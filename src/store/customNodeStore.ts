/**
 * 自定义节点状态管理 Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomNodeConfig, BaseElement } from '../types/customNode';

// 重新导出类型，方便外部使用
export type { CustomNodeConfig, BaseElement } from '../types/customNode';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface CustomNodeState {
  /** 所有自定义节点配置 */
  customNodes: Record<string, CustomNodeConfig>;
  
  /** 获取所有自定义节点列表 */
  getCustomNodes: () => CustomNodeConfig[];
  
  /** 根据 ID 获取自定义节点 */
  getCustomNode: (id: string) => CustomNodeConfig | undefined;
  
  /** 添加自定义节点 */
  addCustomNode: (node: Omit<CustomNodeConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;
  
  /** 更新自定义节点 */
  updateCustomNode: (id: string, updates: Partial<CustomNodeConfig>) => void;
  
  /** 删除自定义节点 */
  deleteCustomNode: (id: string) => void;
  
  /** 复制自定义节点 */
  duplicateCustomNode: (id: string) => string | null;
  
  /** 导出自定义节点数据 */
  exportCustomNodes: () => Record<string, CustomNodeConfig>;
  
  /** 导入自定义节点数据 */
  importCustomNodes: (nodes: Record<string, CustomNodeConfig>, merge?: boolean) => void;
  
  /** 更新节点元素 */
  updateNodeElements: (nodeId: string, elements: BaseElement[]) => void;
  
  /** 添加元素到节点 */
  addElementToNode: (nodeId: string, element: BaseElement) => void;
  
  /** 从节点删除元素 */
  removeElementFromNode: (nodeId: string, elementId: string) => void;
  
  /** 更新节点中的元素 */
  updateElementInNode: (nodeId: string, elementId: string, updates: Partial<BaseElement>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 生成唯一 ID */
function generateId(): string {
  return `custom-node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 创建 Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useCustomNodeStore = create<CustomNodeState>()(
  persist(
    (set, get) => ({
      customNodes: {},
      
      getCustomNodes: () => {
        return Object.values(get().customNodes);
      },
      
      getCustomNode: (id) => {
        return get().customNodes[id];
      },
      
      addCustomNode: (node) => {
        const id = generateId();
        const now = Date.now();
        
        set((state) => ({
          customNodes: {
            ...state.customNodes,
            [id]: {
              ...node,
              id,
              createdAt: now,
              updatedAt: now,
            },
          },
        }));
        
        return id;
      },
      
      updateCustomNode: (id, updates) => {
        set((state) => {
          const existing = state.customNodes[id];
          if (!existing) return state;
          
          return {
            customNodes: {
              ...state.customNodes,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      
      deleteCustomNode: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.customNodes;
          return { customNodes: rest };
        });
      },
      
      duplicateCustomNode: (id) => {
        const node = get().customNodes[id];
        if (!node) return null;
        
        const newId = generateId();
        const now = Date.now();
        
        set((state) => ({
          customNodes: {
            ...state.customNodes,
            [newId]: {
              ...node,
              id: newId,
              name: `${node.name} (副本)`,
              createdAt: now,
              updatedAt: now,
            },
          },
        }));
        
        return newId;
      },
      
      exportCustomNodes: () => {
        return { ...get().customNodes };
      },
      
      importCustomNodes: (nodes, merge = true) => {
        set((state) => {
          if (merge) {
            return {
              customNodes: {
                ...state.customNodes,
                ...nodes,
              },
            };
          } else {
            return {
              customNodes: { ...nodes },
            };
          }
        });
      },
      
      updateNodeElements: (nodeId, elements) => {
        set((state) => {
          const existing = state.customNodes[nodeId];
          if (!existing) return state;
          
          return {
            customNodes: {
              ...state.customNodes,
              [nodeId]: {
                ...existing,
                elements,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      
      addElementToNode: (nodeId, element) => {
        set((state) => {
          const existing = state.customNodes[nodeId];
          if (!existing) return state;
          
          return {
            customNodes: {
              ...state.customNodes,
              [nodeId]: {
                ...existing,
                elements: [...existing.elements, element],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      
      removeElementFromNode: (nodeId, elementId) => {
        set((state) => {
          const existing = state.customNodes[nodeId];
          if (!existing) return state;
          
          return {
            customNodes: {
              ...state.customNodes,
              [nodeId]: {
                ...existing,
                elements: existing.elements.filter((e) => e.id !== elementId),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      
      updateElementInNode: (nodeId, elementId, updates) => {
        set((state) => {
          const existing = state.customNodes[nodeId];
          if (!existing) return state;
          
          return {
            customNodes: {
              ...state.customNodes,
              [nodeId]: {
                ...existing,
                elements: existing.elements.map((e) =>
                  e.id === elementId ? { ...e, ...updates } : e
                ),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
    }),
    {
      name: 'custom-node-storage',
      partialize: (state) => ({
        customNodes: state.customNodes,
      }),
    }
  )
);
