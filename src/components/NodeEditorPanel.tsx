/**
 * NodeEditorPanel - 节点编辑面板
 * 
 * 提供节点信息的编辑功能，包括：
 * - 基础信息（标题、类型、图标、描述）
 * - Markdown 内容编辑
 * - 实时预览
 * - 默认模板
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { 
  Input, 
  Select, 
  Button, 
  Tabs, 
  Spin,
  message,
  Dropdown,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNodeEditorStore, getDefaultIcon, type NodeType } from '../store/nodeEditorStore';
import { ICON_LIST, NODE_TYPE_OPTIONS } from '../constants';
import { 
  MD_TEMPLATES, 
  MD_SNIPPETS, 
  getTemplateContent, 
  getSnippetContent 
} from '../utils/mdTemplates';

const { TextArea } = Input;

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeEditorPanelProps {
  /** 保存回调 */
  onSave?: () => void;
}

const NodeEditorPanel: React.FC<NodeEditorPanelProps> = ({ onSave }) => {
  const {
    isOpen,
    mode,
    parentNodeId,
    editingNode,
    formData,
    updateFormData,
    setMdContent,
    closePanel,
    isLoadingMd,
    subNodeMdPath,
  } = useNodeEditorStore();

  // 本地状态
  const [activeTab, setActiveTab] = useState<'basic' | 'content'>('basic');
  
  // 是否是 sub 节点
  const isSubNode = formData.type === 'sub';

  // 当节点类型改变时，更新默认图标
  const handleTypeChange = (type: NodeType) => {
    updateFormData({
      type,
      icon: formData.icon || getDefaultIcon(type),
    });
  };

  // 应用默认模板
  const applyTemplate = useCallback((templateKey: string) => {
    const title = formData.label || '标题';
    const content = getTemplateContent(templateKey, title);
    if (content) {
      setMdContent(content);
      message.success('已应用模板');
    }
  }, [formData.label, setMdContent]);
  
  // 取消模板
  const cancelTemplate = useCallback(() => {
    setMdContent('');
    message.info('已取消模板');
  }, [setMdContent]);

  // 插入样式片段
  const insertSnippet = useCallback((snippetKey: string) => {
    const content = getSnippetContent(snippetKey);
    if (content) {
      const currentContent = formData.mdContent || '';
      setMdContent(currentContent + '\n' + content);
    }
  }, [formData.mdContent, setMdContent]);

  // 保存节点
  const handleSave = useCallback(() => {
    // 验证必填字段
    if (!formData.label.trim()) {
      message.warning('请输入节点标题');
      return;
    }
    
    console.log('[NodeEditorPanel] 保存节点', {
      mode,
      parentNodeId,
      editingNode,
      formData,
    });
    
    // 调用外部保存回调
    onSave?.();
  }, [mode, parentNodeId, editingNode, formData, onSave]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isOpen) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel, handleSave]);

  // 处理模板菜单点击
  const handleTemplateClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'cancel') {
      cancelTemplate();
    } else {
      applyTemplate(e.key);
    }
  };
  
  // 模板菜单项
  const templateMenuItems: MenuProps['items'] = [
    ...MD_TEMPLATES.map(t => ({
      key: t.key,
      label: t.label,
    })),
    { type: 'divider' },
    {
      key: 'cancel',
      label: '❌ 取消模板',
      danger: true,
    },
  ];

  // 样式片段菜单项
  const snippetMenuItems: MenuProps['items'] = MD_SNIPPETS.map(s => ({
    key: s.key,
    label: s.label,
  }));
  
  // 处理样式片段菜单点击
  const handleSnippetClick: MenuProps['onClick'] = (e) => {
    insertSnippet(e.key);
  };

  // 导入 MD 文件
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportMd = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.endsWith('.md') && file.type !== 'text/markdown') {
      message.error('请选择 Markdown 文件（.md）');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMdContent(content);
        message.success(`已导入文件：${file.name}`);
      }
    };
    reader.onerror = () => {
      message.error('文件读取失败');
    };
    reader.readAsText(file);
    
    // 清除 input 值，允许重复选择同一文件
    e.target.value = '';
  };

  if (!isOpen) return null;

  const tabItems = [
    {
      key: 'basic',
      label: '📋 基础信息',
      children: (
        <div className="editor-form">
          {/* 标题 */}
          <div className="form-group">
            <label className="form-label">{isSubNode ? '章节标题' : '标题'} *</label>
            <Input
              value={formData.label}
              onChange={(e) => updateFormData({ label: e.target.value })}
              placeholder={isSubNode ? "请输入章节标题" : "请输入节点标题"}
              size="large"
            />
          </div>

          {/* 非 sub 节点显示类型、图标、描述等 */}
          {!isSubNode && (
            <>
              {/* 类型和图标 */}
              <div className="form-row">
                <div className="form-group form-group-half">
                  <label className="form-label">节点类型</label>
                  <Select
                    value={formData.type}
                    onChange={handleTypeChange}
                    style={{ width: '100%' }}
                    size="large"
                    getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                    options={NODE_TYPE_OPTIONS.map(opt => ({
                      value: opt.value,
                      label: (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{opt.label}</span>
                          <span style={{ fontSize: 12, color: '#999' }}>{opt.desc}</span>
                        </div>
                      ),
                    }))}
                    optionRender={(option) => (
                      <div style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 500 }}>{NODE_TYPE_OPTIONS.find(o => o.value === option.value)?.label}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{NODE_TYPE_OPTIONS.find(o => o.value === option.value)?.desc}</div>
                      </div>
                    )}
                  />
                </div>

                <div className="form-group form-group-half">
                  <label className="form-label">图标</label>
                  <Select
                    value={formData.icon || '📄'}
                    onChange={(icon) => updateFormData({ icon })}
                    style={{ width: '100%' }}
                    size="large"
                    showSearch
                    optionFilterProp="label"
                    getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                    options={ICON_LIST}
                  />
                </div>
              </div>

              {/* 描述 */}
              <div className="form-group">
                <label className="form-label">描述</label>
                <TextArea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="请输入节点描述（可选）"
                  rows={2}
                  showCount
                  maxLength={200}
                />
              </div>

              {/* MD路径 */}
              {formData.type !== 'link' && (
                <div className="form-group">
                  <label className="form-label">MD 文件路径</label>
                  <Input
                    value={formData.mdPath}
                    onChange={(e) => updateFormData({ mdPath: e.target.value })}
                    placeholder="例如: basic-features/defer"
                  />
                  <span className="form-hint">相对于 /md/ 目录的路径，不含 .md 后缀</span>
                </div>
              )}

              {/* 外部链接 */}
              {formData.type === 'link' && (
                <div className="form-group">
                  <label className="form-label">外部链接</label>
                  <Input
                    value={formData.url}
                    onChange={(e) => updateFormData({ url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      label: '📝 内容编辑',
      children: (
        <div className="editor-md-area">
          <div className="md-editor-header">
            <span className="md-editor-title">
              {isSubNode ? '章节内容' : 'Markdown 内容'}
            </span>
            <div className="md-editor-actions">
              <Dropdown 
                menu={{ items: templateMenuItems, onClick: handleTemplateClick }} 
                trigger={['click']}
              >
                <Button size="small" type="primary" ghost>
                  📋 使用模板
                </Button>
              </Dropdown>
              <Dropdown 
                menu={{ items: snippetMenuItems, onClick: handleSnippetClick }} 
                trigger={['click']}
              >
                <Button size="small">
                  ✨ 插入样式
                </Button>
              </Dropdown>
              <Button size="small" onClick={handleImportMd}>
                <UploadOutlined /> 导入MD
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>
          {isLoadingMd ? (
            <div className="md-editor-loading">
              <Spin tip="正在加载内容..." />
            </div>
          ) : (
            <div className="md-editor-container" data-color-mode="light">
              <MDEditor
                value={formData.mdContent}
                onChange={(value) => setMdContent(value || '')}
                preview="edit"
                height="100%"
                visibleDragbar={false}
              />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="node-editor-overlay">
      <div className="node-editor-panel">
        {/* 标题栏 */}
        <div className="editor-header">
          <h2 className="editor-title">
            {mode === 'add' 
              ? '➕ 添加节点' 
              : isSubNode 
                ? '📝 编辑章节内容' 
                : '✏️ 编辑节点'}
          </h2>
          {isSubNode && subNodeMdPath && (
            <span className="editor-subtitle">📄 {subNodeMdPath}</span>
          )}
          <button className="editor-close-btn" onClick={closePanel}>
            ✕
          </button>
        </div>

        {/* 主内容区 */}
        <div className="editor-main">
          {/* 左侧：编辑区 */}
          <div className="editor-left">
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'basic' | 'content')}
              items={tabItems}
              size="large"
              style={{ paddingLeft: 16, paddingRight: 16 }}
            />
          </div>

          {/* 右侧：预览区 */}
          <div className="editor-right">
            <div className="preview-header">
              <span className="preview-title">📄 实时预览</span>
              <Tooltip title="点击预览区下方的模板按钮可快速填充内容">
                <span className="preview-tip">💡 提示</span>
              </Tooltip>
            </div>
            <div className="preview-content" data-color-mode="light">
              <MDEditor.Markdown
                source={formData.mdContent || '*暂无内容，请在左侧编辑*'}
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            {/* 预览区底部的快捷模板按钮 */}
            <div className="preview-templates">
              <span className="templates-label">快速模板：</span>
              {MD_TEMPLATES.map(t => (
                <Button key={t.key} size="small" onClick={() => applyTemplate(t.key)}>
                  {t.label.replace(/[📋📄📖📚]/g, '').trim()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="editor-footer">
          <div className="footer-hint">
            按 <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存，<kbd>Esc</kbd> 取消
          </div>
          <div className="footer-actions">
            <Button onClick={closePanel}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              💾 保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeEditorPanel;
