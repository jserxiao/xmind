/**
 * ContextMenu - 右键上下文菜单
 * 
 * 在节点上右键点击时显示，提供：
 * - 添加子节点（非 sub 类型）
 * - 编辑节点
 * - 删除节点（包括 sub 类型，会删除 MD 文件中的章节）
 * - 预览内容（sub 类型）
 * - 书签切换
 */

import { useEffect, useRef } from 'react';
import type { RoadmapNode } from '../data/roadmapData';
import { EMOJI } from '../constants/icons';
import styles from '../styles/ContextMenu.module.css';

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
  /** 节点是否有书签 */
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
  /** AI 生成子节点回调 */
  onAIGenerate?: () => void;
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
  hasBookmark: hasBookmarkProp = false,
  onAddChild,
  onEdit,
  onDelete,
  onPreview,
  onToggleBookmark,
  onAIGenerate,
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
    const menuHeight = 180;
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

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: position.left, top: position.top }}
    >
      <div className={styles.contextMenuHeader}>
        <span className={styles.contextMenuNodeLabel}>{node.label}</span>
        <span className={styles.contextMenuNodeType}>{node.type}</span>
      </div>
      <div className={styles.contextMenuDivider} />
      <div className={styles.contextMenuItems}>
        {/* sub 类型节点显示预览、编辑和删除选项 */}
        {isSubNode ? (
          <>
            <button className={styles.contextMenuItem} onClick={onPreview}>
              <span className={styles.menuIcon}>{EMOJI.EYE}</span>
              <span>预览内容</span>
            </button>
            <button className={styles.contextMenuItem} onClick={onEdit}>
              <span className={styles.menuIcon}>{EMOJI.EDIT}</span>
              <span>编辑章节</span>
            </button>
            <button className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`} onClick={onDelete}>
              <span className={styles.menuIcon}>{EMOJI.DELETE}</span>
              <span>删除章节</span>
            </button>
          </>
        ) : (
          <>
            <button className={styles.contextMenuItem} onClick={onAddChild}>
              <span className={styles.menuIcon}>{EMOJI.PLUS}</span>
              <span>添加子节点</span>
            </button>
            {onAIGenerate && (
              <button className={styles.contextMenuItem} onClick={onAIGenerate}>
                <span className={styles.menuIcon}>🤖</span>
                <span>AI 生成子节点</span>
              </button>
            )}
            <button className={styles.contextMenuItem} onClick={onEdit}>
              <span className={styles.menuIcon}>{EMOJI.EDIT}</span>
              <span>编辑节点</span>
            </button>
            {!isRoot && (
              <button className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`} onClick={onDelete}>
                <span className={styles.menuIcon}>{EMOJI.DELETE}</span>
                <span>删除节点</span>
              </button>
            )}
          </>
        )}
        {/* 书签切换按钮 */}
        {onToggleBookmark && (
          <button className={styles.contextMenuItem} onClick={onToggleBookmark}>
            <span className={styles.menuIcon}>{hasBookmarkProp ? EMOJI.BOOKMARK : EMOJI.BOOKMARK_OUTLINE}</span>
            <span>{hasBookmarkProp ? '移除书签' : '添加书签'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ContextMenu;
