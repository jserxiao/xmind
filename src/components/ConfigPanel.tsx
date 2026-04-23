/**
 * ConfigPanel - 配置栏组件
 * 
 * 左侧可折叠的配置面板，包含：
 * - 工具栏按钮（缩放、导出等）
 * - 节点导航面板
 * - 配置项（颜色、尺寸等）
 * - 批量操作
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Input, Spin, Dropdown, Modal, Tree, message, Tooltip, Select } from 'antd';
import type { TreeProps, TreeDataNode } from 'antd';
import { SearchOutlined, DownOutlined, UndoOutlined, RedoOutlined, OrderedListOutlined, SettingOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useConfigStore } from '../store/configStore';
import type { RoadmapNode } from '../data/roadmapData';
import {
  collectNodesWithMdPath,
  searchMdContent,
  type MdSearchResult,
} from '../utils/nodeUtils';
import HistoryPanel from './HistoryPanel';
import ShortcutConfigModal from './ShortcutConfigModal';

// 子组件
import SortableItem from './configPanel/SortableItem';
import MdSearchResults from './configPanel/MdSearchResults';
import ConfigSettingsPanel from './configPanel/ConfigSettingsPanel';
import TreeRenderer from './configPanel/TreeRenderer';

// ═══════════════════════════════════════════════════════════════════════════════
// 组件 Props
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfigPanelProps {
  /** 节点数据（用于导航面板） */
  rawData: RoadmapNode | null;
  /** 聚焦节点回调 */
  onFocusNode: (nodeId: string) => void;
  /** 工具栏操作 */
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExportJPG: () => void;
  onExportPDF: () => void;
  /** 撤销/恢复操作 */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** 节点编辑操作 */
  onAddNode?: (parentId: string, parentNode: RoadmapNode | null) => void;
  onEditNode?: (node: RoadmapNode) => void;
  onDeleteNode?: (node: RoadmapNode) => void;
  /** 预览 sub 节点回调 */
  onPreviewSubNode?: (node: RoadmapNode) => void;
  /** 批量删除节点回调 */
  onBatchDeleteNodes?: (nodeIds: string[]) => Promise<void>;
  /** 节点排序回调 */
  onReorderNodes?: (parentId: string, newChildren: RoadmapNode[]) => Promise<void>;
  /** 跳转到指定历史状态 */
  onJumpToHistory?: (tree: RoadmapNode) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════════════════════

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  rawData,
  onFocusNode,
  onFitView,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExportJPG,
  onExportPDF,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onPreviewSubNode,
  onBatchDeleteNodes,
  onReorderNodes,
  onJumpToHistory,
}) => {
  // ── 状态 ──
  const [activeTab, setActiveTab] = useState<'nav' | 'config' | 'history'>('nav');
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [mdSearchResults, setMdSearchResults] = useState<MdSearchResult[]>([]);
  const [isSearchingMd, setIsSearchingMd] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 批量删除相关状态
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // 排序相关状态
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderParentId, setReorderParentId] = useState<string>('');
  const [reorderChildren, setReorderChildren] = useState<RoadmapNode[]>([]);
  const [reordering, setReordering] = useState(false);
  
  // ── Store ──
  const {
    panelExpanded,
    togglePanel,
    getCurrentConfig,
    updateColors,
    updateLayout,
    updateZoom,
    resetCurrentConfig,
  } = useConfigStore();
  
  // 获取当前思维导图的配置
  const currentConfig = getCurrentConfig();
  const colors = currentConfig.colors;
  const layout = currentConfig.layout;
  const zoom = currentConfig.zoom;
  
  // 包装 updateColors 以添加日志
  const handleUpdateColors = useCallback((updates: Partial<typeof colors>) => {
    console.log('[ConfigPanel] 更新颜色', updates);
    updateColors(updates);
  }, [updateColors]);
  
  // ── 搜索过滤 ──
  const filteredData = useMemo(() => {
    if (!rawData || !searchKeyword.trim()) return rawData;
    
    const keyword = searchKeyword.toLowerCase().trim();
    
    function filterNode(node: RoadmapNode): RoadmapNode | null {
      // 检查当前节点是否匹配
      const labelMatch = node.label.toLowerCase().includes(keyword);
      const descMatch = node.description?.toLowerCase().includes(keyword);
      
      // 递归过滤子节点
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((n): n is RoadmapNode => n !== null);
      
      // 如果当前节点匹配或有匹配的子节点，保留
      if (labelMatch || descMatch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      
      return null;
    }
    
    const result = filterNode(rawData);
    return result;
  }, [rawData, searchKeyword]);
  
  // ── MD 内容搜索 ──
  // 收集所有有 mdPath 的节点
  const nodesWithMdPath = useMemo(() => {
    if (!rawData) return [];
    return collectNodesWithMdPath(rawData);
  }, [rawData]);
  
  // 异步搜索 MD 内容
  useEffect(() => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 如果搜索词为空，清空结果
    if (!searchKeyword.trim()) {
      // 使用 setTimeout 避免在 effect 中直接调用 setState
      searchTimeoutRef.current = setTimeout(() => {
        setMdSearchResults([]);
      }, 0);
      return;
    }
    
    // 防抖：延迟 300ms 后执行搜索
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingMd(true);
      try {
        const results = await searchMdContent(searchKeyword, nodesWithMdPath);
        setMdSearchResults(results);
      } catch (error) {
        console.error('[ConfigPanel] MD 搜索失败:', error);
        setMdSearchResults([]);
      } finally {
        setIsSearchingMd(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchKeyword, nodesWithMdPath]);
  
  // 高亮匹配文本
  const highlightText = useCallback((text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + keyword.length);
    const after = text.slice(index + keyword.length);
    
    return (
      <>
        {before}
        <span className="tree-label-highlight">{match}</span>
        {after}
      </>
    );
  }, []);
  
  // ── 将节点数据转换为 Tree 结构(用于批量删除弹窗) ──
  const treeData = useMemo(() => {
    if (!rawData) return [];
    
    const convertNode = (node: RoadmapNode): TreeDataNode => {
      const isRoot = node.type === 'root';
      return {
        key: node.id,
        title: (
          <span>
            {node.label.replace(/\n/g, ' ').slice(0, 20)}
            {isRoot && <span style={{ color: '#999', marginLeft: 4 }}>(根节点)</span>}
          </span>
        ),
        disabled: isRoot, // 根节点不可删除
        children: node.children?.map(convertNode),
      };
    };
    
    return [convertNode(rawData)];
  }, [rawData]);
  
  // ── 批量操作菜单项 ──
  const batchMenuItems = [
    {
      key: 'batchDelete',
      label: '批量删除节点',
      icon: <span>🗑️</span>,
      onClick: () => {
        setSelectedNodeIds([]);
        setBatchDeleteModalOpen(true);
      },
    },
    {
      key: 'reorderNodes',
      label: '节点排序',
      icon: <OrderedListOutlined />,
      onClick: () => {
        // 默认选择根节点的子节点进行排序
        if (rawData) {
          setReorderParentId(rawData.id);
          setReorderChildren(rawData.children || []);
          setReorderModalOpen(true);
        }
      },
    },
  ];
  
  // ── 排序相关函数 ──
  
  // 查找节点
  const findNodeById = useCallback((node: RoadmapNode, id: string): RoadmapNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }, []);
  
  // 选择要排序的父节点
  const handleSelectReorderParent = useCallback((nodeId: string) => {
    if (!rawData) return;
    const node = findNodeById(rawData, nodeId);
    if (node && node.children && node.children.length > 0) {
      setReorderParentId(nodeId);
      setReorderChildren([...node.children]);
    } else {
      message.info('该节点没有子节点可以排序');
    }
  }, [rawData, findNodeById]);
  
  // dnd-kit 拖拽配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 移动 5px 后才开始拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 拖拽结束处理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = reorderChildren.findIndex(child => child.id === active.id);
      const newIndex = reorderChildren.findIndex(child => child.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newChildren = arrayMove(reorderChildren, oldIndex, newIndex);
        setReorderChildren(newChildren);
      }
    }
  }, [reorderChildren]);
  
  // 确认排序
  const handleReorderConfirm = async () => {
    if (!onReorderNodes) return;
    
    setReordering(true);
    try {
      await onReorderNodes(reorderParentId, reorderChildren);
      message.success('排序已保存');
      setReorderModalOpen(false);
    } catch (error) {
      message.error('排序保存失败');
      console.error('排序保存失败:', error);
    } finally {
      setReordering(false);
    }
  };
  
  // ── 处理批量删除确认 ──
  const handleBatchDeleteConfirm = async () => {
    if (selectedNodeIds.length === 0) {
      message.warning('请选择要删除的节点');
      return;
    }
    
    setBatchDeleting(true);
    try {
      if (onBatchDeleteNodes) {
        await onBatchDeleteNodes(selectedNodeIds);
        message.success(`成功删除 ${selectedNodeIds.length} 个节点`);
        setBatchDeleteModalOpen(false);
        setSelectedNodeIds([]);
      }
    } catch (error) {
      message.error('删除失败');
      console.error('批量删除失败:', error);
    } finally {
      setBatchDeleting(false);
    }
  };
  
  // ── 处理树选择 ──
  const handleTreeCheck: TreeProps['onCheck'] = (checkedKeys) => {
    setSelectedNodeIds(checkedKeys as string[]);
  };
  
  // ── 收起状态只显示展开按钮 ──
  if (!panelExpanded) {
    return (
      <div className="config-panel config-panel-collapsed">
        <button className="config-toggle-btn" onClick={togglePanel} title="展开配置栏">
          ▶
        </button>
      </div>
    );
  }
  
  return (
    <div className="config-panel config-panel-expanded">
      {/* 折叠按钮 */}
      <button className="config-toggle-btn config-toggle-collapse" onClick={togglePanel} title="收起配置栏">
        ◀
      </button>
      
      {/* 工具栏 */}
      <div className="config-toolbar">
        <button onClick={onFitView} className="config-tool-btn" title="适应画布">
          ⊞ 适应
        </button>
        <button onClick={onZoomIn} className="config-tool-btn" title="放大">
          🔍+
        </button>
        <button onClick={onZoomOut} className="config-tool-btn" title="缩小">
          🔍−
        </button>
        <button onClick={onResetZoom} className="config-tool-btn" title="实际大小">
          1:1
        </button>
        
        {/* 撤销/恢复按钮 */}
        <div className="config-toolbar-divider" />
        <Tooltip title={canUndo ? '撤销 (Ctrl+Z)' : '没有可撤销的操作'}>
          <button 
            onClick={onUndo} 
            className={`config-tool-btn ${!canUndo ? 'config-tool-btn-disabled' : ''}`}
            disabled={!canUndo}
          >
            <UndoOutlined />
          </button>
        </Tooltip>
        <Tooltip title={canRedo ? '恢复 (Ctrl+Y)' : '没有可恢复的操作'}>
          <button 
            onClick={onRedo} 
            className={`config-tool-btn ${!canRedo ? 'config-tool-btn-disabled' : ''}`}
            disabled={!canRedo}
          >
            <RedoOutlined />
          </button>
        </Tooltip>
        
        {/* 批量操作下拉菜单 */}
        <Dropdown
          menu={{ items: batchMenuItems }}
          trigger={['click']}
        >
          <button className="config-tool-btn config-tool-btn-dropdown" title="批量操作">
            ⚡ 批量 <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
          </button>
        </Dropdown>
        
        {/* 导出按钮 */}
        <div className="config-toolbar-divider" />
        <button onClick={onExportJPG} className="config-tool-btn" title="导出JPG">
          📷 JPG
        </button>
        <button onClick={onExportPDF} className="config-tool-btn" title="导出PDF">
          📄 PDF
        </button>
        
        {/* 快捷键设置按钮 */}
        <Tooltip title="快捷键设置">
          <button 
            className="config-tool-btn" 
            onClick={() => setShortcutModalOpen(true)}
            style={{ marginLeft: 'auto' }}
          >
            <SettingOutlined />
          </button>
        </Tooltip>
      </div>
      
      {/* Tab 切换 */}
      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'nav' ? 'active' : ''}`}
          onClick={() => setActiveTab('nav')}
        >
          🌳 导航
        </button>
        <button
          className={`config-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ 配置
        </button>
        <button
          className={`config-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 历史
        </button>
      </div>
      
      {/* Tab 内容 */}
      <div className="config-content">
        {activeTab === 'history' ? (
          <HistoryPanel onJumpToHistory={onJumpToHistory} />
        ) : activeTab === 'nav' ? (
          // 节点导航面板
          <div className="config-nav-panel">
            {/* 搜索框 */}
            <div className="tree-search-box">
              <Input
                placeholder="搜索节点或文档内容..."
                prefix={<SearchOutlined />}
                suffix={isSearchingMd ? <Spin size="small" /> : null}
                value={searchKeyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                allowClear
                size="small"
              />
            </div>
            
            {/* MD 内容搜索结果 */}
            <MdSearchResults
              results={mdSearchResults}
              searchKeyword={searchKeyword}
              onFocusNode={onFocusNode}
              highlightText={highlightText}
            />
            
            {filteredData ? (
              <div className="tree-panel-body">
                <TreeRenderer
                  nodes={[filteredData]}
                  colors={colors}
                  searchKeyword={searchKeyword}
                  onFocusNode={onFocusNode}
                  onAddNode={onAddNode}
                  onEditNode={onEditNode}
                  onDeleteNode={onDeleteNode}
                  onPreviewSubNode={onPreviewSubNode}
                  highlightText={highlightText}
                />
              </div>
            ) : (
              <div className="config-loading">
                {searchKeyword ? '未找到匹配的节点' : '加载中...'}
              </div>
            )}
          </div>
        ) : (
          // 配置面板
          <ConfigSettingsPanel
            colors={colors}
            layout={layout}
            zoom={zoom}
            onUpdateColors={handleUpdateColors}
            onUpdateLayout={updateLayout}
            onUpdateZoom={updateZoom}
            onResetConfig={resetCurrentConfig}
          />
        )}
      </div>
      
      {/* 快捷键配置弹窗 */}
      <ShortcutConfigModal
        open={shortcutModalOpen}
        onClose={() => setShortcutModalOpen(false)}
      />
      
      {/* 批量删除弹窗 */}
      <Modal
        title="批量删除节点"
        open={batchDeleteModalOpen}
        onOk={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteModalOpen(false)}
        okText="删除"
        okButtonProps={{ danger: true, loading: batchDeleting }}
        cancelText="取消"
        width={500}
      >
        <p style={{ marginBottom: 12 }}>请选择要删除的节点（根节点不可删除）：</p>
        <Tree
          checkable
          checkedKeys={selectedNodeIds}
          onCheck={handleTreeCheck}
          treeData={treeData}
          defaultExpandAll
          style={{ maxHeight: 400, overflow: 'auto' }}
        />
        {selectedNodeIds.length > 0 && (
          <p style={{ marginTop: 12, color: '#ff4d4f' }}>
            已选择 {selectedNodeIds.length} 个节点
          </p>
        )}
      </Modal>
      
      {/* 节点排序弹窗 */}
      <Modal
        title="节点排序"
        open={reorderModalOpen}
        onOk={handleReorderConfirm}
        onCancel={() => setReorderModalOpen(false)}
        okText="保存"
        okButtonProps={{ loading: reordering }}
        cancelText="取消"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>选择父节点：</label>
          <Select
            style={{ width: '100%' }}
            value={reorderParentId}
            onChange={handleSelectReorderParent}
            options={
              rawData ? [{
                value: rawData.id,
                label: `${rawData.label.replace(/\n/g, ' ').slice(0, 30)} (根节点)`,
              }] : []
            }
          />
        </div>
        
        {reorderChildren.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              拖拽调整子节点顺序：
            </label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={reorderChildren.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {reorderChildren.map((node, index) => (
                  <SortableItem
                    key={node.id}
                    id={node.id}
                    node={node}
                    index={index}
                    colors={colors}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ConfigPanel;
