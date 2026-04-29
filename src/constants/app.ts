/**
 * 应用级常量定义
 * 
 * 包含应用名称、版本号、默认配置等全局常量
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 应用信息
// ═══════════════════════════════════════════════════════════════════════════════

/** 应用名称 */
export const APP_NAME = 'GoRoute MindMap';

/** 应用版本 */
export const APP_VERSION = '2.2.0';

/** 备份文件来源标识 */
export const BACKUP_SOURCE = 'goroute-mindmap';

// ═══════════════════════════════════════════════════════════════════════════════
// 文件系统配置
// ═══════════════════════════════════════════════════════════════════════════════

/** IndexedDB 数据库名称 */
export const DB_NAME = 'mindmap-fs';

/** IndexedDB 存储名称 */
export const DB_STORE_NAME = 'handles';

/** 目录句柄存储键 */
export const DB_HANDLE_KEY = 'directoryHandle';

// ═══════════════════════════════════════════════════════════════════════════════
// 历史记录配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 最大历史记录数量 */
export const MAX_HISTORY_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// localStorage 存储键名
// ═══════════════════════════════════════════════════════════════════════════════

/** 历史记录存储键 */
export const STORAGE_KEY_HISTORY = 'mindmap-history';

/** 快捷键配置存储键 */
export const STORAGE_KEY_SHORTCUTS = 'mindmap-shortcuts';

/** 书签数据存储键 */
export const STORAGE_KEY_BOOKMARKS = 'mindmap-bookmarks';

/** 配置数据存储键 */
export const STORAGE_KEY_CONFIGS = 'mindmap-configs';

/** 水印配置存储键 */
export const STORAGE_KEY_WATERMARK = 'mindmap-watermark';

/** 小地图配置存储键 */
export const STORAGE_KEY_MINIMAP = 'mindmap-minimap';

/** 自定义节点存储键 */
export const STORAGE_KEY_CUSTOM_NODES = 'custom-node-storage';
