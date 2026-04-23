/**
 * BasicInfoForm - 基础信息表单组件
 * 
 * 显示节点的基础信息编辑表单
 */

import React from 'react';
import { Input, Select } from 'antd';
import { useNodeEditorStore, getDefaultIcon, type NodeType } from '../../store/nodeEditorStore';
import { ICON_LIST, NODE_TYPE_OPTIONS } from '../../constants';

const { TextArea } = Input;

/**
 * 基础信息表单组件
 * 包含标题、类型、图标、描述等字段
 */
const BasicInfoForm: React.FC = () => {
  const { formData, updateFormData, setMdContent } = useNodeEditorStore();
  
  // 是否是 sub 节点
  const isSubNode = formData.type === 'sub';

  // 当节点类型改变时，更新默认图标
  const handleTypeChange = (type: NodeType) => {
    updateFormData({
      type,
      icon: formData.icon || getDefaultIcon(type),
    });
  };

  return (
    <div className="editor-form">
      {/* 标题 */}
      <div className="form-group">
        <label className="form-label">{isSubNode ? '章节标题' : '标题'} *</label>
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

            <div className="form-group form-group-half">
              <label className="form-label">图标</label>
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
          <div className="form-group">
            <label className="form-label">描述</label>
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
            <div className="form-group">
              <label className="form-label">MD 文件路径</label>
              <Input
                value={formData.mdPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ mdPath: e.target.value })}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BasicInfoForm;
