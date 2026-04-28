// 学习思维导图数据
// 数据源: 本地文件系统

import { readJsonFile, readFile, getDirectoryHandle } from '../utils/fileSystem';

/** 节点关联关系 */
export interface NodeRelation {
  /** 关联 ID */
  id: string;
  /** 目标节点 ID */
  targetId: string;
  /** 关系类型 */
  type: 'related' | 'prerequisite' | 'extends' | 'contrasts';
  /** 关系描述 */
  label?: string;
  /** 关系强度 (0-1) */
  strength?: number;
}

export interface RoadmapNode {
  id: string;
  label: string;
  // 节点类型: root(根节点) | branch(分支) | leaf(叶子节点) | link(链接) | sub(细分子节点)
  type: 'root' | 'branch' | 'leaf' | 'link' | 'sub';
  children?: RoadmapNode[];
  mdPath?: string;
  url?: string;
  description?: string;
  // 标题级别：2 表示 ##，3 表示 ###，仅用于 branch 类型
  headingLevel?: number;
  // 思维导图元数据（仅 root 节点）
  icon?: string;
  color?: string;
  // 自定义节点样式
  customNodeId?: string;
  customFill?: string;
  customStroke?: string;
  // === 知识图谱扩展 ===
  // 节点关联关系（连线）- 存储在 root 节点中
  connections?: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: 'related' | 'prerequisite' | 'extends' | 'contrasts';
    label?: string;
    createdAt: number;
  }>;
  // 书签数据 - 存储在 root 节点中
  bookmarks?: Array<{
    nodeId: string;
    nodeLabel: string;
    createdAt: number;
    note?: string;
  }>;
  // 节点关联关系（已废弃，保留兼容）
  relations?: NodeRelation[];
  // 标签
  tags?: string[];
  // 难度等级
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  // 学习状态
  status?: 'not_started' | 'learning' | 'mastered' | 'needs_review';
}

/**
 * 异步加载指定思维导图的 index.json 配置文件
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 * @returns 返回节点树数据，连线和书签数据会自动同步到对应的 store
 */
export async function loadRoadmapData(roadmapPath: string): Promise<RoadmapNode> {
  try {
    if (!getDirectoryHandle()) {
      throw new Error('请先选择工作目录');
    }

    const result = await readJsonFile<RoadmapNode>(`${roadmapPath}/index.json`);
    if (result.success && result.data) {
      console.log(`[roadmap] ${roadmapPath}/index.json loaded`);
      
      // 从 root 节点加载连线数据到 connectionStore
      if (result.data.connections && result.data.connections.length > 0) {
        // 动态导入避免循环依赖
        const { useConnectionStore } = await import('../store/connectionStore');
        useConnectionStore.getState().setConnections(roadmapPath, result.data.connections);
        console.log(`[roadmap] 加载了 ${result.data.connections.length} 条连线`);
      }
      
      // 从 root 节点加载书签数据到 bookmarkStore
      if (result.data.bookmarks && result.data.bookmarks.length > 0) {
        // 动态导入避免循环依赖
        const { useBookmarkStore } = await import('../store/bookmarkStore');
        useBookmarkStore.getState().setBookmarks(roadmapPath, result.data.bookmarks);
        console.log(`[roadmap] 加载了 ${result.data.bookmarks.length} 个书签`);
      }
      
      return result.data;
    }
    throw new Error(result.message || '加载失败');
  } catch (err) {
    console.error('[roadmap] load failed:', err);
    return { id: 'root', label: '学习思维导图', type: 'root', children: [] };
  }
}

/**
 * 从 MD 内容提取 ## 二级标题作为细分子节点
 * 注意: 使用完整 idPath 作为前缀确保全局唯一
 * uniqueId: 用于区分同一 mdPath 被多个节点引用的情况
 */
export function extractSubNodesFromMD(mdContent: string, idPath: string, uniqueId?: string): RoadmapNode[] {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const result: RoadmapNode[] = [];
  const prefix = uniqueId ? `${uniqueId}_sub` : idPath;
  
  for (const line of normalized.split('\n')) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      const title = m[1].trim();
      if (title.length > 1 && title !== '概述' && title !== '简介') {
        // 生成唯一 ID：前缀 + 标题 + 计数器
        const baseId = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase();
        const existingCount = result.filter(r => r.id.includes(baseId)).length;
        const uniqueSuffix = existingCount > 0 ? `_${existingCount}` : '';
        
        result.push({
          id: `${prefix}__${baseId}${uniqueSuffix}`,
          label: title,
          type: 'sub',
        });
      }
    }
  }
  return result;
}

/**
 * 为有 mdPath 的 leaf/link 节点动态追加 MD 细分节点
 * 注意: 如果节点已经有 children，则不再动态添加（避免 ID 冲突）
 * @param node 节点数据
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function enrichWithSubNodes(
  node: RoadmapNode, 
  roadmapPath: string
): Promise<RoadmapNode> {
  const newNode = { ...node };

  // 先递归子节点
  if (node.children) {
    newNode.children = await Promise.all(
      node.children.map(c => enrichWithSubNodes(c, roadmapPath))
    );
  }

  // 只有当节点没有子节点时，才动态追加（避免与 JSON 配置中的子节点冲突）
  if (!newNode.children?.length && node.mdPath && (node.type === 'leaf' || node.type === 'link')) {
    try {
      // 读取 MD 文件
      const result = await readFile(`${roadmapPath}/${node.mdPath}.md`);
      if (result.success && result.content) {
        // 使用节点的 id 作为唯一前缀，确保不同节点即使引用同一 MD 也不会 ID 冲突
        const subs = extractSubNodesFromMD(result.content, node.id, node.id);
        if (subs.length > 0) {
          console.log(`[enrich] ${node.label}: +${subs.length} subs`, subs.map(s => s.label));
          newNode.children = subs;
        }
      }
    } catch { /* 静默 */ }
  }

  return newNode;
}
