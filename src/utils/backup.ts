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
import { useConfigStore, type RoadmapConfig } from '../store/configStore';
import { useWatermarkStore, type WatermarkConfig } from '../store/watermarkStore';
import { useMinimapStore, type MinimapConfig } from '../store/minimapStore';
import { useCustomNodeStore, type CustomNodeConfig } from '../store/customNodeStore';
import type { RoadmapNode } from '../data/roadmapData';
import {
  APP_VERSION,
  BACKUP_SOURCE,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_SHORTCUTS,
  STORAGE_KEY_BOOKMARKS,
  STORAGE_KEY_CONFIGS,
  STORAGE_KEY_WATERMARK,
  STORAGE_KEY_MINIMAP,
  STORAGE_KEY_CUSTOM_NODES,
  MAX_HISTORY_SIZE,
} from '../constants';
import { downloadFile, formatTimestamp } from './common';

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
  nodeTree: RoadmapNode;
  /** 导出时间 */
  exportedAt: number;
}

/** 历史记录项 */
interface HistoryItem {
  tree: RoadmapNode;
  description: string;
  timestamp: number;
  deletedFiles?: Array<{ path: string; content: string }>;
}

/** 备份数据结构 */
export interface BackupData {
  /** 备份版本 */
  version: string;
  /** 备份时间 */
  timestamp: number;
  /** 备份来源 */
  source: typeof BACKUP_SOURCE;
  /** 思维导图节点数据 */
  roadmapNodes: RoadmapNodeData[];
  /** 历史记录 */
  history: {
    past: HistoryItem[];
    future: HistoryItem[];
  };
  /** 快捷键配置 */
  shortcuts: Record<string, ShortcutConfig>;
  /** 书签数据 */
  bookmarks: Record<string, Bookmark[]>;
  /** 配置数据 */
  configs: Record<string, RoadmapConfig>;
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

/** 导入选项 */
export interface ImportOptions {
  importHistory?: boolean;
  importShortcuts?: boolean;
  importBookmarks?: boolean;
  importConfigs?: boolean;
  importRoadmapNodes?: boolean;
  importWatermark?: boolean;
  importMinimap?: boolean;
  importCustomNodes?: boolean;
  /** 写入节点数据的回调函数 */
  onWriteNodeData?: (roadmapId: string, nodeTree: RoadmapNode) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store 数据收集器
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从各个 Store 收集数据
 */
function collectStoreData() {
  return {
    history: useHistoryStore.getState(),
    shortcuts: useShortcutStore.getState(),
    bookmarks: useBookmarkStore.getState(),
    configs: useConfigStore.getState(),
    watermark: useWatermarkStore.getState(),
    minimap: useMinimapStore.getState(),
    customNodes: useCustomNodeStore.getState(),
  };
}

/**
 * 构建基础备份数据
 */
function buildBackupData(roadmapNodes: RoadmapNodeData[] = []): BackupData {
  const stores = collectStoreData();
  
  return {
    version: APP_VERSION,
    timestamp: Date.now(),
    source: BACKUP_SOURCE,
    roadmapNodes,
    history: {
      past: stores.history.past,
      future: stores.history.future,
    },
    shortcuts: stores.shortcuts.shortcuts,
    bookmarks: stores.bookmarks.bookmarks,
    configs: stores.configs.configs,
    watermark: stores.watermark.config,
    minimap: stores.minimap.config,
    customNodes: stores.customNodes.customNodes,
    roadmapMetas: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出功能
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出所有配置数据（包含节点数据）
 */
export function exportAllData(roadmapNodesData?: RoadmapNodeData[]): BackupData {
  return buildBackupData(roadmapNodesData);
}

/**
 * 导出单个思维导图的完整数据
 */
export function exportSingleRoadmap(
  roadmapId: string,
  roadmapName: string,
  roadmapPath: string,
  nodeTree: RoadmapNode
): BackupData {
  const roadmapNodeData: RoadmapNodeData = {
    id: roadmapId,
    name: roadmapName,
    path: roadmapPath,
    nodeTree,
    exportedAt: Date.now(),
  };
  
  return buildBackupData([roadmapNodeData]);
}

/**
 * 下载备份文件
 */
export function downloadBackupFile(data: BackupData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const defaultFilename = `mindmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(json, filename || defaultFilename, 'application/json');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导入功能
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 验证备份数据格式
 */
export function validateBackupData(data: unknown): { valid: boolean; message: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, message: '无效的数据格式' };
  }
  
  const backup = data as Partial<BackupData>;
  
  if (backup.source !== BACKUP_SOURCE) {
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
 * 导入结果
 */
interface ImportResult {
  success: boolean;
  message: string;
  roadmapNodes?: RoadmapNodeData[];
}

/**
 * 创建 localStorage 存储项
 */
function createStorageItem<T>(state: T, version: number = 0): string {
  return JSON.stringify({ state, version });
}

/**
 * 导入备份数据
 */
export async function importBackupData(
  data: BackupData,
  options: ImportOptions = {}
): Promise<ImportResult> {
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
    
    // 导入节点数据
    if (importRoadmapNodes && data.roadmapNodes?.length && onWriteNodeData) {
      for (const roadmapNode of data.roadmapNodes) {
        await onWriteNodeData(roadmapNode.id, roadmapNode.nodeTree);
      }
    }
    
    // 使用映射表简化重复的存储逻辑
    const storageMap: Array<{
      enabled: boolean;
      data: unknown;
      key: string;
      stateBuilder: () => Record<string, unknown>;
    }> = [
      {
        enabled: importHistory && !!data.history,
        data: data.history,
        key: STORAGE_KEY_HISTORY,
        stateBuilder: () => ({
          past: data.history?.past ?? [],
          future: data.history?.future ?? [],
          maxHistory: MAX_HISTORY_SIZE,
          isProcessing: false,
        }),
      },
      {
        enabled: importShortcuts && !!data.shortcuts,
        data: data.shortcuts,
        key: STORAGE_KEY_SHORTCUTS,
        stateBuilder: () => ({ shortcuts: data.shortcuts }),
      },
      {
        enabled: importBookmarks && !!data.bookmarks,
        data: data.bookmarks,
        key: STORAGE_KEY_BOOKMARKS,
        stateBuilder: () => ({
          bookmarks: data.bookmarks,
          currentRoadmapId: null,
        }),
      },
      {
        enabled: importConfigs && !!data.configs,
        data: data.configs,
        key: STORAGE_KEY_CONFIGS,
        stateBuilder: () => ({ configs: data.configs }),
      },
      {
        enabled: importWatermark && !!data.watermark,
        data: data.watermark,
        key: STORAGE_KEY_WATERMARK,
        stateBuilder: () => ({ config: data.watermark }),
      },
      {
        enabled: importMinimap && !!data.minimap,
        data: data.minimap,
        key: STORAGE_KEY_MINIMAP,
        stateBuilder: () => ({ config: data.minimap }),
      },
      {
        enabled: importCustomNodes,
        data: data.customNodes,
        key: STORAGE_KEY_CUSTOM_NODES,
        stateBuilder: () => ({ customNodes: data.customNodes ?? {} }),
      },
    ];
    
    // 批量存储
    for (const item of storageMap) {
      if (item.enabled && item.data !== undefined) {
        localStorage.setItem(
          item.key,
          createStorageItem(item.stateBuilder())
        );
      }
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
      message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 读取备份文件
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data as BackupData);
      } catch {
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
 */
export function formatBackupTime(timestamp: number): string {
  return formatTimestamp(timestamp);
}

/**
 * 获取备份数据大小（KB）
 */
export function getBackupSize(data: BackupData): number {
  const json = JSON.stringify(data);
  return Math.ceil(json.length / 1024);
}

/**
 * 比较版本号
 */
export function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}

/**
 * 检查备份版本是否兼容
 */
export function isBackupCompatible(_backupVersion: string): boolean {
  // 可以在这里添加版本兼容性检查逻辑
  return true;
}
