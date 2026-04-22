/**
 * Markdown 模板和样式片段
 * 
 * 提供默认的内容模板和常用样式片段
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 默认模板
// ═══════════════════════════════════════════════════════════════════════════════

export interface MdTemplate {
  key: string;
  label: string;
  content: string;
}

export const MD_TEMPLATES: MdTemplate[] = [
  {
    key: 'simple',
    label: '📄 简单模板',
    content: `# {title}

## 简介

在这里写简介...

## 内容

- 要点一
- 要点二
- 要点三

## 总结

总结内容...
`,
  },
  {
    key: 'basic',
    label: '📋 基础模板',
    content: `# {title}

> 简要描述...

## 概述

在这里编写内容概述...

## 详细内容

### 要点一

- 第一点
- 第二点
- 第三点

### 要点二

1. 步骤一
2. 步骤二
3. 步骤三

## 代码示例

\`\`\`go
// 示例代码
package main

func main() {
    // TODO: 实现代码
}
\`\`\`

## 注意事项

> ⚠️ 重要提示

- 注意事项一
- 注意事项二

## 参考资料

- [参考链接](https://example.com)
`,
  },
  {
    key: 'tutorial',
    label: '📖 教程模板',
    content: `# {title}

> 教程说明...

## 目标

学习目标描述...

## 准备工作

- 前置知识一
- 前置知识二

## 步骤

### 步骤一：标题

步骤一的详细说明...

### 步骤二：标题

步骤二的详细说明...

## 常见问题

### 问题一

解答内容...

### 问题二

解答内容...

## 小结

本节总结...
`,
  },
  {
    key: 'reference',
    label: '📚 参考模板',
    content: `# {title}

## 快速导航

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| prop1 | 说明 | string | - |
| prop2 | 说明 | number | 0 |

## 详细说明

### 属性一

详细说明内容...

### 属性二

详细说明内容...

## 使用示例

\`\`\`go
// 示例代码
\`\`\`

## 相关链接

- [官方文档](https://example.com)
- [GitHub](https://github.com)
`,
  },
];

// 获取模板内容并替换标题
export function getTemplateContent(key: string, title: string): string {
  const template = MD_TEMPLATES.find(t => t.key === key);
  if (!template) return '';
  return template.content.replace(/{title}/g, title);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 常用样式片段
// ═══════════════════════════════════════════════════════════════════════════════

export interface MdSnippet {
  key: string;
  label: string;
  content: string;
}

export const MD_SNIPPETS: MdSnippet[] = [
  { key: 'tip', label: '💡 提示框', content: '> 💡 **提示**：这是一个提示信息\n' },
  { key: 'warning', label: '⚠️ 警告框', content: '> ⚠️ **警告**：这是一个警告信息\n' },
  { key: 'note', label: '📝 注释框', content: '> 📝 **注意**：这是一个注意事项\n' },
  { key: 'code', label: '💻 代码块', content: '```go\n// 代码示例\n```\n' },
  { key: 'table', label: '📊 表格', content: '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n' },
  { key: 'list', label: '📋 无序列表', content: '- 项目一\n- 项目二\n- 项目三\n' },
  { key: 'olist', label: '🔢 有序列表', content: '1. 步骤一\n2. 步骤二\n3. 步骤三\n' },
  { key: 'quote', label: '💬 引用', content: '> 这是一段引用文字\n' },
  { key: 'h2', label: '## 二级标题', content: '## 标题\n\n' },
  { key: 'h3', label: '### 三级标题', content: '### 标题\n\n' },
  { key: 'divider', label: '➖ 分割线', content: '\n---\n\n' },
  { key: 'link', label: '🔗 链接', content: '[链接文字](https://example.com)\n' },
  { key: 'image', label: '🖼️ 图片', content: '![图片描述](图片地址)\n' },
  { key: 'checkbox', label: '☑️ 待办列表', content: '- [ ] 待办事项一\n- [ ] 待办事项二\n- [x] 已完成事项\n' },
];

// 获取样式片段内容
export function getSnippetContent(key: string): string {
  const snippet = MD_SNIPPETS.find(s => s.key === key);
  return snippet ? snippet.content : '';
}
