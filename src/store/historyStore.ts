/**
 * 节点历史记录 Store
 * 
 * 管理节点操作的撤销/恢复，包括：
 * - 节点增删改
 * - 连线增删
 * - 书签变更
 * - 文件持久化
 * - 键盘快捷键绑定
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoadmapNode } from '../data/roadmapData';
import { saveIndexJson, writeFile } from '../utils/fileSystem';
import { useRoadmapStore } from './roadmapStore';
import { useConnectionStore, type NodeRelation } from './connectionStore';
import { useBookmarkStore, type Bookmark } from './bookmarkStore';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 被删除的文件信息 */
export interface DeletedFileInfo {
  /** 文件路径（相对于思维导图目录） */
  path: string;
  /** 文件内容 */
  content: string;
}

/** 历史记录项 */
interface HistoryEntry {
  /** 节点树快照 */
  tree: RoadmapNode;
  /** 操作描述 */
  description: string;
  /** 时间戳 */
  timestamp: number;
  /** 被删除的文件列表（用于撤销时恢复） */
  deletedFiles?: DeletedFileInfo[];
  /** 连线数据快照（用于撤销/恢复连线） */
  connections?: NodeRelation[];
  /** 书签数据快照（用于撤销/恢复书签） */
  bookmarks?: Bookmark[];
  /** 当前思维导图 ID（用于恢复时定位） */
  roadmapId?: string;
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
  pushHistory: (
    tree: RoadmapNode, 
    description: string, 
    deletedFiles?: DeletedFileInfo[],
    connections?: NodeRelation[],
    bookmarks?: Bookmark[],
    roadmapId?: string
  ) => void;
  
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

  /** 跳转到指定历史状态 */
  jumpToHistory: (targetIndex: number, type: 'past' | 'future', roadmapPath: string) => Promise<RoadmapNode | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 实现
// ═══════════════════════════════════════════════════════════════════════════════

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      past: [],
      future: [],
      maxHistory: 50,
      isProcessing: false,

  // 记录操作历史
  pushHistory: (tree, description, deletedFiles, connections, bookmarks, roadmapId) => {
    set((state) => ({
      past: [
        ...state.past,
        {
          tree: JSON.parse(JSON.stringify(tree)), // 深拷贝
          description,
          timestamp: Date.now(),
          deletedFiles,
          // 深拷贝连线和书签数据
          connections: connections ? JSON.parse(JSON.stringify(connections)) : undefined,
          bookmarks: bookmarks ? JSON.parse(JSON.stringify(bookmarks)) : undefined,
          roadmapId,
        },
      ].slice(-state.maxHistory),
      // 记录新操作时清空 future 栈
      future: [],
    }));
  },

  // 撤销操作
  undo: async () => {
    const { past, future, isProcessing } = get();
    
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

      // 恢复被删除的文件
      if (lastEntry.deletedFiles && lastEntry.deletedFiles.length > 0) {
        console.log('[HistoryStore] 恢复被删除的文件:', lastEntry.deletedFiles.length, '个');
        for (const fileInfo of lastEntry.deletedFiles) {
          const fullPath = `${mdBasePath}/${fileInfo.path}`;
          const result = await writeFile(fullPath, fileInfo.content);
          if (!result.success) {
            console.error('[HistoryStore] 恢复文件失败:', fileInfo.path, result.message);
          } else {
            console.log('[HistoryStore] 恢复文件成功:', fileInfo.path);
          }
        }
      }

      // 恢复连线数据到 store
      if (lastEntry.connections !== undefined) {
        const targetRoadmapId = lastEntry.roadmapId || roadmapPath;
        useConnectionStore.getState().setConnections(targetRoadmapId, lastEntry.connections);
        console.log('[HistoryStore] 恢复连线数据:', lastEntry.connections.length, '条');
      }

      // 恢复书签数据到 store
      if (lastEntry.bookmarks !== undefined) {
        const targetRoadmapId = lastEntry.roadmapId || roadmapPath;
        useBookmarkStore.getState().setBookmarks(targetRoadmapId, lastEntry.bookmarks);
        console.log('[HistoryStore] 恢复书签数据:', lastEntry.bookmarks.length, '个');
      }

      // 持久化到文件（包含连线和书签）
      await saveIndexJson(roadmapPath, lastEntry.tree, lastEntry.connections, lastEntry.bookmarks);

      // 更新状态
      // 注意：撤销时，将历史状态放入 future 栈，重做时可以恢复
      set({
        past: newPast,
        future: [
          {
            tree: lastEntry.tree,
            description: lastEntry.description,
            timestamp: Date.now(),
            deletedFiles: lastEntry.deletedFiles,
            connections: lastEntry.connections,
            bookmarks: lastEntry.bookmarks,
            roadmapId: lastEntry.roadmapId,
          },
          ...future,
        ].slice(0, get().maxHistory),
      });

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
    const { future, past, isProcessing } = get();
    
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

      // 注意：重做时不再重复删除文件，因为 nextEntry.tree 已经是不包含这些文件的状态
      // 只需要将状态恢复并持久化即可

      // 恢复连线数据到 store
      if (nextEntry.connections !== undefined) {
        const targetRoadmapId = nextEntry.roadmapId || roadmapPath;
        useConnectionStore.getState().setConnections(targetRoadmapId, nextEntry.connections);
        console.log('[HistoryStore] 重做时恢复连线数据:', nextEntry.connections.length, '条');
      }

      // 恢复书签数据到 store
      if (nextEntry.bookmarks !== undefined) {
        const targetRoadmapId = nextEntry.roadmapId || roadmapPath;
        useBookmarkStore.getState().setBookmarks(targetRoadmapId, nextEntry.bookmarks);
        console.log('[HistoryStore] 重做时恢复书签数据:', nextEntry.bookmarks.length, '个');
      }

      // 持久化到文件（包含连线和书签）
      await saveIndexJson(roadmapPath, nextEntry.tree, nextEntry.connections, nextEntry.bookmarks);

      // 更新状态：将重做的操作移回 past 栈
      set({
        past: [
          ...past,
          {
            tree: nextEntry.tree,
            description: nextEntry.description.replace('重做: ', ''),
            timestamp: Date.now(),
            deletedFiles: nextEntry.deletedFiles,
            connections: nextEntry.connections,
            bookmarks: nextEntry.bookmarks,
            roadmapId: nextEntry.roadmapId,
          },
        ].slice(-get().maxHistory),
        future: newFuture,
      });

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

  // 跳转到指定历史状态
  jumpToHistory: async (targetIndex: number, type: 'past' | 'future', roadmapPath: string) => {
    const { past, future, isProcessing } = get();
    
    if (isProcessing) {
      console.log('[HistoryStore] 正在处理中，跳过跳转');
      return null;
    }

    set({ isProcessing: true });

    try {
      // 获取当前思维导图路径
      const mdBasePath = useRoadmapStore.getState().getMdBasePath();
      let targetTree: RoadmapNode | null = null;
      let filesToRestore: DeletedFileInfo[] = [];

      if (type === 'past') {
        // 跳转到过去的状态
        if (targetIndex < 0 || targetIndex >= past.length) {
          console.error('[HistoryStore] 无效的历史索引');
          return null;
        }

        // 目标状态在 past 数组中的位置
        const targetEntry = past[targetIndex];
        targetTree = targetEntry.tree;

        // 收集需要恢复的文件：从当前状态到目标状态之间所有被修改的文件
        // 对于跳转到过去，我们需要恢复目标状态对应的文件
        if (targetEntry.deletedFiles && targetEntry.deletedFiles.length > 0) {
          filesToRestore = targetEntry.deletedFiles;
        }

        // 更新状态：将目标之后的所有历史移到 future
        const newPast = past.slice(0, targetIndex);
        const newFuture = [
          ...past.slice(targetIndex + 1).reverse().map(entry => ({
            tree: entry.tree,
            description: entry.description,
            timestamp: entry.timestamp,
            deletedFiles: entry.deletedFiles,
            connections: entry.connections,
            bookmarks: entry.bookmarks,
            roadmapId: entry.roadmapId,
          })),
          ...future,
        ];

        // 恢复文件
        if (filesToRestore.length > 0) {
          console.log('[HistoryStore] 跳转时恢复文件:', filesToRestore.length, '个');
          for (const fileInfo of filesToRestore) {
            const fullPath = `${mdBasePath}/${fileInfo.path}`;
            const result = await writeFile(fullPath, fileInfo.content);
            if (!result.success) {
              console.error('[HistoryStore] 恢复文件失败:', fileInfo.path, result.message);
            }
          }
        }

        // 恢复连线数据到 store
        if (targetEntry.connections !== undefined) {
          const targetRoadmapId = targetEntry.roadmapId || roadmapPath;
          useConnectionStore.getState().setConnections(targetRoadmapId, targetEntry.connections);
          console.log('[HistoryStore] 跳转时恢复连线数据:', targetEntry.connections.length, '条');
        }

        // 恢复书签数据到 store
        if (targetEntry.bookmarks !== undefined) {
          const targetRoadmapId = targetEntry.roadmapId || roadmapPath;
          useBookmarkStore.getState().setBookmarks(targetRoadmapId, targetEntry.bookmarks);
          console.log('[HistoryStore] 跳转时恢复书签数据:', targetEntry.bookmarks.length, '个');
        }

        // 持久化目标状态（包含连线和书签）
        await saveIndexJson(roadmapPath, targetTree, targetEntry.connections, targetEntry.bookmarks);

        set({
          past: newPast,
          future: newFuture,
        });

        console.log('[HistoryStore] 跳转到历史状态:', targetEntry.description);
      } else {
        // 跳转到未来的状态
        if (targetIndex < 0 || targetIndex >= future.length) {
          console.error('[HistoryStore] 无效的未来索引');
          return null;
        }

        // 目标状态在 future 数组中的位置
        const targetEntry = future[targetIndex];
        targetTree = targetEntry.tree;

        // 收集需要处理的文件
        if (targetEntry.deletedFiles && targetEntry.deletedFiles.length > 0) {
          filesToRestore = targetEntry.deletedFiles;
        }

        // 更新状态：将目标之后的所有历史移到 past
        const newFuture = future.slice(targetIndex + 1);
        const newPast = [
          ...past,
          ...future.slice(0, targetIndex).reverse().map(entry => ({
            tree: entry.tree,
            description: entry.description,
            timestamp: entry.timestamp,
            deletedFiles: entry.deletedFiles,
            connections: entry.connections,
            bookmarks: entry.bookmarks,
            roadmapId: entry.roadmapId,
          })),
        ];

        // 恢复文件（重做时需要重新应用文件状态）
        if (filesToRestore.length > 0) {
          console.log('[HistoryStore] 跳转到未来时恢复文件:', filesToRestore.length, '个');
          for (const fileInfo of filesToRestore) {
            const fullPath = `${mdBasePath}/${fileInfo.path}`;
            const result = await writeFile(fullPath, fileInfo.content);
            if (!result.success) {
              console.error('[HistoryStore] 恢复文件失败:', fileInfo.path, result.message);
            }
          }
        }

        // 恢复连线数据到 store
        if (targetEntry.connections !== undefined) {
          const targetRoadmapId = targetEntry.roadmapId || roadmapPath;
          useConnectionStore.getState().setConnections(targetRoadmapId, targetEntry.connections);
          console.log('[HistoryStore] 跳转到未来时恢复连线数据:', targetEntry.connections.length, '条');
        }

        // 恢复书签数据到 store
        if (targetEntry.bookmarks !== undefined) {
          const targetRoadmapId = targetEntry.roadmapId || roadmapPath;
          useBookmarkStore.getState().setBookmarks(targetRoadmapId, targetEntry.bookmarks);
          console.log('[HistoryStore] 跳转到未来时恢复书签数据:', targetEntry.bookmarks.length, '个');
        }

        // 持久化目标状态（包含连线和书签）
        await saveIndexJson(roadmapPath, targetTree, targetEntry.connections, targetEntry.bookmarks);

        set({
          past: newPast,
          future: newFuture,
        });

        console.log('[HistoryStore] 跳转到未来状态:', targetEntry.description);
      }

      return targetTree;
    } catch (error) {
      console.error('[HistoryStore] 跳转失败:', error);
      return null;
    } finally {
      set({ isProcessing: false });
    }
  },
    }),
    {
      name: 'history-storage',
      partialize: (state) => ({
        past: state.past.slice(-20), // 只持久化最近20条
        future: state.future.slice(0, 20),
        maxHistory: state.maxHistory,
      }),
    }
  )
);

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
