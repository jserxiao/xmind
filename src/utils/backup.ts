/**
 * 数据备份工具
 * 
 * 提供导入/导出配置功能，包含：
 * - 历史记录
 * - 快捷键配置
 * - 书签数据
 * - 配置颜色/布局
 * - 水印配置
 * - 小地图配置
 * - 自定义节点配置
 */

import { useHistoryStore } from '../store/historyStore';
import { useShortcutStore, type ShortcutConfig } from '../store/shortcutStore';
import { useBookmarkStore, type Bookmark } from '../store/bookmarkStore';
import { useConfigStore } from '../store/configStore';
import { useWatermarkStore, type WatermarkConfig } from '../store/watermarkStore';
import { useMinimapStore, type MinimapConfig } from '../store/minimapStore';
import { useCustomNodeStore, type CustomNodeConfig } from '../store/customNodeStore';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 单个思维导图的节点数据 */
export interface RoadmapNodeData {
  /** 思维导图 ID */
  id: string;
  /** 思维导图名称 */
  name: string;
  /** 思维导图路径 */
  path: string;
  /** 节点树数据 */
  nodeTree: any;
  /** 导出时间 */
  exportedAt: number;
}

/** 备份数据结构 */
export interface BackupData {
  /** 备份版本 */
  version: string;
  /** 备份时间 */
  timestamp: number;
  /** 备份来源 */
  source: 'goroute-mindmap';
  /** 思维导图节点数据（当前所有思维导图） */
  roadmapNodes: RoadmapNodeData[];
  /** 历史记录 */
  history: {
    past: Array<{
      tree: any;
      description: string;
      timestamp: number;
      deletedFiles?: Array<{
        path: string;
        content: string;
      }>;
    }>;
    future: Array<{
      tree: any;
      description: string;
      timestamp: number;
      deletedFiles?: Array<{
        path: string;
        content: string;
      }>;
    }>;
  };
  /** 快捷键配置 */
  shortcuts: Record<string, ShortcutConfig>;
  /** 书签数据 */
  bookmarks: Record<string, Bookmark[]>;
  /** 配置数据 */
  configs: Record<string, {
    colors: any;
    layout: any;
    zoom: any;
  }>;
  /** 水印配置 */
  watermark: WatermarkConfig;
  /** 小地图配置 */
  minimap: MinimapConfig;
  /** 自定义节点配置 */
  customNodes: Record<string, CustomNodeConfig>;
  /** 思维导图元数据列表 */
  roadmapMetas: Array<{
    id: string;
    name: string;
    path: string;
    description: string;
    icon: string;
    color: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出功能
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出所有配置数据（包含节点数据）
 * @param roadmapNodesData 可选的节点数据（由调用方提供）
 * @returns 备份数据
 */
export function exportAllData(roadmapNodesData?: RoadmapNodeData[]): BackupData {
  const historyState = useHistoryStore.getState();
  const shortcutState = useShortcutStore.getState();
  const bookmarkState = useBookmarkStore.getState();
  const configState = useConfigStore.getState();
  const watermarkState = useWatermarkStore.getState();
  const minimapState = useMinimapStore.getState();
  const customNodeState = useCustomNodeStore.getState();
  
  const backupData: BackupData = {
    version: '2.2.0',
    timestamp: Date.now(),
    source: 'goroute-mindmap',
    roadmapNodes: roadmapNodesData || [],
    history: {
      past: historyState.past,
      future: historyState.future,
    },
    shortcuts: shortcutState.shortcuts,
    bookmarks: bookmarkState.bookmarks,
    configs: configState.configs,
    watermark: watermarkState.config,
    minimap: minimapState.config,
    customNodes: customNodeState.customNodes,
    roadmapMetas: [],
  };
  
  return backupData;
}

/**
 * 导出单个思维导图的完整数据
 * @param roadmapId 思维导图 ID
 * @param roadmapName 思维导图名称
 * @param roadmapPath 思维导图路径
 * @param nodeTree 节点树数据
 * @returns 备份数据
 */
export function exportSingleRoadmap(
  roadmapId: string,
  roadmapName: string,
  roadmapPath: string,
  nodeTree: any
): BackupData {
  const historyState = useHistoryStore.getState();
  const shortcutState = useShortcutStore.getState();
  const bookmarkState = useBookmarkStore.getState();
  const configState = useConfigStore.getState();
  const watermarkState = useWatermarkStore.getState();
  const minimapState = useMinimapStore.getState();
  const customNodeState = useCustomNodeStore.getState();
  
  const roadmapNodeData: RoadmapNodeData = {
    id: roadmapId,
    name: roadmapName,
    path: roadmapPath,
    nodeTree: nodeTree,
    exportedAt: Date.now(),
  };
  
  const backupData: BackupData = {
    version: '2.2.0',
    timestamp: Date.now(),
    source: 'goroute-mindmap',
    roadmapNodes: [roadmapNodeData],
    history: {
      past: historyState.past,
      future: historyState.future,
    },
    shortcuts: shortcutState.shortcuts,
    bookmarks: bookmarkState.bookmarks,
    configs: configState.configs,
    watermark: watermarkState.config,
    minimap: minimapState.config,
    customNodes: customNodeState.customNodes,
    roadmapMetas: [],
  };
  
  return backupData;
}

/**
 * 下载备份文件
 * @param data 备份数据
 * @param filename 文件名
 */
export function downloadBackupFile(data: BackupData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `mindmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导入功能
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 验证备份数据格式
 * @param data 待验证数据
 * @returns 验证结果
 */
export function validateBackupData(data: unknown): { valid: boolean; message: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, message: '无效的数据格式' };
  }
  
  const backup = data as Record<string, unknown>;
  
  if (backup.source !== 'goroute-mindmap') {
    return { valid: false, message: '不是有效的思维导图备份文件' };
  }
  
  if (!backup.version || typeof backup.version !== 'string') {
    return { valid: false, message: '缺少版本信息' };
  }
  
  if (!backup.timestamp || typeof backup.timestamp !== 'number') {
    return { valid: false, message: '缺少时间戳信息' };
  }
  
  return { valid: true, message: '验证通过' };
}

/**
 * 导入备份数据
 * @param data 备份数据
 * @param options 导入选项
 */
export async function importBackupData(
  data: BackupData,
  options: {
    importHistory?: boolean;
    importShortcuts?: boolean;
    importBookmarks?: boolean;
    importConfigs?: boolean;
    importRoadmapNodes?: boolean;
    importWatermark?: boolean;
    importMinimap?: boolean;
    importCustomNodes?: boolean;
    /** 写入节点数据的回调函数 */
    onWriteNodeData?: (roadmapId: string, nodeTree: any) => Promise<boolean>;
  } = {}
): Promise<{ success: boolean; message: string; roadmapNodes?: RoadmapNodeData[] }> {
  const {
    importHistory = true,
    importShortcuts = true,
    importBookmarks = true,
    importConfigs = true,
    importRoadmapNodes = true,
    importWatermark = true,
    importMinimap = true,
    importCustomNodes = true,
    onWriteNodeData,
  } = options;
  
  try {
    // 验证数据
    const validation = validateBackupData(data);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    // 导入节点数据（如果有回调函数）
    if (importRoadmapNodes && data.roadmapNodes && data.roadmapNodes.length > 0 && onWriteNodeData) {
      for (const roadmapNode of data.roadmapNodes) {
        await onWriteNodeData(roadmapNode.id, roadmapNode.nodeTree);
      }
    }
    
    // 导入历史记录
    if (importHistory && data.history) {
      // 注意：这里需要直接修改 store 的状态
      // 由于 zustand 的 persist 中间件，我们通过重新设置来实现
      localStorage.setItem('mindmap-history', JSON.stringify({
        state: {
          past: data.history.past,
          future: data.history.future,
          maxHistory: 50,
          isProcessing: false,
        },
        version: 0,
      }));
    }
    
    // 导入快捷键配置
    if (importShortcuts && data.shortcuts) {
      localStorage.setItem('mindmap-shortcuts', JSON.stringify({
        state: {
          shortcuts: data.shortcuts,
        },
        version: 0,
      }));
    }
    
    // 导入书签数据
    if (importBookmarks && data.bookmarks) {
      localStorage.setItem('mindmap-bookmarks', JSON.stringify({
        state: {
          bookmarks: data.bookmarks,
          currentRoadmapId: null,
        },
        version: 0,
      }));
    }
    
    // 导入配置数据
    if (importConfigs && data.configs) {
      localStorage.setItem('mindmap-configs', JSON.stringify({
        state: {
          configs: data.configs,
        },
        version: 0,
      }));
    }
    
    // 导入水印配置
    if (importWatermark && data.watermark) {
      localStorage.setItem('mindmap-watermark', JSON.stringify({
        state: {
          config: data.watermark,
        },
        version: 0,
      }));
    }
    
    // 导入小地图配置
    if (importMinimap && data.minimap) {
      localStorage.setItem('mindmap-minimap', JSON.stringify({
        state: {
          config: data.minimap,
        },
        version: 0,
      }));
    }
    
    // 导入自定义节点配置
    if (importCustomNodes && data.customNodes) {
      localStorage.setItem('custom-node-storage', JSON.stringify({
        state: {
          customNodes: data.customNodes,
        },
        version: 0,
      }));
    }
    
    // 兼容旧版本（没有 customNodes 字段）
    if (importCustomNodes && !data.customNodes) {
      // 确保有默认值
      localStorage.setItem('custom-node-storage', JSON.stringify({
        state: {
          customNodes: {},
        },
        version: 0,
      }));
    }
    
    return { 
      success: true, 
      message: '数据导入成功，刷新页面后生效',
      roadmapNodes: data.roadmapNodes,
    };
  } catch (error) {
    console.error('[backup] 导入失败:', error);
    return { 
      success: false, 
      message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}` 
    };
  }
}

/**
 * 读取备份文件
 * @param file 文件对象
 * @returns 备份数据
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data as BackupData);
      } catch (error) {
        reject(new Error('文件解析失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 格式化备份时间
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
export function formatBackupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取备份数据大小（KB）
 * @param data 备份数据
 * @returns 大小（KB）
 */
export function getBackupSize(data: BackupData): number {
  const json = JSON.stringify(data);
  return Math.ceil(json.length / 1024);
}
