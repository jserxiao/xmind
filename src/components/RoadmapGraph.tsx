/**
 * RoadmapGraph — 思维导图主组件
 *
 * 职责：连接所有子组件和 Hook，管理 UI 状态，处理用户交互。
 *
 * 组件树：
 *   RoadmapGraph
 *   ├── ConfigPanel         左侧配置/导航面板
 *   ├── MemoryMonitor       内存/性能监控浮层
 *   ├── div#graphCanvas     G6 画布容器（由 useGraphInit 管理）
 *   ├── ContextMenu         节点右键菜单
 *   ├── NodeEditorPanel     节点添加/编辑弹窗
 *   ├── SubNodePreviewPanel Markdown 内容预览面板
 *   └── AIGeneratorModal    AI 子节点生成弹窗
 *
 * 数据流：
 *   useGraphInit (数据加载 + G6 生命周期)
 *     ↓ rawData
 *   useNodeSave (CRUD 操作)
 *     ↓ setRawData + refreshGraph
 *   ConfigPanel / ContextMenu / 快捷键
 *     ↓ 用户交互回调
 *   组件状态 (contextMenu, previewPanel, aiModalVisible 等)
 *
 * 状态的 ref 双写模式：useState + useRef 同时持有数据，
 * 确保事件回调（如 onContextMenu）中始终读取最新值，
 * 不会因为闭包捕获过期状态。
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { message } from 'antd';
import { useConfigStore } from '../store/configStore';
import { useNodeEditorStore } from '../store/nodeEditorStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useHistoryStore } from '../store/historyStore';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useShortcutStore } from '../store/shortcutStore';
import { useUndoRedoShortcuts, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useGraphInit } from '../hooks/useGraphInit';
import { useNodeSave } from '../hooks/useNodeSave';
import type { GraphManager } from '../core/GraphManager';
import type { EventHandler } from '../core/EventHandler';
import type { RoadmapNode } from '../data/roadmapData';
import { convertToTreeData } from '../utils/treeDataUtils';
import {
  findNodeInTree,
  findAncestorMdPath,
  getPrevNextNode,
  preorderTraversal,
} from '../utils/nodeUtils';
import ConfigPanel from './ConfigPanel';
import ContextMenu from './ContextMenu';
import NodeEditorPanel from './NodeEditorPanel';
import SubNodePreviewPanel from './SubNodePreviewPanel';
import MemoryMonitor from './MemoryMonitor';
import { AIGeneratorModal } from './aiGenerator';
import styles from '../styles/RoadmapGraph.module.css';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RoadmapGraphProps {
  onNodeClick?: (nodeData: RoadmapNode) => void;
}

// ── 组件 ──────────────────────────────────────────────────────────────────────

const RoadmapGraph: React.FC<RoadmapGraphProps> = ({ onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 组件本地状态（UI 层状态，不通过 Store 管理）
  // ═══════════════════════════════════════════════════════════════════════════════

  // 右键菜单：位置 + 目标节点
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; node: RoadmapNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  // 当前选中的节点 ID（用于上一个/下一个导航的锚点）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 子节点预览面板：显示 MD 章节内容
  const [previewPanel, setPreviewPanel] = useState<{
    visible: boolean;
    nodeLabel: string;
    mdPath: string | null;       // 完整 MD 文件路径（通过 getFullMdPath 拼接）
    sectionTitle: string;        // 非空 = 定位到 MD 中的 ## 章节，空 = 显示整个文件
    autoFullscreen: boolean;     // 双击打开时自动进入全屏
    nodeId: string | null;       // 用于关闭时重新聚焦该节点
  }>({ visible: false, nodeLabel: '', mdPath: null, sectionTitle: '', autoFullscreen: false, nodeId: null });

  // AI 生成弹窗：目标节点 + 祖先路径（供 AI 理解上下文）
  const [aiModalVisible, setAIModalVisible] = useState(false);
  const [aiTargetNode, setAITargetNode] = useState<RoadmapNode | null>(null);
  const [aiContext, setAIContext] = useState<string[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Store 选择器
  // ═══════════════════════════════════════════════════════════════════════════════

  // 思维导图 Store
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);
  const getFullMdPath = useRoadmapStore((state) => state.getFullMdPath);

  // 节点编辑器 Store（getter 函数避免每次渲染重新创建闭包）
  const { isOpen: isEditorOpen } = useNodeEditorStore();
  const openAddPanel = useNodeEditorStore((state) => state.openAddPanel);
  const openEditPanel = useNodeEditorStore((state) => state.openEditPanel);

  // 历史记录 Store
  // past.length / future.length 用 selector 订阅，确保 canUndo/canRedo 响应式更新
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const pastLength = useHistoryStore((state) => state.past.length);
  const futureLength = useHistoryStore((state) => state.future.length);
  const isHistoryProcessing = useHistoryStore((state) => state.isProcessing);

  // 书签 Store
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const setCurrentRoadmapId = useBookmarkStore((state) => state.setCurrentRoadmapId);
  const getBookmarks = useBookmarkStore((state) => state.getBookmarks);
  const currentBookmarkIndex = useBookmarkStore((state) => state.currentBookmarkIndex);
  const setCurrentBookmarkIndex = useBookmarkStore((state) => state.setCurrentBookmarkIndex);

  // 书签 ID 集合 ref：避免将 Set 放入 state 导致不必要的渲染。
  // 书签变化时重新生成 ref.current 并推送新 treeData 到画布（触发节点高亮更新）。
  const bookmarkIdsRef = useRef<Set<string>>(new Set());

  // 通过 JSON 序列化订阅书签列表变化。
  // 直接使用 bookmarks 对象会因 Zustand 返回新引用导致无限循环，
  // JSON.stringify 确保只在内容实际变化时触发 effect。
  const bookmarksJson = useBookmarkStore((state) => {
    const bookmarks = state.bookmarks[state.currentRoadmapId || ''] || [];
    return JSON.stringify(bookmarks);
  });
  const currentBookmarksList = useMemo(() => JSON.parse(bookmarksJson), [bookmarksJson]);

  // 当前思维导图的书签数组（用于导航）
  const bookmarkList = useBookmarkStore((state) => state.bookmarks);
  const bookmarks = useMemo(() => {
    return bookmarkList[currentRoadmapId || ''] || [];
  }, [bookmarkList, currentRoadmapId]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 书签 ID 集合同步到画布
  // ═══════════════════════════════════════════════════════════════════════════════
  // currentBookmarksList 变化时（书签增删）→ 更新 ref → 刷新画布的高亮标记

  useEffect(() => {
    const currentBookmarks = getBookmarks();
    bookmarkIdsRef.current = new Set(currentBookmarks.map(b => b.nodeId));

    // 如果画布已初始化，实时更新 hasBookmark 状态
    if (graphManagerRef.current && rawData) {
      const treeData = convertToTreeData(rawData, bookmarkIdsRef.current);
      graphManagerRef.current.setData(treeData);
    }
  }, [currentBookmarksList]);

  // 切换思维导图时，同步 bookmarksStore 中的 currentRoadmapId 参数
  useEffect(() => {
    setCurrentRoadmapId(currentRoadmapId);
  }, [currentRoadmapId, setCurrentRoadmapId]);

  // ── 图初始化 Hook ──

  const { graphManagerRef, eventHandlerRef, loading, rawData, totalNodes, setRawData, rawDataRef } = useGraphInit({
    containerRef,
    currentRoadmapId,
    onNodeClick,
    onContextMenu: (data) => {
      const currentData = rawDataRef.current;
      const node = currentData ? findNodeInTree(currentData, data.nodeId) : null;
      setContextMenu({ visible: true, x: data.x, y: data.y, node });
    },
    onDoubleClickPreview: (data) => {
      const currentData = rawDataRef.current;
      if (!currentData) return;

      const node = findNodeInTree(currentData, data.nodeId);
      if (node) {
        const isSubNode = node.type === 'sub';
        if (isSubNode) {
          const mdPath = findAncestorMdPath(node.id, currentData);
          const fullMdPath = mdPath ? getFullMdPath(mdPath) : null;
          setPreviewPanel({
            visible: true, nodeLabel: node.label, mdPath: fullMdPath,
            sectionTitle: node.label, autoFullscreen: true, nodeId: node.id,
          });
        } else if (node.mdPath) {
          const fullMdPath = getFullMdPath(node.mdPath);
          setPreviewPanel({
            visible: true, nodeLabel: node.label, mdPath: fullMdPath,
            sectionTitle: '', autoFullscreen: true, nodeId: node.id,
          });
        }
      }
    },
  });

  // ── 节点操作 Hook ──

  const {
    handleSaveNode,
    performNodeDeletion,
    handleAIApply,
    handleBatchDeleteNodes,
    handleReorderNodes,
  } = useNodeSave({
    rawData, rawDataRef: rawDataRef as React.MutableRefObject<RoadmapNode | null>,
    graphManagerRef: graphManagerRef as React.MutableRefObject<GraphManager | null>,
    eventHandlerRef: eventHandlerRef as React.MutableRefObject<EventHandler | null>,
    bookmarkIdsRef: bookmarkIdsRef as React.MutableRefObject<Set<string>>,
    setRawData,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 工具栏操作（暴露给 ConfigPanel 和快捷键）
  // ═══════════════════════════════════════════════════════════════════════════════

  const fitView = useCallback(() => { graphManagerRef.current?.fitView(15); }, []);
  const zoomIn = useCallback(() => { graphManagerRef.current?.zoomIn(); }, []);
  const zoomOut = useCallback(() => { graphManagerRef.current?.zoomOut(); }, []);
  const resetZoom = useCallback(() => { graphManagerRef.current?.resetZoom(); }, []);

  // 聚焦 + 高亮节点：focusNode 将节点移到视口中心并放大，
  // highlightNode 在节点上叠加高亮动画并 2.5s 后消失。
  // 600ms 延迟确保 focus 动画完成后再开始高亮。
  const focusNode = useCallback((nodeId: string) => {
    eventHandlerRef.current?.focusNode(nodeId);
    setTimeout(() => { eventHandlerRef.current?.highlightNode(nodeId, 2500); }, 600);
    setSelectedNodeId(nodeId);
  }, []);

  // ── 上一个/下一个节点导航 ──

  const prevNodeId = useMemo(() => {
    if (!rawData || !selectedNodeId) return null;
    return getPrevNextNode(selectedNodeId, rawData).prev;
  }, [rawData, selectedNodeId]);

  const nextNodeId = useMemo(() => {
    if (!rawData || !selectedNodeId) return null;
    return getPrevNextNode(selectedNodeId, rawData).next;
  }, [rawData, selectedNodeId]);

  const handlePrevNode = useCallback(() => {
    if (!prevNodeId || !rawData) return;
    focusNode(prevNodeId);
  }, [prevNodeId, rawData, focusNode]);

  const handleNextNode = useCallback(() => {
    if (!nextNodeId || !rawData) return;
    focusNode(nextNodeId);
  }, [nextNodeId, rawData, focusNode]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 预览面板导航（前后节点跳转）
  // ═══════════════════════════════════════════════════════════════════════════════
  // 预览面板打开后，用户可以通过上/下按钮切换到前/后一个可预览的节点。
  // 可预览节点 = sub 节点（有祖先 mdPath）或有直接 mdPath 的 leaf/link 节点。
  // 使用前序遍历保证节点顺序与画布视觉顺序一致。

  const canPreviewNode = useCallback((node: RoadmapNode): boolean => {
    // sub 节点需要祖先节点的 mdPath 来确定 MD 文件位置
    if (node.type === 'sub') return rawData ? !!findAncestorMdPath(node.id, rawData) : false;
    // leaf/link 节点有直接 mdPath 即可预览
    return !!node.mdPath;
  }, [rawData]);

  // 在前序遍历序列中查找下一个/上一个可预览的节点
  const findNextPreviewableNode = useCallback((startNodeId: string, direction: 'next' | 'prev'): string | null => {
    if (!rawData) return null;
    const allNodes = preorderTraversal(rawData);
    const currentIndex = allNodes.findIndex(n => n.id === startNodeId);
    if (currentIndex === -1) return null;
    const step = direction === 'next' ? 1 : -1;
    let index = currentIndex + step;
    while (index >= 0 && index < allNodes.length) {
      if (canPreviewNode(allNodes[index])) return allNodes[index].id;
      index += step;
    }
    return null;
  }, [rawData, canPreviewNode]);

  const prevNodeIdForPreview = useMemo(() => {
    if (!rawData || !previewPanel.nodeId) return null;
    return findNextPreviewableNode(previewPanel.nodeId, 'prev');
  }, [rawData, previewPanel.nodeId, findNextPreviewableNode]);

  const nextNodeIdForPreview = useMemo(() => {
    if (!rawData || !previewPanel.nodeId) return null;
    return findNextPreviewableNode(previewPanel.nodeId, 'next');
  }, [rawData, previewPanel.nodeId, findNextPreviewableNode]);

  const openPreviewPanel = useCallback((node: RoadmapNode) => {
    if (!rawData) return;
    const isSubNode = node.type === 'sub';
    if (isSubNode) {
      const mdPath = findAncestorMdPath(node.id, rawData);
      const fullMdPath = mdPath ? getFullMdPath(mdPath) : null;
      setPreviewPanel({
        visible: true, nodeLabel: node.label, mdPath: fullMdPath,
        sectionTitle: node.label, autoFullscreen: false, nodeId: node.id,
      });
    } else if (node.mdPath) {
      const fullMdPath = getFullMdPath(node.mdPath);
      setPreviewPanel({
        visible: true, nodeLabel: node.label, mdPath: fullMdPath,
        sectionTitle: '', autoFullscreen: false, nodeId: node.id,
      });
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [rawData, getFullMdPath]);

  const handlePrevNodeInPreview = useCallback(() => {
    if (!prevNodeIdForPreview || !rawData) return;
    const node = findNodeInTree(rawData, prevNodeIdForPreview);
    if (node) openPreviewPanel(node);
  }, [prevNodeIdForPreview, rawData, openPreviewPanel]);

  const handleNextNodeInPreview = useCallback(() => {
    if (!nextNodeIdForPreview || !rawData) return;
    const node = findNodeInTree(rawData, nextNodeIdForPreview);
    if (node) openPreviewPanel(node);
  }, [nextNodeIdForPreview, rawData, openPreviewPanel]);

  const handleClosePreview = useCallback(() => {
    // 关闭预览后聚焦回被预览的节点，方便用户继续编辑或浏览
    const nodeId = previewPanel.nodeId;
    setPreviewPanel((prev) => ({ ...prev, visible: false }));
    if (nodeId) {
      setTimeout(() => { focusNode(nodeId); }, 200);
    }
  }, [previewPanel.nodeId, focusNode]);

  // 退出全屏后需要手动触发 resize + fitView，
  // 因为全屏切换会改变容器尺寸，G6 画布不会自动感知
  const handleExitFullscreen = useCallback(() => {
    if (containerRef.current && graphManagerRef.current) {
      graphManagerRef.current.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight || window.innerHeight
      );
      graphManagerRef.current.fitView(15);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 导出功能（懒加载导出模块以减少初始包体积）
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleExportJPG = useCallback(async () => {
    const graph = graphManagerRef.current?.getGraph();
    if (graph) {
      // 动态导入：exportMindmap 包含 jspdf 依赖，较大的 chunk
      const { exportToJPG } = await import('../utils/exportMindmap');
      exportToJPG(graph, '学习思维导图');
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    const graph = graphManagerRef.current?.getGraph();
    if (graph) {
      const { exportToPDF } = await import('../utils/exportMindmap');
      exportToPDF(graph, '学习思维导图');
    }
  }, []);

  // ── 右键菜单操作 ──

  const handleAddChild = useCallback(() => {
    if (!contextMenu.node) return;
    openAddPanel(contextMenu.node.id, contextMenu.node);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, openAddPanel]);

  const handleEditNode = useCallback(() => {
    if (!contextMenu.node || !rawData) return;
    const node = contextMenu.node;
    if (node.type === 'sub') {
      const mdPath = findAncestorMdPath(node.id, rawData);
      openEditPanel(node, mdPath || undefined);
    } else {
      openEditPanel(node);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, rawData, openEditPanel]);

  const handleDeleteNode = useCallback(() => {
    if (!contextMenu.node || !rawData) return;
    performNodeDeletion(contextMenu.node, rawData);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, rawData, performNodeDeletion]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleToggleBookmark = useCallback(() => {
    const node = contextMenu.node;
    if (!node) return;
    const added = toggleBookmark(node.id, node.label.replace(/\n/g, ' ').slice(0, 50));
    message.success(added ? '已添加书签' : '已移除书签');
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, toggleBookmark]);

  const handlePreviewSubNode = useCallback(() => {
    const node = contextMenu.node;
    if (node) openPreviewPanel(node);
  }, [contextMenu.node, openPreviewPanel]);

  // ── AI 生成 ──

  // 获取节点的祖先路径（根→父），供 AI 理解节点在思维导图中的上下文位置
  const getNodeContext = useCallback((node: RoadmapNode): string[] => {
    if (!rawData) return [];
    const path: string[] = [];
    const findPath = (current: RoadmapNode, targetId: string, ancestors: string[]): boolean => {
      if (current.id === targetId) { path.push(...ancestors); return true; }
      if (current.children) {
        for (const child of current.children) {
          if (findPath(child, targetId, [...ancestors, current.label])) return true;
        }
      }
      return false;
    };
    findPath(rawData, node.id, []);
    return path;
  }, [rawData]);

  const handleAIGenerate = useCallback(() => {
    const node = contextMenu.node;
    if (!node) return;
    setAITargetNode(node);
    setAIContext(getNodeContext(node));
    setAIModalVisible(true);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, getNodeContext]);

  // AI 目标节点的现有子节点（传递给 AI 避免生成重复内容）
  const aiExistingChildren = useMemo(() => {
    if (!aiTargetNode?.children) return undefined;
    // 过滤掉 sub 节点（sub 节点是 MD 动态生成的，不应计入）
    return aiTargetNode.children
      .filter(child => child.type !== 'sub')
      .map(child => ({ label: child.label, type: child.type }));
  }, [aiTargetNode]);

  const handleAIApplyWrapper = useCallback(async (generatedNodes: any[]) => {
    if (!aiTargetNode) return;
    await handleAIApply(generatedNodes, aiTargetNode);
    // setData 内部通过双帧 rAF + fitView 调整了视口。
    // 此处 focusNode 把镜头拉近到父节点，展示新生成的子节点。
    // 500ms 延迟确保 setData 的双 rAF fitView 已完成。
    setTimeout(() => {
      focusNode(aiTargetNode.id);
    }, 500);
  }, [aiTargetNode, handleAIApply, focusNode]);

  // ── 导航面板回调 ──

  const handleAddNodeFromNav = useCallback((parentId: string, parentNode: RoadmapNode | null) => {
    openAddPanel(parentId, parentNode);
  }, [openAddPanel]);

  const handleEditNodeFromNav = useCallback((node: RoadmapNode) => {
    if (!rawData) return;
    if (node.type === 'sub') {
      const mdPath = findAncestorMdPath(node.id, rawData);
      openEditPanel(node, mdPath || undefined);
    } else {
      openEditPanel(node);
    }
  }, [rawData, openEditPanel]);

  const handleDeleteNodeFromNav = useCallback((node: RoadmapNode) => {
    if (!rawData || node.type === 'root') return;
    performNodeDeletion(node, rawData);
  }, [rawData, performNodeDeletion]);

  const handlePreviewSubNodeFromNav = useCallback((node: RoadmapNode) => {
    openPreviewPanel(node);
  }, [openPreviewPanel]);

  // ── 书签导航 ──

  const handleNextBookmark = useCallback(() => {
    if (bookmarks.length === 0) { message.info('暂无书签'); return; }
    const newIndex = (currentBookmarkIndex + 1) % bookmarks.length;
    setCurrentBookmarkIndex(newIndex);
    const bookmark = bookmarks[newIndex];
    focusNode(bookmark.nodeId);
    message.success(`书签 ${newIndex + 1}/${bookmarks.length}: ${bookmark.nodeLabel}`);
  }, [bookmarks, currentBookmarkIndex, focusNode, setCurrentBookmarkIndex]);

  const handlePrevBookmark = useCallback(() => {
    if (bookmarks.length === 0) { message.info('暂无书签'); return; }
    const newIndex = currentBookmarkIndex <= 0 ? bookmarks.length - 1 : currentBookmarkIndex - 1;
    setCurrentBookmarkIndex(newIndex);
    const bookmark = bookmarks[newIndex];
    focusNode(bookmark.nodeId);
    message.success(`书签 ${newIndex + 1}/${bookmarks.length}: ${bookmark.nodeLabel}`);
  }, [bookmarks, currentBookmarkIndex, focusNode, setCurrentBookmarkIndex]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 撤销 / 重做
  // ═══════════════════════════════════════════════════════════════════════════════
  // historyStore.undo() 返回操作前的树快照，同时将当前状态推入 future 栈。
  // 撤销/重做不写入 index.json —— 数据只保留在内存中，
  // 下次手动操作时才会通过 refreshGraphAndIndex 持久化。
  // handleJumpToHistory 用于点击历史面板中的某个条目跳转到对应状态。

  const handleUndo = useCallback(async () => {
    if (pastLength === 0 || !rawData || isHistoryProcessing) return;
    const hideLoading = message.loading('正在撤销...', 0);
    try {
      const previousTree = await undo();
      if (previousTree) {
        // 手动同步三步：state + ref + 画布
        setRawData(previousTree);
        rawDataRef.current = previousTree;
        const treeData = convertToTreeData(previousTree, bookmarkIdsRef.current);
        graphManagerRef.current?.setData(treeData);
        hideLoading();
        message.success('已撤销操作');
      } else { hideLoading(); }
    } catch (error) {
      hideLoading();
      message.error('撤销失败');
      console.error('[RoadmapGraph] 撤销失败:', error);
    }
  }, [pastLength, undo, rawData, isHistoryProcessing, setRawData, rawDataRef, graphManagerRef]);

  const handleRedo = useCallback(async () => {
    if (futureLength === 0 || !rawData || isHistoryProcessing) return;
    const hideLoading = message.loading('正在重做...', 0);
    try {
      const nextTree = await redo();
      if (nextTree) {
        setRawData(nextTree);
        rawDataRef.current = nextTree;
        const treeData = convertToTreeData(nextTree, bookmarkIdsRef.current);
        graphManagerRef.current?.setData(treeData);
        hideLoading();
        message.success('已重做操作');
      } else { hideLoading(); }
    } catch (error) {
      hideLoading();
      message.error('重做失败');
      console.error('[RoadmapGraph] 重做失败:', error);
    }
  }, [futureLength, redo, rawData, isHistoryProcessing, setRawData, rawDataRef, graphManagerRef]);

  const handleJumpToHistory = useCallback((tree: RoadmapNode) => {
    if (!tree) return;
    setRawData(tree);
    rawDataRef.current = tree;
    const treeData = convertToTreeData(tree, bookmarkIdsRef.current);
    graphManagerRef.current?.setData(treeData);
  }, [setRawData, rawDataRef, graphManagerRef]);

  useUndoRedoShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    canUndo: pastLength > 0 && !isHistoryProcessing,
    canRedo: futureLength > 0 && !isHistoryProcessing,
    enabled: !isEditorOpen,
  });

  // ── 快捷键 ──

  const handleTogglePanel = useCallback(() => {
    useConfigStore.getState().togglePanel();
  }, []);

  // 聚焦搜索框：通过触发自定义事件，让 ConfigPanel 监听并聚焦
  const handleFocusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('shortcut:focusSearch'));
  }, []);

  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const getShortcutKey = (action: string): string => {
    return shortcuts[action as keyof typeof shortcuts]?.key || '';
  };

  useKeyboardShortcuts(
    [
      // 视图操作
      { key: getShortcutKey('zoomIn'), callback: zoomIn, description: '放大' },
      { key: getShortcutKey('zoomOut'), callback: zoomOut, description: '缩小' },
      { key: getShortcutKey('resetZoom'), callback: resetZoom, description: '重置缩放' },
      { key: getShortcutKey('fitView'), callback: fitView, description: '适应视图' },
      { key: getShortcutKey('togglePanel'), callback: handleTogglePanel, description: '切换面板' },
      { key: getShortcutKey('focusSearch'), callback: handleFocusSearch, description: '聚焦搜索' },
      // 导航操作
      { key: getShortcutKey('prevNode'), callback: handlePrevNode, description: '上一个节点' },
      { key: getShortcutKey('nextNode'), callback: handleNextNode, description: '下一个节点' },
      { key: getShortcutKey('prevBookmark'), callback: handlePrevBookmark, description: '上一个书签' },
      { key: getShortcutKey('nextBookmark'), callback: handleNextBookmark, description: '下一个书签' },
      // 导出操作
      { key: getShortcutKey('exportJPG'), callback: handleExportJPG, description: '导出JPG' },
      { key: getShortcutKey('exportPDF'), callback: handleExportPDF, description: '导出PDF' },
    ],
    { enabled: !isEditorOpen }
  );

  // ── 渲染 ──

  return (
    <div className={styles.graphContainer}>
      <ConfigPanel
        rawData={rawData}
        onFocusNode={focusNode}
        onFitView={fitView}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onExportJPG={handleExportJPG}
        onExportPDF={handleExportPDF}
        onPrevNode={handlePrevNode}
        onNextNode={handleNextNode}
        hasPrevNode={!!prevNodeId}
        hasNextNode={!!nextNodeId}
        onAddNode={handleAddNodeFromNav}
        onEditNode={handleEditNodeFromNav}
        onDeleteNode={handleDeleteNodeFromNav}
        onPreviewSubNode={handlePreviewSubNodeFromNav}
        onBatchDeleteNodes={handleBatchDeleteNodes}
        onReorderNodes={handleReorderNodes}
        onJumpToHistory={handleJumpToHistory}
      />

      <div className={styles.graphStage}>
        <MemoryMonitor totalNodes={totalNodes} />

        {loading && (
          <div className={styles.graphLoading}>
            <div className="loading-spinner-small"></div>
            <span>正在加载数据...</span>
          </div>
        )}

        <div ref={containerRef} className={styles.graphCanvas} />
      </div>

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        node={contextMenu.node}
        visible={contextMenu.visible}
        hasBookmark={contextMenu.node ? hasBookmark(contextMenu.node.id) : false}
        onAddChild={handleAddChild}
        onEdit={handleEditNode}
        onDelete={handleDeleteNode}
        onPreview={handlePreviewSubNode}
        onToggleBookmark={handleToggleBookmark}
        onAIGenerate={handleAIGenerate}
        onClose={handleCloseContextMenu}
      />

      {isEditorOpen && <NodeEditorPanel onSave={handleSaveNode} rawData={rawData} />}

      <SubNodePreviewPanel
        isOpen={previewPanel.visible}
        nodeLabel={previewPanel.nodeLabel}
        mdPath={previewPanel.mdPath}
        sectionTitle={previewPanel.sectionTitle}
        autoFullscreen={previewPanel.autoFullscreen}
        onClose={handleClosePreview}
        onExitFullscreen={handleExitFullscreen}
        onPrevNode={handlePrevNodeInPreview}
        onNextNode={handleNextNodeInPreview}
        hasPrevNode={!!prevNodeIdForPreview}
        hasNextNode={!!nextNodeIdForPreview}
      />

      <AIGeneratorModal
        visible={aiModalVisible}
        node={aiTargetNode}
        context={aiContext}
        roadmapTheme={rawData?.label || '思维导图'}
        existingChildren={aiExistingChildren}
        onClose={() => setAIModalVisible(false)}
        onApply={handleAIApplyWrapper}
      />
    </div>
  );
};

export default RoadmapGraph;
