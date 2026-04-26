/**
 * AI 辅助生成功能 - 类型定义
 * 
 * 支持多种 AI 服务提供商
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AI 服务提供商
// ═══════════════════════════════════════════════════════════════════════════════

/** AI 服务提供商类型 */
export type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

/** AI 配置 */
export interface AIConfig {
  /** 服务提供商 */
  provider: AIProvider;
  /** API 密钥 */
  apiKey: string;
  /** 自定义 API 地址（可选） */
  baseUrl?: string;
  /** 模型名称 */
  model: string;
  /** 最大 Token 数 */
  maxTokens: number;
  /** 温度参数（0-2） */
  temperature: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 生成请求与响应
// ═══════════════════════════════════════════════════════════════════════════════

/** 生成请求 */
export interface AIGenerateRequest {
  /** 父节点信息 */
  parentNode: {
    id: string;
    label: string;
    type: string;
    description?: string;
    mdPath?: string;
  };
  /** 上下文信息（祖先节点路径） */
  context: string[];
  /** 用户自定义要求 */
  userPrompt?: string;
  /** 生成数量 */
  count: number;
  /** 思维导图主题 */
  roadmapTheme: string;
}

/** 生成的节点建议 */
export interface GeneratedNode {
  /** 临时 ID（用于前端标识） */
  id: string;
  /** 节点名称 */
  label: string;
  /** 节点类型 */
  type: 'branch' | 'leaf';
  /** 描述 */
  description?: string;
  /** 建议关联的 MD 文件路径 */
  mdPath?: string;
  /** AI 的生成理由 */
  reasoning?: string;
  /** 是否被选中（用于批量操作） */
  selected?: boolean;
}

/** AI 响应 */
export interface AIGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的节点列表 */
  nodes: GeneratedNode[];
  /** Token 使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 错误信息 */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 预设配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 各提供商的默认配置 */
export const AI_DEFAULT_CONFIGS: Record<AIProvider, Omit<AIConfig, 'apiKey'>> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 2000,
    temperature: 0.7,
  },
  deepseek: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    maxTokens: 2000,
    temperature: 0.7,
  },
  custom: {
    provider: 'custom',
    model: '',
    maxTokens: 2000,
    temperature: 0.7,
  },
};

/** 可选的模型列表 */
export const AI_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  custom: [],
};

/** 提供商显示名称 */
export const AI_PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  deepseek: 'DeepSeek (国产)',
  custom: '自定义 API',
};
