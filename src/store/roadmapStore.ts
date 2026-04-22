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
  /** 根文件夹路径（如 'md' 或 'public/md'） */
  rootPath: string;
  /** 根文件夹的绝对路径 */
  absolutePath: string;
  /** 当前选中的思维导图 ID */
  currentRoadmapId: string | null;
  /** 当前思维导图的元数据 */
  currentRoadmap: RoadmapMeta | null;
  /** 所有可用的思维导图列表（从文件夹动态扫描） */
  availableRoadmaps: RoadmapMeta[];
  
  /** 设置根文件夹路径 */
  setRootPath: (path: string) => void;
  /** 设置绝对路径 */
  setAbsolutePath: (path: string) => void;
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
      rootPath: '',
      absolutePath: '',
      currentRoadmapId: null,
      currentRoadmap: null,
      availableRoadmaps: [],

      setRootPath: (path) => {
        set({ rootPath: path });
      },

      setAbsolutePath: (path) => {
        set({ absolutePath: path });
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
        const { rootPath, currentRoadmap } = get();
        if (!rootPath || !currentRoadmap) {
          return '';
        }
        return `/${rootPath}/${currentRoadmap.path}/index.json`;
      },

      getMdBasePath: () => {
        const { rootPath, currentRoadmap } = get();
        if (!rootPath || !currentRoadmap) {
          return '';
        }
        return `${rootPath}/${currentRoadmap.path}`;
      },

      getFullMdPath: (mdPath: string) => {
        const { rootPath, currentRoadmap } = get();
        if (!rootPath || !currentRoadmap) {
          return mdPath;
        }
        return `${rootPath}/${currentRoadmap.path}/${mdPath}`;
      },
    }),
    {
      name: 'mindmap-storage',
      partialize: (state) => ({
        rootPath: state.rootPath,
        currentRoadmapId: state.currentRoadmapId,
        currentRoadmap: state.currentRoadmap,
        availableRoadmaps: state.availableRoadmaps,
      }),
    }
  )
);