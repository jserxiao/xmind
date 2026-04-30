/**
 * useGraphInit — G6 图初始化与配置监听 Hook（门面模式）
 *
 * 职责：作为组合入口，将数据加载、图实例管理、配置监听三部分
 * 职责委托给各自的子 Hook，对外保持统一接口不变。
 *
 * 子 Hook 拆分：
 *   ├── useRoadmapDataLoader()  — 数据加载和缓存管理
 *   ├── useGraphInstance()      — G6 生命周期管理（创建/销毁/resize）
 *   └── useGraphConfig()        — 配置变化监听（样式/水印/小地图/主题/连线）
 *
 * 销毁顺序：先解绑事件处理器，再销毁图实例（避免销毁时触发事件回调）
 */

import { useRoadmapDataLoader } from './useRoadmapDataLoader';
import { useGraphInstance } from './useGraphInstance';
import { useGraphConfig } from './useGraphConfig';
import type { GraphManager } from '../core/GraphManager';
import type { EventHandler, ContextMenuCallback, DoubleClickPreviewCallback } from '../core/EventHandler';
import type { RoadmapNode } from '../data/roadmapData';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义（保持与拆分前完全一致）
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
// Hook 实现（组合子 Hook）
// ═══════════════════════════════════════════════════════════════════════════════

export function useGraphInit({
  containerRef,
  currentRoadmapId,
  onNodeClick: _onNodeClick,
  onContextMenu,
  onDoubleClickPreview,
}: UseGraphInitOptions): UseGraphInitReturn {

  // ── 子 Hook 1：数据加载 ──
  const {
    loading,
    rawData,
    totalNodes,
    setRawData,
    rawDataRef,
  } = useRoadmapDataLoader({ currentRoadmapId });

  // ── 子 Hook 2：图实例生命周期 ──
  const { graphManagerRef, eventHandlerRef } = useGraphInstance({
    containerRef,
    currentRoadmapId,
    rawData,
    loading,
    onContextMenu,
    onDoubleClickPreview,
  });

  // ── 子 Hook 3：配置变化监听 ──
  useGraphConfig({
    graphManagerRef,
    loading,
    currentRoadmapId,
  });

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
