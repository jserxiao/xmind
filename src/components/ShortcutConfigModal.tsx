/**
 * ShortcutConfigModal - 快捷键配置弹窗
 * 
 * 提供快捷键自定义功能:
 * - 美观的弹窗界面
 * - 逼真的按键效果
 * - 支持修改快捷键
 * - 检测冲突
 * - 重置默认设置
 */

import React, { useState, useCallback } from 'react';
import { Modal, Button, Alert, Tabs } from 'antd';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { 
  useShortcutStore,
  type ShortcutAction,
  type ShortcutConfig 
} from '../store/shortcutStore';
import { EMOJI } from '../constants/icons';
import ShortcutCategoryList from './shortcut/ShortcutCategoryList';

interface ShortcutConfigModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
}

/**
 * 快捷键配置弹窗组件
 */
const ShortcutConfigModal: React.FC<ShortcutConfigModalProps> = ({ open, onClose }) => {
  // 使用精细 selector 避免全量订阅触发重渲染
  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const updateShortcut = useShortcutStore((state) => state.updateShortcut);
  const toggleShortcut = useShortcutStore((state) => state.toggleShortcut);
  const resetShortcuts = useShortcutStore((state) => state.resetShortcuts);
  const checkConflict = useShortcutStore((state) => state.checkConflict);
  
  const [editingAction, setEditingAction] = useState<ShortcutAction | null>(null);
  const [tempKey, setTempKey] = useState<string>('');
  const [conflict, setConflict] = useState<ShortcutAction | null>(null);

  // 开始编辑快捷键
  const startEditing = useCallback((action: ShortcutAction) => {
    setEditingAction(action);
    setTempKey('');
    setConflict(null);
  }, []);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    setEditingAction(null);
    setTempKey('');
    setConflict(null);
  }, []);

  // 处理键盘输入
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // ESC 取消
    if (e.key === 'Escape') {
      cancelEditing();
      return;
    }

    // 构建快捷键字符串
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');

    // 添加主键
    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }

    if (parts.length > 0) {
      const shortcutKey = parts.join('+');
      setTempKey(shortcutKey);

      // 检测冲突
      const conflictAction = checkConflict(shortcutKey, editingAction || undefined);
      setConflict(conflictAction);
    }
  }, [editingAction, checkConflict, cancelEditing]);

  // 保存快捷键
  const saveShortcut = useCallback(() => {
    if (!editingAction || !tempKey) return;

    if (conflict) {
      Modal.confirm({
        title: '快捷键冲突',
        content: `快捷键已被「${shortcuts[conflict].name}」使用，是否覆盖？`,
        onOk: () => {
          updateShortcut(editingAction, tempKey);
          cancelEditing();
        },
      });
    } else {
      updateShortcut(editingAction, tempKey);
      cancelEditing();
    }
  }, [editingAction, tempKey, conflict, shortcuts, updateShortcut, cancelEditing]);

  // 重置所有快捷键
  const handleReset = useCallback(() => {
    Modal.confirm({
      title: '重置快捷键',
      content: '确定要重置所有快捷键为默认设置吗？',
      onOk: () => {
        resetShortcuts();
      },
    });
  }, [resetShortcuts]);

  // 获取某分类的快捷键列表
  const getCategoryItems = useCallback((category: ShortcutConfig['category']) => {
    return Object.values(shortcuts).filter(s => s.category === category);
  }, [shortcuts]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⌨️</span>
          <span>快捷键配置</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={handleReset}>
          重置默认
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>,
      ]}
      styles={{ body: { padding: '0' } }}
    >
      <Alert
        type="info"
        message="点击快捷键可修改，按 ESC 取消编辑"
        style={{ margin: '16px', borderRadius: '6px' }}
        showIcon
        icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
      />

      {conflict && (
        <Alert
          type="warning"
          message={`与「${shortcuts[conflict].name}」冲突`}
          style={{ margin: '0 16px 16px', borderRadius: '6px' }}
          showIcon
        />
      )}

      <Tabs
        defaultActiveKey="edit"
        items={[
          {
            key: 'edit',
            label: `${EMOJI.EDIT} 编辑`,
            children: (
              <ShortcutCategoryList
                items={getCategoryItems('edit')}
                editingAction={editingAction}
                tempKey={tempKey}
                hasConflict={conflict !== null}
                conflictActionName={conflict ? shortcuts[conflict].name : undefined}
                onStartEdit={startEditing}
                onKeyDown={handleKeyDown}
                onSave={saveShortcut}
                onCancel={cancelEditing}
                onToggle={toggleShortcut}
              />
            ),
          },
          {
            key: 'node',
            label: `${EMOJI.FOLDER} 节点`,
            children: (
              <ShortcutCategoryList
                items={getCategoryItems('node')}
                editingAction={editingAction}
                tempKey={tempKey}
                hasConflict={conflict !== null}
                conflictActionName={conflict ? shortcuts[conflict].name : undefined}
                onStartEdit={startEditing}
                onKeyDown={handleKeyDown}
                onSave={saveShortcut}
                onCancel={cancelEditing}
                onToggle={toggleShortcut}
              />
            ),
          },
          {
            key: 'view',
            label: `${EMOJI.EYE} 视图`,
            children: (
              <ShortcutCategoryList
                items={getCategoryItems('view')}
                editingAction={editingAction}
                tempKey={tempKey}
                hasConflict={conflict !== null}
                conflictActionName={conflict ? shortcuts[conflict].name : undefined}
                onStartEdit={startEditing}
                onKeyDown={handleKeyDown}
                onSave={saveShortcut}
                onCancel={cancelEditing}
                onToggle={toggleShortcut}
              />
            ),
          },
          {
            key: 'export',
            label: '📤 导出',
            children: (
              <ShortcutCategoryList
                items={getCategoryItems('export')}
                editingAction={editingAction}
                tempKey={tempKey}
                hasConflict={conflict !== null}
                conflictActionName={conflict ? shortcuts[conflict].name : undefined}
                onStartEdit={startEditing}
                onKeyDown={handleKeyDown}
                onSave={saveShortcut}
                onCancel={cancelEditing}
                onToggle={toggleShortcut}
              />
            ),
          },
        ]}
        style={{ margin: '0 16px' }}
      />
    </Modal>
  );
};

export default ShortcutConfigModal;
