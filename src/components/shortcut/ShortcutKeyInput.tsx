/**
 * ShortcutKeyInput - 快捷键输入组件
 * 
 * 用于编辑快捷键
 */

import React from 'react';
import { Button, Space, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { formatShortcut } from '../../store/shortcutStore';

const { Text } = Typography;

interface ShortcutKeyInputProps {
  /** 当前输入的快捷键 */
  tempKey: string;
  /** 是否有冲突 */
  hasConflict: boolean;
  /** 冲突的动作名称 */
  conflictActionName?: string;
  /** 键盘按下回调 */
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** 保存回调 */
  onSave: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 快捷键输入组件
 * 提供快捷键编辑功能
 */
const ShortcutKeyInput: React.FC<ShortcutKeyInputProps> = ({
  tempKey,
  hasConflict,
  conflictActionName,
  onKeyDown,
  onSave,
  onCancel,
}) => {
  return (
    <div 
      className="shortcut-key-input"
      tabIndex={0}
      autoFocus
      onKeyDown={onKeyDown}
      style={{
        padding: '8px 16px',
        border: hasConflict ? '2px solid #ff4d4f' : '2px solid #1890ff',
        borderRadius: '6px',
        background: hasConflict ? '#fff1f0' : '#f0f5ff',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center',
        outline: 'none',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Text style={{ color: tempKey ? '#1890ff' : '#999' }}>
          {tempKey ? formatShortcut(tempKey) : '按下快捷键...'}
        </Text>
        <Space size={4}>
          <Button 
            size="small" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            disabled={!tempKey}
          />
          <Button 
            size="small" 
            icon={<CloseOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          />
        </Space>
      </div>
      {hasConflict && conflictActionName && (
        <Text type="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
          与「{conflictActionName}」冲突
        </Text>
      )}
    </div>
  );
};

export default ShortcutKeyInput;
