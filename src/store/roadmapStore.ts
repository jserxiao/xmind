import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 思维导图元数据 */
export type RoadmapMeta = {
  id: string;
  name: string;
  path: string;
  description: string;
  icon: string;
  color: string;
}

interface RoadmapStore {
  /** 目录句柄索引（用于恢复） */
  directoryHandleIndex: string;
  /** 目录名称（显示用） */
  directoryName: string;
  /** 当前选中的思维导图 ID */
  currentRoadmapId: string | null;
  /** 当前思维导图的元数据 */
  currentRoadmap: RoadmapMeta | null;
  /** 所有可用的思维导图列表（从文件夹动态扫描） */
  availableRoadmaps: RoadmapMeta[];
  
  /** 设置目录信息 */
  setDirectory: (name: string, handleIndex?: string) => void;
  /** 清除目录信息 */
  clearDirectory: () => void;
  /** 设置当前思维导图 */
  setCurrentRoadmap: (roadmap: RoadmapMeta) => void;
  /** 清除当前思维导图（返回列表页） */
  clearCurrentRoadmap: () => void;
  /** 设置可用的思维导图列表 */
  setAvailableRoadmaps: (roadmaps: RoadmapMeta[]) => void;
  /** 获取当前思维导图的数据路径 */
  getDataPath: () => string;
  /** 获取当前思维导图的 MD 文件基础路径 */
  getMdBasePath: () => string;
  /** 获取完整的 MD 文件路径 */
  getFullMdPath: (mdPath: string) => string;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      directoryHandleIndex: '',
      directoryName: '',
      currentRoadmapId: null,
      currentRoadmap: null,
      availableRoadmaps: [],

      setDirectory: (name, handleIndex) => {
        set({ 
          directoryName: name,
          directoryHandleIndex: handleIndex || ''
        });
      },

      clearDirectory: () => {
        set({ 
          directoryHandleIndex: '',
          directoryName: '',
          availableRoadmaps: []
        });
      },

      setCurrentRoadmap: (roadmap) => {
        set({
          currentRoadmapId: roadmap.id,
          currentRoadmap: roadmap,
        });
      },

      clearCurrentRoadmap: () => {
        set({
          currentRoadmapId: null,
          currentRoadmap: null,
        });
      },

      setAvailableRoadmaps: (roadmaps) => {
        set({ availableRoadmaps: roadmaps });
      },

      getDataPath: () => {
        const { currentRoadmap } = get();
        if (!currentRoadmap) {
          return '';
        }
        return `${currentRoadmap.path}/index.json`;
      },

      getMdBasePath: () => {
        const { currentRoadmap } = get();
        if (!currentRoadmap) {
          return '';
        }
        return currentRoadmap.path;
      },

      getFullMdPath: (mdPath: string) => {
        const { currentRoadmap } = get();
        if (!currentRoadmap) {
          return mdPath;
        }
        return `${currentRoadmap.path}/${mdPath}`;
      },
    }),
    {
      name: 'mindmap-storage',
      partialize: (state) => ({
        directoryHandleIndex: state.directoryHandleIndex,
        directoryName: state.directoryName,
        currentRoadmapId: state.currentRoadmapId,
        currentRoadmap: state.currentRoadmap,
        availableRoadmaps: state.availableRoadmaps,
      }),
    }
  )
);
