/**
 * ContentEditor - 内容编辑器组件
 * 
 * 提供 Markdown 内容编辑功能
 */

import React, { useRef, useCallback, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button, Dropdown, message, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { UploadOutlined, RobotOutlined } from '@ant-design/icons';
import { useNodeEditorStore } from '../../store/nodeEditorStore';
import { useAIStore } from '../../store/aiStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { EMOJI } from '../../constants/icons';
import { 
  MD_TEMPLATES, 
  MD_SNIPPETS, 
  getTemplateContent, 
  getSnippetContent 
} from '../../utils/mdTemplates';
import { getNodePath } from '../../utils/nodeUtils';
import { getAIService } from '../../services/aiService';
import styles from '../../styles/NodeEditorPanel.module.css';
import type { RoadmapNode } from '../../data/roadmapData';
import TextDiffModal from '../common/TextDiffModal';

interface ContentEditorProps {
  /** 节点树数据（用于获取节点路径） */
  rawData?: RoadmapNode | null;
}

/**
 * 内容编辑器组件
 * 提供 Markdown 编辑、模板应用、样式片段插入等功能
 */
const ContentEditor: React.FC<ContentEditorProps> = ({ rawData }) => {
  const { formData, setMdContent, editingNode, parentNodeId, mode } = useNodeEditorStore();
  const { config, isConfigured } = useAIStore();
  const { currentRoadmap } = useRoadmapStore();
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // 差异对比弹窗状态
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [enhancedContent, setEnhancedContent] = useState('');
  
  // 是否是 sub 节点
  const isSubNode = formData.type === 'sub';

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
      label: `${EMOJI.CANCEL} 取消模板`,
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

  // AI 完善内容
  const handleAIEnhance = useCallback(async () => {
    // 检查 AI 是否已配置
    if (!isConfigured || !config) {
      message.warning('请先配置 AI 服务');
      return;
    }

    // 获取节点路径
    let nodePath: string[] = [];
    let nodeName = formData.label;
    
    if (mode === 'edit' && editingNode && rawData) {
      // 编辑模式：从 rawData 获取完整路径
      nodePath = getNodePath(editingNode.id, rawData);
    } else if (mode === 'add' && parentNodeId && rawData) {
      // 添加模式：获取父节点路径 + 当前节点名
      const parentPath = getNodePath(parentNodeId, rawData);
      nodePath = [...parentPath, formData.label];
    } else {
      // 无法获取完整路径时，使用简化路径
      nodePath = [formData.label];
    }

    // 获取主题
    const roadmapTheme = currentRoadmap?.name || '知识图谱';

    setIsEnhancing(true);
    try {
      const aiService = getAIService(config);
      if (!aiService) {
        message.error('AI 服务不可用');
        return;
      }

      const result = await aiService.enhanceContent(
        formData.mdContent || '',
        nodePath,
        nodeName,
        roadmapTheme
      );

      if (result.success && result.content) {
        // 显示差异对比弹窗
        setOriginalContent(formData.mdContent || '');
        setEnhancedContent(result.content);
        setDiffModalVisible(true);
      } else {
        message.error(result.error || 'AI 完善内容失败');
      }
    } catch (error) {
      console.error('[ContentEditor] AI 完善内容失败:', error);
      message.error('AI 完善内容失败，请稍后重试');
    } finally {
      setIsEnhancing(false);
    }
  }, [config, isConfigured, formData.mdContent, formData.label, editingNode, parentNodeId, mode, currentRoadmap, rawData]);

  // 确认应用 AI 完善的内容
  const handleConfirmDiff = useCallback(() => {
    setMdContent(enhancedContent);
    setDiffModalVisible(false);
    message.success('已应用 AI 完善的内容');
  }, [enhancedContent, setMdContent]);

  // 取消应用 AI 完善的内容
  const handleCancelDiff = useCallback(() => {
    setDiffModalVisible(false);
  }, []);

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

  return (
    <div className={styles.editorMdArea}>
      <div className={styles.mdEditorHeader}>
        <span className={styles.mdEditorTitle}>
          {isSubNode ? '章节内容' : 'Markdown 内容'}
        </span>
        <div className={styles.mdEditorActions}>
          <Dropdown 
            menu={{ items: templateMenuItems, onClick: handleTemplateClick }} 
            trigger={['click']}
          >
            <Button size="small" type="primary" ghost>
              {EMOJI.CLIPBOARD} 使用模板
            </Button>
          </Dropdown>
          <Dropdown 
            menu={{ items: snippetMenuItems, onClick: handleSnippetClick }} 
            trigger={['click']}
          >
            <Button size="small">
              {EMOJI.SPARKLE} 插入样式
            </Button>
          </Dropdown>
          <Button size="small" onClick={handleImportMd}>
            <UploadOutlined /> 导入MD
          </Button>
          <Tooltip title={isConfigured ? '使用 AI 完善当前内容' : '请先配置 AI 服务'}>
            <Button 
              size="small" 
              type="primary"
              loading={isEnhancing}
              disabled={!isConfigured}
              onClick={handleAIEnhance}
              icon={<RobotOutlined />}
            >
              AI完善
            </Button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
      
      <div className={styles.mdEditorContainer} data-color-mode="light">
        <MDEditor
          value={formData.mdContent || ''}
          onChange={(val) => setMdContent(val || '')}
          height={400}
          preview="live"
          hideToolbar={false}
        />
      </div>

      {/* 文本差异对比弹窗 */}
      <TextDiffModal
        visible={diffModalVisible}
        originalText={originalContent}
        modifiedText={enhancedContent}
        originalTitle="原始内容"
        modifiedTitle="AI 完善后内容"
        title="AI 内容完善对比"
        onConfirm={handleConfirmDiff}
        onCancel={handleCancelDiff}
        confirmText="应用修改"
        cancelText="放弃修改"
      />
    </div>
  );
};

export default ContentEditor;
