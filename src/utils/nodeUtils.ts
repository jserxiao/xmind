/**
 * 节点操作工具函数
 * 
 * 提供节点的增删改查操作，以及 MD 文件的更新功能
 */

import type { RoadmapNode } from '../data/roadmapData';
import type { NodeFormData } from '../store/nodeEditorStore';
import { writeFile, readFile, deleteFile, writeJsonFile } from './fileSystem';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResult {
  success: boolean;
  message: string;
  path?: string;
  content?: string;
  data?: any;
}

/** 删除节点操作的返回数据 */
export interface DeleteNodeResult {
  newTree: RoadmapNode;
  deletedFiles: Array<{ path: string; content: string }>;
}

/** 节点删除的上下文信息 */
export interface NodeDeleteContext {
  node: RoadmapNode;
  rawData: RoadmapNode;
  mdBasePath: string;
  roadmapPath: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 节点树遍历工具
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 前序遍历获取所有节点列表
 * @param root 根节点
 * @returns 节点数组（前序遍历顺序）
 */
export function preorderTraversal(root: RoadmapNode): RoadmapNode[] {
  const result: RoadmapNode[] = [];
  
  function traverse(node: RoadmapNode) {
    result.push(node);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(root);
  return result;
}

/**
 * 获取当前节点的上一个/下一个节点
 * @param currentNodeId 当前节点 ID
 * @param root 根节点
 * @returns { prev: 上一个节点 ID | null, next: 下一个节点 ID | null }
 */
export function getPrevNextNode(
  currentNodeId: string,
  root: RoadmapNode
): { prev: string | null; next: string | null } {
  const nodes = preorderTraversal(root);
  const currentIndex = nodes.findIndex(n => n.id === currentNodeId);
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex > 0 ? nodes[currentIndex - 1].id : null,
    next: currentIndex < nodes.length - 1 ? nodes[currentIndex + 1].id : null,
  };
}

/**
 * 根据节点 ID 获取节点信息
 * @param nodeId 节点 ID
 * @param root 根节点
 * @returns 节点信息，如果没找到返回 null
 */
export function getNodeById(nodeId: string, root: RoadmapNode): RoadmapNode | null {
  return findNodeInTree(root, nodeId);
}

/**
 * 查找节点的父节点
 * @param nodeId 目标节点 ID
 * @param root 根节点
 * @returns 父节点，如果没有找到返回 null
 */
export function findParentNode(root: RoadmapNode, nodeId: string): RoadmapNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === nodeId) return root;
      const found = findParentNode(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 查找 sub 节点的父节点（用于获取 mdPath）
 * @param nodeId 目标节点 ID
 * @param root 根节点
 * @returns 父节点，如果没有找到返回 null
 */
export function findParentWithMdPath(nodeId: string, root: RoadmapNode): RoadmapNode | null {
  // 递归查找父节点
  const findParent = (current: RoadmapNode, targetId: string, parent: RoadmapNode | null): RoadmapNode | null => {
    if (current.id === targetId) {
      return parent;
    }
    if (current.children) {
      for (const child of current.children) {
        const found = findParent(child, targetId, current);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findParent(root, nodeId, null);
}

/**
 * 向上查找具有 mdPath 的祖先节点
 * @param nodeId 起始节点 ID
 * @param root 根节点
 * @returns 具有 mdPath 的祖先节点的 mdPath，如果没有找到返回 null
 */
export function findAncestorMdPath(nodeId: string, root: RoadmapNode): string | null {
  const findMdPath = (currentNodeId: string): string | null => {
    const parent = findParentWithMdPath(currentNodeId, root);
    if (!parent) return null;
    if (parent.mdPath) return parent.mdPath;
    return findMdPath(parent.id);
  };
  
  return findMdPath(nodeId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 节点操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成唯一节点 ID
 */
export function generateNodeId(label: string, parentId?: string): string {
  const prefix = parentId ? `${parentId}_` : '';
  const safeLabel = label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase().slice(0, 30);
  const timestamp = Date.now().toString(36);
  return `${prefix}${safeLabel}_${timestamp}`;
}

/**
 * 深拷贝节点树
 */
export function deepCloneNode(node: RoadmapNode): RoadmapNode {
  return {
    ...node,
    children: node.children?.map(deepCloneNode),
  };
}

/**
 * 在树中查找节点
 */
export function findNodeInTree(root: RoadmapNode, nodeId: string): RoadmapNode | null {
  if (root.id === nodeId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 根据节点 ID 列表查找多个节点
 */
export function findNodesByIds(root: RoadmapNode, nodeIds: string[]): RoadmapNode[] {
  const result: RoadmapNode[] = [];
  for (const nodeId of nodeIds) {
    const node = findNodeInTree(root, nodeId);
    if (node) result.push(node);
  }
  return result;
}

/**
 * 添加子节点
 */
export function addChildNode(
  root: RoadmapNode,
  parentId: string,
  newNode: RoadmapNode
): RoadmapNode {
  const clonedRoot = deepCloneNode(root);
  const parent = findNodeInTree(clonedRoot, parentId);
  if (parent) {
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);
  }
  return clonedRoot;
}

/**
 * 更新节点
 */
export function updateNodeInTree(
  root: RoadmapNode,
  nodeId: string,
  updates: Partial<RoadmapNode>
): RoadmapNode {
  const clonedRoot = deepCloneNode(root);
  const node = findNodeInTree(clonedRoot, nodeId);
  if (node) {
    Object.assign(node, updates);
  }
  return clonedRoot;
}

/**
 * 删除节点
 */
export function deleteNodeFromTree(root: RoadmapNode, nodeId: string): RoadmapNode {
  const clonedRoot = deepCloneNode(root);
  
  function removeFromChildren(parent: RoadmapNode): boolean {
    if (parent.children) {
      const index = parent.children.findIndex((c) => c.id === nodeId);
      if (index !== -1) {
        parent.children.splice(index, 1);
        return true;
      }
      for (const child of parent.children) {
        if (removeFromChildren(child)) return true;
      }
    }
    return false;
  }
  
  removeFromChildren(clonedRoot);
  return clonedRoot;
}

/**
 * 批量删除节点
 */
export function batchDeleteNodes(root: RoadmapNode, nodeIds: string[]): RoadmapNode {
  let result = deepCloneNode(root);
  for (const nodeId of nodeIds) {
    result = deleteNodeFromTree(result, nodeId);
  }
  return result;
}

/**
 * 重新排序节点的子节点
 */
export function reorderNodeChildren(
  root: RoadmapNode,
  parentId: string,
  newChildren: RoadmapNode[]
): RoadmapNode {
  const clonedRoot = deepCloneNode(root);
  const parent = findNodeInTree(clonedRoot, parentId);
  if (parent) {
    parent.children = newChildren.map(deepCloneNode);
  }
  return clonedRoot;
}

/**
 * 从表单数据创建节点
 */
export function createNodeFromFormData(formData: NodeFormData, parentId?: string): RoadmapNode {
  const node: RoadmapNode = {
    id: generateNodeId(formData.label, parentId),
    label: formData.label,
    type: formData.type,
    description: formData.description || undefined,
    children: [],
  };

  if (formData.type !== 'link' && formData.mdPath) {
    node.mdPath = formData.mdPath;
  }

  if (formData.type === 'link' && formData.url) {
    node.url = formData.url;
  }

  // 添加自定义节点样式字段
  if (formData.customNodeId) {
    node.customNodeId = formData.customNodeId;
    node.customFill = formData.customFill;
    node.customStroke = formData.customStroke;
  }

  return node;
}

// ═══════════════════════════════════════════════════════════════════════════════
// index.json 更新
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 更新 index.json 文件
 * @param folderName 思维导图文件夹名称
 * @param data 节点树数据
 */
export async function updateIndexJson(folderName: string, data: RoadmapNode): Promise<ApiResult> {
  return writeJsonFile(`${folderName}/index.json`, data);
}

/**
 * 读取 index.json 文件
 */
export async function readIndexJson(folderName: string): Promise<ApiResult & { data?: RoadmapNode }> {
  const result = await readFile(`${folderName}/index.json`);
  if (result.success && result.content) {
    try {
      return { ...result, data: JSON.parse(result.content) };
    } catch {
      return { success: false, message: 'JSON 解析失败' };
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MD 文件操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 保存 MD 文件内容
 * @param mdPath MD 文件路径（相对路径，可能含或不含 .md 后缀）
 * @param content 文件内容
 */
export async function saveMdFile(mdPath: string, content: string): Promise<ApiResult> {
  // 移除可能存在的 .md 后缀，避免双后缀问题
  const pathWithoutMd = mdPath.replace(/\.md$/, '');
  return writeFile(`${pathWithoutMd}.md`, content);
}

/**
 * 读取 MD 文件内容
 */
export async function readMdFile(mdPath: string): Promise<ApiResult & { content?: string }> {
  // mdPath 可能已经包含 .md 后缀，也可能没有
  const fullPath = mdPath.endsWith('.md') ? mdPath : `${mdPath}.md`;
  return readFile(fullPath);
}

/**
 * 删除 MD 文件
 * @param mdPath MD 文件路径（相对路径，不含 .md 后缀）
 * @param roadmapPath 思维导图路径（可选）
 */
export async function deleteMdFile(mdPath: string, roadmapPath?: string): Promise<ApiResult> {
  const fullPath = roadmapPath ? `${roadmapPath}/${mdPath}` : mdPath;
  return deleteFile(`${fullPath}.md`);
}

/**
 * 获取 MD 文件内容（从 localStorage 缓存）- 已废弃，使用 readMdFile 替代
 * @deprecated
 */
export function getMdFile(mdPath: string): string | null {
  const key = `md_${mdPath.replace(/\//g, '_')}`;
  return localStorage.getItem(key);
}

/**
 * 创建默认的 MD 内容模板
 */
export function createMdTemplate(title: string, description?: string): string {
  return `# ${title}

${description ? `> ${description}` : ''}

## 概述

<!-- 在这里编写内容 -->

## 示例

\`\`\`go
// 代码示例
\`\`\`

## 注意事项

- 
- 

## 参考资料

- 
`;
}

/**
 * 收集节点及其子节点中所有的 mdPath
 */
export function collectMdPathsFromNode(node: RoadmapNode): string[] {
  const result: string[] = [];
  
  function traverse(n: RoadmapNode) {
    if (n.mdPath) {
      result.push(n.mdPath);
    }
    if (n.children) {
      n.children.forEach(traverse);
    }
  }
  
  traverse(node);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MD 章节操作（用于 sub 类型节点）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从 MD 内容中提取指定章节的内容
 * @param mdContent MD 文件完整内容
 * @param sectionTitle 章节标题（不带 ## 前缀）
 * @returns 章节内容（不含标题行）
 */
export function extractSectionContent(mdContent: string, sectionTitle: string): string {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  let inTargetSection = false;
  let content: string[] = [];
  let targetLevel = 2; // ## 开头的标题级别
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      if (!inTargetSection) {
        // 还没进入目标章节，检查是否匹配
        if (title === sectionTitle) {
          inTargetSection = true;
          targetLevel = level;
          continue; // 跳过章节标题本身
        }
      } else {
        // 已经在目标章节内，检查是否遇到同级或更高级标题
        if (level <= targetLevel) {
          // 遇到同级或更高级标题，结束当前章节
          break;
        }
      }
    } else if (inTargetSection) {
      content.push(line);
    }
  }
  
  return content.join('\n').trim();
}

/**
 * 更新 MD 文件中指定章节的内容
 * @param mdContent MD 文件完整内容
 * @param sectionTitle 章节标题（不带 ## 前缀）
 * @param newContent 新的章节内容
 * @returns 更新后的完整 MD 内容
 */
export function updateSectionContent(mdContent: string, sectionTitle: string, newContent: string): string {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  let inTargetSection = false;
  let targetLevel = 2;
  let startIndex = -1;
  let endIndex = lines.length;
  
  // 找到章节的起始和结束位置
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      if (!inTargetSection) {
        if (title === sectionTitle) {
          inTargetSection = true;
          targetLevel = level;
          startIndex = i + 1; // 标题下一行开始
        }
      } else {
        if (level <= targetLevel) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  // 如果找到章节，替换内容
  if (startIndex !== -1) {
    const before = lines.slice(0, startIndex);
    const after = lines.slice(endIndex);
    
    // 处理新内容
    const newLines = newContent.trim().split('\n');
    
    // 重新组合
    const result = [...before, ...newLines, ...after];
    return result.join('\n');
  }
  
  // 如果没找到章节，在文件末尾添加
  return mdContent + `\n\n## ${sectionTitle}\n\n${newContent}\n`;
}

/**
 * 更新 MD 文件中指定章节的标题
 * @param mdContent MD 文件完整内容
 * @param oldTitle 旧标题
 * @param newTitle 新标题
 * @returns 更新后的完整 MD 内容
 */
export function updateSectionTitle(mdContent: string, oldTitle: string, newTitle: string): string {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1];
      const title = headingMatch[2].trim();
      
      if (title === oldTitle) {
        lines[i] = `${level} ${newTitle}`;
        break;
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * 删除 MD 文件中指定章节
 * @param mdContent MD 文件完整内容
 * @param sectionTitle 章节标题
 * @returns 更新后的完整 MD 内容
 */
export function deleteSection(mdContent: string, sectionTitle: string): string {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  let inTargetSection = false;
  let targetLevel = 2;
  let deleteStart = -1;
  let deleteEnd = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      if (!inTargetSection) {
        if (title === sectionTitle) {
          inTargetSection = true;
          targetLevel = level;
          deleteStart = i;
        }
      } else {
        if (level <= targetLevel) {
          deleteEnd = i;
          break;
        }
      }
    }
  }
  
  if (deleteStart !== -1) {
    const before = lines.slice(0, deleteStart);
    const after = lines.slice(deleteEnd);
    
    // 移除章节前后的多余空行
    let result = [...before, ...after].join('\n');
    // 清理多余空行
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
  }
  
  return mdContent;
}

/**
 * 从 MD 文件中删除指定章节
 * @param mdPath MD 文件路径（相对路径，不含思维导图前缀，可能含或不含 .md 后缀）
 * @param sectionTitle 章节标题
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function deleteSectionFromMdFile(
  mdPath: string,
  sectionTitle: string,
  roadmapPath?: string
): Promise<ApiResult> {
  try {
    // 移除 mdPath 中可能存在的 .md 后缀，避免双后缀问题
    const cleanMdPath = mdPath.replace(/\.md$/, '');
    
    // 构建完整的 MD 文件路径（不含 .md 后缀）
    const fullPath = roadmapPath ? `${roadmapPath}/${cleanMdPath}` : cleanMdPath;
    
    // 先获取 MD 文件内容
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${cleanMdPath}` };
    }
    
    let mdContent = readResult.content;
    
    // 删除章节
    mdContent = deleteSection(mdContent, sectionTitle);
    
    // 保存文件（使用完整路径，saveMdFile 会自动添加 .md 后缀）
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `删除章节失败: ${error}` };
  }
}

/**
 * 在 MD 文件中添加新章节
 * @param mdPath MD 文件路径（相对路径，不含思维导图前缀，可能含或不含 .md 后缀）
 * @param sectionTitle 章节标题
 * @param content 章节内容（可选）
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function addSectionToMdFile(
  mdPath: string,
  sectionTitle: string,
  content?: string,
  roadmapPath?: string
): Promise<ApiResult> {
  try {
    // 移除 mdPath 中可能存在的 .md 后缀，避免双后缀问题
    const cleanMdPath = mdPath.replace(/\.md$/, '');
    
    // 构建完整的 MD 文件路径（不含 .md 后缀）
    const fullPath = roadmapPath ? `${roadmapPath}/${cleanMdPath}` : cleanMdPath;
    
    // 先获取 MD 文件内容
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${cleanMdPath}` };
    }
    
    let mdContent = readResult.content;
    
    // 检查章节是否已存在
    const sectionPattern = new RegExp(`^#{2,6}\\s+${escapeRegExp(sectionTitle)}\\s*$`, 'm');
    if (sectionPattern.test(mdContent)) {
      // 章节已存在，不需要添加
      return { success: true, message: `章节「${sectionTitle}」已存在` };
    }
    
    // 在文件末尾添加新章节
    const defaultContent = content || '\n\n<!-- 在这里编写章节内容 -->\n';
    const newSection = `\n\n## ${sectionTitle}${defaultContent}`;
    
    // 清理文件末尾的多余空行
    mdContent = mdContent.replace(/\n{3,}$/, '\n');
    mdContent += newSection;
    
    // 保存文件（使用完整路径，saveMdFile 会自动添加 .md 后缀）
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `添加章节失败: ${error}` };
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 保存 sub 节点的章节内容
 * @param mdPath MD 文件路径（相对路径，不含思维导图前缀）
 * @param sectionTitle 章节标题
 * @param content 章节内容
 * @param isTitleUpdate 是否只是更新标题
 * @param oldTitle 旧标题（仅当 isTitleUpdate 为 true 时使用）
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function saveSubNodeSection(
  mdPath: string,
  sectionTitle: string,
  content: string,
  isTitleUpdate?: boolean,
  oldTitle?: string,
  roadmapPath?: string
): Promise<ApiResult> {
  try {
    // 构建完整的 MD 文件路径
    const fullPath = roadmapPath ? `${roadmapPath}/${mdPath}` : mdPath;
    
    // 先获取 MD 文件内容
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${mdPath}` };
    }
    
    let mdContent = readResult.content;
    
    // 更新内容或标题
    if (isTitleUpdate && oldTitle) {
      mdContent = updateSectionTitle(mdContent, oldTitle, sectionTitle);
    } else {
      mdContent = updateSectionContent(mdContent, sectionTitle, content);
    }
    
    // 保存文件（使用完整路径）
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `保存失败: ${error}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MD 内容搜索
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 收集所有具有 mdPath 的节点
 */
export function collectNodesWithMdPath(root: RoadmapNode): Array<{ id: string; label: string; mdPath: string }> {
  const result: Array<{ id: string; label: string; mdPath: string }> = [];
  
  function traverse(node: RoadmapNode) {
    if (node.mdPath) {
      result.push({
        id: node.id,
        label: node.label,
        mdPath: node.mdPath,
      });
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(root);
  return result;
}

/**
 * 搜索结果项
 */
export interface MdSearchResult {
  nodeId: string;
  nodeLabel: string;
  mdPath: string;
  matches: string[]; // 匹配的上下文片段
}

/**
 * 搜索 MD 文件内容
 * @param keyword 搜索关键词
 * @param nodesWithMdPath 具有 mdPath 的节点列表
 * @returns 匹配的搜索结果
 */
export async function searchMdContent(
  keyword: string,
  nodesWithMdPath: Array<{ id: string; label: string; mdPath: string }>
): Promise<MdSearchResult[]> {
  if (!keyword.trim()) return [];
  
  const lowerKeyword = keyword.toLowerCase().trim();
  
  // 并行搜索所有 MD 文件
  const searchPromises = nodesWithMdPath.map(async (node) => {
    try {
      const readResult = await readMdFile(node.mdPath);
      if (!readResult.success || !readResult.content) return null;
      
      const content = readResult.content;
      const lowerContent = content.toLowerCase();
      const matches: string[] = [];
      
      // 搜索内容中的关键词
      let searchPos = 0;
      while (true) {
        const index = lowerContent.indexOf(lowerKeyword, searchPos);
        if (index === -1) break;
        
        // 提取匹配上下文（前后各 30 个字符）
        const contextStart = Math.max(0, index - 30);
        const contextEnd = Math.min(content.length, index + keyword.length + 30);
        const context = content.slice(contextStart, contextEnd);
        
        // 清理上下文（移除换行和多余空格）
        const cleanContext = context
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        matches.push(cleanContext);
        searchPos = index + keyword.length;
        
        // 最多记录 3 个匹配
        if (matches.length >= 3) break;
      }
      
      if (matches.length > 0) {
        return {
          nodeId: node.id,
          nodeLabel: node.label,
          mdPath: node.mdPath,
          matches,
        };
      }
      
      return null;
    } catch {
      return null;
    }
  });
  
  const searchResults = await Promise.all(searchPromises);
  
  // 过滤掉 null 结果
  return searchResults.filter((r): r is MdSearchResult => r !== null);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统一的节点操作服务
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 执行节点删除操作（包括处理相关 MD 文件）
 * 此函数封装了 sub 节点和普通节点的删除逻辑，供组件调用
 * 
 * @param context 删除上下文
 * @returns 删除结果，包含新的节点树和被删除的文件信息
 */
export async function executeNodeDelete(
  context: NodeDeleteContext
): Promise<DeleteNodeResult> {
  const { node, rawData, mdBasePath, roadmapPath } = context;
  const deletedFiles: Array<{ path: string; content: string }> = [];
  const isSubNode = node.type === 'sub';
  
  if (isSubNode) {
    // sub 节点：删除 MD 文件中的章节
    const ancestorMdPath = findAncestorMdPath(node.id, rawData);
    
    if (ancestorMdPath) {
      // 读取完整的 MD 文件内容（用于撤销时恢复）
      const readResult = await readMdFile(`${mdBasePath}/${ancestorMdPath}`);
      if (readResult.success && readResult.content) {
        deletedFiles.push({
          path: `${ancestorMdPath}.md`,
          content: readResult.content,
        });
      }
      
      // 删除 MD 文件中的章节
      await deleteSectionFromMdFile(ancestorMdPath, node.label, roadmapPath);
    }
  } else {
    // 非 sub 节点：收集并删除相关 MD 文件
    const mdPathsToDelete = collectMdPathsFromNode(node);
    
    // 读取并保存 MD 文件内容（用于撤销时恢复）
    for (const mdPath of mdPathsToDelete) {
      const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
      if (readResult.success && readResult.content) {
        deletedFiles.push({
          path: `${mdPath}.md`,
          content: readResult.content,
        });
      }
    }
    
    // 删除 MD 文件
    for (const mdPath of mdPathsToDelete) {
      await deleteMdFile(mdPath, roadmapPath);
    }
  }
  
  // 执行节点删除
  const newTree = deleteNodeFromTree(rawData, node.id);
  
  return { newTree, deletedFiles };
}

/**
 * 批量删除节点（包括处理相关 MD 文件）
 * 
 * @param nodeIds 要删除的节点 ID 列表
 * @param rawData 当前节点树
 * @param mdBasePath MD 文件基础路径
 * @param roadmapPath 思维导图路径
 * @returns 删除结果
 */
export async function executeBatchNodeDelete(
  nodeIds: string[],
  rawData: RoadmapNode,
  mdBasePath: string,
  roadmapPath: string
): Promise<DeleteNodeResult> {
  const deletedFiles: Array<{ path: string; content: string }> = [];
  const processedMdPaths = new Set<string>(); // 避免重复处理同一个文件
  
  // 找到所有要删除的节点
  const nodesToDelete = findNodesByIds(rawData, nodeIds);
  
  // 分别处理 sub 节点和普通节点
  for (const node of nodesToDelete) {
    if (node.type === 'sub') {
      // sub 节点：删除 MD 文件中的章节
      const ancestorMdPath = findAncestorMdPath(node.id, rawData);
      
      if (ancestorMdPath && !processedMdPaths.has(ancestorMdPath)) {
        processedMdPaths.add(ancestorMdPath);
        
        // 读取完整的 MD 文件内容（用于撤销时恢复）
        const readResult = await readMdFile(`${mdBasePath}/${ancestorMdPath}`);
        if (readResult.success && readResult.content) {
          deletedFiles.push({
            path: `${ancestorMdPath}.md`,
            content: readResult.content,
          });
        }
      }
      
      // 删除章节
      if (ancestorMdPath) {
        await deleteSectionFromMdFile(ancestorMdPath, node.label, roadmapPath);
      }
    } else {
      // 非 sub 节点：收集要删除的 MD 文件路径
      const mdPaths = collectMdPathsFromNode(node);
      
      for (const mdPath of mdPaths) {
        if (!processedMdPaths.has(mdPath)) {
          processedMdPaths.add(mdPath);
          
          // 读取并保存 MD 文件内容（用于撤销时恢复）
          const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
          if (readResult.success && readResult.content) {
            deletedFiles.push({
              path: `${mdPath}.md`,
              content: readResult.content,
            });
          }
        }
      }
      
      // 删除 MD 文件
      for (const mdPath of mdPaths) {
        await deleteMdFile(mdPath, roadmapPath);
      }
    }
  }
  
  // 批量删除节点
  const newTree = batchDeleteNodes(rawData, nodeIds);
  
  return { newTree, deletedFiles };
}
