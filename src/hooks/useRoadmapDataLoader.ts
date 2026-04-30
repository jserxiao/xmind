/**
 * useRoadmapDataLoader — 数据加载与缓存管理 Hook
 *
 * 职责：
 *   - 等待 IndexedDB 异步恢复目录句柄
 *   - 读取 index.json 获取节点树
 *   - enrichWithSubNodes 解析 MD 标题生成动态 sub 子节点
 *   - 管理加载状态和 rawData 的 state + ref 双写
 *
 * 从 useGraphInit 中拆分出来，实现职责单一原则。
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRoadmapStore } from '../store/roadmapStore';
import type { RoadmapNode } from '../data/roadmapData';
import { loadRoadmapData, enrichWithSubNodes } from '../data/roadmapData';
import { getDirectoryHandle, waitForDirectoryHandleInit } from '../utils/fileSystem';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseRoadmapDataLoaderOptions {
  /** 当前思维导图 ID，变化时重新加载数据 */
  currentRoadmapId: string | null;
}

export interface UseRoadmapDataLoaderReturn {
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

export function useRoadmapDataLoader({
  currentRoadmapId,
}: UseRoadmapDataLoaderOptions): UseRoadmapDataLoaderReturn {

  // ── 数据状态 ──

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RoadmapNode | null>(null);
  // ref 版本：事件回调中使用 ref 读取最新值，避免闭包捕获过期状态
  const rawDataRef = useRef<RoadmapNode | null>(null);

  // ── Store 选择器 ──

  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);

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
  // 数据加载 effect（currentRoadmapId 变化时重新执行）
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        console.log('[useRoadmapDataLoader] 开始加载数据...');

        // 等待 IndexedDB 异步恢复目录句柄
        await waitForDirectoryHandleInit();

        // 没有目录句柄说明用户还未选择工作目录，停止加载
        const dirHandle = getDirectoryHandle();
        if (!dirHandle) {
          console.warn('[useRoadmapDataLoader] 没有目录句柄，停止加载');
          if (!cancelled) setLoading(false);
          return;
        }

        // 获取当前思维导图在文件系统中的路径
        const mdBasePath = getMdBasePath();
        if (!mdBasePath) {
          console.warn('[useRoadmapDataLoader] 没有 mdBasePath，停止加载');
          if (!cancelled) setLoading(false);
          return;
        }

        // 步骤 1：加载 index.json 获取节点树
        const roadmapPath = mdBasePath.split('/').pop() || '';
        const root = await loadRoadmapData(roadmapPath);
        if (cancelled) return;

        // 步骤 2：enrich — 解析 MD 标题，生成动态 sub 子节点
        const enriched = await enrichWithSubNodes(root, roadmapPath);
        if (cancelled) return;

        // 保存原始数据（ref + state 双写）
        setRawData(enriched);
        rawDataRef.current = enriched;
        setLoading(false);

        console.log('[useRoadmapDataLoader] 数据加载完成');
      } catch (err) {
        console.error('[useRoadmapDataLoader] 数据加载失败:', err);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentRoadmapId, getMdBasePath]);

  return {
    loading,
    rawData,
    totalNodes,
    setRawData,
    rawDataRef,
  };
}
