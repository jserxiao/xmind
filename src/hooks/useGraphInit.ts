/**
 * useGraphInit — G6 图初始化与配置监听 Hook
 *
 * 职责：管理 G6 TreeGraph 的完整生命周期，以及所有影响画布的 Store 变化监听。
 *
 * 数据加载流程：
 *   IndexedDB 恢复目录句柄 → 读取 index.json → enrichWithSubNodes 解析 MD 标题
 *   → 注册 5 种自定义 G6 节点类型 → 创建 GraphManager → 转换数据并初始化图
 *   → 创建 EventHandler 绑定交互事件 → 初始聚焦根节点
 *
 * 配置监听：
 *   - configStore (节点样式/布局/颜色) → refresh() 重绘所有节点
 *   - watermarkStore (水印) → setWatermark() 更新水印叠加层
 *   - minimapStore (小地图) → setMinimap() 切换小地图插件
 *   - themeStore (主题) → 逐节点 updateItem + layout() 应用新主题色
 *
 * 销毁顺序：先解绑事件处理器，再销毁图实例（避免销毁时触发事件回调）
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../store/configStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useWatermarkStore } from '../store/watermarkStore';
import { useMinimapStore } from '../store/minimapStore';
import { useThemeStore } from '../store/themeStore';
import type { RoadmapNode } from '../data/roadmapData';
import { loadRoadmapData, enrichWithSubNodes } from '../data/roadmapData';
import { getDirectoryHandle, waitForDirectoryHandleInit } from '../utils/fileSystem';
import { GraphManager } from '../core/GraphManager';
import { NodeRenderer } from '../core/NodeRenderer';
import { EventHandler, type ContextMenuCallback, type DoubleClickPreviewCallback, type NavigateCallback } from '../core/EventHandler';
import { convertToTreeData } from '../utils/treeDataUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseGraphInitOptions {
  /** 画布 DOM 容器 ref（挂载 G6 canvas 的元素） */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 当前思维导图 ID，变化时重新初始化整个图 */
  currentRoadmapId: string | null;
  /** 节点点击回调（预留，当前未使用） */
  onNodeClick?: (nodeData: RoadmapNode) => void;
  /** 右键菜单回调：由组件设置 contextMenu 状态 */
  onContextMenu?: ContextMenuCallback;
  /** 双击预览回调：由组件设置 previewPanel 状态 */
  onDoubleClickPreview?: DoubleClickPreviewCallback;
}

export interface UseGraphInitReturn {
  /** G6 图管理器实例 ref，供组件调用 zoom/fitView/focusNode 等 */
  graphManagerRef: React.RefObject<GraphManager | null>;
  /** 事件处理器实例 ref，供组件调用 focusNode/highlightNode */
  eventHandlerRef: React.RefObject<EventHandler | null>;
  /** 数据是否正在加载 */
  loading: boolean;
  /** 完整的节点树数据（已 enrich） */
  rawData: RoadmapNode | null;
  /** 节点总数（递归计数，用于内存监控组件） */
  totalNodes: number;
  /** 更新节点树数据（撤销/重做/外部修改时调用） */
  setRawData: (data: RoadmapNode | null) => void;
  /** rawData 的 ref 版本，供事件回调中获取最新值避免闭包陷阱 */
  rawDataRef: React.RefObject<RoadmapNode | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

export function useGraphInit({
  containerRef,
  currentRoadmapId,
  onNodeClick,
  onContextMenu,
  onDoubleClickPreview,
}: UseGraphInitOptions): UseGraphInitReturn {

  // ── 核心实例 ref（跨渲染周期保持引用）────

  const graphManagerRef = useRef<GraphManager | null>(null);
  const eventHandlerRef = useRef<EventHandler | null>(null);
  // NodeRenderer 只创建一次，自定义节点注册是全局操作无需重新注册
  const nodeRendererRef = useRef<NodeRenderer | null>(null);

  // ── 数据状态 ──

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RoadmapNode | null>(null);
  // ref 版本：事件回调中使用 ref 读取最新值，避免闭包捕获过期状态
  const rawDataRef = useRef<RoadmapNode | null>(null);

  const navigate = useNavigate();

  // ── 回调 ref（保持回调引用稳定，避免 effect 依赖变化导致图重建）──
  // 组件每次渲染传入的新函数引用存到 ref 中，EventHander 通过 read-through
  // 函数在事件触发时才读取 ref 中的最新值，避免闭包捕获过期状态。

  const onContextMenuRef = useRef<ContextMenuCallback | undefined>(onContextMenu);
  onContextMenuRef.current = onContextMenu;

  const onDoubleClickPreviewRef = useRef<DoubleClickPreviewCallback | undefined>(onDoubleClickPreview);
  onDoubleClickPreviewRef.current = onDoubleClickPreview;

  // navigate 也可能跨渲染变化，同样用 ref 保持稳定
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // ── Store 选择器 ──

  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);

  // configVersion 是 configStore 中的递增计数器，
  // 当面板修改配置时 +1，触发本 effect 重新执行 refresh()
  const configVersion = useConfigStore((state) => state.configVersion);
  const getCurrentConfig = useConfigStore((state) => state.getCurrentConfig);
  const currentConfig = getCurrentConfig();

  // 将嵌套对象序列化为 JSON 字符串作为 effect 依赖。
  // CSS Properties 对象每次渲染都是新引用，直接用作依赖会导致无限循环，
  // JSON.stringify 确保只在内容实际变化时触发 effect。
  const colorsJson = JSON.stringify(currentConfig.colors);
  const layoutJson = JSON.stringify(currentConfig.layout);
  const nodeStylesJson = JSON.stringify(currentConfig.nodeStyles);
  const textStylesJson = JSON.stringify(currentConfig.textStyles);

  const watermarkConfig = useWatermarkStore((state) => state.config);
  const minimapConfig = useMinimapStore((state) => state.config);

  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const themeColors = useThemeStore((state) => state.getCurrentColors());

  // ── 节点总数（递归遍历计数）──

  const totalNodes = useMemo(() => {
    if (!rawData) return 0;
    const countNodes = (node: RoadmapNode): number => {
      let count = 1;
      if (node.children) {
        for (const child of node.children) {
          count += countNodes(child);
        }
      }
      return count;
    };
    return countNodes(rawData);
  }, [rawData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 图初始化 effect（currentRoadmapId 变化时重新执行）
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!containerRef.current) return;

    // destroyed 标志：异步 init 完成前组件如果卸载，跳过所有 setState 和 G6 操作。
    // React 18 Strict Mode 下 effect 会执行两次（mount → unmount → mount），
    // 该标志确保第一次的异步操作被正确取消。
    let destroyed = false;

    const init = async () => {
      try {
        console.log('[useGraphInit] 开始初始化...');
        
        // 等待 IndexedDB 异步恢复目录句柄（页面刷新后重建 FileSystemDirectoryHandle）
        await waitForDirectoryHandleInit();
        console.log('[useGraphInit] IndexedDB 初始化完成');

        // 没有目录句柄说明用户还未选择工作目录，停止加载
        const dirHandle = getDirectoryHandle();
        console.log('[useGraphInit] 目录句柄:', dirHandle ? '存在' : '不存在');
        if (!dirHandle) {
          console.warn('[useGraphInit] 没有目录句柄，停止加载');
          setLoading(false);
          return;
        }

        // 获取当前思维导图在文件系统中的路径
        const mdBasePath = getMdBasePath();
        console.log('[useGraphInit] mdBasePath:', mdBasePath || '(空)');
        if (!mdBasePath) {
          console.warn('[useGraphInit] 没有 mdBasePath，停止加载');
          setLoading(false);
          return;
        }

        // 步骤 1：加载 index.json 获取节点树
        const roadmapPath = mdBasePath.split('/').pop() || '';
        console.log('[useGraphInit] roadmapPath:', roadmapPath);
        const root = await loadRoadmapData(roadmapPath);
        console.log('[useGraphInit] 加载的节点数据:', root ? '成功' : '失败');
        if (destroyed) return;

        // 步骤 2：enrich — 为有 mdPath 的 leaf/link 节点解析 MD 中的 ## 标题，
        //         生成动态 sub 子节点并挂载到 children
        const enriched = await enrichWithSubNodes(root, roadmapPath);
        console.log('[useGraphInit] enrich 完成，节点数:', enriched ? '有数据' : '无数据');
        if (destroyed) return;

        // 保存原始数据（ref + state 双写：state 驱动渲染，ref 供回调读取最新值）
        setRawData(enriched);
        rawDataRef.current = enriched;
        console.log('[useGraphInit] 数据已设置到 state');

        // 步骤 3：注册 5 种自定义 G6 节点（root-node、branch-node 等）
        //         NodeRenderer 只创建一次，因为 registerNode 是全局副作用
        if (!nodeRendererRef.current) {
          nodeRendererRef.current = new NodeRenderer();
        }
        nodeRendererRef.current.registerAll();

        // 步骤 4：创建 GraphManager，传入 DOM 容器和初始尺寸
        const container = containerRef.current!;
        graphManagerRef.current = new GraphManager({
          container,
          width: container.clientWidth || window.innerWidth,
          height: container.clientHeight || window.innerHeight,
        });

        // 步骤 5：将应用层数据转为 G6 格式并初始化 TreeGraph
        const treeData = convertToTreeData(enriched, new Set());
        graphManagerRef.current.initialize(treeData);

        // 步骤 6：创建 EventHandler，桥接 G6 原生事件与 React 组件状态。
        //         使用 read-through 函数：在事件触发时才从 ref 读取最新回调，
        //         避免回调引用变化导致 effect 反复重建 G6 实例。
        eventHandlerRef.current = new EventHandler({
          graphManager: graphManagerRef.current,
          container,
          // 导航回调：点击节点跳转到 /knowledge/:mdPath 知识详情页
          onNavigate: ((data: Parameters<NavigateCallback>[0]) => {
            if (data.mdPath) {
              navigateRef.current(`/knowledge/${data.mdPath.replace('.md', '')}`, {
                state: {
                  label: data.label,
                  mdPath: data.mdPath,
                  description: data.description,
                  url: data.url,
                },
              });
            } else if (data.url) {
              window.open(data.url, '_blank');
            }
          }) as NavigateCallback,
          // 通过 read-through 函数间接调用，每次事件触发时从 ref 读取最新的组件回调
          onContextMenu: (data) => { onContextMenuRef.current?.(data); },
          onDoubleClickPreview: (data) => { onDoubleClickPreviewRef.current?.(data); },
        });

        // 步骤 7：绑定所有 G6 交互事件
        eventHandlerRef.current.bindAll();

        // 步骤 8：初始定位到根节点。
        //         setTimeout 100ms 是因为 G6 的 layout() 是异步的，
        //         需要等一帧让节点坐标计算完成后再执行 focusItem
        setTimeout(() => {
          if (destroyed || !graphManagerRef.current) return;
          const graph = graphManagerRef.current.getGraph();
          if (graph) {
            const rootNode = graph.findById(treeData.id);
            if (rootNode) {
              // 不使用动画（false），直接定位避免初始加载时的镜头移动
              graph.focusItem(rootNode, false);
            }
          }
        }, 100);

        setLoading(false);
        console.log('[useGraphInit] 初始化完成');
      } catch (err) {
        console.error('[useGraphInit] 初始化失败:', err);
        setLoading(false);
      }
    };

    init();

    // ── 窗口 resize 处理 ──
    // 浏览器窗口尺寸变化时，同步调整 G6 画布尺寸并重新适配视口。
    // fitView(15) 中的 15 是画布四周留白的 padding 像素值。

    const handleResize = () => {
      if (!containerRef.current || !graphManagerRef.current) return;
      graphManagerRef.current.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight || window.innerHeight
      );
      graphManagerRef.current.fitView(15);
    };
    window.addEventListener('resize', handleResize);

    // ── 清理函数 ──
    // 销毁顺序很重要：先解绑事件（避免销毁时触发回调访问已释放的 graph），
    // 再销毁 GraphManager（释放 G6 内部资源）

    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleResize);

      if (eventHandlerRef.current) {
        eventHandlerRef.current.destroy();
        eventHandlerRef.current = null;
      }

      if (graphManagerRef.current) {
        graphManagerRef.current.destroy();
        graphManagerRef.current = null;
      }
    };
    // 注意：回调函数通过 ref 访问最新值，不在依赖数组中，
    // 只有 currentRoadmapId 和路径变化时才重新初始化
  }, [currentRoadmapId, getMdBasePath]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 配置变化监听 — 节点样式/布局/颜色变化时刷新画布
  // ═══════════════════════════════════════════════════════════════════════════════
  // 依赖 JSON 序列化字符串而非对象引用，确保只在内容实际变化时触发。
  // configVersion 用于处理同一对象引用被内部修改的情况（如 ConfigPanel 的 onChange）。

  useEffect(() => {
    if (graphManagerRef.current && !loading) {
      graphManagerRef.current.refresh();
    }
  }, [colorsJson, layoutJson, nodeStylesJson, textStylesJson, loading, currentRoadmapId, configVersion]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 水印配置变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // loading 时跳过：图中节点尚未渲染，设置水印无意义
    if (!graphManagerRef.current || loading) return;
    graphManagerRef.current.setWatermark(watermarkConfig);
  }, [watermarkConfig, loading]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 小地图配置变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    graphManagerRef.current.setMinimap(minimapConfig);
  }, [minimapConfig, loading]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 主题变化监听
  // ═══════════════════════════════════════════════════════════════════════════════
  // 主题切换需要强制重绘所有节点（因为节点渲染时从 themeStore 读取颜色）。
  // 策略：遍历所有节点调用 updateItem({}, {}) 触发 setState → 重绘，
  //       然后 layout() 重新计算节点位置（颜色变化可能影响文本宽度和节点尺寸）。

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    const graph = graphManagerRef.current.getGraph();
    if (!graph) return;
    graph.getNodes().forEach((node) => {
      graph.updateItem(node, {});
    });
    graph.layout();
  }, [currentThemeId, themeColors, loading]);

  return {
    graphManagerRef,
    eventHandlerRef,
    loading,
    rawData,
    totalNodes,
    setRawData,
    rawDataRef,
  };
}
