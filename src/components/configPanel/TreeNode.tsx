/**
 * TreeNode - 树节点组件
 * 
 * 用于渲染导航树中的单个节点
 */

import React from 'react';
import type { RoadmapNode } from '../../data/roadmapData';
import type { RoadmapConfig } from '../../store/configStore';
import styles from '../../styles/TreePanel.module.css';

interface TreeNodeProps {
  node: RoadmapNode;
  depth: number;
  colors: RoadmapConfig['colors'];
  searchKeyword: string;
  onFocusNode: (nodeId: string) => void;
  onAddNode?: (parentId: string, parentNode: RoadmapNode | null) => void;
  onEditNode?: (node: RoadmapNode) => void;
  onDeleteNode?: (node: RoadmapNode) => void;
  onPreviewSubNode?: (node: RoadmapNode) => void;
  highlightText: (text: string, keyword: string) => React.ReactNode;
  children?: React.ReactNode;
}

/**
 * 树节点组件
 * 渲染单个节点及其操作按钮
 */
const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  colors,
  searchKeyword,
  onFocusNode,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onPreviewSubNode,
  highlightText,
  children,
}) => {
  const hasChildren = !!node.children?.length;
  const isRoot = node.type === 'root';
  const isSubNode = node.type === 'sub';

  return (
    <div key={node.id}>
      <div
        className={styles.treeNodeContent}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
      >
        <span
          className={styles.treeIcon}
          style={{
            color:
              {
                root: colors.primary,
                branch: colors.primary,
                leaf: colors.success,
                link: colors.warning,
                sub: colors.link,
              }[node.type] || '#888',
          }}
        >
          {node.type === 'root'
            ? '📘'
            : node.type === 'branch'
              ? '📂'
              : node.type === 'leaf'
                ? '🟢'
                : node.type === 'link'
                  ? '🔗'
                  : '📝'}
        </span>
        <span 
          className={styles.treeLabel} 
          title={node.label}
          onClick={() => onFocusNode(node.id)}
        >
          {searchKeyword 
            ? highlightText(node.label.replace(/\n/g, ' ').slice(0, 25), searchKeyword)
            : node.label.replace(/\n/g, ' ').slice(0, 25)}
        </span>
        
        {/* 操作按钮 */}
        <div className={styles.treeNodeActions}>
          {/* sub 类型节点显示预览和编辑按钮 */}
          {isSubNode ? (
            <>
              {onPreviewSubNode && (
                <button
                  className={styles.treeActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewSubNode(node);
                  }}
                  title="预览内容"
                >
                  👁️
                </button>
              )}
              {onEditNode && (
                <button
                  className={styles.treeActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditNode(node);
                  }}
                  title="编辑章节"
                >
                  ✏️
                </button>
              )}
            </>
          ) : (
            <>
              {onAddNode && (
                <button
                  className={styles.treeActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNode(node.id, node);
                  }}
                  title="添加子节点"
                >
                  ➕
                </button>
              )}
              {onEditNode && (
                <button
                  className={styles.treeActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditNode(node);
                  }}
                  title="编辑节点"
                >
                  ✏️
                </button>
              )}
              {onDeleteNode && !isRoot && (
                <button
                  className={`${styles.treeActionBtn} ${styles.treeActionBtnDanger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node);
                  }}
                  title="删除节点"
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {hasChildren && (
        <div className={styles.treeChildren}>{children}</div>
      )}
    </div>
  );
};

export default TreeNode;
