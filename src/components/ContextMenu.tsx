/**
 * ContextMenu - 右键上下文菜单
 * 
 * 在节点上右键点击时显示，提供：
 * - 添加子节点（非 sub 类型）
 * - 编辑节点
 * - 删除节点（非 root 类型）
 * - 预览内容（sub 类型或有 mdPath 的节点）
 */

import { useEffect, useRef } from 'react';
import type { RoadmapNode } from '../data/roadmapData';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContextMenuProps {
  /** 菜单显示位置 X */
  x: number;
  /** 菜单显示位置 Y */
  y: number;
  /** 当前节点 */
  node: RoadmapNode | null;
  /** 是否显示 */
  visible: boolean;
  /** 是否有书签 */
  hasBookmark?: boolean;
  /** 添加子节点回调 */
  onAddChild: () => void;
  /** 编辑节点回调 */
  onEdit: () => void;
  /** 删除节点回调 */
  onDelete: () => void;
  /** 预览内容回调（sub 类型节点） */
  onPreview?: () => void;
  /** 切换书签回调 */
  onToggleBookmark?: () => void;
  /** 关闭菜单回调 */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  node,
  visible,
  hasBookmark,
  onAddChild,
  onEdit,
  onDelete,
  onPreview,
  onToggleBookmark,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  // 调整菜单位置，确保不超出屏幕
  const adjustPosition = () => {
    if (!menuRef.current) return { left: x, top: y };

    const menuWidth = 160;
    const menuHeight = 140;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = x;
    let top = y;

    if (x + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10;
    }
    if (y + menuHeight > windowHeight) {
      top = windowHeight - menuHeight - 10;
    }

    return { left, top };
  };

  if (!visible || !node) return null;

  const position = adjustPosition();
  const isRoot = node.type === 'root';
  const isSubNode = node.type === 'sub';
  const hasMdPath = !!node.mdPath;
  const canPreview = isSubNode || hasMdPath;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.left, top: position.top }}
    >
      <div className="context-menu-header">
        <span className="context-menu-node-label">{node.label}</span>
        <span className="context-menu-node-type">{node.type}</span>
      </div>
      <div className="context-menu-divider" />
      <div className="context-menu-items">
        {/* 书签选项 */}
        {onToggleBookmark && (
          <button className="context-menu-item" onClick={onToggleBookmark}>
            <span className="menu-icon">{hasBookmark ? '🔖' : '📑'}</span>
            <span>{hasBookmark ? '移除书签' : '添加书签'}</span>
          </button>
        )}
        
        {/* sub 类型或有 mdPath 的节点显示预览选项 */}
        {canPreview && (
          <button className="context-menu-item" onClick={onPreview}>
            <span className="menu-icon">👁️</span>
            <span>预览内容</span>
          </button>
        )}
        
        {/* sub 类型节点 */}
        {isSubNode ? (
          <button className="context-menu-item" onClick={onEdit}>
            <span className="menu-icon">✏️</span>
            <span>编辑章节</span>
          </button>
        ) : (
          <>
            <button className="context-menu-item" onClick={onAddChild}>
              <span className="menu-icon">➕</span>
              <span>添加子节点</span>
            </button>
            <button className="context-menu-item" onClick={onEdit}>
              <span className="menu-icon">✏️</span>
              <span>编辑节点</span>
            </button>
            {!isRoot && (
              <button className="context-menu-item context-menu-item-danger" onClick={onDelete}>
                <span className="menu-icon">🗑️</span>
                <span>删除节点</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContextMenu;
