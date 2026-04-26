/**
 * AI Prompt 工具
 * 
 * 构建和解析 AI 生成的提示词
 */

import type { AIGenerateRequest, GeneratedNode } from '../types/ai';

// ═══════════════════════════════════════════════════════════════════════════════
// Prompt 构建
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 构建生成节点的 Prompt
 */
export function buildGeneratePrompt(request: AIGenerateRequest): string {
  const { parentNode, context, userPrompt, count, roadmapTheme } = request;
  
  // 构建上下文路径
  const contextPath = context.length > 0 
    ? `知识路径：${context.join(' → ')}\n` 
    : '';
  
  // 用户额外要求
  const userRequirement = userPrompt 
    ? `\n用户额外要求：${userPrompt}` 
    : '';

  // 层级深度提示
  const depthHint = getDepthHint(context.length);

  const countInstruction = count
    ? `请为以下知识点生成 ${count} 个子节点。`
    : `请为以下知识点生成合适数量的子节点（根据知识领域的复杂度，建议 3-8 个）。`;

  return `你是一个专业的知识图谱构建助手。${countInstruction}

## 当前思维导图主题
${roadmapTheme}

## 父节点信息
- 名称：${parentNode.label}
- 类型：${parentNode.type}
${parentNode.description ? `- 描述：${parentNode.description}` : ''}
${parentNode.mdPath ? `- 关联文件：${parentNode.mdPath}` : ''}

## 上下文
${contextPath}当前节点是第 ${context.length + 2} 层级（根节点为第1层）
${depthHint}
${userRequirement}

## 生成要求
1. ${countInstruction}
2. 每个节点应该是父节点的细分知识领域
2. 节点命名要简洁清晰（2-10个字），避免重复父节点信息
3. 节点类型判断：
   - 如果当前层级 < 4，生成的子节点类型应为 "branch"
   - 如果当前层级 >= 4，生成的子节点类型应为 "leaf"
4. 如果是技术类知识，可以建议关联的 Markdown 文件路径（相对路径，如 "basic-features/variables"）
5. 提供简短的生成理由（帮助用户理解）

## 输出格式（严格 JSON）
请直接输出以下格式的 JSON，不要有任何其他文字或解释：

{
  "nodes": [
    {
      "label": "节点名称",
      "type": "branch 或 leaf",
      "description": "可选的简短描述",
      "mdPath": "可选的关联文件路径",
      "reasoning": "简短的生成理由"
    }
  ]
}`;
}

/**
 * 根据深度获取提示
 */
function getDepthHint(depth: number): string {
  if (depth === 0) {
    return '提示：这是根节点的子节点，应该是最主要的知识分支。';
  }
  if (depth === 1) {
    return '提示：这是第二层节点，应该细分知识领域的主要方向。';
  }
  if (depth === 2) {
    return '提示：这是第三层节点，可以是具体的知识点或更细的分类。';
  }
  if (depth >= 3) {
    return '提示：这是较深层节点，应该是具体知识点或实例。';
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 响应解析
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 解析 AI 响应
 */
export function parseAIResponse(response: unknown): GeneratedNode[] {
  try {
    // 提取内容字符串
    let content: string;
    
    // OpenAI 格式
    if (isOpenAIResponse(response)) {
      content = response.choices[0].message.content;
    }
    // Anthropic 格式
    else if (isAnthropicResponse(response)) {
      content = response.content[0].text;
    }
    // 直接字符串
    else if (typeof response === 'string') {
      content = response;
    }
    else {
      throw new Error('无法识别的响应格式');
    }

    // 提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AI] 未找到 JSON，原始内容:', content);
      throw new Error('未找到有效的 JSON 响应');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed.nodes)) {
      throw new Error('响应中缺少 nodes 数组');
    }

    // 为每个节点生成唯一 ID 并设置默认选中
    return parsed.nodes.map((node: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      label: node.label?.trim() || `节点 ${index + 1}`,
      type: node.type === 'branch' ? 'branch' : 'leaf',
      description: node.description?.trim(),
      mdPath: node.mdPath?.trim(),
      reasoning: node.reasoning?.trim(),
      selected: true, // 默认选中
    }));
  } catch (error) {
    console.error('[AI] 解析响应失败:', error);
    return [];
  }
}

/**
 * 判断是否为 OpenAI 响应格式
 */
function isOpenAIResponse(response: any): response is OpenAIResponse {
  return (
    response &&
    Array.isArray(response.choices) &&
    response.choices[0]?.message?.content
  );
}

/**
 * 判断是否为 Anthropic 响应格式
 */
function isAnthropicResponse(response: any): response is AnthropicResponse {
  return (
    response &&
    Array.isArray(response.content) &&
    response.content[0]?.text
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从响应中提取 Token 使用量
 */
export function extractTokenUsage(response: unknown): {
  prompt: number;
  completion: number;
  total: number;
} | null {
  if (!response || typeof response !== 'object') return null;

  const r = response as any;

  // OpenAI 格式
  if (r.usage?.prompt_tokens !== undefined) {
    return {
      prompt: r.usage.prompt_tokens,
      completion: r.usage.completion_tokens || 0,
      total: r.usage.total_tokens || r.usage.prompt_tokens + (r.usage.completion_tokens || 0),
    };
  }

  // Anthropic 格式
  if (r.usage?.input_tokens !== undefined) {
    return {
      prompt: r.usage.input_tokens,
      completion: r.usage.output_tokens || 0,
      total: r.usage.input_tokens + (r.usage.output_tokens || 0),
    };
  }

  return null;
}
