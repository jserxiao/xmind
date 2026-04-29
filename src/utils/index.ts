/**
 * Utils 模块导出
 *
 * 包含所有工具函数（纯函数），按功能分类：
 *
 * - common.ts        通用工具函数（深拷贝、防抖节流、ID生成等）
 * - fileSystem.ts    本地文件系统操作
 * - nodeUtils.ts     节点操作工具
 * - treeDataUtils.ts 思维导图数据转换
 * - treePanelUtils.ts 树形面板工具
 * - cache.ts         缓存工具
 * - backup.ts        数据备份工具
 * - performance.ts   性能优化工具
 * - exportMindmap.ts 导出思维导图
 * - aiPrompts.ts     AI Prompt 工具
 * - mdTemplates.ts   Markdown 模板
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 通用工具函数
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 对象操作
  deepClone,
  isEmptyObject,
  get,
  // 字符串操作
  generateUniqueId,
  escapeRegExp,
  safeJsonParse,
  // 函数工具
  debounce,
  throttle,
  rafThrottle,
  // 异步操作
  processBatch,
  runWhenIdle,
  withTimeout,
  withRetry,
  // 时间格式化
  formatTimestamp,
  getCurrentDateString,
  formatDuration,
  // 浏览器 API
  downloadFile,
  readFileContent,
  copyToClipboard,
  // 类型
  type CancelableFn,
} from './common';

// ═══════════════════════════════════════════════════════════════════════════════
// 文件系统操作
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 目录操作
  isFileSystemSupported,
  selectDirectory,
  setDirectoryHandle,
  clearDirectoryHandle,
  getDirectoryHandle,
  verifyDirectoryHandle,
  waitForDirectoryHandleInit,
  // 文件读取
  readFile,
  readJsonFile,
  invalidateFileCache,
  // 文件写入
  writeFile,
  writeJsonFile,
  // 文件删除
  deleteFile,
  deleteDirectory,
  // 目录操作
  createDirectory,
  directoryExists,
  scanDirectories,
  // 思维导图操作
  createRoadmap,
  deleteRoadmap,
  scanRoadmaps,
  saveMdFile,
  deleteMdFileByPath,
  readIndexJson,
  saveIndexJson,
  // 类型
  type ApiResult,
} from './fileSystem';

// ═══════════════════════════════════════════════════════════════════════════════
// 节点操作工具
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 树遍历
  traverseTree,
  findNodeInTree,
  findNodesByIds,
  findParentNode,
  preorderTraversal,
  getNodePath,
  findParentWithMdPath,
  findAncestorMdPath,
  getPrevNextNode,
  // 节点操作
  generateNodeId,
  getNodeById,
  deepCloneNode,
  addChildNode,
  updateNodeInTree,
  deleteNodeFromTree,
  batchDeleteNodes,
  reorderNodeChildren,
  createNodeFromFormData,
  // index.json 操作
  updateIndexJson,
  readIndexJson as readIndexJsonFromNodeUtils,
  // MD 文件操作
  saveMdFile as saveMdFileFromNodeUtils,
  readMdFile,
  deleteMdFile,
  getMdFile,
  createMdTemplate,
  collectMdPathsFromNode,
  collectNodesWithMdPath,
  // MD 章节操作
  extractSectionContent,
  updateSectionContent,
  updateSectionTitle,
  deleteSection,
  deleteSectionFromMdFile,
  addSectionToMdFile,
  saveSubNodeSection,
  // MD 搜索
  searchMdContent,
  // 统一节点操作
  executeNodeDelete,
  executeBatchNodeDelete,
  // 类型
  type ApiResult as NodeApiResult,
  type DeleteNodeResult,
  type NodeDeleteContext,
  type ConnectionData,
  type BookmarkData,
  type MdSearchResult,
} from './nodeUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 缓存工具
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Cache 类
  Cache,
  // 预配置缓存实例
  mdContentCache,
  indexJsonCache,
  nodeTreeCache,
  // 缓存辅助函数
  createCacheKey,
  parseCacheKey,
  // 缓存清理
  startCacheCleanup,
  stopCacheCleanup,
  clearAllCaches,
  getAllCacheStats,
} from './cache';

// ═══════════════════════════════════════════════════════════════════════════════
// 备份工具
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 导出功能
  exportAllData,
  exportSingleRoadmap,
  downloadBackupFile,
  // 导入功能
  validateBackupData,
  importBackupData,
  readBackupFile,
  // 工具函数
  formatBackupTime,
  getBackupSize,
  compareVersions,
  isBackupCompatible,
  // 类型
  type RoadmapNodeData,
  type BackupData,
  type ImportOptions,
} from './backup';

// ═══════════════════════════════════════════════════════════════════════════════
// 性能优化工具
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 节点树操作
  truncateNodeTree,
  getNodeDepth,
  countNodes,
  flattenNodeTree,
  expandNodeByDepth,
  findNodeById,
  // 性能监控
  PerformanceMonitor,
  performanceMonitor,
  measureTime,
  markPerformance,
  measurePerformance,
  // 类型
  type LazyLoadOptions,
  type PerformanceMetrics,
} from './performance';

// ═══════════════════════════════════════════════════════════════════════════════
// 树形数据转换
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateSubNodeId,
  convertToTreeData,
} from './treeDataUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 导出思维导图
// ═══════════════════════════════════════════════════════════════════════════════

export { exportToJPG, exportToPDF } from './exportMindmap';

// ═══════════════════════════════════════════════════════════════════════════════
// 树形面板工具
// ═══════════════════════════════════════════════════════════════════════════════

export { collectExpandKeys, getNodeIcon, getNodeColor } from './treePanelUtils';
