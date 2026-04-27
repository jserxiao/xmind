/**
 * AI 生成结果预览列表
 * 
 * 显示 AI 生成的节点建议，支持选择和应用
 */

import React, { useState, useMemo } from 'react';
import { Checkbox, Button, Tag, Empty, Tooltip, Select, Space } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, BranchesOutlined, FileTextOutlined, FileAddOutlined, FolderOutlined } from '@ant-design/icons';
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
  /** 父节点是否有 MD 文件 */
  parentHasMd?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const AIPreviewList: React.FC<AIPreviewListProps> = ({
  nodes,
  onApply,
  onRegenerate,
  parentHasMd = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(nodes.filter(n => n.selected).map(n => n.id))
  );

  // 节点的 MD 插入位置设置（允许用户覆盖 AI 建议）
  const [mdInsertPositions, setMdInsertPositions] = useState<Record<string, 'new' | 'parent' | 'none'>>(
    () => {
      const positions: Record<string, 'new' | 'parent' | 'none'> = {};
      nodes.forEach(n => {
        positions[n.id] = n.mdInsertPosition || 'new';
      });
      return positions;
    }
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

  // 选中的节点（包含更新后的 mdInsertPosition）
  const selectedNodes = useMemo(() => {
    return nodes
      .filter(n => selectedIds.has(n.id))
      .map(n => ({
        ...n,
        mdInsertPosition: mdInsertPositions[n.id] || n.mdInsertPosition,
      }));
  }, [nodes, selectedIds, mdInsertPositions]);

  // 更新节点的 MD 插入位置
  const handleMdInsertPositionChange = (nodeId: string, position: 'new' | 'parent' | 'none') => {
    setMdInsertPositions(prev => ({
      ...prev,
      [nodeId]: position,
    }));
  };

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
            parentHasMd={parentHasMd}
            mdInsertPosition={mdInsertPositions[node.id] || node.mdInsertPosition}
            onToggle={() => handleToggle(node.id)}
            onMdInsertPositionChange={handleMdInsertPositionChange}
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
  parentHasMd: boolean;
  mdInsertPosition: 'new' | 'parent' | 'none';
  onToggle: () => void;
  onMdInsertPositionChange: (nodeId: string, position: 'new' | 'parent' | 'none') => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ 
  node, 
  index, 
  selected, 
  parentHasMd,
  mdInsertPosition,
  onToggle,
  onMdInsertPositionChange,
}) => {
  // 阻止事件冒泡的处理器
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        marginBottom: 8,
        background: selected ? '#e6f7ff' : '#fafafa',
        border: `1px solid ${selected ? '#91d5ff' : '#e8e8e8'}`,
        borderRadius: 6,
        transition: 'all 0.2s',
      }}
    >
      {/* 选择框 - 点击切换选中状态 */}
      <Checkbox 
        checked={selected} 
        style={{ marginTop: 2, cursor: 'pointer' }}
        onClick={onToggle}
      />

      {/* 内容区域 - 点击也可以切换选中状态 */}
      <div 
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={onToggle}
      >
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

        {/* MD 插入位置选择（仅当选中时显示） */}
        {selected && (
          <div 
            style={{ marginTop: 8 }} 
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
          >
            <Space size={4}>
              <span style={{ fontSize: 11, color: '#999' }}>MD 文件：</span>
              <Select
                size="small"
                value={mdInsertPosition}
                onChange={(value) => onMdInsertPositionChange(node.id, value)}
                style={{ width: 140 }}
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                options={[
                  { value: 'new', label: <><FileAddOutlined /> 新建文件</> },
                  ...(parentHasMd ? [{ value: 'parent', label: <><FolderOutlined /> 插入父级 MD</> }] : []),
                  { value: 'none', label: <><CloseOutlined /> 不需要 MD</> },
                ]}
              />
            </Space>
            {mdInsertPosition === 'parent' && node.mdInsertAfter && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                建议插入位置：{node.mdInsertAfter} 之后
              </div>
            )}
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
