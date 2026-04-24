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
import { Input, Spin, Dropdown, Modal, Tree, message, Tooltip, Select, Upload } from 'antd';
import type { TreeProps, TreeDataNode } from 'antd';
import { SearchOutlined, UndoOutlined, RedoOutlined, OrderedListOutlined, SettingOutlined } from '@ant-design/icons';
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
import { useBookmarkStore } from '../store/bookmarkStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useMinimapStore } from '../store/minimapStore';
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
import ThemeConfigModal from './configPanel/ThemeConfigModal';
import WatermarkConfigModal from './configPanel/WatermarkConfigModal';
import BookmarkManagerModal from './configPanel/BookmarkManagerModal';
import CustomNodeManagerModal from './customNodeEditor/CustomNodeManagerModal';
import {
  exportAllData,
  downloadBackupFile,
  readBackupFile,
  importBackupData,
  getBackupSize,
  type RoadmapNodeData,
} from '../utils/backup';
import { writeJsonFile, getDirectoryHandle } from '../utils/fileSystem';
import styles from '../styles/ConfigPanel.module.css';
import treeStyles from '../styles/TreePanel.module.css';

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
  
  // 备份相关状态
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importOptions, setImportOptions] = useState({
    history: true,
    shortcuts: true,
    bookmarks: true,
    configs: true,
    roadmapNodes: true,
    watermark: true,
    minimap: true,
  });
  
  // 水印相关状态
  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  
  // 书签管理状态
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  
  // 自定义节点管理状态
  const [customNodeModalOpen, setCustomNodeModalOpen] = useState(false);
  
  // 主题设置状态
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  
  // ── Store ──
  const {
    panelExpanded,
    togglePanel,
    getCurrentConfig,
    updateLayout,
    updateZoom,
    resetCurrentConfig,
  } = useConfigStore();
  
  // 书签 Store
  const currentRoadmapId = useBookmarkStore((state) => state.currentRoadmapId);
  
  // Roadmap Store - 获取当前思维导图路径
  const currentRoadmap = useRoadmapStore((state) => state.currentRoadmap);
  
  // 小地图 Store
  const minimapConfig = useMinimapStore((state) => state.config);
  const toggleMinimap = useMinimapStore((state) => state.toggleEnabled);
  
  // 获取当前思维导图的配置
  const currentConfig = getCurrentConfig();
  const colors = currentConfig.colors;
  const layout = currentConfig.layout;
  const zoom = currentConfig.zoom;
  
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
        <span className={treeStyles.treeLabelHighlight}>{match}</span>
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
      key: 'exportJPG',
      label: '导出 JPG',
      icon: <span>📷</span>,
      onClick: onExportJPG,
    },
    {
      key: 'exportPDF',
      label: '导出 PDF',
      icon: <span>📄</span>,
      onClick: onExportPDF,
    },
    { type: 'divider' as const },
    {
      key: 'themeConfig',
      label: '主题设置',
      icon: <span>🎨</span>,
      onClick: () => setThemeModalOpen(true),
    },
    {
      key: 'watermarkConfig',
      label: '水印设置',
      icon: <span>💧</span>,
      onClick: () => setWatermarkModalOpen(true),
    },
    { type: 'divider' as const },
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
    {
      key: 'manageBookmarks',
      label: '管理书签',
      icon: <span>🔖</span>,
      onClick: () => setBookmarkModalOpen(true),
    },
    {
      key: 'manageCustomNodes',
      label: '自定义节点',
      icon: <span>🎨</span>,
      onClick: () => setCustomNodeModalOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'exportBackup',
      label: '导出备份',
      icon: <span>💾</span>,
      onClick: () => setBackupModalOpen(true),
    },
    {
      key: 'importBackup',
      label: '导入备份',
      icon: <span>📂</span>,
      onClick: () => setImportModalOpen(true),
    },
  ];
  
  // ── 备份相关函数 ──
  
  // 导出备份
  const handleExportBackup = useCallback(() => {
    try {
      // 准备节点数据（包含路径信息）
      const roadmapNodesData = rawData ? [{
        id: currentRoadmapId || 'unknown',
        name: rawData.label || '未命名',
        path: currentRoadmap?.path || '',
        nodeTree: rawData,
        exportedAt: Date.now(),
      }] : [];
      
      const data = exportAllData(roadmapNodesData);
      downloadBackupFile(data);
      message.success(`备份已导出 (${getBackupSize(data)} KB)`);
      setBackupModalOpen(false);
    } catch (error) {
      message.error('导出失败');
      console.error('[ConfigPanel] 导出备份失败:', error);
    }
  }, [rawData, currentRoadmapId, currentRoadmap]);
  
  // 导入备份
  const handleImportBackup = useCallback(async (file: File) => {
    try {
      const data = await readBackupFile(file);
      
      // 检查是否包含节点数据
      const hasRoadmapNodes = data.roadmapNodes && data.roadmapNodes.length > 0;
      
      // 如果有节点数据，需要用户确认是否覆盖当前数据
      if (hasRoadmapNodes && importOptions.roadmapNodes) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '确认导入节点数据',
            content: `备份中包含 ${data.roadmapNodes.length} 个思维导图的节点数据。导入将会覆盖当前的节点数据，是否继续？`,
            okText: '确认导入',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        
        if (!confirmed) {
          return false;
        }
      }
      
      // 写入节点数据的回调函数
      const writeNodeData = async (roadmapId: string, nodeTree: any): Promise<boolean> => {
        try {
          const dirHandle = getDirectoryHandle();
          if (!dirHandle) {
            console.warn('[ConfigPanel] 没有目录句柄，无法写入节点数据');
            return false;
          }
          
          // 写入到当前思维导图（如果 ID 匹配）
          if (currentRoadmapId && roadmapId === currentRoadmapId && currentRoadmap) {
            // 使用当前思维导图的路径
            const indexPath = `${currentRoadmap.path}/index.json`;
            console.log(`[ConfigPanel] 写入当前节点数据到: ${indexPath}`);
            await writeJsonFile(indexPath, nodeTree);
            console.log(`[ConfigPanel] 已写入当前节点数据`);
            return true;
          } else {
            // 尝试按照备份中的路径写入
            const roadmapNode = data.roadmapNodes?.find((r: RoadmapNodeData) => r.id === roadmapId);
            if (roadmapNode?.path) {
              const indexPath = `${roadmapNode.path}/index.json`;
              console.log(`[ConfigPanel] 写入节点数据到: ${indexPath}`);
              await writeJsonFile(indexPath, nodeTree);
              console.log(`[ConfigPanel] 已写入节点数据: ${indexPath}`);
              return true;
            } else {
              console.warn('[ConfigPanel] 未找到节点对应的路径');
              return false;
            }
          }
        } catch (err) {
          console.error('[ConfigPanel] 写入节点数据失败:', err);
          return false;
        }
      };
      
      const result = await importBackupData(data, {
        importHistory: importOptions.history,
        importShortcuts: importOptions.shortcuts,
        importBookmarks: importOptions.bookmarks,
        importConfigs: importOptions.configs,
        importRoadmapNodes: importOptions.roadmapNodes,
        importWatermark: importOptions.watermark,
        importMinimap: importOptions.minimap,
        onWriteNodeData: importOptions.roadmapNodes ? writeNodeData : undefined,
      });
      
      if (result.success) {
        message.success(result.message);
        setImportModalOpen(false);
        // 提示用户刷新页面
        Modal.success({
          title: '导入成功',
          content: '备份数据已导入，请刷新页面以应用更改。',
          okText: '刷新页面',
          onOk: () => window.location.reload(),
        });
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    }
    
    return false; // 阻止默认上传行为
  }, [importOptions, currentRoadmapId, currentRoadmap]);
  
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
  
  // ── 收起状态只显示展开按钮和小地图开关 ──
  if (!panelExpanded) {
    return (
      <div className={`${styles.configPanel} ${styles.configPanelCollapsed}`}>
        <button className={styles.configToggleBtn} onClick={togglePanel} title="展开配置栏">
          ▶
        </button>
        <Tooltip title={minimapConfig.enabled ? '关闭小地图' : '开启小地图'}>
          <button 
            className={`${styles.minimapToggleBtn} ${minimapConfig.enabled ? styles.minimapToggleBtnActive : ''}`}
            onClick={toggleMinimap}
          >
            🗺️
          </button>
        </Tooltip>
      </div>
    );
  }
  
  return (
    <div className={`${styles.configPanel} ${styles.configPanelExpanded}`}>
      {/* 折叠按钮 */}
      <button className={`${styles.configToggleBtn} ${styles.configToggleCollapse}`} onClick={togglePanel} title="收起配置栏">
        ◀
      </button>
      
      {/* 工具栏 - 紧凑两行布局 */}
      <div className={styles.configToolbar}>
        {/* 第一行：缩放 + 编辑 + 导出 */}
        <div className={styles.toolbarRow}>
          <Tooltip title="适应画布">
            <button onClick={onFitView} className={styles.toolbarBtn}>⊞</button>
          </Tooltip>
          <Tooltip title="放大">
            <button onClick={onZoomIn} className={styles.toolbarBtn}>+</button>
          </Tooltip>
          <Tooltip title="缩小">
            <button onClick={onZoomOut} className={styles.toolbarBtn}>−</button>
          </Tooltip>
          <Tooltip title="实际大小">
            <button onClick={onResetZoom} className={styles.toolbarBtn}>1:1</button>
          </Tooltip>
          
          <div className={styles.toolbarDivider} />
          
          <Tooltip title={canUndo ? '撤销 (Ctrl+Z)' : '没有可撤销的操作'}>
            <button 
              onClick={onUndo} 
              className={`${styles.toolbarBtn} ${!canUndo ? styles.toolbarBtnDisabled : ''}`}
              disabled={!canUndo}
            >
              <UndoOutlined />
            </button>
          </Tooltip>
          <Tooltip title={canRedo ? '恢复 (Ctrl+Y)' : '没有可恢复的操作'}>
            <button 
              onClick={onRedo} 
              className={`${styles.toolbarBtn} ${!canRedo ? styles.toolbarBtnDisabled : ''}`}
              disabled={!canRedo}
            >
              <RedoOutlined />
            </button>
          </Tooltip>
          
          <div className={styles.toolbarDivider} />
          
          <Tooltip title="设置">
            <button className={styles.toolbarBtn} onClick={() => setShortcutModalOpen(true)}>
              <SettingOutlined />
            </button>
          </Tooltip>
        </div>
        
        {/* 第二行：小地图开关 + 更多操作 */}
        <div className={styles.toolbarRow}>
          <Tooltip title={minimapConfig.enabled ? '关闭小地图' : '开启小地图'}>
            <button 
              className={`${styles.toolbarBtn} ${styles.minimapToggleBtn} ${minimapConfig.enabled ? styles.minimapToggleBtnActive : ''}`}
              onClick={toggleMinimap}
            >
              🗺️
            </button>
          </Tooltip>
          <Dropdown menu={{ items: batchMenuItems }} trigger={['click']}>
            <button className={styles.toolbarBtn}>⚡ 操作</button>
          </Dropdown>
        </div>
      </div>
      
      {/* Tab 切换 */}
      <div className={styles.configTabs}>
        <button
          className={`${styles.configTab} ${activeTab === 'nav' ? styles.active : ''}`}
          onClick={() => setActiveTab('nav')}
        >
          🌳 导航
        </button>
        <button
          className={`${styles.configTab} ${activeTab === 'config' ? styles.active : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ 配置
        </button>
        <button
          className={`${styles.configTab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 历史
        </button>
      </div>
      
      {/* Tab 内容 */}
      <div className={styles.configContent}>
        {activeTab === 'history' ? (
          <HistoryPanel onJumpToHistory={onJumpToHistory} />
        ) : activeTab === 'nav' ? (
          // 节点导航面板
          <div className={styles.configNavPanel}>
            {/* 搜索框 */}
            <div className={treeStyles.treeSearchBox}>
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
              <div className={treeStyles.treePanelBody}>
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
              <div className={styles.configLoading}>
                {searchKeyword ? '未找到匹配的节点' : '加载中...'}
              </div>
            )}
          </div>
        ) : (
          // 配置面板
          <ConfigSettingsPanel
            layout={layout}
            zoom={zoom}
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
      
      {/* 导出备份弹窗 */}
      <Modal
        title="导出备份"
        open={backupModalOpen}
        onOk={handleExportBackup}
        onCancel={() => setBackupModalOpen(false)}
        okText="导出"
        cancelText="取消"
      >
        <p>将导出以下数据：</p>
        <ul style={{ paddingLeft: 20, color: '#666' }}>
          <li>🌳 当前节点数据（思维导图结构）</li>
          <li>📜 历史记录（撤销/恢复数据）</li>
          <li>⌨️ 快捷键配置</li>
          <li>🔖 书签数据</li>
          <li>🎨 颜色/布局配置</li>
        </ul>
        <p style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
          备份文件为 JSON 格式，可用于在其他设备恢复完整数据。
        </p>
      </Modal>
      
      {/* 导入备份弹窗 */}
      <Modal
        title="导入备份"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
      >
        <p>选择要导入的备份文件：</p>
        
        <Upload
          accept=".json"
          beforeUpload={handleImportBackup}
          showUploadList={false}
          maxCount={1}
        >
          <button className={styles.backupUploadBtn}>
            📂 选择备份文件 (.json)
          </button>
        </Upload>
        
        <p style={{ marginTop: 16, marginBottom: 8 }}>导入选项：</p>
        <div className={styles.importOptions}>
          <label>
            <input
              type="checkbox"
              checked={importOptions.roadmapNodes}
              onChange={(e) => setImportOptions(prev => ({ ...prev, roadmapNodes: e.target.checked }))}
            />
            节点数据
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.history}
              onChange={(e) => setImportOptions(prev => ({ ...prev, history: e.target.checked }))}
            />
            历史记录
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.shortcuts}
              onChange={(e) => setImportOptions(prev => ({ ...prev, shortcuts: e.target.checked }))}
            />
            快捷键配置
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.bookmarks}
              onChange={(e) => setImportOptions(prev => ({ ...prev, bookmarks: e.target.checked }))}
            />
            书签数据
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.configs}
              onChange={(e) => setImportOptions(prev => ({ ...prev, configs: e.target.checked }))}
            />
            颜色/布局配置
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.watermark}
              onChange={(e) => setImportOptions(prev => ({ ...prev, watermark: e.target.checked }))}
            />
            水印配置
          </label>
          <label>
            <input
              type="checkbox"
              checked={importOptions.minimap}
              onChange={(e) => setImportOptions(prev => ({ ...prev, minimap: e.target.checked }))}
            />
            小地图配置
          </label>
        </div>
        
        <p style={{ marginTop: 12, color: '#ff4d4f', fontSize: 12 }}>
          ⚠️ 导入将覆盖现有数据，请谨慎操作。
        </p>
      </Modal>
      
      {/* 书签管理弹窗 */}
      <BookmarkManagerModal
        open={bookmarkModalOpen}
        onClose={() => setBookmarkModalOpen(false)}
        onFocusNode={onFocusNode}
      />
      
      {/* 自定义节点管理弹窗 */}
      <CustomNodeManagerModal
        open={customNodeModalOpen}
        onClose={() => setCustomNodeModalOpen(false)}
      />
      
      {/* 水印设置弹窗 */}
      <WatermarkConfigModal
        open={watermarkModalOpen}
        onClose={() => setWatermarkModalOpen(false)}
      />
      
      {/* 主题设置弹窗 */}
      <ThemeConfigModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </div>
  );
};

export default ConfigPanel;
