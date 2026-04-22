/**
 * 节点历史记录 Store
 * 
 * 管理节点操作的撤销/恢复，包括：
 * - 节点增删改
 * - 文件持久化
 * - 键盘快捷键绑定
 */

import { create } from 'zustand';
import type { RoadmapNode } from '../data/roadmapData';
import { saveIndexJson, writeFile, deleteFile } from '../utils/fileSystem';
import { useRoadmapStore } from './roadmapStore';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 历史记录项 */
interface HistoryEntry {
  /** 节点树快照 */
  tree: RoadmapNode;
  /** 操作描述 */
  description: string;
  /** 时间戳 */
  timestamp: number;
}

/** 历史管理器状态 */
interface HistoryStore {
  /** 历史栈（过去的状态） */
  past: HistoryEntry[];
  /** 未来栈（用于重做） */
  future: HistoryEntry[];
  /** 最大历史记录数 */
  maxHistory: number;
  /** 是否正在执行撤销/重做 */
  isProcessing: boolean;

  // ── 操作方法 ──
  
  /** 记录操作历史 */
  pushHistory: (tree: RoadmapNode, description: string) => void;
  
  /** 撤销操作 */
  undo: () => Promise<RoadmapNode | null>;
  
  /** 重做操作 */
  redo: () => Promise<RoadmapNode | null>;
  
  /** 清空历史 */
  clearHistory: () => void;
  
  /** 设置最大历史记录数 */
  setMaxHistory: (max: number) => void;

  // ── 派生状态 ──
  
  /** 是否可以撤销 */
  canUndo: () => boolean;
  
  /** 是否可以重做 */
  canRedo: () => boolean;
  
  /** 获取历史记录数量 */
  getHistoryLength: () => number;
  
  /** 获取最近的历史描述 */
  getLastHistoryDescription: () => string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 实现
// ═══════════════════════════════════════════════════════════════════════════════

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,
  isProcessing: false,

  // 记录操作历史
  pushHistory: (tree, description) => {
    set((state) => ({
      past: [
        ...state.past,
        {
          tree: JSON.parse(JSON.stringify(tree)), // 深拷贝
          description,
          timestamp: Date.now(),
        },
      ].slice(-state.maxHistory),
      // 记录新操作时清空 future 栈
      future: [],
    }));
  },

  // 撤销操作
  undo: async () => {
    const { past, isProcessing } = get();
    
    if (past.length === 0 || isProcessing) {
      return null;
    }

    set({ isProcessing: true });

    try {
      const lastEntry = past[past.length - 1];
      const newPast = past.slice(0, -1);

      // 获取当前思维导图路径
      const mdBasePath = useRoadmapStore.getState().getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';

      // 持久化到文件
      await saveIndexJson(roadmapPath, lastEntry.tree);

      // 更新状态
      set((state) => ({
        past: newPast,
        future: [
          {
            tree: state.past[state.past.length - 1]?.tree || lastEntry.tree,
            description: `重做: ${lastEntry.description}`,
            timestamp: Date.now(),
          },
          ...state.future,
        ].slice(0, state.maxHistory),
      }));

      console.log('[HistoryStore] 撤销成功:', lastEntry.description);
      return lastEntry.tree;
    } catch (error) {
      console.error('[HistoryStore] 撤销失败:', error);
      return null;
    } finally {
      set({ isProcessing: false });
    }
  },

  // 重做操作
  redo: async () => {
    const { future, isProcessing } = get();
    
    if (future.length === 0 || isProcessing) {
      return null;
    }

    set({ isProcessing: true });

    try {
      const nextEntry = future[0];
      const newFuture = future.slice(1);

      // 获取当前思维导图路径
      const mdBasePath = useRoadmapStore.getState().getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';

      // 持久化到文件
      await saveIndexJson(roadmapPath, nextEntry.tree);

      // 更新状态
      set((state) => ({
        past: [
          ...state.past,
          {
            tree: nextEntry.tree,
            description: nextEntry.description,
            timestamp: Date.now(),
          },
        ].slice(-state.maxHistory),
        future: newFuture,
      }));

      console.log('[HistoryStore] 重做成功:', nextEntry.description);
      return nextEntry.tree;
    } catch (error) {
      console.error('[HistoryStore] 重做失败:', error);
      return null;
    } finally {
      set({ isProcessing: false });
    }
  },

  // 清空历史
  clearHistory: () => {
    set({ past: [], future: [] });
  },

  // 设置最大历史记录数
  setMaxHistory: (max) => {
    set((state) => ({
      maxHistory: max,
      past: state.past.slice(-max),
      future: state.future.slice(0, max),
    }));
  },

  // 是否可以撤销
  canUndo: () => get().past.length > 0,

  // 是否可以重做
  canRedo: () => get().future.length > 0,

  // 获取历史记录数量
  getHistoryLength: () => get().past.length,

  // 获取最近的历史描述
  getLastHistoryDescription: () => {
    const { past } = get();
    return past.length > 0 ? past[past.length - 1].description : null;
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// 便捷方法：包装节点操作以自动记录历史
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建一个带历史记录的节点操作函数
 * 
 * @example
 * ```tsx
 * const withHistory = createHistoryAwareOperation();
 * 
 * // 在执行节点操作前记录历史
 * withHistory(currentTree, '添加节点', async (tree) => {
 *   const newTree = addChildNode(tree, parentId, newNode);
 *   return newTree;
 * });
 * ```
 */
export function createHistoryAwareOperation() {
  return async (
    currentTree: RoadmapNode,
    description: string,
    operation: (tree: RoadmapNode) => Promise<RoadmapNode> | RoadmapNode
  ): Promise<RoadmapNode> => {
    // 1. 记录当前状态到历史
    useHistoryStore.getState().pushHistory(currentTree, description);

    // 2. 执行操作
    const newTree = await operation(currentTree);

    // 3. 返回新状态
    return newTree;
  };
}
