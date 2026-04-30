/**
 * useGraphInstance — G6 图实例生命周期管理 Hook
 *
 * 职责：
 *   - 注册自定义 G6 节点类型
 *   - 创建 GraphManager 并初始化 TreeGraph
 *   - 窗口 resize 处理
 *   - 销毁 GraphManager（释放 G6 内部资源）
 *
 * 从 useGraphInit 中拆分出来，实现职责单一原则。
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoadmapNode } from '../data/roadmapData';
import { GraphManager } from '../core/GraphManager';
import { NodeRenderer } from '../core/NodeRenderer';
import { EventHandler, type ContextMenuCallback, type DoubleClickPreviewCallback, type NavigateCallback } from '../core/EventHandler';
import { convertToTreeData } from '../utils/treeDataUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseGraphInstanceOptions {
  /** 画布 DOM 容器 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 当前思维导图 ID，变化时重新初始化 */
  currentRoadmapId: string | null;
  /** 完整的节点树数据（已 enrich） */
  rawData: RoadmapNode | null;
  /** 数据是否正在加载 */
  loading: boolean;
  /** 右键菜单回调 */
  onContextMenu?: ContextMenuCallback;
  /** 双击预览回调 */
  onDoubleClickPreview?: DoubleClickPreviewCallback;
}

export interface UseGraphInstanceReturn {
  /** G6 图管理器实例 ref */
  graphManagerRef: React.RefObject<GraphManager | null>;
  /** 事件处理器实例 ref */
  eventHandlerRef: React.RefObject<EventHandler | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

export function useGraphInstance({
  containerRef,
  currentRoadmapId,
  rawData,
  loading,
  onContextMenu,
  onDoubleClickPreview,
}: UseGraphInstanceOptions): UseGraphInstanceReturn {

  const graphManagerRef = useRef<GraphManager | null>(null);
  const eventHandlerRef = useRef<EventHandler | null>(null);
  const nodeRendererRef = useRef<NodeRenderer | null>(null);

  const navigate = useNavigate();

  // ── 回调 ref（保持回调引用稳定）──

  const onContextMenuRef = useRef<ContextMenuCallback | undefined>(onContextMenu);
  onContextMenuRef.current = onContextMenu;

  const onDoubleClickPreviewRef = useRef<DoubleClickPreviewCallback | undefined>(onDoubleClickPreview);
  onDoubleClickPreviewRef.current = onDoubleClickPreview;

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // ═══════════════════════════════════════════════════════════════════════════════
  // 图初始化 effect（currentRoadmapId 变化且有数据时重新执行）
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!containerRef.current || loading || !rawData) return;

    let destroyed = false;

    const initGraph = () => {
      try {
        console.log('[useGraphInstance] 开始初始化图实例...');

        // 步骤 1：注册自定义 G6 节点类型
        if (!nodeRendererRef.current) {
          nodeRendererRef.current = new NodeRenderer();
        }
        nodeRendererRef.current.registerAll();

        // 步骤 2：创建 GraphManager
        const container = containerRef.current!;
        graphManagerRef.current = new GraphManager({
          container,
          width: container.clientWidth || window.innerWidth,
          height: container.clientHeight || window.innerHeight,
        });

        // 步骤 3：转换数据并初始化 TreeGraph
        const treeData = convertToTreeData(rawData, new Set());
        graphManagerRef.current.initialize(treeData);

        // 步骤 4：创建 EventHandler
        eventHandlerRef.current = new EventHandler({
          graphManager: graphManagerRef.current,
          container,
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
          onContextMenu: (data) => { onContextMenuRef.current?.(data); },
          onDoubleClickPreview: (data) => { onDoubleClickPreviewRef.current?.(data); },
        });

        // 步骤 5：绑定事件
        eventHandlerRef.current.bindAll();

        // 步骤 6：初始定位到根节点
        setTimeout(() => {
          if (destroyed || !graphManagerRef.current) return;
          const graph = graphManagerRef.current.getGraph();
          if (graph) {
            const rootNode = graph.findById(treeData.id);
            if (rootNode) {
              graph.focusItem(rootNode, false);
            }
          }
        }, 100);

        console.log('[useGraphInstance] 图实例初始化完成');
      } catch (err) {
        console.error('[useGraphInstance] 图实例初始化失败:', err);
      }
    };

    initGraph();

    // ── 窗口 resize 处理 ──

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
  }, [currentRoadmapId, loading, rawData]);

  return {
    graphManagerRef,
    eventHandlerRef,
  };
}
