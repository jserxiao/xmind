/**
 * 水印配置 Store
 * 
 * 管理思维导图的水印设置
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 水印配置 */
export interface WatermarkConfig {
  /** 是否启用水印 */
  enabled: boolean;
  /** 水印内容 */
  content: string;
  /** 水印字体大小 */
  fontSize: number;
  /** 水印颜色 */
  color: string;
  /** 水印透明度 */
  opacity: number;
  /** 水印旋转角度 */
  rotate: number;
  /** 水印水平间距 */
  gapX: number;
  /** 水印垂直间距 */
  gapY: number;
  /** 水印字体 */
  fontFamily: string;
}

/** 默认水印配置 */
export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: false,
  content: '思维导图',
  fontSize: 16,
  color: '#999999',
  opacity: 0.15,
  rotate: -20,
  gapX: 100,
  gapY: 100,
  fontFamily: 'Microsoft YaHei, sans-serif',
};

interface WatermarkStore {
  /** 水印配置 */
  config: WatermarkConfig;
  /** 更新水印配置 */
  updateConfig: (config: Partial<WatermarkConfig>) => void;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 切换水印开关 */
  toggleEnabled: () => void;
}

export const useWatermarkStore = create<WatermarkStore>()(
  persist(
    (set) => ({
      config: DEFAULT_WATERMARK_CONFIG,
      
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },
      
      resetConfig: () => {
        set({ config: DEFAULT_WATERMARK_CONFIG });
      },
      
      toggleEnabled: () => {
        set((state) => ({
          config: { ...state.config, enabled: !state.config.enabled },
        }));
      },
    }),
    {
      name: 'mindmap-watermark',
    }
  )
);
