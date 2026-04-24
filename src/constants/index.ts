/**
 * 常量定义
 * 
 * 集中管理应用中使用的所有常量
 */

import type { NodeType } from '../store/nodeEditorStore';

// 导出图标常量
export { EMOJI, NODE_ICONS } from './icons';
import { NODE_ICONS } from './icons';

// ═══════════════════════════════════════════════════════════════════════════════
// 预设图标列表
// ═══════════════════════════════════════════════════════════════════════════════

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
// 节点类型选项
// ═══════════════════════════════════════════════════════════════════════════════

export const NODE_TYPE_OPTIONS: { value: NodeType; label: string; desc: string }[] = [
  { value: 'branch', label: '分支节点', desc: '分类目录，可包含子节点' },
  { value: 'leaf', label: '叶子节点', desc: '知识点，可关联 MD 文件' },
  { value: 'link', label: '链接节点', desc: '外部链接资源' },
  { value: 'sub', label: '子节点', desc: '细分的知识点' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 节点类型与图标映射
// ═══════════════════════════════════════════════════════════════════════════════

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
  // 根节点样式 - 蓝色主题，大尺寸
  root: {
    size: [220, 70] as [number, number],
    fill: '#1890ff',
    stroke: '#096dd9',
    lineWidth: 3,
    radius: 10,
    shadowColor: 'rgba(24,144,255,.3)',
    shadowBlur: 20,
  },
  
  // 分支节点样式 - 浅蓝色背景
  branch: {
    size: [130, 40] as [number, number],
    fill: '#e6f7ff',
    stroke: '#1890ff',
    lineWidth: 2,
    radius: 8,
  },
  
  // 叶子节点样式 - 绿色胶囊形
  leaf: {
    size: [160, 36] as [number, number],
    fill: '#f6ffed',
    stroke: '#b7eb8f',
    lineWidth: 1.5,
    radius: 17,
  },
  
  // 链接节点样式 - 黄色虚线边框
  link: {
    size: [150, 30] as [number, number],
    fill: '#fffbe6',
    stroke: '#ffe58f',
    lineWidth: 1.5,
    radius: 14,
    lineDash: [4, 2],
  },
  
  // 子节点样式 - 小尺寸浅蓝色
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

/**
 * 文本样式配置
 */
export const TEXT_STYLES = {
  // 根节点文本
  root: {
    fontSize: 17,
    fontSizeSecondary: 14,
    fontWeight: 'bold' as const,
    fontWeightSecondary: 'normal' as const,
    fill: '#fff',
  },
  
  // 分支节点文本
  branch: {
    fontSize: 12.5,
    fontWeight: '600' as const,
    fill: '#0050b3',
  },
  
  // 叶子节点文本
  leaf: {
    fontSize: 11.5,
    fill: '#389e0d',
  },
  
  // 链接节点文本
  link: {
    fontSize: 10,
    fill: '#ad6800',
  },
  
  // 子节点文本
  sub: {
    fontSize: 10,
    fill: '#2f54eb',
  },
  
  // 展开/收起按钮
  toggle: {
    fontSize: 14,
    fontSizeLink: 13, // 链接节点使用较小字号
    fontWeight: 'bold' as const,
  },
  
  // 图标
  icon: {
    fontSize: 13,
    fontSizeLink: 10, // 链接节点使用较小字号
    fontSizeLinkIcon: 10, // 链接图标字号
  },
};

/**
 * 文本截断配置
 * 超过最大长度的文本将被截断并显示省略号
 */
export const TEXT_TRUNCATE = {
  // 各节点类型的最大标签长度
  maxLength: {
    root: 30,
    branch: 12,
    leaf: 14,
    link: 14,
    sub: 14,
  },
  
  // 省略号后缀
  ellipsis: '...',
  ellipsisDouble: '..', // 双点后缀（用于链接节点）
};

// ═══════════════════════════════════════════════════════════════════════════════
// 布局配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 节点布局配置
 */
export const LAYOUT_CONFIG = {
  // 布局类型
  type: 'compactBox',
  
  // 布局方向：LR = 从左到右
  direction: 'LR' as const,
  
  // 节点高度（布局计算用）
  nodeHeight: 30,
  
  // 节点宽度（布局计算用）
  nodeWidth: 80,
  
  // 垂直间距
  vGap: 20,
  
  // 水平间距
  hGap: 55,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 交互配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 缩放配置
 */
export const ZOOM_CONFIG = {
  // 最小缩放比例
  minZoom: 0.08,
  
  // 最大缩放比例
  maxZoom: 25,
  
  // 缩放灵敏度
  sensitivity: 2,
  
  // 各节点类型聚焦时的缩放比例
  levels: {
    root: 1.0,
    branch: 2.0,
    leaf: 2.8,
    link: 2.8,
    sub: 3.5,
  },
};

/**
 * 动画配置
 */
export const ANIMATION_CONFIG = {
  // 动画持续时间
  duration: 300,
  
  // 缓动函数
  easing: 'easeCubic' as const,
  
  // 聚焦动画持续时间
  focusDuration: 400,
  
  // 缩放动画持续时间
  zoomDuration: 250,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 边配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 边样式配置
 */
export const EDGE_STYLES = {
  // 边类型
  type: 'cubic-horizontal',
  
  // 边样式
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

/**
 * 颜色配置
 */
export const COLORS = {
  // 主色调
  primary: '#1890ff',
  primaryDark: '#096dd9',
  primaryLight: '#e6f7ff',
  
  // 成功色
  success: '#52c41a',
  successLight: '#f6ffed',
  
  // 警告色
  warning: '#fa8c16',
  warningLight: '#fffbe6',
  
  // 链接色
  link: '#597ef7',
  linkLight: '#f0f5ff',
  
  // 文本颜色
  textPrimary: '#0050b3',
  textSuccess: '#389e0d',
  textWarning: '#ad6800',
  textLink: '#2f54eb',
  
  // 边框颜色
  borderSuccess: '#b7eb8f',
  borderWarning: '#ffe58f',
  borderLink: '#adc6ff',
  
  // 悬停状态
  hoverPrimary: '#40a9ff',
  hoverPrimaryLight: '#bae7ff',
  hoverSuccessLight: '#d9f7be',
  hoverWarningLight: '#fff1b8',
  hoverLinkLight: '#d6e4ff',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 节点元素位置配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 节点内元素位置偏移配置
 */
export const ELEMENT_POSITIONS = {
  // 展开/收起按钮位置
  toggle: {
    offsetX: 10, // 距离节点左边缘的偏移
    offsetXLink: 8, // 链接节点的偏移
  },
  
  // 文本位置
  text: {
    offsetX: 12, // 无展开按钮时的偏移
    offsetXToggle: 28, // 有展开按钮时的偏移
    offsetXLink: 26, // 链接节点无展开按钮
    offsetXLinkToggle: 42, // 链接节点有展开按钮
  },
  
  // 图标位置
  icon: {
    offsetX: 15, // 根节点图标偏移
    offsetXLink: 8, // 链接图标偏移
    offsetXToggle: 24, // 有展开按钮时的链接图标偏移
    offsetDetail: -18, // 详情图标距右边缘的偏移
    offsetDetailLink: -20, // 链接节点详情图标偏移
  },
};
