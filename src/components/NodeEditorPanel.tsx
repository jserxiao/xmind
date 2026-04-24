/**
 * NodeEditorPanel - 节点编辑面板
 * 
 * 提供节点信息的编辑功能，包括：
 * - 基础信息（标题、类型、图标、描述）
 * - Markdown 内容编辑
 * - 实时预览
 * - 默认模板
 */

import { useState, useEffect, useCallback } from 'react';
import { Button, Tabs, message } from 'antd';
import { useNodeEditorStore } from '../store/nodeEditorStore';
import { EMOJI } from '../constants/icons';
import BasicInfoForm from './nodeEditorPanel/BasicInfoForm';
import ContentEditor from './nodeEditorPanel/ContentEditor';
import styles from '../styles/NodeEditorPanel.module.css';

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
    closePanel,
    isLoadingMd,
  } = useNodeEditorStore();

  // 本地状态
  const [activeTab, setActiveTab] = useState<'basic' | 'content'>('basic');

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
      label: `${EMOJI.CLIPBOARD} 基础信息`,
      children: <BasicInfoForm />,
    },
    {
      key: 'content',
      label: `${EMOJI.NOTE} 内容编辑`,
      children: <ContentEditor />,
    },
  ];

  return (
    <div className={styles.nodeEditorOverlay}>
      <div className={styles.nodeEditorPanel}>
        {/* 标题栏 */}
        <div className={styles.editorHeader}>
          <h2 className={styles.editorTitle}>
            {mode === 'add' ? `${EMOJI.PLUS} 添加节点` : `${EMOJI.EDIT} 编辑节点`}
          </h2>
          <Button 
            type="text" 
            className={styles.editorCloseBtn}
            onClick={closePanel}
          >
            ✕
          </Button>
        </div>

        {/* Tab 内容 */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'basic' | 'content')}
          items={tabItems}
          className={styles.editorTabs}
        />

        {/* 底部操作栏 */}
        <div className={styles.editorFooter}>
          <Button onClick={closePanel}>
            取消
          </Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>

      {/* Loading 遮罩 */}
      {isLoadingMd && (
        <div className={styles.editorLoadingOverlay}>
          <div className={styles.editorLoadingContent}>
            <div className={styles.editorLoadingSpinner} />
            <span>正在加载内容...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeEditorPanel;
