/**
 * BasicInfoForm - 基础信息表单组件
 * 
 * 显示节点的基础信息编辑表单
 */

import React, { useState } from 'react';
import { Input, Select, Button } from 'antd';
import { AppstoreAddOutlined } from '@ant-design/icons';
import { useNodeEditorStore, getDefaultIcon, type NodeType } from '../../store/nodeEditorStore';
import { useCustomNodeStore } from '../../store/customNodeStore';
import { ICON_LIST, NODE_TYPE_OPTIONS } from '../../constants';
import CustomNodeManagerModal from '../customNodeEditor/CustomNodeManagerModal';
import styles from '../../styles/NodeEditorPanel.module.css';

const { TextArea } = Input;

/**
 * 基础信息表单组件
 * 包含标题、类型、图标、描述等字段
 */
const BasicInfoForm: React.FC = () => {
  const { formData, updateFormData, setMdContent } = useNodeEditorStore();
  const [showCustomNodeModal, setShowCustomNodeModal] = useState(false);
  const customNodesRecord = useCustomNodeStore((state) => state.customNodes);
  const customNodes = Object.values(customNodesRecord);
  
  // 是否是 sub 节点
  const isSubNode = formData.type === 'sub';

  // 当节点类型改变时，更新默认图标
  const handleTypeChange = (type: NodeType) => {
    updateFormData({
      type,
      icon: formData.icon || getDefaultIcon(type),
    });
  };
  
  // 选择自定义节点
  const handleSelectCustomNode = (nodeId: string) => {
    const node = customNodes.find((n) => n.id === nodeId);
    if (node) {
      updateFormData({
        customNodeId: nodeId,
        customFill: node.defaultFill,
        customStroke: node.defaultStroke,
      });
    }
    setShowCustomNodeModal(false);
  };
  
  // 清除自定义节点选择
  const handleClearCustomNode = () => {
    updateFormData({
      customNodeId: undefined,
      customFill: undefined,
      customStroke: undefined,
    });
  };
  
  // 获取选中的自定义节点信息
  const selectedCustomNode = formData.customNodeId 
    ? customNodes.find((n) => n.id === formData.customNodeId) 
    : null;

  return (
    <div className={styles.editorForm}>
      {/* 标题 */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{isSubNode ? '章节标题' : '标题'} *</label>
        <Input
          value={formData.label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ label: e.target.value })}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            // 当输入框失焦时，如果 markdown 内容为空，自动同步添加标题
            const label = e.target.value.trim();
            if (!formData.mdContent?.trim() && label) {
              setMdContent(`# ${label}\n\n`);
            }
          }}
          placeholder={isSubNode ? "请输入章节标题" : "请输入节点标题"}
          size="large"
        />
      </div>

      {/* 自定义节点选择 - 所有节点类型都可以选择 */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>自定义节点样式</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedCustomNode ? (
            <>
              <div 
                style={{ 
                  padding: '6px 12px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {selectedCustomNode.elements.find(e => e.type === 'icon')?.icon || '🎨'}
                </span>
                <span>{selectedCustomNode.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ({selectedCustomNode.width}×{selectedCustomNode.height})
                </span>
              </div>
              <Button onClick={handleClearCustomNode}>清除</Button>
              <Button onClick={() => setShowCustomNodeModal(true)}>更换</Button>
            </>
          ) : (
            <>
              <Button 
                icon={<AppstoreAddOutlined />} 
                onClick={() => setShowCustomNodeModal(true)}
                style={{ flex: 1 }}
              >
                选择自定义节点样式
              </Button>
              {customNodes.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  暂无自定义节点，请先创建
                </span>
              )}
            </>
          )}
        </div>
        {formData.customNodeId && (
          <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>填充色：</label>
              <input
                type="color"
                value={formData.customFill || '#e6f7ff'}
                onChange={(e) => updateFormData({ customFill: e.target.value })}
                style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>边框色：</label>
              <input
                type="color"
                value={formData.customStroke || '#1890ff'}
                onChange={(e) => updateFormData({ customStroke: e.target.value })}
                style={{ width: 28, height: 28, border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 非 sub 节点显示类型、图标、描述等 */}
      {!isSubNode && (
        <>
          {/* 类型和图标 */}
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
              <label className={styles.formLabel}>节点类型</label>
              <Select
                value={formData.type}
                onChange={handleTypeChange}
                style={{ width: '100%' }}
                size="large"
                getPopupContainer={(triggerNode: HTMLElement) => triggerNode.parentNode as HTMLElement}
                options={NODE_TYPE_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{opt.label}</span>
                      <span style={{ fontSize: 12, color: '#999' }}>{opt.desc}</span>
                    </div>
                  ),
                }))}
                optionRender={(option: any) => (
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ fontWeight: 500 }}>{NODE_TYPE_OPTIONS.find(o => o.value === option.value)?.label}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{NODE_TYPE_OPTIONS.find(o => o.value === option.value)?.desc}</div>
                  </div>
                )}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
              <label className={styles.formLabel}>图标</label>
              <Select
                value={formData.icon || '📄'}
                onChange={(icon: string) => updateFormData({ icon })}
                style={{ width: '100%' }}
                size="large"
                showSearch
                optionFilterProp="label"
                getPopupContainer={(triggerNode: HTMLElement) => triggerNode.parentNode as HTMLElement}
                options={ICON_LIST}
              />
            </div>
          </div>

          {/* 描述 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData({ description: e.target.value })}
              placeholder="请输入节点描述（可选）"
              rows={2}
              showCount
              maxLength={200}
            />
          </div>

          {/* MD路径 */}
          {formData.type !== 'link' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>MD 文件路径</label>
              <Input
                value={formData.mdPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ mdPath: e.target.value })}
                placeholder="例如: basic-features/defer"
              />
              <span className={styles.formHint}>相对于 /md/ 目录的路径，不含 .md 后缀</span>
            </div>
          )}

          {/* 外部链接 */}
          {formData.type === 'link' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>外部链接</label>
              <Input
                value={formData.url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}
        </>
      )}
      
      {/* 自定义节点选择弹窗 */}
      <CustomNodeManagerModal
        open={showCustomNodeModal}
        onClose={() => setShowCustomNodeModal(false)}
        onSelectNode={handleSelectCustomNode}
        showSelect
      />
    </div>
  );
};

export default BasicInfoForm;
