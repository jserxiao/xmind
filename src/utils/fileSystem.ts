/**
 * 本地文件系统操作工具
 * 
 * 使用 File System Access API 直接操作本地文件
 * 支持 Chrome、Edge 等现代浏览器
 * 
 * 优化特性：
 * - MD 文件内容缓存，避免重复读取
 * - index.json 缓存，提升加载速度
 * - 统一错误处理
 */

import type { RoadmapMeta } from '../store/roadmapStore';
import type { RoadmapNode } from '../data/roadmapData';
import type { NodeRelation } from '../store/connectionStore';
import type { Bookmark } from '../store/bookmarkStore';
import { mdContentCache, indexJsonCache, createCacheKey } from './cache';
import { DB_NAME, DB_STORE_NAME, DB_HANDLE_KEY } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  path?: string;
  data?: T;
  content?: string;
  handle?: FileSystemDirectoryHandle;
  roadmaps?: RoadmapMeta[];
  roadmap?: RoadmapMeta;
}

/** 带扩展属性的目录句柄接口 */
interface FileSystemDirectoryHandleWithPermission extends FileSystemDirectoryHandle {
  queryPermission(opts: { mode: string }): Promise<PermissionState>;
  requestPermission(opts: { mode: string }): Promise<PermissionState>;
}

/** 目录迭代器值类型 */
interface FileSystemDirectoryHandleValue {
  kind: 'file' | 'directory';
  name: string;
}

/** 目录迭代器 */
interface FileSystemDirectoryHandleIterator {
  values(): AsyncIterableIterator<FileSystemDirectoryHandleValue>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 错误处理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建错误结果
 */
function errorResult(message: string): ApiResult {
  return { success: false, message };
}

/**
 * 创建成功结果
 */
function successResult<T>(message: string, data?: Partial<ApiResult<T>>): ApiResult<T> {
  return { success: true, message, ...data } as ApiResult<T>;
}

/**
 * 包装异步操作，统一错误处理
 */
async function withErrorHandling<T>(
  operation: () => Promise<ApiResult<T>>,
  errorMessage: string
): Promise<ApiResult<T>> {
  try {
    return await operation();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(`${errorMessage}: ${message}`) as ApiResult<T>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 全局状态
// ═══════════════════════════════════════════════════════════════════════════════

let directoryHandle: FileSystemDirectoryHandle | null = null;
let initPromise: Promise<void> | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// IndexedDB 操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 打开 IndexedDB 数据库
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
    };
  });
}

/**
 * 执行 IndexedDB 事务
 */
async function executeDBTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, mode);
    const store = transaction.objectStore(DB_STORE_NAME);
    const request = operation(store);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    db.close();
  });
}

/**
 * 将句柄保存到 IndexedDB
 */
async function saveHandleToIndexedDB(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await executeDBTransaction('readwrite', store => store.put(handle, DB_HANDLE_KEY));
  } catch (error) {
    console.error('[fileSystem] 保存句柄到 IndexedDB 失败:', error);
  }
}

/**
 * 从 IndexedDB 加载句柄
 */
async function loadHandleFromIndexedDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await executeDBTransaction('readonly', store => store.get(DB_HANDLE_KEY));
  } catch (error) {
    console.error('[fileSystem] 从 IndexedDB 加载句柄失败:', error);
    return null;
  }
}

/**
 * 从 IndexedDB 删除句柄
 */
async function removeHandleFromIndexedDB(): Promise<void> {
  try {
    await executeDBTransaction('readwrite', store => store.delete(DB_HANDLE_KEY));
  } catch (error) {
    console.error('[fileSystem] 从 IndexedDB 删除句柄失败:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 目录句柄验证
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 验证目录句柄权限
 */
async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const handleWithPermission = handle as FileSystemDirectoryHandleWithPermission;
    const permission = await handleWithPermission.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') return true;
    
    const requestResult = await handleWithPermission.requestPermission({ mode: 'readwrite' });
    return requestResult === 'granted';
  } catch {
    return false;
  }
}

/**
 * 初始化：从 IndexedDB 恢复句柄
 */
async function initHandleFromIndexedDB(): Promise<void> {
  if (directoryHandle) return;
  
  try {
    const handle = await loadHandleFromIndexedDB();
    if (handle && await verifyPermission(handle)) {
      directoryHandle = handle;
      console.log('[fileSystem] 从 IndexedDB 恢复句柄成功');
    } else if (handle) {
      await removeHandleFromIndexedDB();
      console.log('[fileSystem] 句柄已失效，已清除存储');
    }
  } catch (error) {
    console.error('[fileSystem] 初始化句柄失败:', error);
  }
}

// 立即初始化
initPromise = initHandleFromIndexedDB();

// ═══════════════════════════════════════════════════════════════════════════════
// 公共 API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 等待目录句柄初始化完成
 */
export async function waitForDirectoryHandleInit(): Promise<void> {
  if (initPromise) {
    await initPromise;
    initPromise = null;
  }
}

/**
 * 检查浏览器是否支持 File System Access API
 */
export function isFileSystemSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * 选择目录
 */
export async function selectDirectory(): Promise<ApiResult & { handle?: FileSystemDirectoryHandle }> {
  return withErrorHandling(async () => {
    if (!isFileSystemSupported()) {
      return errorResult('您的浏览器不支持文件系统访问，请使用 Chrome 或 Edge 浏览器');
    }
    
    const handle = await (window as unknown as { showDirectoryPicker: (opts: { mode: string }) => Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker({ mode: 'readwrite' });
    
    directoryHandle = handle;
    await saveHandleToIndexedDB(handle);
    
    return successResult('目录已选择', { handle });
  }, '选择目录失败');
}

/**
 * 设置目录句柄
 */
export function setDirectoryHandle(handle: FileSystemDirectoryHandle): void {
  directoryHandle = handle;
  saveHandleToIndexedDB(handle);
}

/**
 * 清除目录句柄
 */
export function clearDirectoryHandle(): void {
  directoryHandle = null;
  removeHandleFromIndexedDB();
}

/**
 * 获取当前目录句柄
 */
export function getDirectoryHandle(): FileSystemDirectoryHandle | null {
  return directoryHandle;
}

/**
 * 验证目录句柄是否仍然有效
 */
export async function verifyDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return verifyPermission(handle);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件路径解析
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 根据路径获取文件句柄
 */
async function getFileHandle(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
  create: boolean = false
): Promise<FileSystemFileHandle> {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop();
  
  if (!fileName) {
    throw new Error('无效的文件路径');
  }

  let currentHandle = rootHandle;
  
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, { create });
  }

  return currentHandle.getFileHandle(fileName, { create });
}

/**
 * 根据路径获取目录句柄
 */
async function getDirectoryHandleByPath(
  rootHandle: FileSystemDirectoryHandle,
  path: string,
  create: boolean = false
): Promise<FileSystemDirectoryHandle | null> {
  const parts = path.split('/').filter(Boolean);
  
  let currentHandle = rootHandle;
  
  for (const part of parts) {
    try {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create });
    } catch {
      return null;
    }
  }

  return currentHandle;
}

/**
 * 获取父目录句柄和文件名
 */
async function getParentDirectoryAndFileName(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<{ dirHandle: FileSystemDirectoryHandle; fileName: string }> {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop();
  
  if (!fileName) {
    throw new Error('无效的路径');
  }

  let currentHandle = rootHandle;
  
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part);
  }

  return { dirHandle: currentHandle, fileName };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件读取操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 读取文件内容（带缓存）
 */
export async function readFile(
  path: string,
  useCache: boolean = true
): Promise<ApiResult & { content?: string }> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const cacheKey = createCacheKey('file', path);
    
    if (useCache) {
      const cachedContent = mdContentCache.get(cacheKey);
      if (cachedContent !== null) {
        return successResult('文件读取成功（缓存）', { content: cachedContent });
      }
    }

    const fileHandle = await getFileHandle(directoryHandle, path);
    const file = await fileHandle.getFile();
    const content = await file.text();

    if (useCache) {
      mdContentCache.set(cacheKey, content);
    }

    return successResult('文件读取成功', { content });
  }, '读取文件失败');
}

/**
 * 使文件缓存失效
 */
export function invalidateFileCache(path: string): void {
  const cacheKey = createCacheKey('file', path);
  mdContentCache.delete(cacheKey);
}

/**
 * 读取 JSON 文件
 */
export async function readJsonFile<T = unknown>(path: string): Promise<ApiResult<T>> {
  const result = await readFile(path);
  if (!result.success || !result.content) {
    return { success: false, message: result.message };
  }

  try {
    const data = JSON.parse(result.content) as T;
    return { success: true, message: 'JSON 解析成功', data };
  } catch (err) {
    return { success: false, message: `JSON 解析失败: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件写入操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 写入文件
 */
export async function writeFile(path: string, content: string): Promise<ApiResult> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const fileHandle = await getFileHandle(directoryHandle, path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    const cacheKey = createCacheKey('file', path);
    mdContentCache.set(cacheKey, content);

    return successResult('文件保存成功', { path });
  }, '保存文件失败');
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile<T = unknown>(path: string, data: T): Promise<ApiResult> {
  const content = JSON.stringify(data, null, 2);
  return writeFile(path, content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件删除操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 删除文件
 */
export async function deleteFile(path: string): Promise<ApiResult> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const { dirHandle, fileName } = await getParentDirectoryAndFileName(directoryHandle, path);
    await dirHandle.removeEntry(fileName);

    const cacheKey = createCacheKey('file', path);
    mdContentCache.delete(cacheKey);

    return successResult('文件已删除');
  }, '删除文件失败');
}

/**
 * 删除文件夹（递归）
 */
export async function deleteDirectory(path: string): Promise<ApiResult> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const { dirHandle, fileName } = await getParentDirectoryAndFileName(directoryHandle, path);
    await dirHandle.removeEntry(fileName, { recursive: true });

    return successResult('文件夹已删除');
  }, '删除文件夹失败');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 目录操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建文件夹
 */
export async function createDirectory(path: string): Promise<ApiResult> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    await getDirectoryHandleByPath(directoryHandle, path, true);

    return successResult('文件夹已创建', { path });
  }, '创建文件夹失败');
}

/**
 * 检查文件夹是否存在
 */
export async function directoryExists(path: string): Promise<boolean> {
  try {
    if (!directoryHandle) return false;
    const handle = await getDirectoryHandleByPath(directoryHandle, path, false);
    return handle !== null;
  } catch {
    return false;
  }
}

/**
 * 扫描目录下的所有子文件夹
 */
export async function scanDirectories(): Promise<ApiResult & { roadmaps?: RoadmapMeta[] }> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const roadmaps: RoadmapMeta[] = [];

    for await (const entry of (directoryHandle as unknown as FileSystemDirectoryHandleIterator).values()) {
      if (entry.kind !== 'directory') continue;
      
      try {
        const indexPath = `${entry.name}/index.json`;
        const result = await readJsonFile<RoadmapMeta & { label?: string; description?: string; icon?: string; color?: string }>(indexPath);
        
        if (result.success && result.data) {
          roadmaps.push({
            id: entry.name,
            name: result.data.label || entry.name,
            path: entry.name,
            description: result.data.description || `${entry.name} 思维导图`,
            icon: result.data.icon || '📚',
            color: result.data.color || '#1890ff',
          });
        }
      } catch {
        // 忽略无法读取的文件夹
      }
    }

    return { success: true, message: '扫描完成', roadmaps };
  }, '扫描失败');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 思维导图操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建新的思维导图
 */
export async function createRoadmap(options: {
  folderName: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<ApiResult & { roadmap?: RoadmapMeta }> {
  return withErrorHandling(async () => {
    if (!directoryHandle) {
      return errorResult('请先选择工作目录');
    }

    const exists = await directoryExists(options.folderName);
    if (exists) {
      return errorResult('该文件夹已存在');
    }

    await createDirectory(options.folderName);

    const indexData = {
      id: options.folderName,
      label: options.name || options.folderName,
      type: 'root',
      description: options.description || `${options.name || options.folderName} 思维导图`,
      icon: options.icon || '📚',
      color: options.color || '#1890ff',
      children: [],
    };

    await writeJsonFile(`${options.folderName}/index.json`, indexData);

    return {
      success: true,
      message: '思维导图已创建',
      roadmap: {
        id: options.folderName,
        name: indexData.label,
        path: options.folderName,
        description: indexData.description,
        icon: indexData.icon,
        color: indexData.color,
      },
    };
  }, '创建失败');
}

/**
 * 删除思维导图
 */
export async function deleteRoadmap(folderName: string): Promise<ApiResult> {
  return deleteDirectory(folderName);
}

/**
 * 扫描思维导图
 */
export async function scanRoadmaps(): Promise<ApiResult & { roadmaps?: RoadmapMeta[] }> {
  return scanDirectories();
}

/**
 * 保存 MD 文件
 */
export async function saveMdFile(mdPath: string, content: string): Promise<ApiResult> {
  return writeFile(`${mdPath}.md`, content);
}

/**
 * 删除 MD 文件
 */
export async function deleteMdFileByPath(mdPath: string): Promise<ApiResult> {
  return deleteFile(`${mdPath}.md`);
}

/**
 * 读取 index.json（带缓存）
 */
export async function readIndexJson(folderName: string): Promise<ApiResult<RoadmapNode>> {
  const cacheKey = createCacheKey('index', folderName);
  
  const cached = indexJsonCache.get(cacheKey);
  if (cached !== null) {
    return successResult('读取成功（缓存）', { data: cached });
  }
  
  const result = await readJsonFile<RoadmapNode>(`${folderName}/index.json`);
  
  if (result.success && result.data) {
    indexJsonCache.set(cacheKey, result.data);
  }
  
  return result;
}

/**
 * 保存 index.json
 */
export async function saveIndexJson(
  folderName: string,
  data: RoadmapNode,
  connections?: NodeRelation[],
  bookmarks?: Bookmark[]
): Promise<ApiResult> {
  const dataToSave: RoadmapNode = {
    ...data,
    connections: connections?.length ? connections : undefined,
    bookmarks: bookmarks?.length ? bookmarks : undefined,
  };
  
  const result = await writeJsonFile(`${folderName}/index.json`, dataToSave);
  
  if (result.success) {
    const cacheKey = createCacheKey('index', folderName);
    indexJsonCache.set(cacheKey, dataToSave);
  }
  
  return result;
}
