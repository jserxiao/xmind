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
  const { parentNode, context, existingChildren, userPrompt, count, roadmapTheme } = request;
  
  // 构建上下文路径
  const contextPath = context.length > 0 
    ? `知识路径：${context.join(' → ')}\n` 
    : '';
  
  // 现有子节点信息
  const existingChildrenInfo = existingChildren && existingChildren.length > 0
    ? `\n## 现有子节点（请勿生成重复或相似内容）\n${existingChildren.map(c => `- ${c.label} (${c.type})`).join('\n')}\n`
    : '';

  // 用户额外要求
  const userRequirement = userPrompt 
    ? `\n用户额外要求：${userPrompt}` 
    : '';

  // 层级深度提示
  const depthHint = getDepthHint(context.length);

  // 同级节点类型建议
  const siblingTypeHint = getSiblingTypeHint(existingChildren);

  // MD 插入位置提示
  const mdInsertHint = parentNode.mdPath
    ? `9. MD 文件处理：
   - 父节点已有 MD 文件「${parentNode.mdPath}」
   - 如果生成的节点适合作为父 MD 文件中的章节，设置 mdInsertPosition 为 "parent"
   - 如果需要创建独立的新 MD 文件，设置 mdInsertPosition 为 "new"
   - 如果不需要 MD 文件（如纯概念节点），设置 mdInsertPosition 为 "none"`
    : `9. MD 文件处理：
   - 父节点没有 MD 文件
   - 如果需要创建 MD 文件，设置 mdInsertPosition 为 "new"
   - 否则设置 mdInsertPosition 为 "none"`;

  const countInstruction = count
    ? `请为以下知识点生成 ${count} 个子节点。`
    : `请为以下知识点生成合适数量的子节点（根据知识领域的复杂度，建议 3-8 个）。`;

  return `你是一个专业的知识图谱构建助手，擅长深入分析和组织知识结构。${countInstruction}

## 当前思维导图主题
${roadmapTheme}

## 父节点信息
- 名称：${parentNode.label}
- 类型：${parentNode.type}
${parentNode.description ? `- 描述：${parentNode.description}` : ''}
${parentNode.mdPath ? `- 关联文件：${parentNode.mdPath}` : ''}
${existingChildrenInfo}
## 上下文
${contextPath}当前节点是第 ${context.length + 2} 层级（根节点为第1层）
${depthHint}
${userRequirement}

## 生成要求
1. ${countInstruction}
2. 每个节点应该是父节点的细分知识领域
3. 节点命名要简洁清晰（2-10个字），避免重复父节点信息
4. 节点类型判断：
   - 如果当前层级 < 4，生成的子节点类型应为 "branch"
   - 如果当前层级 >= 4，生成的子节点类型应为 "leaf"
${siblingTypeHint}5. 如果是技术类知识，可以建议关联的 Markdown 文件路径（相对路径，如 "basic-features/variables"）
6. 提供简短的生成理由（帮助用户理解）
7. 确保生成的节点与现有子节点不重复、不相似
8. **内容质量要求（重要）**：
   - description 字段：提供 50-150 字的详细描述，说明该知识点的核心内容、学习要点或应用场景
   - mdContent 字段：当 mdInsertPosition 为 "parent" 时，必须提供完整的 Markdown 章节内容（200-500字），包含：
     - 核心概念解释
     - 关键要点（使用列表或表格）
     - 代码示例（如果是技术内容，提供简洁的代码片段）
     - 注意事项或最佳实践
   - 内容应该具有实用价值，便于学习者理解和记忆
${mdInsertHint}

## 输出格式（严格 JSON）
请直接输出以下格式的 JSON，不要有任何其他文字或解释：

{
  "nodes": [
    {
      "label": "节点名称",
      "type": "branch 或 leaf",
      "description": "详细的节点描述（50-150字），说明核心内容和学习要点",
      "mdPath": "可选的关联文件路径",
      "reasoning": "简短的生成理由",
      "mdInsertPosition": "new 或 parent 或 none",
      "mdInsertAfter": "当 mdInsertPosition 为 parent 时，建议插入在哪个章节之后（可选）",
      "mdContent": "当 mdInsertPosition 为 parent 时，提供章节的正文内容（不要包含标题，系统会自动添加）。内容应包含核心概念、要点列表、代码示例等（200-500字）"
    }
  ]
}

## mdContent 内容示例

当 mdInsertPosition 为 "parent" 时，mdContent **不要包含标题行**（系统会自动根据 label 添加），直接从正文开始：

\`\`\`
核心概念的详细解释，帮助读者理解这个知识点的本质和应用场景。

**关键要点：**

- 要点一：具体说明
- 要点二：具体说明
- 要点三：具体说明

**代码示例：**

\`\`\`go
// 简洁的代码示例
func example() {
    // 代码实现
}
\`\`\`

**注意事项：**

- 实际开发中需要注意的问题
- 常见的坑点或误区
\`\`\`

**重要：mdContent 不要以 ### 或 ## 标题开头，直接写正文内容！**

请确保生成的内容专业、实用、易于理解！`;
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
    return '提示：这是较深层节点，应该是具体知识点或实例，需要提供更详细的内容。';
  }
  return '';
}

/**
 * 根据同级节点类型获取提示
 * 保持与现有同级节点类型一致，确保视觉上的一致性
 */
function getSiblingTypeHint(existingChildren?: Array<{ label: string; type: string }>): string {
  if (!existingChildren || existingChildren.length === 0) {
    return '';
  }
  
  // 统计同级节点类型
  const typeCounts = existingChildren.reduce((acc, child) => {
    acc[child.type] = (acc[child.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 如果同级节点主要是 branch 类型
  if ((typeCounts['branch'] || 0) > (typeCounts['leaf'] || 0)) {
    return '   - 注意：同级已有节点主要是 branch 类型，建议生成相同类型保持一致性\n';
  }
  
  // 如果同级节点主要是 leaf 类型
  if ((typeCounts['leaf'] || 0) > (typeCounts['branch'] || 0)) {
    return '   - 注意：同级已有节点主要是 leaf 类型，建议生成相同类型保持一致性\n';
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
      mdInsertPosition: ['new', 'parent', 'none'].includes(node.mdInsertPosition) 
        ? node.mdInsertPosition 
        : 'new',
      mdInsertAfter: node.mdInsertAfter?.trim(),
      mdContent: node.mdContent?.trim(), // 新增：MD 章节内容
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
