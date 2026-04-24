/**
 * 小地图配置 Store
 * 
 * 管理思维导图的小地图设置
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 小地图配置 */
export interface MinimapConfig {
  /** 是否显示小地图 */
  enabled: boolean;
  /** 小地图宽度 */
  width: number;
  /** 小地图高度 */
  height: number;
  /** 小地图位置 */
  position: 'leftTop' | 'rightTop' | 'leftBottom' | 'rightBottom';
  /** 小地图背景色 */
  backgroundColor: string;
  /** 视口样式 */
  viewportStyle: {
    fill: string;
    stroke: string;
  };
}

/** 默认小地图配置 */
export const DEFAULT_MINIMAP_CONFIG: MinimapConfig = {
  enabled: false,
  width: 200,
  height: 150,
  position: 'rightBottom',
  backgroundColor: '#f5f5f5',
  viewportStyle: {
    fill: 'rgba(24, 144, 255, 0.2)',
    stroke: '#1890ff',
  },
};

interface MinimapStore {
  /** 小地图配置 */
  config: MinimapConfig;
  /** 更新小地图配置 */
  updateConfig: (config: Partial<MinimapConfig>) => void;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 切换小地图开关 */
  toggleEnabled: () => void;
}

export const useMinimapStore = create<MinimapStore>()(
  persist(
    (set) => ({
      config: DEFAULT_MINIMAP_CONFIG,
      
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },
      
      resetConfig: () => {
        set({ config: DEFAULT_MINIMAP_CONFIG });
      },
      
      toggleEnabled: () => {
        set((state) => ({
          config: { ...state.config, enabled: !state.config.enabled },
        }));
      },
    }),
    {
      name: 'mindmap-minimap',
    }
  )
);
