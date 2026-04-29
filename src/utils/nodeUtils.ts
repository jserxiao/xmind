/**
 * 节点操作工具函数
 * 
 * 提供节点的增删改查操作，以及 MD 文件的更新功能
 */

import type { RoadmapNode } from '../data/roadmapData';
import type { NodeFormData } from '../store/nodeEditorStore';
import { writeFile, readFile, deleteFile, writeJsonFile } from './fileSystem';
import { escapeRegExp } from './common';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  path?: string;
  content?: string;
  data?: T;
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
// 树遍历工具（统一抽象）
// ═══════════════════════════════════════════════════════════════════════════════

type TraverseCallback<T = void> = (node: RoadmapNode, parent: RoadmapNode | null, depth: number) => T | boolean;

/**
 * 通用的树遍历函数
 * @param root 根节点
 * @param callback 回调函数，返回 true 可提前终止遍历
 * @param mode 遍历模式：'pre'（前序）或 'post'（后序）
 */
export function traverseTree(
  root: RoadmapNode,
  callback: TraverseCallback,
  mode: 'pre' | 'post' = 'pre'
): void {
  const walk = (node: RoadmapNode, parent: RoadmapNode | null, depth: number): boolean => {
    if (mode === 'pre') {
      if (callback(node, parent, depth) === true) return true;
    }
    
    for (const child of node.children || []) {
      if (walk(child, node, depth + 1)) return true;
    }
    
    if (mode === 'post') {
      if (callback(node, parent, depth) === true) return true;
    }
    
    return false;
  };
  
  walk(root, null, 0);
}

/**
 * 在树中查找节点
 */
export function findNodeInTree(root: RoadmapNode, nodeId: string): RoadmapNode | null {
  let result: RoadmapNode | null = null;
  
  traverseTree(root, (node) => {
    if (node.id === nodeId) {
      result = node;
      return true;
    }
    return false;
  });
  
  return result;
}

/**
 * 根据节点 ID 列表查找多个节点
 */
export function findNodesByIds(root: RoadmapNode, nodeIds: string[]): RoadmapNode[] {
  const idSet = new Set(nodeIds);
  const result: RoadmapNode[] = [];
  
  traverseTree(root, (node) => {
    if (idSet.has(node.id)) {
      result.push(node);
    }
  });
  
  return result;
}

/**
 * 查找节点的父节点
 */
export function findParentNode(root: RoadmapNode, nodeId: string): RoadmapNode | null {
  let result: RoadmapNode | null = null;
  
  traverseTree(root, (node, parent) => {
    if (node.id === nodeId && parent) {
      result = parent;
      return true;
    }
    return false;
  });
  
  return result;
}

/**
 * 前序遍历获取所有节点列表
 */
export function preorderTraversal(root: RoadmapNode): RoadmapNode[] {
  const result: RoadmapNode[] = [];
  
  traverseTree(root, (node) => {
    result.push(node);
  });
  
  return result;
}

/**
 * 获取节点从根节点开始的路径（节点名称数组）
 */
export function getNodePath(nodeId: string, root: RoadmapNode): string[] {
  const path: string[] = [];
  
  const walk = (node: RoadmapNode, target: string): boolean => {
    if (node.id === target) {
      path.push(node.label);
      return true;
    }
    
    for (const child of node.children || []) {
      if (walk(child, target)) {
        path.unshift(node.label);
        return true;
      }
    }
    
    return false;
  };
  
  walk(root, nodeId);
  return path;
}

/**
 * 查找 sub 节点的父节点（用于获取 mdPath）
 */
export function findParentWithMdPath(nodeId: string, root: RoadmapNode): RoadmapNode | null {
  return findParentNode(root, nodeId);
}

/**
 * 向上查找具有 mdPath 的祖先节点
 */
export function findAncestorMdPath(nodeId: string, root: RoadmapNode): string | null {
  let currentId: string | null = nodeId;
  
  while (currentId) {
    const parent = findParentWithMdPath(currentId, root);
    if (!parent) return null;
    if (parent.mdPath) return parent.mdPath;
    currentId = parent.id;
  }
  
  return null;
}

/**
 * 获取当前节点的上一个/下一个节点
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
 * 根据节点 ID 获取节点信息
 */
export function getNodeById(nodeId: string, root: RoadmapNode): RoadmapNode | null {
  return findNodeInTree(root, nodeId);
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
  
  traverseTree(clonedRoot, (node, parent) => {
    if (node.id === nodeId && parent?.children) {
      const index = parent.children.indexOf(node);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }
      return true;
    }
    return false;
  });
  
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

/** 连线数据类型（用于 index.json） */
export interface ConnectionData {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'prerequisite' | 'extends' | 'contrasts';
  label?: string;
  createdAt: number;
}

/** 书签数据类型（用于 index.json） */
export interface BookmarkData {
  nodeId: string;
  nodeLabel: string;
  createdAt: number;
  note?: string;
}

/**
 * 更新 index.json 文件
 */
export async function updateIndexJson(
  folderName: string, 
  data: RoadmapNode,
  connections?: ConnectionData[],
  bookmarks?: BookmarkData[]
): Promise<ApiResult> {
  // 将连线和书签数据合并到 root 节点中
  const dataToSave: RoadmapNode = {
    ...data,
    connections: connections?.length ? connections : undefined,
    bookmarks: bookmarks?.length ? bookmarks : undefined,
  };
  return writeJsonFile(`${folderName}/index.json`, dataToSave);
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
 */
export async function saveMdFile(mdPath: string, content: string): Promise<ApiResult> {
  const pathWithoutMd = mdPath.replace(/\.md$/, '');
  return writeFile(`${pathWithoutMd}.md`, content);
}

/**
 * 读取 MD 文件内容
 */
export async function readMdFile(mdPath: string): Promise<ApiResult & { content?: string }> {
  const fullPath = mdPath.endsWith('.md') ? mdPath : `${mdPath}.md`;
  return readFile(fullPath);
}

/**
 * 删除 MD 文件
 */
export async function deleteMdFile(mdPath: string, roadmapPath?: string): Promise<ApiResult> {
  const fullPath = roadmapPath ? `${roadmapPath}/${mdPath}` : mdPath;
  return deleteFile(`${fullPath}.md`);
}

/**
 * 获取 MD 文件内容（从 localStorage 缓存）- 已废弃
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
  const lines = [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    description ? '' : '',
    '## 概述',
    '',
    '<!-- 在这里编写内容 -->',
    '',
    '## 示例',
    '',
    '```go',
    '// 代码示例',
    '```',
    '',
    '## 注意事项',
    '',
    '- ',
    '- ',
    '',
    '## 参考资料',
    '',
    '- ',
  ];
  
  return lines.filter((line, i, arr) => {
    // 移除连续空行
    if (line === '' && arr[i - 1] === '') return false;
    return true;
  }).join('\n');
}

/**
 * 收集节点及其子节点中所有的 mdPath
 */
export function collectMdPathsFromNode(node: RoadmapNode): string[] {
  const result: string[] = [];
  
  traverseTree(node, (n) => {
    if (n.mdPath) {
      result.push(n.mdPath);
    }
  });
  
  return result;
}

/**
 * 收集所有具有 mdPath 的节点
 */
export function collectNodesWithMdPath(root: RoadmapNode): Array<{ id: string; label: string; mdPath: string }> {
  const result: Array<{ id: string; label: string; mdPath: string }> = [];
  
  traverseTree(root, (node) => {
    if (node.mdPath) {
      result.push({
        id: node.id,
        label: node.label,
        mdPath: node.mdPath,
      });
    }
  });
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MD 章节操作
// ═══════════════════════════════════════════════════════════════════════════════

/** MD 章节解析结果 */
interface SectionParseResult {
  found: boolean;
  startIndex: number;
  endIndex: number;
  targetLevel: number;
}

/**
 * 解析 MD 内容，找到指定章节
 */
function parseMdSection(mdContent: string, sectionTitle: string): SectionParseResult {
  const lines = mdContent.replace(/\r\n?/g, '\n').split('\n');
  
  let inTargetSection = false;
  let targetLevel = 2;
  let startIndex = -1;
  let endIndex = lines.length;
  
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
          startIndex = i + 1;
        }
      } else {
        if (level <= targetLevel) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  return { found: startIndex !== -1, startIndex, endIndex, targetLevel };
}

/**
 * 从 MD 内容中提取指定章节的内容
 */
export function extractSectionContent(mdContent: string, sectionTitle: string): string {
  const lines = mdContent.replace(/\r\n?/g, '\n').split('\n');
  const { found, startIndex, endIndex } = parseMdSection(mdContent, sectionTitle);
  
  if (!found) return '';
  
  return lines.slice(startIndex, endIndex).join('\n').trim();
}

/**
 * 更新 MD 文件中指定章节的内容
 */
export function updateSectionContent(mdContent: string, sectionTitle: string, newContent: string): string {
  const lines = mdContent.replace(/\r\n?/g, '\n').split('\n');
  const { found, startIndex, endIndex } = parseMdSection(mdContent, sectionTitle);
  
  if (found) {
    const before = lines.slice(0, startIndex);
    const after = lines.slice(endIndex);
    const newLines = newContent.trim().split('\n');
    return [...before, ...newLines, ...after].join('\n');
  }
  
  // 如果没找到章节，在文件末尾添加
  return mdContent + `\n\n## ${sectionTitle}\n\n${newContent}\n`;
}

/**
 * 更新 MD 文件中指定章节的标题
 */
export function updateSectionTitle(mdContent: string, oldTitle: string, newTitle: string): string {
  const lines = mdContent.replace(/\r\n?/g, '\n').split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{2,6})\s+(.+)$/);
    if (match && match[2].trim() === oldTitle) {
      lines[i] = `${match[1]} ${newTitle}`;
      break;
    }
  }
  
  return lines.join('\n');
}

/**
 * 删除 MD 文件中指定章节
 */
export function deleteSection(mdContent: string, sectionTitle: string): string {
  const lines = mdContent.replace(/\r\n?/g, '\n').split('\n');
  const { found, startIndex, endIndex } = parseMdSection(mdContent, sectionTitle);
  
  if (found) {
    const before = lines.slice(0, startIndex - 1); // 包含章节标题
    const after = lines.slice(endIndex);
    return [...before, ...after].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  
  return mdContent;
}

/**
 * 从 MD 文件中删除指定章节
 */
export async function deleteSectionFromMdFile(
  mdPath: string,
  sectionTitle: string,
  roadmapPath?: string
): Promise<ApiResult> {
  try {
    const cleanMdPath = mdPath.replace(/\.md$/, '');
    const fullPath = roadmapPath ? `${roadmapPath}/${cleanMdPath}` : cleanMdPath;
    
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${cleanMdPath}` };
    }
    
    const mdContent = deleteSection(readResult.content, sectionTitle);
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `删除章节失败: ${error}` };
  }
}

/**
 * 在 MD 文件中添加新章节
 */
export async function addSectionToMdFile(
  mdPath: string,
  sectionTitle: string,
  content?: string,
  roadmapPath?: string
): Promise<ApiResult> {
  try {
    const cleanMdPath = mdPath.replace(/\.md$/, '');
    const fullPath = roadmapPath ? `${roadmapPath}/${cleanMdPath}` : cleanMdPath;
    
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${cleanMdPath}` };
    }
    
    let mdContent = readResult.content;
    
    // 检查章节是否已存在
    const sectionPattern = new RegExp(`^#{2,6}\\s+${escapeRegExp(sectionTitle)}\\s*$`, 'm');
    if (sectionPattern.test(mdContent)) {
      return { success: true, message: `章节「${sectionTitle}」已存在` };
    }
    
    const defaultContent = content || '\n\n<!-- 在这里编写章节内容 -->\n';
    mdContent = mdContent.replace(/\n{3,}$/, '\n') + `\n\n## ${sectionTitle}${defaultContent}`;
    
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `添加章节失败: ${error}` };
  }
}

/**
 * 保存 sub 节点的章节内容
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
    const fullPath = roadmapPath ? `${roadmapPath}/${mdPath}` : mdPath;
    
    const readResult = await readMdFile(fullPath);
    if (!readResult.success || !readResult.content) {
      return { success: false, message: `无法加载 MD 文件: ${mdPath}` };
    }
    
    let mdContent = readResult.content;
    mdContent = isTitleUpdate && oldTitle
      ? updateSectionTitle(mdContent, oldTitle, sectionTitle)
      : updateSectionContent(mdContent, sectionTitle, content);
    
    return await saveMdFile(fullPath, mdContent);
  } catch (error) {
    return { success: false, message: `保存失败: ${error}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MD 内容搜索
// ═══════════════════════════════════════════════════════════════════════════════

/** 搜索结果项 */
export interface MdSearchResult {
  nodeId: string;
  nodeLabel: string;
  mdPath: string;
  matches: string[];
}

/** 搜索配置 */
interface SearchConfig {
  /** 上下文长度（前后字符数） */
  contextLength?: number;
  /** 最大匹配数 */
  maxMatches?: number;
  /** 是否忽略大小写 */
  ignoreCase?: boolean;
}

/**
 * 搜索 MD 文件内容
 */
export async function searchMdContent(
  keyword: string,
  nodesWithMdPath: Array<{ id: string; label: string; mdPath: string }>,
  config: SearchConfig = {}
): Promise<MdSearchResult[]> {
  const { contextLength = 30, maxMatches = 3, ignoreCase = true } = config;
  
  if (!keyword.trim()) return [];
  
  const searchStr = ignoreCase ? keyword.toLowerCase().trim() : keyword.trim();
  
  const searchPromises = nodesWithMdPath.map(async (node) => {
    try {
      const readResult = await readMdFile(node.mdPath);
      if (!readResult.success || !readResult.content) return null;
      
      const content = readResult.content;
      const searchContent = ignoreCase ? content.toLowerCase() : content;
      const matches: string[] = [];
      
      let searchPos = 0;
      while (matches.length < maxMatches) {
        const index = searchContent.indexOf(searchStr, searchPos);
        if (index === -1) break;
        
        const contextStart = Math.max(0, index - contextLength);
        const contextEnd = Math.min(content.length, index + keyword.length + contextLength);
        const context = content
          .slice(contextStart, contextEnd)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        matches.push(context);
        searchPos = index + keyword.length;
      }
      
      return matches.length > 0
        ? { nodeId: node.id, nodeLabel: node.label, mdPath: node.mdPath, matches }
        : null;
    } catch {
      return null;
    }
  });
  
  const results = await Promise.all(searchPromises);
  return results.filter((r): r is MdSearchResult => r !== null);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统一的节点操作服务
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 执行节点删除操作（包括处理相关 MD 文件）
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
      const readResult = await readMdFile(`${mdBasePath}/${ancestorMdPath}`);
      if (readResult.success && readResult.content) {
        deletedFiles.push({
          path: `${ancestorMdPath}.md`,
          content: readResult.content,
        });
      }
      
      await deleteSectionFromMdFile(ancestorMdPath, node.label, roadmapPath);
    }
  } else {
    // 非 sub 节点：收集并删除相关 MD 文件
    const mdPathsToDelete = collectMdPathsFromNode(node);
    
    for (const mdPath of mdPathsToDelete) {
      const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
      if (readResult.success && readResult.content) {
        deletedFiles.push({
          path: `${mdPath}.md`,
          content: readResult.content,
        });
      }
    }
    
    for (const mdPath of mdPathsToDelete) {
      await deleteMdFile(mdPath, roadmapPath);
    }
  }
  
  const newTree = deleteNodeFromTree(rawData, node.id);
  
  return { newTree, deletedFiles };
}

/**
 * 批量删除节点
 */
export async function executeBatchNodeDelete(
  nodeIds: string[],
  rawData: RoadmapNode,
  mdBasePath: string,
  roadmapPath: string
): Promise<DeleteNodeResult> {
  const deletedFiles: Array<{ path: string; content: string }> = [];
  const processedMdPaths = new Set<string>();
  
  const nodesToDelete = findNodesByIds(rawData, nodeIds);
  
  for (const node of nodesToDelete) {
    if (node.type === 'sub') {
      const ancestorMdPath = findAncestorMdPath(node.id, rawData);
      
      if (ancestorMdPath && !processedMdPaths.has(ancestorMdPath)) {
        processedMdPaths.add(ancestorMdPath);
        
        const readResult = await readMdFile(`${mdBasePath}/${ancestorMdPath}`);
        if (readResult.success && readResult.content) {
          deletedFiles.push({
            path: `${ancestorMdPath}.md`,
            content: readResult.content,
          });
        }
      }
      
      if (ancestorMdPath) {
        await deleteSectionFromMdFile(ancestorMdPath, node.label, roadmapPath);
      }
    } else {
      const mdPaths = collectMdPathsFromNode(node);
      
      for (const mdPath of mdPaths) {
        if (!processedMdPaths.has(mdPath)) {
          processedMdPaths.add(mdPath);
          
          const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
          if (readResult.success && readResult.content) {
            deletedFiles.push({
              path: `${mdPath}.md`,
              content: readResult.content,
            });
          }
        }
      }
      
      for (const mdPath of mdPaths) {
        await deleteMdFile(mdPath, roadmapPath);
      }
    }
  }
  
  const newTree = batchDeleteNodes(rawData, nodeIds);
  
  return { newTree, deletedFiles };
}
