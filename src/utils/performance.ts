/**
 * 性能优化工具模块
 * 
 * 提供：
 * - 节点懒加载（按层级加载）
 * - 虚拟渲染（只渲染可视区域节点）
 * - 性能监控
 * - 防抖节流工具
 */

import type { RoadmapNode } from '../data/roadmapData';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface LazyLoadOptions {
  /** 初始加载深度，默认 2 */
  initialDepth?: number;
  /** 每次展开增加的深度，默认 1 */
  expandDepth?: number;
  /** 最大加载深度，默认 10 */
  maxDepth?: number;
}

export interface VirtualRenderOptions {
  /** 视口宽度 */
  viewportWidth: number;
  /** 视口高度 */
  viewportHeight: number;
  /** 当前缩放比例 */
  zoom: number;
  /** 当前视口中心 X */
  centerX: number;
  /** 当前视口中心 Y */
  centerY: number;
  /** 缓冲区边距（像素） */
  bufferMargin?: number;
}

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PerformanceMetrics {
  /** 节点总数 */
  totalNodes: number;
  /** 渲染节点数 */
  renderedNodes: number;
  /** 渲染时间（毫秒） */
  renderTime: number;
  /** 内存使用（MB，如果可用） */
  memoryUsage?: number;
  /** 最后更新时间 */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 节点懒加载
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 按深度截断节点树（懒加载）
 * @param root 根节点
 * @param depth 截断深度
 * @returns 截断后的节点树
 */
export function truncateNodeTree(
  root: RoadmapNode,
  depth: number
): RoadmapNode {
  if (depth <= 0) {
    return { ...root, children: undefined };
  }

  return {
    ...root,
    children: root.children?.map(child => truncateNodeTree(child, depth - 1)),
  };
}

/**
 * 计算节点树的深度
 * @param node 节点
 * @returns 深度
 */
export function getNodeDepth(node: RoadmapNode): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...node.children.map(getNodeDepth));
}

/**
 * 统计节点总数
 * @param node 节点树
 * @returns 节点总数
 */
export function countNodes(node: RoadmapNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/**
 * 按层级展开节点（用于懒加载更多层级）
 * @param root 完整的节点树
 * @param currentTruncated 当前的截断树
 * @param nodeId 要展开的节点 ID
 * @param expandDepth 展开的深度
 * @returns 新的截断树
 */
export function expandNodeByDepth(
  root: RoadmapNode,
  currentTruncated: RoadmapNode,
  nodeId: string,
  expandDepth: number = 1
): RoadmapNode {
  // 找到完整树中的节点
  const fullNode = findNodeById(root, nodeId);
  if (!fullNode) return currentTruncated;

  // 深拷贝当前截断树
  const result = deepClone(currentTruncated);

  // 找到截断树中的对应节点并展开
  const targetNode = findNodeById(result, nodeId);
  if (targetNode && fullNode.children) {
    targetNode.children = fullNode.children.map(child =>
      truncateNodeTree(child, expandDepth - 1)
    );
  }

  return result;
}

/**
 * 节点树扁平化（用于虚拟渲染）
 * @param node 节点树
 * @param depth 当前深度
 * @param parent 父节点
 * @returns 扁平化的节点列表
 */
export function flattenNodeTree(
  node: RoadmapNode,
  depth: number = 0,
  parent: RoadmapNode | null = null
): Array<{ node: RoadmapNode; depth: number; parent: RoadmapNode | null }> {
  const result = [{ node, depth, parent }];

  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenNodeTree(child, depth + 1, node));
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

function findNodeById(root: RoadmapNode, id: string): RoadmapNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 性能监控
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxRecords: number = 100;
  private startTime: number = 0;

  /**
   * 开始计时
   */
  startTiming(): void {
    this.startTime = performance.now();
  }

  /**
   * 结束计时并记录
   */
  endTiming(totalNodes: number, renderedNodes: number): PerformanceMetrics {
    const endTime = performance.now();
    const renderTime = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      totalNodes,
      renderedNodes,
      renderTime,
      timestamp: Date.now(),
    };

    // 尝试获取内存使用（Chrome 支持）
    if ((performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }

    this.metrics.push(metrics);

    // 限制记录数量
    if (this.metrics.length > this.maxRecords) {
      this.metrics.shift();
    }

    return metrics;
  }

  /**
   * 获取平均渲染时间
   */
  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / this.metrics.length;
  }

  /**
   * 获取最近 N 次的性能数据
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 检查性能是否健康
   */
  isHealthy(): boolean {
    const avgTime = this.getAverageRenderTime();
    return avgTime < 100; // 平均渲染时间小于 100ms 视为健康
  }

  /**
   * 导出性能报告
   */
  exportReport(): string {
    return JSON.stringify({
      summary: {
        totalRecords: this.metrics.length,
        averageRenderTime: this.getAverageRenderTime(),
        isHealthy: this.isHealthy(),
      },
      details: this.metrics,
    }, null, 2);
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// ═══════════════════════════════════════════════════════════════════════════════
// 防抖和节流
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param limit 时间限制（毫秒）
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 请求动画帧节流
 * @param fn 要节流的函数
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn.apply(this, args);
        rafId = null;
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 批量处理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分批处理数组（避免阻塞主线程）
 * @param items 要处理的数组
 * @param processor 处理函数
 * @param batchSize 每批处理数量
 * @returns Promise
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  batchSize: number = 50
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map((item, j) => processor(item, i + j));
    results.push(...batchResults);

    // 让出主线程
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * 空闲时处理（使用 requestIdleCallback）
 * @param fn 要处理的函数
 * @param timeout 超时时间
 */
export function runWhenIdle(fn: () => void, timeout: number = 2000): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 1);
  }
}
