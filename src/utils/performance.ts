/**
 * 性能优化工具模块
 * 
 * 提供：
 * - 节点懒加载（按层级加载）
 * - 虚拟渲染（只渲染可视区域节点）
 * - 性能监控
 * 
 * 注意：防抖节流等通用函数请使用 common.ts 中的实现
 */

import type { RoadmapNode } from '../data/roadmapData';
import { deepClone } from './common';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 带内存信息的 Performance 接口（Chrome 扩展） */
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/** 带开发标记的窗口接口 */
interface WindowWithDev extends Window {
  __DEV__?: boolean;
}

export interface LazyLoadOptions {
  /** 初始加载深度，默认 2 */
  initialDepth?: number;
  /** 每次展开增加的深度，默认 1 */
  expandDepth?: number;
  /** 最大加载深度，默认 10 */
  maxDepth?: number;
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
// 节点树操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 按深度截断节点树（懒加载）
 */
export function truncateNodeTree(root: RoadmapNode, depth: number): RoadmapNode {
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
 */
export function getNodeDepth(node: RoadmapNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(getNodeDepth));
}

/**
 * 统计节点总数
 */
export function countNodes(node: RoadmapNode): number {
  let count = 1;
  node.children?.forEach(child => {
    count += countNodes(child);
  });
  return count;
}

/**
 * 节点树扁平化（用于虚拟渲染）
 */
export function flattenNodeTree(
  node: RoadmapNode,
  depth: number = 0,
  parent: RoadmapNode | null = null
): Array<{ node: RoadmapNode; depth: number; parent: RoadmapNode | null }> {
  const result = [{ node, depth, parent }];

  node.children?.forEach(child => {
    result.push(...flattenNodeTree(child, depth + 1, node));
  });

  return result;
}

/**
 * 按层级展开节点（用于懒加载更多层级）
 */
export function expandNodeByDepth(
  fullTree: RoadmapNode,
  currentTruncated: RoadmapNode,
  nodeId: string,
  expandDepth: number = 1
): RoadmapNode {
  // 找到完整树中的节点
  const fullNode = findNodeById(fullTree, nodeId);
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
 * 在树中查找节点
 */
export function findNodeById(root: RoadmapNode, id: string): RoadmapNode | null {
  if (root.id === id) return root;
  
  for (const child of root.children || []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  
  return null;
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

  /** 开始计时 */
  startTiming(): void {
    this.startTime = performance.now();
  }

  /** 结束计时并记录 */
  endTiming(totalNodes: number, renderedNodes: number): PerformanceMetrics {
    const renderTime = performance.now() - this.startTime;

    const metrics: PerformanceMetrics = {
      totalNodes,
      renderedNodes,
      renderTime,
      timestamp: Date.now(),
    };

    // 尝试获取内存使用（Chrome 支持）
    const memory = (performance as PerformanceWithMemory).memory;
    if (memory) {
      metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024;
    }

    this.metrics.push(metrics);

    // 限制记录数量
    if (this.metrics.length > this.maxRecords) {
      this.metrics.shift();
    }

    return metrics;
  }

  /** 获取平均渲染时间 */
  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / this.metrics.length;
  }

  /** 获取最近 N 次的性能数据 */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /** 检查性能是否健康 */
  isHealthy(): boolean {
    return this.getAverageRenderTime() < 100; // 平均渲染时间小于 100ms 视为健康
  }

  /** 导出性能报告 */
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

  /** 清空记录 */
  clear(): void {
    this.metrics = [];
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// ═══════════════════════════════════════════════════════════════════════════════
// 性能测量工具
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 测量函数执行时间
 */
export async function measureTime<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  // 仅在开发环境下输出日志
  if (typeof window !== 'undefined' && (window as WindowWithDev).__DEV__) {
    console.log(`[perf] ${name}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}

/**
 * 标记性能点
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * 测量两个标记之间的时间
 */
export function measurePerformance(name: string, startMark: string, endMark: string): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // 忽略不存在的标记
    }
  }
}
