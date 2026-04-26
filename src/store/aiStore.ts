/**
 * AI 配置状态管理 Store
 * 
 * 管理 AI 服务的配置信息
 * 支持 OpenAI、Anthropic、DeepSeek 等多种提供商
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIConfig, AIProvider } from '../types/ai';
import { AI_DEFAULT_CONFIGS } from '../types/ai';

// ═══════════════════════════════════════════════════════════════════════════════
// Store 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface AIStore {
  // ── 配置状态 ──
  /** 当前 AI 配置 */
  config: AIConfig | null;
  /** 是否已配置 */
  isConfigured: boolean;
  
  // ── 运行状态 ──
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 最后的错误信息 */
  lastError: string | null;
  /** 最后一次生成使用的 Token */
  lastTokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
  
  // ── 操作方法 ──
  /** 设置配置 */
  setConfig: (config: AIConfig) => void;
  /** 更新部分配置 */
  updateConfig: (partial: Partial<AIConfig>) => void;
  /** 清除配置 */
  clearConfig: () => void;
  /** 设置生成状态 */
  setGenerating: (generating: boolean) => void;
  /** 设置错误 */
  setError: (error: string | null) => void;
  /** 设置 Token 使用量 */
  setTokenUsage: (usage: { prompt: number; completion: number; total: number } | null) => void;
  /** 切换提供商 */
  switchProvider: (provider: AIProvider) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 实现
// ═══════════════════════════════════════════════════════════════════════════════

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      config: null,
      isConfigured: false,
      isGenerating: false,
      lastError: null,
      lastTokenUsage: null,

      // 设置完整配置
      setConfig: (config) => {
        set({
          config,
          isConfigured: !!config.apiKey,
          lastError: null,
        });
      },

      // 更新部分配置
      updateConfig: (partial) => {
        const { config } = get();
        if (!config) return;
        
        const newConfig = { ...config, ...partial };
        set({
          config: newConfig,
          isConfigured: !!newConfig.apiKey,
        });
      },

      // 清除配置
      clearConfig: () => {
        set({
          config: null,
          isConfigured: false,
          lastError: null,
          lastTokenUsage: null,
        });
      },

      // 设置生成状态
      setGenerating: (generating) => {
        set({ isGenerating: generating });
      },

      // 设置错误
      setError: (error) => {
        set({ lastError: error });
      },

      // 设置 Token 使用量
      setTokenUsage: (usage) => {
        set({ lastTokenUsage: usage });
      },

      // 切换提供商（保留 API Key）
      switchProvider: (provider) => {
        const { config } = get();
        const defaultConfig = AI_DEFAULT_CONFIGS[provider];
        
        const newConfig: AIConfig = {
          ...defaultConfig,
          apiKey: config?.apiKey || '',
          // 如果切换到 custom，保留之前的 baseUrl
          baseUrl: provider === 'custom' ? config?.baseUrl : undefined,
        };
        
        set({
          config: newConfig,
          isConfigured: !!newConfig.apiKey,
        });
      },
    }),
    {
      name: 'ai-config-storage',
      // 只持久化配置信息
      partialize: (state) => ({
        config: state.config,
        isConfigured: state.isConfigured,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// 便捷导出
// ═══════════════════════════════════════════════════════════════════════════════

export { AI_DEFAULT_CONFIGS } from '../types/ai';
