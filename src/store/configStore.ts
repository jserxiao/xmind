/**
 * 配置状态管理 Store
 * 
 * 使用 zustand 管理所有可配置的参数
 * 支持按思维导图 ID 分别存储配置
 * 
 * 性能优化：使用 immer 中间件消除不可变深拷贝开销
 * - immer 允许直接 mutable 修改 draft，自动生成不可变新状态
 * - 避免了 updateColors 等方法中多层嵌套展开运算符的深拷贝开销
 * - persist 按 roadmap ID 拆分存储，避免全量写入
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useRoadmapStore } from './roadmapStore';
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
} from '../constants';

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
  fontWeight?: string;
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
      size: number[];
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

/** 单个思维导图的配置 */
export interface RoadmapConfig {
  nodeStyles: {
    root: NodeStyleConfig;
    branch: NodeStyleConfig;
    leaf: NodeStyleConfig;
    link: NodeStyleConfig;
    sub: NodeStyleConfig;
  };
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
  layout: LayoutConfigType;
  zoom: ZoomConfigType;
  animation: AnimationConfigType;
  edge: EdgeStyleConfig;
  colors: ColorsConfig;
  elementPositions: ElementPositionsConfig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 初始状态（从常量导入）
// ═══════════════════════════════════════════════════════════════════════════════

export const defaultConfig: RoadmapConfig = {
  nodeStyles: { ...NODE_STYLES },
  textStyles: { ...TEXT_STYLES },
  textTruncate: { ...TEXT_TRUNCATE },
  layout: { ...LAYOUT_CONFIG },
  zoom: { ...ZOOM_CONFIG },
  animation: { ...ANIMATION_CONFIG },
  edge: { ...EDGE_STYLES },
  colors: { ...COLORS },
  elementPositions: { ...ELEMENT_POSITIONS },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Store 状态接口
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfigState {
  // ── 按思维导图存储的配置 ──
  /** 各思维导图的配置映射 { [roadmapId]: RoadmapConfig } */
  configs: Record<string, RoadmapConfig>;
  
  // ── 配置栏状态 ──
  /** 配置栏是否展开 */
  panelExpanded: boolean;
  
  /** 配置更新时间戳，用于触发组件重新渲染 */
  configVersion: number;
  
  // ── 操作方法 ──
  /** 获取当前思维导图的配置 */
  getCurrentConfig: () => RoadmapConfig;
  
  /** 更新当前思维导图的节点样式 */
  updateNodeStyle: (type: keyof RoadmapConfig['nodeStyles'], config: Partial<NodeStyleConfig>) => void;
  
  /** 更新当前思维导图的文本样式 */
  updateTextStyle: (type: keyof RoadmapConfig['textStyles'], config: Partial<TextStyleConfig>) => void;
  
  /** 更新当前思维导图的布局配置 */
  updateLayout: (config: Partial<LayoutConfigType>) => void;
  
  /** 更新当前思维导图的缩放配置 */
  updateZoom: (config: Partial<ZoomConfigType>) => void;
  
  /** 更新当前思维导图的动画配置 */
  updateAnimation: (config: Partial<AnimationConfigType>) => void;
  
  /** 更新当前思维导图的边样式 */
  updateEdge: (config: Partial<EdgeStyleConfig>) => void;
  
  /** 更新当前思维导图的颜色配置 */
  updateColors: (config: Partial<ColorsConfig>) => void;
  
  /** 重置当前思维导图的所有配置为默认值 */
  resetCurrentConfig: () => void;
  
  /** 切换配置栏展开状态 */
  togglePanel: () => void;
  
  /** 设置配置栏展开状态 */
  setPanelExpanded: (expanded: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数：颜色处理
// ═══════════════════════════════════════════════════════════════════════════════

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return '#' 
    + (0x1000000 
      + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 
      + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 
      + (B < 255 ? (B < 1 ? 0 : B) : 255))
      .toString(16)
      .slice(1);
}

function generateLightColor(hex: string): string {
  return adjustColorBrightness(hex, 85);
}

function generateBorderColor(hex: string): string {
  return adjustColorBrightness(hex, 25);
}

function generateTextColor(hex: string): string {
  return adjustColorBrightness(hex, -30);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数：确保配置存在
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 在 immer draft 中确保指定 roadmapId 的配置存在
 * 如果不存在，则基于 defaultConfig 初始化
 */
function ensureConfigExists(draft: Record<string, RoadmapConfig>, roadmapId: string): RoadmapConfig {
  if (!draft[roadmapId]) {
    draft[roadmapId] = JSON.parse(JSON.stringify(defaultConfig));
  }
  return draft[roadmapId];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 创建 Store（使用 immer 中间件优化深拷贝）
// ═══════════════════════════════════════════════════════════════════════════════

export const useConfigStore = create<ConfigState>()(
  immer(
    persist(
      (set, get) => ({
        configs: {},
        panelExpanded: true,
        configVersion: 0,

        getCurrentConfig: () => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) {
            return defaultConfig;
          }
          return get().configs[currentRoadmapId] || defaultConfig;
        },

        updateNodeStyle: (type, config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            Object.assign(currentConfig.nodeStyles[type], config);
          });
        },

        updateTextStyle: (type, config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            const target = currentConfig.textStyles[type as keyof typeof currentConfig.textStyles];
            if (target && typeof target === 'object') {
              Object.assign(target, config);
            }
          });
        },

        updateLayout: (config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            state.configVersion += 1;
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            Object.assign(currentConfig.layout, config);
          });
        },

        updateZoom: (config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            Object.assign(currentConfig.zoom, config);
          });
        },

        updateAnimation: (config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            Object.assign(currentConfig.animation, config);
          });
        },

        updateEdge: (config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            if (config.type !== undefined) currentConfig.edge.type = config.type;
            if (config.style) {
              Object.assign(currentConfig.edge.style, config.style);
            }
          });
        },

        updateColors: (config) => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            const currentConfig = ensureConfigExists(state.configs, currentRoadmapId);
            // 先合并颜色更新
            Object.assign(currentConfig.colors, config);
            
            // 主色调变化 → 联动更新 nodeStyles 和 textStyles
            if (config.primary !== undefined || config.primaryDark !== undefined || config.primaryLight !== undefined) {
              if (config.primary !== undefined) {
                currentConfig.colors.primaryDark = currentConfig.colors.primaryDark || adjustColorBrightness(config.primary, -15);
                currentConfig.colors.primaryLight = currentConfig.colors.primaryLight || generateLightColor(config.primary);
                currentConfig.colors.hoverPrimary = adjustColorBrightness(config.primary, 10);
                currentConfig.colors.hoverPrimaryLight = adjustColorBrightness(currentConfig.colors.primaryLight, 5);
                currentConfig.colors.textPrimary = generateTextColor(config.primary);
              }
              
              currentConfig.nodeStyles.root.fill = currentConfig.colors.primary;
              currentConfig.nodeStyles.root.stroke = currentConfig.colors.primaryDark;
              currentConfig.nodeStyles.root.shadowColor = `rgba(${parseInt(currentConfig.colors.primary.slice(1, 3), 16)}, ${parseInt(currentConfig.colors.primary.slice(3, 5), 16)}, ${parseInt(currentConfig.colors.primary.slice(5, 7), 16)}, 0.3)`;
              
              currentConfig.nodeStyles.branch.fill = currentConfig.colors.primaryLight;
              currentConfig.nodeStyles.branch.stroke = currentConfig.colors.primary;
              
              currentConfig.textStyles.branch.fill = currentConfig.colors.textPrimary;
            }
            
            // 成功色变化
            if (config.success !== undefined) {
              currentConfig.colors.successLight = generateLightColor(config.success);
              currentConfig.colors.borderSuccess = generateBorderColor(config.success);
              currentConfig.colors.hoverSuccessLight = adjustColorBrightness(currentConfig.colors.successLight, 5);
              currentConfig.colors.textSuccess = generateTextColor(config.success);
              
              currentConfig.nodeStyles.leaf.fill = currentConfig.colors.successLight;
              currentConfig.nodeStyles.leaf.stroke = currentConfig.colors.borderSuccess;
              
              currentConfig.textStyles.leaf.fill = currentConfig.colors.textSuccess;
            }
            
            // 警告色变化
            if (config.warning !== undefined) {
              currentConfig.colors.warningLight = generateLightColor(config.warning);
              currentConfig.colors.borderWarning = generateBorderColor(config.warning);
              currentConfig.colors.hoverWarningLight = adjustColorBrightness(currentConfig.colors.warningLight, 5);
              currentConfig.colors.textWarning = generateTextColor(config.warning);
              
              currentConfig.nodeStyles.link.fill = currentConfig.colors.warningLight;
              currentConfig.nodeStyles.link.stroke = currentConfig.colors.borderWarning;
              
              currentConfig.textStyles.link.fill = currentConfig.colors.textWarning;
            }
            
            // 链接色变化
            if (config.link !== undefined) {
              currentConfig.colors.linkLight = generateLightColor(config.link);
              currentConfig.colors.borderLink = generateBorderColor(config.link);
              currentConfig.colors.hoverLinkLight = adjustColorBrightness(currentConfig.colors.linkLight, 5);
              currentConfig.colors.textLink = generateTextColor(config.link);
              
              currentConfig.nodeStyles.sub.fill = currentConfig.colors.linkLight;
              currentConfig.nodeStyles.sub.stroke = currentConfig.colors.borderLink;
              
              currentConfig.textStyles.sub.fill = currentConfig.colors.textLink;
            }
          });
        },

        resetCurrentConfig: () => {
          const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
          if (!currentRoadmapId) return;
          
          set((state) => {
            state.configs[currentRoadmapId] = JSON.parse(JSON.stringify(defaultConfig));
          });
        },

        togglePanel: () => set((state) => { state.panelExpanded = !state.panelExpanded; }),

        setPanelExpanded: (expanded) => set((state) => { state.panelExpanded = expanded; }),
      }),
      {
        name: 'roadmap-config-storage',
        partialize: (state) => ({
          configs: state.configs,
          panelExpanded: state.panelExpanded,
        }),
      }
    )
  )
);
