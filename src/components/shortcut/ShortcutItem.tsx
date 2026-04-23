/**
 * ShortcutItem - 快捷键配置项组件
 * 
 * 显示单个快捷键的配置信息
 */

import React from 'react';
import { Typography, Switch, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { ShortcutConfig, ShortcutAction } from '../../store/shortcutStore';
import ShortcutKey from './ShortcutKey';
import ShortcutKeyInput from './ShortcutKeyInput';

const { Text } = Typography;

interface ShortcutItemProps {
  /** 快捷键配置 */
  config: ShortcutConfig;
  /** 是否正在编辑 */
  isEditing: boolean;
  /** 当前输入的快捷键 */
  tempKey: string;
  /** 是否有冲突 */
  hasConflict: boolean;
  /** 冲突的动作名称 */
  conflictActionName?: string;
  /** 开始编辑回调 */
  onStartEdit: (action: ShortcutAction) => void;
  /** 键盘按下回调 */
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** 保存回调 */
  onSave: () => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 切换启用状态回调 */
  onToggle: (action: ShortcutAction, enabled: boolean) => void;
}

/**
 * 快捷键配置项组件
 * 显示快捷键名称、描述和按键
 */
const ShortcutItem: React.FC<ShortcutItemProps> = ({
  config,
  isEditing,
  tempKey,
  hasConflict,
  conflictActionName,
  onStartEdit,
  onKeyDown,
  onSave,
  onCancel,
  onToggle,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* 左侧: 操作名称和描述 */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Text strong style={{ fontSize: '14px' }}>{config.name}</Text>
          <Tooltip title={config.description}>
            <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px', cursor: 'help' }} />
          </Tooltip>
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>{config.description}</Text>
      </div>

      {/* 右侧: 快捷键和开关 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {config.enabled && (
          isEditing ? (
            <ShortcutKeyInput
              tempKey={tempKey}
              hasConflict={hasConflict}
              conflictActionName={conflictActionName}
              onKeyDown={onKeyDown}
              onSave={onSave}
              onCancel={onCancel}
            />
          ) : (
            <ShortcutKey 
              shortcutKey={config.key} 
              editable 
              onClick={() => onStartEdit(config.action)} 
            />
          )
        )}
        <Switch
          size="small"
          checked={config.enabled}
          onChange={(checked) => onToggle(config.action, checked)}
        />
      </div>
    </div>
  );
};

export default ShortcutItem;
