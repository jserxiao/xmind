/**
 * SortableItem - 可拖拽排序项组件
 * 
 * 用于节点排序功能中的单个拖拽项
 */

import React from 'react';
import { HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RoadmapNode } from '../../data/roadmapData';
import type { RoadmapConfig } from '../../store/configStore';
import { NODE_ICONS, EMOJI } from '../../constants/icons';

interface SortableItemProps {
  id: string;
  node: RoadmapNode;
  index: number;
  colors: RoadmapConfig['colors'];
}

/**
 * 可拖拽排序项组件
 * 提供拖拽手柄和节点信息展示
 */
const SortableItem: React.FC<SortableItemProps> = ({ id, node, index, colors }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: isDragging ? '#e6f7ff' : '#fafafa',
        cursor: 'grab',
      }}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          padding: '0 8px',
          color: '#999',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <HolderOutlined style={{ fontSize: 16 }} />
      </div>
      
      {/* 序号 */}
      <span style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        flexShrink: 0,
      }}>
        {index + 1}
      </span>
      
      {/* 图标和名称 */}
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
        <span style={{
          color: node.type === 'sub' ? colors.link :
                 node.type === 'leaf' ? colors.success :
                 node.type === 'link' ? colors.warning : colors.primary
        }}>
          {NODE_ICONS[node.type] || EMOJI.NOTE}
        </span>
        <span>{node.label}</span>
      </span>
    </div>
  );
};

export default SortableItem;
