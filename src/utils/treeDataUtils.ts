/**
 * 思维导图数据转换工具函数
 *
 * 数据流：RoadmapNode (应用层节点类型) → NodeModel (G6 渲染引擎可用的格式)
 * 这些是纯函数，无副作用，方便单独测试。
 *
 * 节点类型映射：
 *   root   → root-node   (根节点，蓝色大尺寸)
 *   branch → branch-node (分支节点，浅蓝色中尺寸)
 *   leaf   → leaf-node   (叶子节点，绿色胶囊形)
 *   link   → link-node   (链接节点，黄色虚线边框)
 *   sub    → sub-node    (子节点，小尺寸浅蓝，由 MD 标题动态生成)
 */

import type { RoadmapNode } from '../data/roadmapData';
import type { NodeModel } from '../core/GraphManager';

// ═══════════════════════════════════════════════════════════════════════════════
// Sub 节点 ID 生成
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成 sub 节点的唯一标识符
 *
 * ID 格式：{parentNodeId}_sub__{slugifiedTitle}
 * 例如：父节点 ID 为 "node1"，标题为 "环境搭建" → "node1_sub__环境搭建"
 *
 * 注意：ID 由标题 slug 组成，标题修改后 ID 会变化。
 *       调用方（useNodeSave）在标题变更时会同步更新书签中的旧 ID。
 *
 * @param parentNodeId 父节点 ID
 * @param title        子节点标题（通常是 MD 中的 ## 标题）
 * @returns           全局唯一的 sub 节点 ID
 */
export function generateSubNodeId(parentNodeId: string, title: string): string {
  const prefix = `${parentNodeId}_sub`;
  // 将标题中的非字母数字汉字字符替换为下划线，确保 ID 不含特殊字符
  const baseId = title.replace(/[^a-zA-Z0-9一-龥]/g, '_').toLowerCase();
  return `${prefix}__${baseId}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 树数据转换
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 将 RoadmapNode 树递归转换为 G6 TreeGraph 可用的 NodeModel 树
 *
 * 转换过程：
 * 1. 扁平化应用层字段（label、mdPath、url 等）到 NodeModel
 * 2. 根据 originalType 映射到对应的 G6 节点类型和尺寸
 * 3. 检查节点是否在书签集合中，设置 hasBookmark 标记
 * 4. 递归处理子节点
 *
 * 每次画布刷新时调用此函数，将最新的数据状态同步到 G6 渲染层。
 *
 * @param node            应用层节点树的根节点
 * @param bookmarkIdsSet  当前书签节点 ID 集合（用于高亮标记）
 * @returns              G6 可渲染的节点树
 */
export function convertToTreeData(node: RoadmapNode, bookmarkIdsSet: Set<string>): NodeModel {
  const nodeData: NodeModel = {
    id: node.id,
    label: node.label,
    mdPath: node.mdPath,
    url: node.url,
    description: node.description,
    originalType: node.type,
    hasBookmark: bookmarkIdsSet.has(node.id),
    // 自定义节点样式（来自自定义节点设计器）
    customNodeId: node.customNodeId,
    customFill: node.customFill,
    customStroke: node.customStroke,
  };

  // 节点类型 → G6 注册节点类型 + 固定尺寸的映射
  // size=[宽, 高] 决定了 G6 布局计算时的节点占位
  switch (node.type) {
    case 'root':
      nodeData.type = 'root-node';
      nodeData.size = [220, 70];
      break;
    case 'branch':
      nodeData.type = 'branch-node';
      nodeData.size = [130, 40];
      break;
    case 'leaf':
      nodeData.type = 'leaf-node';
      nodeData.size = [160, 36];
      break;
    case 'link':
      nodeData.type = 'link-node';
      nodeData.size = [150, 30];
      break;
    case 'sub':
      nodeData.type = 'sub-node';
      nodeData.size = [120, 26];
      break;
  }

  // 递归转换子节点，保持树结构
  if (node.children?.length) {
    nodeData.children = node.children.map(n => convertToTreeData(n, bookmarkIdsSet));
  }

  return nodeData;
}
