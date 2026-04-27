/**
 * AI 服务层
 * 
 * 封装不同 AI 提供商的 API 调用
 * 支持 OpenAI、Anthropic、DeepSeek 等
 */

import type { AIConfig, AIGenerateRequest, AIGenerateResponse } from '../types/ai';
import { buildGeneratePrompt, parseAIResponse, extractTokenUsage } from '../utils/aiPrompts';

// ═══════════════════════════════════════════════════════════════════════════════
// API 端点配置
// ═══════════════════════════════════════════════════════════════════════════════

const API_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI 服务类
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI 服务类
 * 处理与不同 AI 提供商的通信
 */
export class AIService {
  private config: AIConfig;
  private abortController: AbortController | null = null;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: AIConfig): void {
    this.config = config;
  }

  /**
   * 取消当前正在进行的请求
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 生成子节点
   */
  async generateNodes(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    try {
      // 取消之前的请求
      this.cancel();
      this.abortController = new AbortController();

      const prompt = buildGeneratePrompt(request);
      const response = await this.callAI(prompt, this.abortController.signal);
      const nodes = parseAIResponse(response);
      const usage = extractTokenUsage(response);

      if (nodes.length === 0) {
        return {
          success: false,
          nodes: [],
          error: 'AI 未能生成有效的节点，请重试或调整要求',
        };
      }

      return {
        success: true,
        nodes,
        usage: usage ? {
          promptTokens: usage.prompt,
          completionTokens: usage.completion,
          totalTokens: usage.total,
        } : undefined,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, nodes: [], error: '请求已取消' };
      }
      console.error('[AI] 生成失败:', error);
      return {
        success: false,
        nodes: [],
        error: error instanceof Error ? error.message : '生成失败，请检查网络连接',
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 调用 AI API
   */
  private async callAI(prompt: string, signal?: AbortSignal): Promise<unknown> {
    const { provider, baseUrl } = this.config;

    const url = baseUrl || API_ENDPOINTS[provider];

    if (!url) {
      throw new Error('请配置 API 地址');
    }

    if (['openai', 'deepseek', 'custom'].includes(provider)) {
      return this.callOpenAICompatible(url, prompt, signal);
    }

    if (provider === 'anthropic') {
      return this.callAnthropic(url, prompt, signal);
    }

    throw new Error(`不支持的 AI 提供商: ${provider}`);
  }

  /**
   * OpenAI 兼容 API 调用
   */
  private async callOpenAICompatible(url: string, prompt: string, signal?: AbortSignal): Promise<unknown> {
    const { apiKey, model, maxTokens, temperature } = this.config;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的知识图谱构建助手，擅长分析和组织知识结构。请严格按照用户要求的 JSON 格式输出，不要添加任何额外的文字或解释。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API 错误: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Anthropic API 调用
   */
  private async callAnthropic(url: string, prompt: string, signal?: AbortSignal): Promise<unknown> {
    const { apiKey, model, maxTokens, temperature } = this.config;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: '你是一个专业的知识图谱构建助手，擅长分析和组织知识结构。请严格按照用户要求的 JSON 格式输出，不要添加任何额外的文字或解释。',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API 错误: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.cancel();
      this.abortController = new AbortController();

      const response = await this.callAI(
        '请回复"连接成功"三个字，不要有其他内容。',
        this.abortController.signal
      );

      if (response) {
        return { success: true, message: 'API 连接正常' };
      }

      return { success: false, message: 'API 响应异常' };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, message: '测试已取消' };
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接失败',
      };
    } finally {
      this.abortController = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 单例管理
// ═══════════════════════════════════════════════════════════════════════════════

let aiServiceInstance: AIService | null = null;

/**
 * 获取 AI 服务实例
 */
export function getAIService(config?: AIConfig): AIService | null {
  if (config) {
    aiServiceInstance = new AIService(config);
  }
  return aiServiceInstance;
}

/**
 * 初始化 AI 服务
 */
export function initAIService(config: AIConfig): AIService {
  aiServiceInstance = new AIService(config);
  return aiServiceInstance;
}

/**
 * 检查 AI 服务是否可用
 */
export function isAIServiceAvailable(): boolean {
  return aiServiceInstance !== null;
}
