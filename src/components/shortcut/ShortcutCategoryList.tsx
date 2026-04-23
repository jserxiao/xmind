/**
 * ShortcutCategoryList - 快捷键分类列表组件
 * 
 * 显示某个分类下的所有快捷键
 */

import React from 'react';
import type { ShortcutConfig, ShortcutAction } from '../../store/shortcutStore';
import ShortcutItem from './ShortcutItem';

interface ShortcutCategoryListProps {
  /** 该分类下的所有快捷键配置 */
  items: ShortcutConfig[];
  /** 当前正在编辑的动作 */
  editingAction: ShortcutAction | null;
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
 * 快捷键分类列表组件
 * 显示某个分类下的所有快捷键配置
 */
const ShortcutCategoryList: React.FC<ShortcutCategoryListProps> = ({
  items,
  editingAction,
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
    <div style={{ padding: '16px 0' }}>
      {items.map((item) => (
        <ShortcutItem
          key={item.action}
          config={item}
          isEditing={editingAction === item.action}
          tempKey={tempKey}
          hasConflict={hasConflict && editingAction === item.action}
          conflictActionName={conflictActionName}
          onStartEdit={onStartEdit}
          onKeyDown={onKeyDown}
          onSave={onSave}
          onCancel={onCancel}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

export default ShortcutCategoryList;
