/**
 * BookmarkStore - 书签标记 Store
 * 
 * 管理节点的书签标记功能
 * - 支持添加/移除书签
 * - 持久化存储
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 书签信息 */
export interface Bookmark {
  /** 节点 ID */
  nodeId: string;
  /** 节点标签（用于显示） */
  nodeLabel: string;
  /** 创建时间 */
  createdAt: number;
  /** 备注（可选） */
  note?: string;
}

/** 书签 Store 状态 */
interface BookmarkStore {
  /** 当前思维导图的书签列表（按 roadmapId 分组） */
  bookmarks: Record<string, Bookmark[]>;
  
  /** 当前思维导图 ID */
  currentRoadmapId: string | null;
  
  /** 设置当前思维导图 ID */
  setCurrentRoadmapId: (roadmapId: string | null) => void;
  
  /** 添加书签 */
  addBookmark: (nodeId: string, nodeLabel: string, note?: string) => void;
  
  /** 移除书签 */
  removeBookmark: (nodeId: string) => void;
  
  /** 切换书签状态 */
  toggleBookmark: (nodeId: string, nodeLabel: string, note?: string) => boolean;
  
  /** 检查节点是否有书签 */
  hasBookmark: (nodeId: string) => boolean;
  
  /** 获取当前思维导图的书签列表 */
  getBookmarks: () => Bookmark[];
  
  /** 获取书签备注 */
  getBookmarkNote: (nodeId: string) => string | undefined;
  
  /** 更新书签备注 */
  updateBookmarkNote: (nodeId: string, note: string) => void;
  
  /** 清空当前思维导图的所有书签 */
  clearBookmarks: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 实现
// ═══════════════════════════════════════════════════════════════════════════════

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: {},
      currentRoadmapId: null,
      
      setCurrentRoadmapId: (roadmapId) => {
        set({ currentRoadmapId: roadmapId });
      },
      
      addBookmark: (nodeId, nodeLabel, note) => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return;
        
        const roadmapBookmarks = bookmarks[currentRoadmapId] || [];
        
        // 检查是否已存在
        if (roadmapBookmarks.some(b => b.nodeId === nodeId)) return;
        
        set({
          bookmarks: {
            ...bookmarks,
            [currentRoadmapId]: [
              ...roadmapBookmarks,
              {
                nodeId,
                nodeLabel,
                createdAt: Date.now(),
                note,
              },
            ],
          },
        });
      },
      
      removeBookmark: (nodeId) => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return;
        
        const roadmapBookmarks = bookmarks[currentRoadmapId] || [];
        
        set({
          bookmarks: {
            ...bookmarks,
            [currentRoadmapId]: roadmapBookmarks.filter(b => b.nodeId !== nodeId),
          },
        });
      },
      
      toggleBookmark: (nodeId, nodeLabel, note) => {
        const { hasBookmark, addBookmark, removeBookmark } = get();
        
        if (hasBookmark(nodeId)) {
          removeBookmark(nodeId);
          return false;
        } else {
          addBookmark(nodeId, nodeLabel, note);
          return true;
        }
      },
      
      hasBookmark: (nodeId) => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return false;
        
        const roadmapBookmarks = bookmarks[currentRoadmapId] || [];
        return roadmapBookmarks.some(b => b.nodeId === nodeId);
      },
      
      getBookmarks: () => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return [];
        
        return bookmarks[currentRoadmapId] || [];
      },
      
      getBookmarkNote: (nodeId) => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return undefined;
        
        const roadmapBookmarks = bookmarks[currentRoadmapId] || [];
        const bookmark = roadmapBookmarks.find(b => b.nodeId === nodeId);
        return bookmark?.note;
      },
      
      updateBookmarkNote: (nodeId, note) => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return;
        
        const roadmapBookmarks = bookmarks[currentRoadmapId] || [];
        
        set({
          bookmarks: {
            ...bookmarks,
            [currentRoadmapId]: roadmapBookmarks.map(b =>
              b.nodeId === nodeId ? { ...b, note } : b
            ),
          },
        });
      },
      
      clearBookmarks: () => {
        const { bookmarks, currentRoadmapId } = get();
        if (!currentRoadmapId) return;
        
        set({
          bookmarks: {
            ...bookmarks,
            [currentRoadmapId]: [],
          },
        });
      },
    }),
    {
      name: 'mindmap-bookmarks',
    }
  )
);
