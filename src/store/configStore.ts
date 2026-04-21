/**
 * 配置状态管理 Store
 * 
 * 使用 zustand 管理所有可配置的参数
 * 常量作为初始状态，可通过 UI 动态修改
 */

import { create } from 'zustand';
import {
  NODE_STYLES,
  TEXT_STYLES,
  TEXT_TRUNCATE,
  LAYOUT_CONFIG,
  ZOOM_CONFIG,
  ANIMATION_CONFIG,
  EDGE_STYLES,
  COLORS,
  ELEMENT_POSITIONS,
} from '../core/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 单个节点样式配置 */
export interface NodeStyleConfig {
  size: [number, number];
  fill: string;
  stroke: string;
  lineWidth: number;
  radius: number;
  shadowColor?: string;
  shadowBlur?: number;
  lineDash?: number[];
}

/** 文本样式配置 */
export interface TextStyleConfig {
  fontSize: number;
  fontSizeSecondary?: number;
  fontWeight: string;
  fontWeightSecondary?: string;
  fill: string;
}

/** 布局配置 */
export interface LayoutConfigType {
  type: string;
  direction: string;
  nodeHeight: number;
  nodeWidth: number;
  vGap: number;
  hGap: number;
}

/** 缩放配置 */
export interface ZoomConfigType {
  minZoom: number;
  maxZoom: number;
  sensitivity: number;
  levels: {
    root: number;
    branch: number;
    leaf: number;
    link: number;
    sub: number;
  };
}

/** 动画配置 */
export interface AnimationConfigType {
  duration: number;
  easing: string;
  focusDuration: number;
  zoomDuration: number;
}

/** 边样式配置 */
export interface EdgeStyleConfig {
  type: string;
  style: {
    stroke: string;
    lineWidth: number;
    endArrow: {
      size: [number, number];
      fill: string;
    };
  };
}

/** 颜色配置 */
export interface ColorsConfig {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  link: string;
  linkLight: string;
  textPrimary: string;
  textSuccess: string;
  textWarning: string;
  textLink: string;
  borderSuccess: string;
  borderWarning: string;
  borderLink: string;
  hoverPrimary: string;
  hoverPrimaryLight: string;
  hoverSuccessLight: string;
  hoverWarningLight: string;
  hoverLinkLight: string;
}

/** 元素位置配置 */
export interface ElementPositionsConfig {
  toggle: {
    offsetX: number;
    offsetXLink: number;
  };
  text: {
    offsetX: number;
    offsetXToggle: number;
    offsetXLink: number;
    offsetXLinkToggle: number;
  };
  icon: {
    offsetX: number;
    offsetXLink: number;
    offsetXToggle: number;
    offsetDetail: number;
    offsetDetailLink: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 状态接口
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfigState {
  // ── 配置数据 ──
  /** 节点样式配置 */
  nodeStyles: {
    root: NodeStyleConfig;
    branch: NodeStyleConfig;
    leaf: NodeStyleConfig;
    link: NodeStyleConfig;
    sub: NodeStyleConfig;
  };
  
  /** 文本样式配置 */
  textStyles: {
    root: TextStyleConfig;
    branch: TextStyleConfig;
    leaf: TextStyleConfig;
    link: TextStyleConfig;
    sub: TextStyleConfig;
    toggle: {
      fontSize: number;
      fontSizeLink: number;
      fontWeight: string;
    };
    icon: {
      fontSize: number;
      fontSizeLink: number;
      fontSizeLinkIcon: number;
    };
  };
  
  /** 文本截断配置 */
  textTruncate: {
    maxLength: {
      root: number;
      branch: number;
      leaf: number;
      link: number;
      sub: number;
    };
    ellipsis: string;
    ellipsisDouble: string;
  };
  
  /** 布局配置 */
  layout: LayoutConfigType;
  
  /** 缩放配置 */
  zoom: ZoomConfigType;
  
  /** 动画配置 */
  animation: AnimationConfigType;
  
  /** 边样式配置 */
  edge: EdgeStyleConfig;
  
  /** 颜色配置 */
  colors: ColorsConfig;
  
  /** 元素位置配置 */
  elementPositions: ElementPositionsConfig;
  
  // ── 配置栏状态 ──
  /** 配置栏是否展开 */
  panelExpanded: boolean;
  
  // ── 操作方法 ──
  /** 更新节点样式 */
  updateNodeStyle: (type: keyof ConfigState['nodeStyles'], config: Partial<NodeStyleConfig>) => void;
  
  /** 更新文本样式 */
  updateTextStyle: (type: keyof ConfigState['textStyles'], config: Partial<TextStyleConfig>) => void;
  
  /** 更新布局配置 */
  updateLayout: (config: Partial<LayoutConfigType>) => void;
  
  /** 更新缩放配置 */
  updateZoom: (config: Partial<ZoomConfigType>) => void;
  
  /** 更新动画配置 */
  updateAnimation: (config: Partial<AnimationConfigType>) => void;
  
  /** 更新边样式 */
  updateEdge: (config: Partial<EdgeStyleConfig>) => void;
  
  /** 更新颜色配置 */
  updateColors: (config: Partial<ColorsConfig>) => void;
  
  /** 重置所有配置为默认值 */
  resetAll: () => void;
  
  /** 切换配置栏展开状态 */
  togglePanel: () => void;
  
  /** 设置配置栏展开状态 */
  setPanelExpanded: (expanded: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 初始状态（从常量导入）
// ═══════════════════════════════════════════════════════════════════════════════

const initialState = {
  nodeStyles: { ...NODE_STYLES },
  textStyles: { ...TEXT_STYLES },
  textTruncate: { ...TEXT_TRUNCATE },
  layout: { ...LAYOUT_CONFIG },
  zoom: { ...ZOOM_CONFIG },
  animation: { ...ANIMATION_CONFIG },
  edge: { ...EDGE_STYLES },
  colors: { ...COLORS },
  elementPositions: { ...ELEMENT_POSITIONS },
  panelExpanded: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 创建 Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useConfigStore = create<ConfigState>((set) => ({
  // 初始状态
  ...initialState,
  
  // 更新节点样式
  updateNodeStyle: (type, config) =>
    set((state) => ({
      nodeStyles: {
        ...state.nodeStyles,
        [type]: { ...state.nodeStyles[type], ...config },
      },
    })),
  
  // 更新文本样式
  updateTextStyle: (type, config) =>
    set((state) => {
      const target = state.textStyles[type as keyof typeof state.textStyles];
      return {
        textStyles: {
          ...state.textStyles,
          [type]: { ...target, ...config },
        },
      };
    }),
  
  // 更新布局配置
  updateLayout: (config) =>
    set((state) => ({
      layout: { ...state.layout, ...config },
    })),
  
  // 更新缩放配置
  updateZoom: (config) =>
    set((state) => ({
      zoom: { ...state.zoom, ...config },
    })),
  
  // 更新动画配置
  updateAnimation: (config) =>
    set((state) => ({
      animation: { ...state.animation, ...config },
    })),
  
  // 更新边样式
  updateEdge: (config) =>
    set((state) => ({
      edge: { ...state.edge, ...config },
    })),
  
  // 更新颜色配置
  updateColors: (config) =>
    set((state) => {
      console.log('[configStore] updateColors 被调用', { 
        oldColors: state.colors, 
        newConfig: config 
      });
      return {
        colors: { ...state.colors, ...config },
      };
    }),
  
  // 重置所有配置
  resetAll: () => set(initialState),
  
  // 切换配置栏
  togglePanel: () => set((state) => ({ panelExpanded: !state.panelExpanded })),
  
  // 设置配置栏展开状态
  setPanelExpanded: (expanded) => set({ panelExpanded: expanded }),
}));
