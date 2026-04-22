/**
 * 本地文件系统操作工具
 * 
 * 使用 File System Access API 直接操作本地文件
 * 支持 Chrome、Edge 等现代浏览器
 */

import type { RoadmapMeta } from '../store/roadmapStore';

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
 * 读取文件内容
 * @param path 相对于根目录的文件路径
 */
export async function readFile(path: string): Promise<ApiResult & { content?: string }> {
  try {
    if (!directoryHandle) {
      return { success: false, message: '请先选择工作目录' };
    }

    const fileHandle = await getFileHandle(directoryHandle, path);
    const file = await fileHandle.getFile();
    const content = await file.text();

    return { success: true, message: '文件读取成功', content };
  } catch (err: any) {
    return { success: false, message: `读取文件失败: ${err.message}` };
  }
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
 * 读取 index.json
 */
export async function readIndexJson(folderName: string): Promise<ApiResult & { data?: any }> {
  return readJsonFile(`${folderName}/index.json`);
}

/**
 * 保存 index.json
 */
export async function saveIndexJson(folderName: string, data: any): Promise<ApiResult> {
  return writeJsonFile(`${folderName}/index.json`, data);
}
