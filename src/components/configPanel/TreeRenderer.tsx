import React from 'react';
import type { RoadmapNode } from '../../data/roadmapData';
import type { ColorsConfig } from '../../store/configStore';
import TreeNode from './TreeNode';

interface TreeRendererProps {
  nodes: RoadmapNode[];
  depth?: number;
  colors: ColorsConfig;
  searchKeyword: string;
  onFocusNode: (nodeId: string) => void;
  onAddNode?: (parentId: string, parentNode: RoadmapNode | null) => void;
  onEditNode?: (node: RoadmapNode) => void;
  onDeleteNode?: (node: RoadmapNode) => void;
  onPreviewSubNode?: (node: RoadmapNode) => void;
  highlightText: (text: string, keyword: string) => React.ReactNode;
}

const TreeRenderer: React.FC<TreeRendererProps> = ({
  nodes,
  depth = 0,
  colors,
  searchKeyword,
  onFocusNode,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onPreviewSubNode,
  highlightText,
}) => {
  return (
    <>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={depth}
          colors={colors}
          searchKeyword={searchKeyword}
          onFocusNode={onFocusNode}
          onAddNode={onAddNode}
          onEditNode={onEditNode}
          onDeleteNode={onDeleteNode}
          onPreviewSubNode={onPreviewSubNode}
          highlightText={highlightText}
        >
          {node.children && node.children.length > 0 && (
            <TreeRenderer
              nodes={node.children}
              depth={depth + 1}
              colors={colors}
              searchKeyword={searchKeyword}
              onFocusNode={onFocusNode}
              onAddNode={onAddNode}
              onEditNode={onEditNode}
              onDeleteNode={onDeleteNode}
              onPreviewSubNode={onPreviewSubNode}
              highlightText={highlightText}
            />
          )}
        </TreeNode>
      ))}
    </>
  );
};

export default React.memo(TreeRenderer);
