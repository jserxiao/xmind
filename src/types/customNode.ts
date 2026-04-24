/**
 * 自定义节点类型定义
 */

/** 基础元素类型 */
export type BaseElementType = 'rect' | 'circle' | 'ellipse' | 'text' | 'icon' | 'line';

/** 基础元素配置 */
export interface BaseElement {
  /** 元素唯一 ID */
  id: string;
  /** 元素类型 */
  type: BaseElementType;
  /** X 坐标（相对于节点左上角） */
  x: number;
  /** Y 坐标（相对于节点左上角） */
  y: number;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 填充颜色 */
  fill?: string;
  /** 边框颜色 */
  stroke?: string;
  /** 边框宽度 */
  strokeWidth?: number;
  /** 圆角（仅 rect） */
  radius?: number;
  /** 文本内容（仅 text） */
  text?: string;
  /** 字体大小（仅 text） */
  fontSize?: number;
  /** 字体颜色（仅 text） */
  fontColor?: string;
  /** 图标内容（仅 icon，使用 emoji） */
  icon?: string;
  /** 图标大小（仅 icon） */
  iconSize?: number;
  /** 透明度 */
  opacity?: number;
  /** 旋转角度（度） */
  rotation?: number;
}

/** 自定义节点配置 */
export interface CustomNodeConfig {
  /** 节点 ID */
  id: string;
  /** 节点名称 */
  name: string;
  /** 节点描述 */
  description?: string;
  /** 节点宽度 */
  width: number;
  /** 节点高度 */
  height: number;
  /** 节点默认填充色 */
  defaultFill?: string;
  /** 节点默认边框色 */
  defaultStroke?: string;
  /** 元素列表 */
  elements: BaseElement[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 缩略图（Base64 或 SVG 字符串） */
  thumbnail?: string;
}

/** 自定义节点实例（在思维导图中使用） */
export interface CustomNodeInstance {
  /** 实例 ID */
  id: string;
  /** 引用的自定义节点配置 ID */
  customNodeId: string;
  /** 节点标签 */
  label: string;
  /** 自定义颜色覆盖 */
  customFill?: string;
  /** 自定义边框颜色覆盖 */
  customStroke?: string;
}

/** 基础元素模板 */
export interface ElementTemplate {
  type: BaseElementType;
  name: string;
  icon: string;
  defaultProps: Partial<BaseElement>;
}

/** 预设的基础元素模板 */
export const ELEMENT_TEMPLATES: ElementTemplate[] = [
  {
    type: 'rect',
    name: '矩形',
    icon: '◻️',
    defaultProps: {
      width: 60,
      height: 30,
      fill: '#e6f7ff',
      stroke: '#1890ff',
      strokeWidth: 1,
      radius: 4,
    },
  },
  {
    type: 'circle',
    name: '圆形',
    icon: '⚪',
    defaultProps: {
      width: 30,
      height: 30,
      fill: '#f6ffed',
      stroke: '#52c41a',
      strokeWidth: 1,
    },
  },
  {
    type: 'ellipse',
    name: '椭圆',
    icon: '⭕',
    defaultProps: {
      width: 50,
      height: 25,
      fill: '#fffbe6',
      stroke: '#faad14',
      strokeWidth: 1,
    },
  },
  {
    type: 'text',
    name: '文本',
    icon: '📝',
    defaultProps: {
      text: '文本',
      fontSize: 12,
      fontColor: '#262626',
    },
  },
  {
    type: 'icon',
    name: '图标',
    icon: '⭐',
    defaultProps: {
      icon: '⭐',
      iconSize: 16,
    },
  },
  {
    type: 'line',
    name: '线条',
    icon: '➖',
    defaultProps: {
      width: 40,
      height: 1,
      stroke: '#d9d9d9',
      strokeWidth: 1,
    },
  },
];
