/**
 * 常量定义
 * 
 * 集中管理应用中使用的所有常量
 * 
 * 模块结构：
 * - icons.tsx  - 图标相关常量
 * - app.ts     - 应用级常量
 * - storage.ts - 存储相关常量
 * - index.ts   - 节点样式、布局、交互等配置
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 模块导出
// ═══════════════════════════════════════════════════════════════════════════════

// 图标常量
export { 
  EMOJI, 
  NODE_ICONS,
  FullscreenIcon,
  ExitFullscreenIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  FitViewIcon,
  ConnectionIcon,
  ConnectionActiveIcon,
  ConnectionPreviewIcon,
} from './icons';

// 应用级常量
export {
  APP_NAME,
  APP_VERSION,
  BACKUP_SOURCE,
  DB_NAME,
  DB_STORE_NAME,
  DB_HANDLE_KEY,
  MAX_HISTORY_SIZE,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_SHORTCUTS,
  STORAGE_KEY_BOOKMARKS,
  STORAGE_KEY_CONFIGS,
  STORAGE_KEY_WATERMARK,
  STORAGE_KEY_MINIMAP,
  STORAGE_KEY_CUSTOM_NODES,
} from './app';

// 存储相关常量
export {
  CRYPTO_ALGORITHM,
  CRYPTO_KEY_LENGTH,
  CRYPTO_IV_LENGTH,
  CRYPTO_SALT_LENGTH,
  CRYPTO_ITERATIONS,
  CRYPTO_HASH_ALGORITHM,
  SECURE_STORAGE_PREFIX,
  CRYPTO_APP_SEED,
  CACHE_MD_CONTENT_TTL,
  CACHE_MD_CONTENT_MAX_SIZE,
  CACHE_INDEX_TTL,
  CACHE_INDEX_MAX_SIZE,
  CACHE_NODE_TREE_TTL,
  CACHE_NODE_TREE_MAX_SIZE,
  CACHE_CLEANUP_INTERVAL,
} from './storage';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型导入
// ═══════════════════════════════════════════════════════════════════════════════

import type { NodeType } from '../store/nodeEditorStore';
import { NODE_ICONS } from './icons';

// ═══════════════════════════════════════════════════════════════════════════════
// 预设图标列表
// ═══════════════════════════════════════════════════════════════════════════════

/** 图标选项列表（用于下拉选择） */
export const ICON_LIST = [
  { value: '📘', label: '📘 书籍' },
  { value: '📖', label: '📖 阅读' },
  { value: '📝', label: '📝 笔记' },
  { value: '📄', label: '📄 文档' },
  { value: '📚', label: '📚 教程' },
  { value: '📂', label: '📂 目录' },
  { value: '📁', label: '📁 文件夹' },
  { value: '🗃️', label: '🗃️ 数据库' },
  { value: '📊', label: '📊 图表' },
  { value: '📈', label: '📈 趋势' },
  { value: '🟢', label: '🟢 状态' },
  { value: '✅', label: '✅ 完成' },
  { value: '🎯', label: '🎯 目标' },
  { value: '⭐', label: '⭐ 收藏' },
  { value: '🔗', label: '🔗 链接' },
  { value: '🌐', label: '🌐 网络' },
  { value: '💻', label: '💻 代码' },
  { value: '🖥️', label: '🖥️ 终端' },
  { value: '⚙️', label: '⚙️ 设置' },
  { value: '🛠️', label: '🛠️ 工具' },
  { value: '🔧', label: '🔧 配置' },
  { value: '🚀', label: '🚀 启动' },
  { value: '💡', label: '💡 提示' },
  { value: '🎨', label: '🎨 设计' },
  { value: '🔥', label: '🔥 热门' },
  { value: '⚡', label: '⚡ 快速' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 节点类型配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 节点类型选项 */
export const NODE_TYPE_OPTIONS: { value: NodeType; label: string; desc: string }[] = [
  { value: 'branch', label: '分支节点', desc: '分类目录，可包含子节点' },
  { value: 'leaf', label: '叶子节点', desc: '知识点，可关联 MD 文件' },
  { value: 'link', label: '链接节点', desc: '外部链接资源' },
  { value: 'sub', label: '子节点', desc: '细分的知识点' },
];

/** 节点类型与图标映射 */
export const NODE_TYPE_ICONS: Record<NodeType, string> = NODE_ICONS;

// ═══════════════════════════════════════════════════════════════════════════════
// 节点样式配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 节点样式配置
 * 
 * @property size - 节点尺寸 [宽度, 高度]
 * @property fill - 填充颜色
 * @property stroke - 边框颜色
 * @property lineWidth - 边框宽度
 * @property radius - 圆角半径
 * @property shadowColor - 阴影颜色（可选）
 * @property shadowBlur - 阴影模糊度（可选）
 * @property lineDash - 虚线样式（可选）
 */
export const NODE_STYLES = {
  root: {
    size: [220, 70] as [number, number],
    fill: '#1890ff',
    stroke: '#096dd9',
    lineWidth: 3,
    radius: 10,
    shadowColor: 'rgba(24,144,255,.3)',
    shadowBlur: 20,
  },
  branch: {
    size: [130, 40] as [number, number],
    fill: '#e6f7ff',
    stroke: '#1890ff',
    lineWidth: 2,
    radius: 8,
  },
  leaf: {
    size: [160, 36] as [number, number],
    fill: '#f6ffed',
    stroke: '#b7eb8f',
    lineWidth: 1.5,
    radius: 17,
  },
  link: {
    size: [150, 30] as [number, number],
    fill: '#fffbe6',
    stroke: '#ffe58f',
    lineWidth: 1.5,
    radius: 14,
    lineDash: [4, 2],
  },
  sub: {
    size: [120, 26] as [number, number],
    fill: '#f0f5ff',
    stroke: '#adc6ff',
    lineWidth: 1,
    radius: 12,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 文本配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 文本样式配置 */
export const TEXT_STYLES = {
  root: {
    fontSize: 17,
    fontSizeSecondary: 14,
    fontWeight: 'bold' as const,
    fontWeightSecondary: 'normal' as const,
    fill: '#fff',
  },
  branch: {
    fontSize: 12.5,
    fontWeight: '600' as const,
    fill: '#0050b3',
  },
  leaf: {
    fontSize: 11.5,
    fill: '#389e0d',
  },
  link: {
    fontSize: 10,
    fill: '#ad6800',
  },
  sub: {
    fontSize: 10,
    fill: '#2f54eb',
  },
  toggle: {
    fontSize: 14,
    fontSizeLink: 13,
    fontWeight: 'bold' as const,
  },
  icon: {
    fontSize: 13,
    fontSizeLink: 10,
    fontSizeLinkIcon: 10,
  },
};

/** 文本截断配置 */
export const TEXT_TRUNCATE = {
  maxLength: {
    root: 30,
    branch: 12,
    leaf: 14,
    link: 14,
    sub: 14,
  },
  ellipsis: '...',
  ellipsisDouble: '..',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 布局配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 节点布局配置 */
export const LAYOUT_CONFIG = {
  type: 'compactBox',
  direction: 'LR' as const,
  nodeHeight: 30,
  nodeWidth: 80,
  vGap: 20,
  hGap: 55,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 交互配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 缩放配置 */
export const ZOOM_CONFIG = {
  minZoom: 0.08,
  maxZoom: 25,
  sensitivity: 2,
  levels: {
    root: 1.0,
    branch: 2.0,
    leaf: 2.8,
    link: 2.8,
    sub: 3.5,
  },
};

/** 动画配置 */
export const ANIMATION_CONFIG = {
  duration: 300,
  easing: 'easeCubic' as const,
  focusDuration: 400,
  zoomDuration: 250,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 边配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 边样式配置 */
export const EDGE_STYLES = {
  type: 'cubic-horizontal',
  style: {
    stroke: '#c6c6c6',
    lineWidth: 1.2,
    endArrow: {
      size: [4, 6],
      fill: '#c6c6c6',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 颜色配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 颜色配置 */
export const COLORS = {
  primary: '#1890ff',
  primaryDark: '#096dd9',
  primaryLight: '#e6f7ff',
  success: '#52c41a',
  successLight: '#f6ffed',
  warning: '#fa8c16',
  warningLight: '#fffbe6',
  link: '#597ef7',
  linkLight: '#f0f5ff',
  textPrimary: '#0050b3',
  textSuccess: '#389e0d',
  textWarning: '#ad6800',
  textLink: '#2f54eb',
  borderSuccess: '#b7eb8f',
  borderWarning: '#ffe58f',
  borderLink: '#adc6ff',
  hoverPrimary: '#40a9ff',
  hoverPrimaryLight: '#bae7ff',
  hoverSuccessLight: '#d9f7be',
  hoverWarningLight: '#fff1b8',
  hoverLinkLight: '#d6e4ff',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 节点元素位置配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 节点内元素位置偏移配置 */
export const ELEMENT_POSITIONS = {
  toggle: {
    offsetX: 10,
    offsetXLink: 8,
  },
  text: {
    offsetX: 12,
    offsetXToggle: 28,
    offsetXLink: 26,
    offsetXLinkToggle: 42,
  },
  icon: {
    offsetX: 15,
    offsetXLink: 8,
    offsetXToggle: 24,
    offsetDetail: -18,
    offsetDetailLink: -20,
  },
};
