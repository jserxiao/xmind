/**
 * 图标常量定义
 * 
 * 集中管理应用中使用的所有图标（Emoji 和 SVG）
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Emoji 图标常量
// ═══════════════════════════════════════════════════════════════════════════════

/** 通用图标 */
export const EMOJI = {
  // 文档相关
  BOOK: '📘',
  BOOK_OPEN: '📖',
  NOTE: '📝',
  DOCUMENT: '📄',
  TUTORIAL: '📚',
  FOLDER: '📂',
  FOLDER_OPEN: '📁',
  DATABASE: '🗃️',
  
  // 状态相关
  CHART: '📊',
  TREND: '📈',
  STATUS: '🟢',
  CHECK: '✅',
  TARGET: '🎯',
  STAR: '⭐',
  
  // 链接相关
  LINK: '🔗',
  GLOBE: '🌐',
  
  // 开发相关
  CODE: '💻',
  TERMINAL: '🖥️',
  SETTINGS: '⚙️',
  TOOLS: '🛠️',
  CONFIG: '🔧',
  ROCKET: '🚀',
  
  // 提示相关
  BULB: '💡',
  PALETTE: '🎨',
  FIRE: '🔥',
  LIGHTNING: '⚡',
  
  // 操作相关
  EYE: '👁️',
  DELETE: '🗑️',
  SEARCH: '🔍',
  PLUS: '➕',
  MINUS: '➖',
  WARNING: '⚠️',
  BOOKMARK: '🔖',
  MAP: '🗺️',
  EDIT: '✏️',
  CAMERA: '📷',
  SAVE: '💾',
  TREE: '🌳',
  SCROLL: '📜',
  LIGHTBULB: '💡',
  CANCEL: '❌',
  SPARKLE: '✨',
  CLIPBOARD: '📋',
  WATER: '💧',
  PIN: '📍',
  EMPTY_INBOX: '📭',
  BOOKMARK_OUTLINE: '📑',
  
  // 箭头
  ARROW_RIGHT: '▶',
  ARROW_LEFT: '◀',
  
  // 其他
  WHITE_CIRCLE: '⚪',
  RECT: '◻️',
  ELLIPSE: '⭕',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 节点类型图标映射
// ═══════════════════════════════════════════════════════════════════════════════

export const NODE_ICONS = {
  root: EMOJI.BOOK,
  branch: EMOJI.FOLDER,
  leaf: EMOJI.STATUS,
  link: EMOJI.LINK,
  sub: EMOJI.NOTE,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SVG 图标组件
// ═══════════════════════════════════════════════════════════════════════════════

/** SVG 图标 Props */
interface SvgIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** 全屏图标 */
export const FullscreenIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

/** 退出全屏图标 */
export const ExitFullscreenIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

/** 关闭图标 */
export const CloseIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** 添加图标 */
export const PlusIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** 减少图标 */
export const MinusIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** 编辑图标 */
export const EditIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/** 删除图标 */
export const TrashIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

/** 预览/眼睛图标 */
export const EyeIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** 适应画布图标 */
export const FitViewIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

/** 连线图标 */
export const ConnectionIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <circle cx="5" cy="12" r="3" />
    <circle cx="19" cy="12" r="3" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

/** 连线激活图标 */
export const ConnectionActiveIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <circle cx="5" cy="12" r="3" fill="currentColor" />
    <circle cx="19" cy="12" r="3" fill="currentColor" />
    <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="3 3" />
  </svg>
);

/** 连线预览图标 */
export const ConnectionPreviewIcon: React.FC<SvgIconProps> = ({ size = 16, className, style }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <circle cx="5" cy="12" r="3" fill="currentColor" />
    <circle cx="19" cy="12" r="3" fill="currentColor" />
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="3" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
