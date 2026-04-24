/**
 * 配置状态管理 Store
 * 
 * 使用 zustand 管理所有可配置的参数
 * 支持按思维导图 ID 分别存储配置
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
// 创建 Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useConfigStore = create<ConfigState>()(
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
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                nodeStyles: {
                  ...currentConfig.nodeStyles,
                  [type]: { ...currentConfig.nodeStyles[type], ...config },
                },
              },
            },
          };
        });
      },

      updateTextStyle: (type, config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          const target = currentConfig.textStyles[type as keyof typeof currentConfig.textStyles];
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                textStyles: {
                  ...currentConfig.textStyles,
                  [type]: { ...target, ...config },
                },
              },
            },
          };
        });
      },

      updateLayout: (config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          return {
            configVersion: state.configVersion + 1,
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                layout: { ...currentConfig.layout, ...config },
              },
            },
          };
        });
      },

      updateZoom: (config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                zoom: { ...currentConfig.zoom, ...config },
              },
            },
          };
        });
      },

      updateAnimation: (config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                animation: { ...currentConfig.animation, ...config },
              },
            },
          };
        });
      },

      updateEdge: (config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                edge: { ...currentConfig.edge, ...config },
              },
            },
          };
        });
      },

      updateColors: (config) => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => {
          const currentConfig = state.configs[currentRoadmapId] || { ...defaultConfig };
          const newColors = { ...currentConfig.colors, ...config };
          const newNodeStyles = { ...currentConfig.nodeStyles };
          const newTextStyles = { ...currentConfig.textStyles };
          
          // 主色调变化
          if (config.primary !== undefined || config.primaryDark !== undefined || config.primaryLight !== undefined) {
            if (config.primary !== undefined) {
              newColors.primaryDark = newColors.primaryDark || adjustColorBrightness(config.primary, -15);
              newColors.primaryLight = newColors.primaryLight || generateLightColor(config.primary);
              newColors.hoverPrimary = adjustColorBrightness(config.primary, 10);
              newColors.hoverPrimaryLight = adjustColorBrightness(newColors.primaryLight, 5);
              newColors.textPrimary = generateTextColor(config.primary);
            }
            
            newNodeStyles.root = {
              ...newNodeStyles.root,
              fill: newColors.primary,
              stroke: newColors.primaryDark,
              shadowColor: `rgba(${parseInt(newColors.primary.slice(1, 3), 16)}, ${parseInt(newColors.primary.slice(3, 5), 16)}, ${parseInt(newColors.primary.slice(5, 7), 16)}, 0.3)`,
            };
            
            newNodeStyles.branch = {
              ...newNodeStyles.branch,
              fill: newColors.primaryLight,
              stroke: newColors.primary,
            };
            
            newTextStyles.branch = {
              ...newTextStyles.branch,
              fill: newColors.textPrimary,
            };
          }
          
          // 成功色变化
          if (config.success !== undefined) {
            newColors.successLight = generateLightColor(config.success);
            newColors.borderSuccess = generateBorderColor(config.success);
            newColors.hoverSuccessLight = adjustColorBrightness(newColors.successLight, 5);
            newColors.textSuccess = generateTextColor(config.success);
            
            newNodeStyles.leaf = {
              ...newNodeStyles.leaf,
              fill: newColors.successLight,
              stroke: newColors.borderSuccess,
            };
            
            newTextStyles.leaf = {
              ...newTextStyles.leaf,
              fill: newColors.textSuccess,
            };
          }
          
          // 警告色变化
          if (config.warning !== undefined) {
            newColors.warningLight = generateLightColor(config.warning);
            newColors.borderWarning = generateBorderColor(config.warning);
            newColors.hoverWarningLight = adjustColorBrightness(newColors.warningLight, 5);
            newColors.textWarning = generateTextColor(config.warning);
            
            newNodeStyles.link = {
              ...newNodeStyles.link,
              fill: newColors.warningLight,
              stroke: newColors.borderWarning,
            };
            
            newTextStyles.link = {
              ...newTextStyles.link,
              fill: newColors.textWarning,
            };
          }
          
          // 链接色变化
          if (config.link !== undefined) {
            newColors.linkLight = generateLightColor(config.link);
            newColors.borderLink = generateBorderColor(config.link);
            newColors.hoverLinkLight = adjustColorBrightness(newColors.linkLight, 5);
            newColors.textLink = generateTextColor(config.link);
            
            newNodeStyles.sub = {
              ...newNodeStyles.sub,
              fill: newColors.linkLight,
              stroke: newColors.borderLink,
            };
            
            newTextStyles.sub = {
              ...newTextStyles.sub,
              fill: newColors.textLink,
            };
          }
          
          return {
            configs: {
              ...state.configs,
              [currentRoadmapId]: {
                ...currentConfig,
                colors: newColors,
                nodeStyles: newNodeStyles,
                textStyles: newTextStyles,
              },
            },
          };
        });
      },

      resetCurrentConfig: () => {
        const currentRoadmapId = useRoadmapStore.getState().currentRoadmapId;
        if (!currentRoadmapId) return;
        
        set((state) => ({
          configs: {
            ...state.configs,
            [currentRoadmapId]: { ...defaultConfig },
          },
        }));
      },

      togglePanel: () => set((state) => ({ panelExpanded: !state.panelExpanded })),

      setPanelExpanded: (expanded) => set({ panelExpanded: expanded }),
    }),
    {
      name: 'roadmap-config-storage',
      partialize: (state) => ({
        configs: state.configs,
        panelExpanded: state.panelExpanded,
      }),
    }
  )
);
