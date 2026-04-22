// 学习思维导图数据
// 数据源: /{rootPath}/{roadmapPath}/index.json

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
}

/**
 * 异步加载指定思维导图的 index.json 配置文件
 * @param rootPath 根文件夹路径（如 'md'）
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function loadRoadmapData(rootPath: string, roadmapPath: string): Promise<RoadmapNode> {
  try {
    const res = await fetch(`/${rootPath}/${roadmapPath}/index.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`[roadmap] ${rootPath}/${roadmapPath}/index.json loaded`);
    return data as RoadmapNode;
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
 * @param rootPath 根文件夹路径（如 'md'）
 * @param roadmapPath 思维导图路径（如 'go-learning-roadmap'）
 */
export async function enrichWithSubNodes(
  node: RoadmapNode, 
  rootPath: string, 
  roadmapPath: string
): Promise<RoadmapNode> {
  const newNode = { ...node };

  // 先递归子节点
  if (node.children) {
    newNode.children = await Promise.all(
      node.children.map(c => enrichWithSubNodes(c, rootPath, roadmapPath))
    );
  }

  // 只有当节点没有子节点时，才动态追加（避免与 JSON 配置中的子节点冲突）
  if (!newNode.children?.length && node.mdPath && (node.type === 'leaf' || node.type === 'link')) {
    try {
      // 使用完整路径：/{rootPath}/{roadmapPath}/{mdPath}
      const res = await fetch(`/${rootPath}/${roadmapPath}/${node.mdPath}`);
      if (res.ok) {
        const text = await res.text();
        // 使用节点的 id 作为唯一前缀，确保不同节点即使引用同一 MD 也不会 ID 冲突
        const subs = extractSubNodesFromMD(text, node.id, node.id);
        if (subs.length > 0) {
          console.log(`[enrich] ${node.label}: +${subs.length} subs`, subs.map(s => s.label));
          newNode.children = subs;
        }
      }
    } catch { /* 静默 */ }
  }

  return newNode;
}
