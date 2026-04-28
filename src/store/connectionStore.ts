/**
 * 连线状态管理 Store
 * 
 * 管理连线模式的开启/预览/取消状态
 * 以及节点间的关联连线数据
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 连线模式状态 */
export type ConnectionMode = 'idle' | 'active' | 'preview';

/** 节点关联关系 */
export interface NodeRelation {
  /** 关联 ID */
  id: string;
  /** 源节点 ID */
  sourceId: string;
  /** 目标节点 ID */
  targetId: string;
  /** 关系类型 */
  type: 'related' | 'prerequisite' | 'extends' | 'contrasts';
  /** 关系描述 */
  label?: string;
  /** 创建时间 */
  createdAt: number;
}

/** 预览中的连线 */
export interface PreviewConnection {
  sourceId: string;
  targetId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 状态接口
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectionState {
  // ── 连线模式状态 ──
  /** 连线模式：idle=关闭, active=开启连线, preview=预览连线 */
  connectionMode: ConnectionMode;
  
  // ── 连线数据 ──
  /** 所有连线数据，按思维导图 ID 存储 */
  connections: Record<string, NodeRelation[]>;
  
  // ── 临时状态 ──
  /** 当前正在绘制的连线起点节点 ID */
  drawingSourceId: string | null;
  /** 鼠标当前位置（画布坐标） */
  mousePosition: { x: number; y: number } | null;
  /** 预览中的连线（等待确认） */
  previewConnection: PreviewConnection | null;
  
  // ── 操作方法 ──
  /** 设置连线模式 */
  setConnectionMode: (mode: ConnectionMode) => void;
  /** 切换连线模式：idle -> active -> preview -> idle */
  toggleConnectionMode: () => void;
  
  /** 开始绘制连线 */
  startDrawing: (sourceId: string) => void;
  /** 更新鼠标位置 */
  updateMousePosition: (x: number, y: number) => void;
  /** 结束绘制（连接到目标节点） */
  endDrawing: (targetId: string | null) => void;
  /** 取消绘制 */
  cancelDrawing: () => void;
  
  /** 设置预览连线 */
  setPreviewConnection: (connection: PreviewConnection | null) => void;
  /** 确认预览连线 */
  confirmPreviewConnection: () => void;
  /** 取消预览连线 */
  cancelPreviewConnection: () => void;
  
  /** 添加连线 */
  addConnection: (roadmapId: string, connection: Omit<NodeRelation, 'id' | 'createdAt'>) => void;
  /** 删除连线 */
  removeConnection: (roadmapId: string, connectionId: string) => void;
  /** 获取当前思维导图的连线 */
  getConnections: (roadmapId: string) => NodeRelation[];
  /** 清空当前思维导图的连线 */
  clearConnections: (roadmapId: string) => void;
  
  /** 批量设置连线（从 index.json 加载时使用） */
  setConnections: (roadmapId: string, connections: NodeRelation[]) => void;
  
  /** 重置状态 */
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 初始状态
// ═══════════════════════════════════════════════════════════════════════════════

const initialState = {
  connectionMode: 'idle' as ConnectionMode,
  connections: {},
  drawingSourceId: null,
  mousePosition: null,
  previewConnection: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 创建 Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── 连线模式 ──
      
      setConnectionMode: (mode) => set({ connectionMode: mode }),
      
      toggleConnectionMode: () => {
        const currentMode = get().connectionMode;
        const nextMode: ConnectionMode = 
          currentMode === 'idle' ? 'active' :
          currentMode === 'active' ? 'preview' : 'idle';
        
        console.log(`[ConnectionStore] 切换模式: ${currentMode} -> ${nextMode}`);
        
        // 如果切换到 idle，清除临时状态
        if (nextMode === 'idle') {
          set({
            connectionMode: nextMode,
            drawingSourceId: null,
            mousePosition: null,
            previewConnection: null,
          });
        } else {
          set({ connectionMode: nextMode });
        }
      },

      // ── 绘制连线 ──
      
      startDrawing: (sourceId) => {
        console.log(`[ConnectionStore] 开始绘制连线，起点: ${sourceId}`);
        set({ drawingSourceId: sourceId });
      },
      
      updateMousePosition: (x, y) => {
        set({ mousePosition: { x, y } });
      },
      
      endDrawing: (targetId) => {
        const sourceId = get().drawingSourceId;
        
        if (sourceId && targetId && sourceId !== targetId) {
          console.log(`[ConnectionStore] 连接: ${sourceId} -> ${targetId}`);
          // 设置预览连线
          set({
            previewConnection: { sourceId, targetId },
            drawingSourceId: null,
            mousePosition: null,
            connectionMode: 'preview',
          });
        } else {
          // 取消绘制
          console.log('[ConnectionStore] 取消绘制');
          set({
            drawingSourceId: null,
            mousePosition: null,
          });
        }
      },
      
      cancelDrawing: () => {
        set({
          drawingSourceId: null,
          mousePosition: null,
        });
      },

      // ── 预览连线 ──
      
      setPreviewConnection: (connection) => {
        set({
          previewConnection: connection,
          connectionMode: connection ? 'preview' : 'active',
        });
      },
      
      confirmPreviewConnection: () => {
        const preview = get().previewConnection;
        if (!preview) return;
        
        // 这里不直接添加连线，而是通过回调让外部处理
        console.log(`[ConnectionStore] 确认连线: ${preview.sourceId} -> ${preview.targetId}`);
        
        // 重置预览状态，保持在 active 模式
        set({
          previewConnection: null,
          connectionMode: 'active',
        });
      },
      
      cancelPreviewConnection: () => {
        console.log('[ConnectionStore] 取消预览连线');
        set({
          previewConnection: null,
          connectionMode: 'active',
        });
      },

      // ── 连线管理 ──
      
      addConnection: (roadmapId, connection) => {
        const newConnection: NodeRelation = {
          ...connection,
          id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          createdAt: Date.now(),
        };
        
        set((state) => {
          const existing = state.connections[roadmapId] || [];
          // 检查是否已存在相同的连线
          const exists = existing.some(
            c => (c.sourceId === connection.sourceId && c.targetId === connection.targetId) ||
                 (c.sourceId === connection.targetId && c.targetId === connection.sourceId)
          );
          
          if (exists) {
            console.log('[ConnectionStore] 连线已存在，跳过');
            return state;
          }
          
          console.log(`[ConnectionStore] 添加连线: ${newConnection.id}`);
          return {
            connections: {
              ...state.connections,
              [roadmapId]: [...existing, newConnection],
            },
          };
        });
      },
      
      removeConnection: (roadmapId, connectionId) => {
        set((state) => {
          const existing = state.connections[roadmapId] || [];
          return {
            connections: {
              ...state.connections,
              [roadmapId]: existing.filter(c => c.id !== connectionId),
            },
          };
        });
      },
      
      getConnections: (roadmapId) => {
        return get().connections[roadmapId] || [];
      },
      
      clearConnections: (roadmapId) => {
        set((state) => ({
          connections: {
            ...state.connections,
            [roadmapId]: [],
          },
        }));
      },
      
      setConnections: (roadmapId, connections) => {
        console.log(`[ConnectionStore] 设置连线: ${roadmapId}, ${connections.length} 条`);
        set((state) => ({
          connections: {
            ...state.connections,
            [roadmapId]: connections,
          },
        }));
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'connection-storage',
      partialize: (state) => ({
        connections: state.connections,
      }),
    }
  )
);
