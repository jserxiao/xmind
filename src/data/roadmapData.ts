// Go 学习路线图数据
// 数据源: /public/md/index.md
// 从 Markdown 层级标题动态解析树形结构

export interface RoadmapNode {
  id: string;
  label: string;
  // 节点类型: root(根节点) | branch(分支) | leaf(叶子节点) | link(链接) | sub(细分子节点)
  type: 'root' | 'branch' | 'leaf' | 'link' | 'sub';
  children?: RoadmapNode[];
  mdPath?: string;
  url?: string;
  description?: string;
}

// 原始列表项（保留原始文本用于二次解析）
interface RawLeaf {
  parentLevel: number;
  rawContent: string;
  siblingIndex: number; // 同级兄弟中的序号（用于去重ID）
}

/**
 * 从 index.md 解析出树形 RoadmapNode 结构
 *
 * 格式规则:
 *   # 标题        -> 根节点
 *   ## 标题       -> 一级分支 (branch)
 *   ### 标题      -> 二级分支 (branch)
 *   - 列表项      -> 叶子节点 (leaf/link)
 *
 * 列表项格式:
 *   [文字](URL) | md路径 | 描述     -> link
 *   文字 | md路径 | 描述           -> leaf
 *   [文字](URL) | 描述             -> link
 *   文字 | 描述                     -> leaf
 */
export function parseIndexMd(mdContent: string): RoadmapNode {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  let rootLabel = 'Go 学习路线图';
  // 分支: level(2=##, 3=###) + label
  const branches: { level: number; label: string }[] = [];
  // 叶子: parentLevel + rawContent + siblingIndex
  const leaves: RawLeaf[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // # 根标题
    const h1 = t.match(/^#\s+(.+)$/);
    if (h1) { rootLabel = h1[1].trim(); continue; }

    // ## / ### 分支
    const hn = t.match(/^(#{2,3})\s+(.+)$/);
    if (hn) {
      branches.push({ level: hn[1].length, label: hn[2].trim() });
      continue;
    }

    // - 列表项
    const li = t.match(/^-\s+(.+)$/);
    if (li) {
      const parentLevel = branches.length > 0 ? branches[branches.length - 1].level : 2;
      // 计算同级 siblingIndex（同一 parentLevel 下已有多少个叶子）
      const sibCount = leaves.filter(l => l.parentLevel === parentLevel).length;
      leaves.push({ parentLevel, rawContent: li[1].trim(), siblingIndex: sibCount });
      continue;
    }
  }

  return buildTree(rootLabel, branches, leaves);
}

/**
 * 解析单条列表项
 * siblingIdx: 同组内的序号，用于区分同名节点
 * branchPrefix: 父级分支名的简写前缀，用于全局唯一性
 */
function parseLeaf(raw: string, siblingIdx: number, branchPrefix?: string): (Omit<RoadmapNode, 'type'> & { isLink: boolean }) | null {
  let label = '';
  let url: string | undefined;
  let mdPath: string | undefined;
  let desc: string | undefined;

  // [label](url) ...
  const m = raw.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (m) {
    label = m[1].trim();
    url = m[2].trim();
    const rest = m[3].trim();
    if (rest) {
      const p = rest.split('|').map(s => s.trim());
      if (p[0]?.endsWith('.md')) { mdPath = p[0]; desc = p[1]; }
      else { desc = p[0]; }
    }
  } else {
    const p = raw.split('|').map(s => s.trim());
    label = p[0] || '';
    if (p[1]) {
      if (p[1].endsWith('.md')) { mdPath = p[1]; desc = p[2]; }
      else { desc = p[1]; }
    }
  }

  if (!label) return null;

  const baseId = label
    .replace(/[《》【】（）()\[\]]/g, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .toLowerCase()
    .slice(0, 40);

  // 用 branchPrefix + baseId + siblingIdx 组合确保全局唯一
  const prefix = branchPrefix ? `${branchPrefix}__` : '';
  return {
    id: `${prefix}${baseId}_${siblingIdx}`,
    label,
    url,
    mdPath,
    description: desc,
    isLink: !!url,
  };
}

/**
 * 用栈构建树形结构
 */
function buildTree(
  rootLabel: string,
  branches: { level: number; label: string }[],
  leaves: RawLeaf[],
): RoadmapNode {
  const root: RoadmapNode = {
    id: 'root',
    label: rootLabel + '\n(@煎鱼)',
    type: 'root',
    children: [],
  };

  interface StackItem { node: RoadmapNode; level: number; }
  const stack: StackItem[] = [{ node: root, level: 1 }];
  let li = 0;

  for (const br of branches) {
    const bNode: RoadmapNode = {
      id: br.label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase().slice(0, 50),
      label: br.label,
      type: 'branch',
      children: [],
    };

    // 弹栈到合适的父级
    while (stack.length > 1 && stack[stack.length - 1].level >= br.level) stack.pop();
    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(bNode);
    stack.push({ node: bNode, level: br.level });

    // 收集属于此分支的叶子
    while (li < leaves.length && leaves[li].parentLevel === br.level) {
      const raw = leaves[li];
      // 用父级分支名生成短前缀
      const bp = br.label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase().slice(0, 20);
      const parsed = parseLeaf(raw.rawContent, raw.siblingIndex, bp);
      if (parsed) {
        bNode.children!.push({
          ...parsed,
          type: parsed.isLink ? 'link' : 'leaf',
        });
      }
      li++;
    }
  }

  return root;
}

/**
 * 异步加载并解析 index.md
 */
export async function loadRoadmapData(): Promise<RoadmapNode> {
  try {
    const res = await fetch('/md/index.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    console.log('[roadmap] index.md loaded');
    return parseIndexMd(text);
  } catch (err) {
    console.error('[roadmap] load failed:', err);
    return { id: 'root', label: 'Go 学习路线图\n(@煎鱼)', type: 'root', children: [] };
  }
}

/**
 * 从 MD 内容提取 ## 二级标题作为细分子节点
 * 注意: 使用完整 idPath 作为前缀确保全局唯一
 */
export function extractSubNodesFromMD(mdContent: string, idPath: string): RoadmapNode[] {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const result: RoadmapNode[] = [];
  for (const line of normalized.split('\n')) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      const title = m[1].trim();
      if (title.length > 1 && title !== '概述' && title !== '简介') {
        result.push({
          // 用完整的 idPath + 确保唯一
          id: `${idPath}__${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase()}`,
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
 */
export async function enrichWithSubNodes(node: RoadmapNode): Promise<RoadmapNode> {
  const newNode = { ...node };

  // 先递归子节点
  if (node.children) {
    newNode.children = await Promise.all(node.children.map(c => enrichWithSubNodes(c)));
  }

  // 再追加动态子节点
  if (node.mdPath && (node.type === 'leaf' || node.type === 'link')) {
    try {
      const res = await fetch(`/md/${node.mdPath}`);
      if (res.ok) {
        const text = await res.text();
        const subs = extractSubNodesFromMD(text, node.id);
        if (subs.length > 0) {
          console.log(`[enrich] ${node.label}: +${subs.length} subs`, subs.map(s => s.label));
          newNode.children = [...(newNode.children || []), ...subs];
        }
      }
    } catch { /* 静默 */ }
  }

  return newNode;
}
