/**
 * NodeEditorPanel - 节点编辑面板
 * 
 * 提供节点信息的编辑功能，包括：
 * - 基础信息（标题、类型、图标、描述）
 * - Markdown 内容编辑
 * - 实时预览
 */

import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { 
  Input, 
  Select, 
  Button, 
  Tabs, 
  Spin,
  message,
} from 'antd';
import { useNodeEditorStore, getDefaultIcon, type NodeType } from '../store/nodeEditorStore';
import { ICON_LIST, NODE_TYPE_OPTIONS } from '../constants';

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
            <span className="md-editor-hint">支持 H1-H6 标题、代码块、表格等</span>
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
            </div>
            <div className="preview-content" data-color-mode="light">
              <MDEditor.Markdown
                source={formData.mdContent || '*暂无内容，请在左侧编辑*'}
                style={{ backgroundColor: 'transparent' }}
              />
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
