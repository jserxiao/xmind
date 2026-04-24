// ===== 树形面板工具函数 =====

import type { TreeNodeItem } from '../types/treeNode';
import { NODE_ICONS, EMOJI } from '../constants/icons';

/** 递归收集需要默认展开的 key（前两层全部展开） */
export function collectExpandKeys(
  nodes: TreeNodeItem[],
  keys: Set<string>,
  depth: number
): void {
  for (const node of nodes) {
    if (depth < 2 && node.children && node.children.length > 0) {
      keys.add(node.id);
      collectExpandKeys(node.children, keys, depth + 1);
    }
  }
}

/** 根据节点类型返回图标 */
export function getNodeIcon(type: string): string {
  return NODE_ICONS[type as keyof typeof NODE_ICONS] || EMOJI.WHITE_CIRCLE;
}

/** 根据节点类型返回颜色 */
export function getNodeColor(type: string): string {
  switch (type) {
    case 'root': return '#1890ff';
    case 'branch': return '#1890ff';
    case 'leaf': return '#52c41a';
    case 'link': return '#fa8c16';
    case 'sub': return '#597ef7';
    default: return '#888';
  }
}
