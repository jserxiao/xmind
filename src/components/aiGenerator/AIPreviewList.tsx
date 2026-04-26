/**
 * AI 生成结果预览列表
 * 
 * 显示 AI 生成的节点建议，支持选择和应用
 */

import React, { useState, useMemo } from 'react';
import { Checkbox, Button, Tag, Empty, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, BranchesOutlined, FileTextOutlined } from '@ant-design/icons';
import type { GeneratedNode } from '../../types/ai';

// ═══════════════════════════════════════════════════════════════════════════════
// Props 类型
// ═══════════════════════════════════════════════════════════════════════════════

interface AIPreviewListProps {
  /** 生成的节点列表 */
  nodes: GeneratedNode[];
  /** 应用选中的节点 */
  onApply: (nodes: GeneratedNode[]) => void;
  /** 重新生成 */
  onRegenerate: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const AIPreviewList: React.FC<AIPreviewListProps> = ({
  nodes,
  onApply,
  onRegenerate,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(nodes.filter(n => n.selected).map(n => n.id))
  );

  // 全选/取消全选
  const allSelected = selectedIds.size === nodes.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < nodes.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nodes.map(n => n.id)));
    }
  };

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 选中的节点
  const selectedNodes = useMemo(
    () => nodes.filter(n => selectedIds.has(n.id)),
    [nodes, selectedIds]
  );

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handleToggleAll}
        >
          全选
        </Checkbox>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#999' }}>
          已选择 {selectedIds.size} / {nodes.length} 个
        </span>
      </div>

      {/* 节点列表 */}
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {nodes.map((node, index) => (
          <NodeCard
            key={node.id}
            node={node}
            index={index}
            selected={selectedIds.has(node.id)}
            onToggle={() => handleToggle(node.id)}
          />
        ))}
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button
          onClick={onRegenerate}
          icon={<ReloadOutlined />}
          style={{ flex: 1 }}
        >
          重新生成
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => onApply(selectedNodes)}
          disabled={selectedIds.size === 0}
          style={{ flex: 2 }}
        >
          添加 {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </Button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 节点卡片组件
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeCardProps {
  node: GeneratedNode;
  index: number;
  selected: boolean;
  onToggle: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, index, selected, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        marginBottom: 8,
        background: selected ? '#e6f7ff' : '#fafafa',
        border: `1px solid ${selected ? '#91d5ff' : '#e8e8e8'}`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* 选择框 */}
      <Checkbox checked={selected} style={{ marginTop: 2 }} />

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {node.type === 'branch' ? (
            <BranchesOutlined style={{ color: '#1890ff', fontSize: 12 }} />
          ) : (
            <FileTextOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          )}
          <strong style={{ fontSize: 14 }}>{node.label}</strong>
          <Tag
            color={node.type === 'branch' ? 'blue' : 'green'}
            style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', margin: 0 }}
          >
            {node.type === 'branch' ? '分支' : '叶子'}
          </Tag>
        </div>

        {/* 描述 */}
        {node.description && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            {node.description}
          </div>
        )}

        {/* 关联文件 */}
        {node.mdPath && (
          <div style={{ fontSize: 11, color: '#999' }}>
            📄 {node.mdPath}
          </div>
        )}

        {/* 生成理由 */}
        {node.reasoning && (
          <Tooltip title="AI 生成理由">
            <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 4 }}>
              💡 {node.reasoning}
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default AIPreviewList;
