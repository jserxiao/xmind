// ===== 树形面板中展示的节点信息 =====

export interface TreeNodeItem {
  id: string;
  label: string;
  type: string;
  children?: TreeNodeItem[];
}
