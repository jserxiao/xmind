/**
 * 本地文件系统操作工具
 * 
 * 使用 File System Access API 直接操作本地文件
 * 支持 Chrome、Edge 等现代浏览器
 * 
 * 优化特性：
 * - MD 文件内容缓存，避免重复读取
 * - index.json 缓存，提升加载速度
 */

import type { RoadmapMeta } from '../store/roadmapStore';
import { mdContentCache, indexJsonCache, createCacheKey } from './cache';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResult {
  success: boolean;
  message: string;
  path?: string;
}

// 全局存储的目录句柄
let directoryHandle: FileSystemDirectoryHandle | null = null;

// IndexedDB 数据库名称和存储名称
const DB_NAME = 'mindmap-fs';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'directoryHandle';

// 句柄初始化 Promise（用于等待异步恢复完成）
let initPromise: Promise<void> | null = null;

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * 将句柄保存到 IndexedDB
 */
async function saveHandleToIndexedDB(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, HANDLE_KEY);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      db.close();
    });
  } catch (error) {
    console.error('[fileSystem] 保存句柄到 IndexedDB 失败:', error);
  }
}

/**
 * 从 IndexedDB 加载句柄
 */
async function loadHandleFromIndexedDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(HANDLE_KEY);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
      
      db.close();
    });
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(HANDLE_KEY);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      db.close();
    });
  } catch (error) {
    console.error('[fileSystem] 从 IndexedDB 删除句柄失败:', error);
  }
}

/**
 * 验证目录句柄是否仍然有效
 */
async function verifyDirectoryHandleInternal(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    // @ts-ignore - File System Access API
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      return true;
    }
    // @ts-ignore - File System Access API
    const requestResult = await handle.requestPermission({ mode: 'readwrite' });
    return requestResult === 'granted';
  } catch {
    return false;
  }
}

/**
 * 初始化：从 IndexedDB 恢复句柄（用于 HMR 后恢复）
 */
async function initHandleFromIndexedDB(): Promise<void> {
  if (directoryHandle) return; // 已经有句柄了，不需要恢复
  
  try {
    const handle = await loadHandleFromIndexedDB();
    if (handle) {
      // 验证句柄是否仍然有效
      const isValid = await verifyDirectoryHandleInternal(handle);
      if (isValid) {
        directoryHandle = handle;
        console.log('[fileSystem] 从 IndexedDB 恢复句柄成功');
      } else {
        // 句柄无效，删除存储
        await removeHandleFromIndexedDB();
        console.log('[fileSystem] 句柄已失效，已清除存储');
      }
    }
  } catch (error) {
    console.error('[fileSystem] 初始化句柄失败:', error);
  }
}

// 立即初始化（模块加载时执行）
initPromise = initHandleFromIndexedDB();

/**
 * 等待目录句柄初始化完成
 * 用于确保在访问目录句柄前，IndexedDB 恢复操作已完成
 */
export async function waitForDirectoryHandleInit(): Promise<void> {
  if (initPromise) {
    await initPromise;
    initPromise = null; // 只等待一次
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 目录选择与管理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 检查浏览器是否支持 File System Access API
 */
export function isFileSystemSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * 选择目录
 * @returns 目录句柄和名称
 */
export async function selectDirectory(): Promise<ApiResult & { handle?: FileSystemDirectoryHandle }> {
  try {
    if (!isFileSystemSupported()) {
      return { success: false, message: '您的浏览器不支持文件系统访问，请使用 Chrome 或 Edge 浏览器' };
    }

    // @ts-ignore - File System Access API
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    directoryHandle = handle;
    
    // 保存到 IndexedDB，以便 HMR 后恢复
    await saveHandleToIndexedDB(handle);

    return {
      success: true,
      message: '目录已选择',
      handle,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: '用户取消了选择' };
    }
    return { success: false, message: `选择目录失败: ${err.message}` };
  }
}

/**
 * 设置目录句柄（从存储中恢复）
 */
export function setDirectoryHandle(handle: FileSystemDirectoryHandle): void {
  directoryHandle = handle;
  // 同时保存到 IndexedDB
  saveHandleToIndexedDB(handle);
}

/**
 * 清除目录句柄
 */
export function clearDirectoryHandle(): void {
  directoryHandle = null;
  // 从 IndexedDB 删除
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
  try {
    // @ts-ignore - File System Access API
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      return true;
    }
    // @ts-ignore - File System Access API
    const requestResult = await handle.requestPermission({ mode: 'readwrite' });
    return requestResult === 'granted';
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件读取操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 读取文件内容（带缓存）
 * @param path 相对于根目录的文件路径
 * @param useCache 是否使用缓存，默认 true
 */
export async function readFile(
  path: string,
  useCache: boolean = true
): Promise<ApiResult & { content?: string }> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    // 检查缓存
    const cacheKey = createCacheKey('file', path);
    if (useCache) {
      const cachedContent = mdContentCache.get(cacheKey);
      if (cachedContent !== null) {
        return { success: true, message: '文件读取成功（缓存）', content: cachedContent };
      }
    }

    const fileHandle = await getFileHandle(directoryHandle, path);
    const file = await fileHandle.getFile();
    const content = await file.text();

    // 存入缓存
    if (useCache) {
      mdContentCache.set(cacheKey, content);
    }

    return { success: true, message: '文件读取成功', content };
  } catch (err: any) {
    return { success: false, message: `读取文件失败: ${err.message}` };
  }
}

/**
 * 使文件缓存失效
 * @param path 文件路径
 */
export function invalidateFileCache(path: string): void {
  const cacheKey = createCacheKey('file', path);
  mdContentCache.delete(cacheKey);
}

/**
 * 读取 JSON 文件
 */
export async function readJsonFile<T = any>(path: string): Promise<ApiResult & { data?: T }> {
  const result = await readFile(path);
  if (!result.success || !result.content) {
    return { success: false, message: result.message };
  }

  try {
    const data = JSON.parse(result.content);
    return { success: true, message: 'JSON 解析成功', data };
  } catch (err: any) {
    return { success: false, message: `JSON 解析失败: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件写入操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 写入文件
 * @param path 相对于根目录的文件路径
 * @param content 文件内容
 */
export async function writeFile(path: string, content: string): Promise<ApiResult> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    const fileHandle = await getFileHandle(directoryHandle, path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    // 更新缓存
    const cacheKey = createCacheKey('file', path);
    mdContentCache.set(cacheKey, content);

    return { success: true, message: '文件保存成功', path };
  } catch (err: any) {
    return { success: false, message: `保存文件失败: ${err.message}` };
  }
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile(path: string, data: any): Promise<ApiResult> {
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
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    const { dirHandle, fileName } = await getParentDirectoryAndFileName(directoryHandle, path);
    await dirHandle.removeEntry(fileName);

    // 清除缓存
    const cacheKey = createCacheKey('file', path);
    mdContentCache.delete(cacheKey);

    return { success: true, message: '文件已删除' };
  } catch (err: any) {
    return { success: false, message: `删除文件失败: ${err.message}` };
  }
}

/**
 * 删除文件夹（递归）
 */
export async function deleteDirectory(path: string): Promise<ApiResult> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    const { dirHandle, fileName } = await getParentDirectoryAndFileName(directoryHandle, path);
    await dirHandle.removeEntry(fileName, { recursive: true });

    return { success: true, message: '文件夹已删除' };
  } catch (err: any) {
    return { success: false, message: `删除文件夹失败: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 目录操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建文件夹
 */
export async function createDirectory(path: string): Promise<ApiResult> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    await getDirectoryHandleByPath(directoryHandle, path, true);

    return { success: true, message: '文件夹已创建', path };
  } catch (err: any) {
    return { success: false, message: `创建文件夹失败: ${err.message}` };
  }
}

/**
 * 扫描目录下的所有子文件夹
 */
export async function scanDirectories(): Promise<ApiResult & { roadmaps?: RoadmapMeta[] }> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    const roadmaps: RoadmapMeta[] = [];

    // @ts-ignore - File System Access API
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'directory') {
        // 检查是否有 index.json
        try {
          const indexPath = `${entry.name}/index.json`;
          const result = await readJsonFile<any>(indexPath);
          
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
    }

    return { success: true, message: '扫描完成', roadmaps };
  } catch (err: any) {
    return { success: false, message: `扫描失败: ${err.message}` };
  }
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

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
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
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    // 检查文件夹是否已存在
    const exists = await directoryExists(options.folderName);
    if (exists) {
      return { success: false, message: '该文件夹已存在' };
    }

    // 创建文件夹
    await createDirectory(options.folderName);

    // 创建 index.json
    const indexData = {
      id: options.folderName,
      label: options.name || options.folderName,
      type: 'root',
      description: options.description || `${options.name || options.folderName} 思维导图`,
      icon: options.icon || '📚',
      color: options.color || '#1890ff',
      children: []
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
      }
    };
  } catch (err: any) {
    return { success: false, message: `创建失败: ${err.message}` };
  }
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
export async function deleteMdFile(mdPath: string): Promise<ApiResult> {
  return deleteFile(`${mdPath}.md`);
}

/**
 * 读取 index.json（带缓存）
 */
export async function readIndexJson(folderName: string): Promise<ApiResult & { data?: any }> {
  const cacheKey = createCacheKey('index', folderName);
  
  // 检查缓存
  const cached = indexJsonCache.get(cacheKey);
  if (cached !== null) {
    return { success: true, message: '读取成功（缓存）', data: cached };
  }
  
  const result = await readJsonFile(`${folderName}/index.json`);
  
  // 存入缓存
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
  data: any, 
  connections?: any[],
  bookmarks?: any[]
): Promise<ApiResult> {
  // 将连线和书签数据合并到 data 对象中（如果提供）
  const dataToSave = {
    ...data,
    connections: connections && connections.length > 0 ? connections : undefined,
    bookmarks: bookmarks && bookmarks.length > 0 ? bookmarks : undefined,
  };
  
  const result = await writeJsonFile(`${folderName}/index.json`, dataToSave);
  
  // 更新缓存
  if (result.success) {
    const cacheKey = createCacheKey('index', folderName);
    indexJsonCache.set(cacheKey, dataToSave);
  }
  
  return result;
}
