/**
 * 通用工具函数
 * 
 * 提供常用的通用工具函数，如深拷贝、ID生成、防抖节流等
 * 所有工具函数均为纯函数，无副作用
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 可取消的函数类型 */
export type CancelableFn<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void & {
  cancel: () => void;
  flush: () => void;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 对象操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 深拷贝对象
 * 使用 JSON 序列化实现，适用于纯数据对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的新对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 检查对象是否为空
 * @param obj 要检查的对象
 * @returns 是否为空对象
 */
export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 安全地获取对象嵌套属性
 * @param obj 源对象
 * @param path 属性路径（如 'a.b.c'）
 * @param defaultValue 默认值
 */
export function get<T = undefined>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = (result as Record<string, unknown>)[key];
  }
  
  return (result as T) ?? defaultValue;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 字符串操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成唯一 ID
 * @param prefix ID 前缀
 * @returns 唯一 ID 字符串
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * 转义正则表达式特殊字符
 * @param string 要转义的字符串
 * @returns 转义后的字符串
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 安全的 JSON 解析
 * @param json JSON 字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析结果或默认值
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 函数工具
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建函数工具的工厂函数
 */
const createFunctionUtils = () => {
  /**
   * 防抖函数
   * @param fn 要防抖的函数
   * @param delay 延迟时间（毫秒）
   * @param immediate 是否立即执行（首次调用时）
   */
  function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    immediate: boolean = false
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = function (this: any, ...args: Parameters<T>) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (immediate && !timeoutId) {
        fn.apply(this, args);
      }
      
      timeoutId = setTimeout(() => {
        if (!immediate) {
          fn.apply(this, args);
        }
        timeoutId = null;
      }, delay);
    };

    return debounced;
  }

  /**
   * 节流函数
   * @param fn 要节流的函数
   * @param limit 时间限制（毫秒）
   */
  function throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    let lastArgs: Parameters<T> | null = null;

    return function (this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            fn.apply(this, lastArgs);
            lastArgs = null;
          }
        }, limit);
      } else {
        lastArgs = args;
      }
    };
  }

  /**
   * 请求动画帧节流
   * @param fn 要节流的函数
   */
  function rafThrottle<T extends (...args: any[]) => any>(
    fn: T
  ): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    let lastArgs: Parameters<T> | null = null;

    return function (this: any, ...args: Parameters<T>) {
      lastArgs = args;
      
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (lastArgs) {
            fn.apply(this, lastArgs);
            lastArgs = null;
          }
          rafId = null;
        });
      }
    };
  }

  return { debounce, throttle, rafThrottle };
};

export const { debounce, throttle, rafThrottle } = createFunctionUtils();

// ═══════════════════════════════════════════════════════════════════════════════
// 异步操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分批处理数组（避免阻塞主线程）
 * @param items 要处理的数组
 * @param processor 处理函数
 * @param batchSize 每批处理数量
 * @returns Promise
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => R | Promise<R>,
  batchSize: number = 50
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => processor(item, i + j))
    );
    results.push(...batchResults);

    // 让出主线程
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * 空闲时执行任务
 * 使用 requestIdleCallback 或 setTimeout 作为 fallback
 * @param fn 要执行的函数
 * @param timeout 超时时间
 */
export function runWhenIdle(fn: IdleRequestCallback | (() => void), timeout: number = 2000): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      typeof fn === 'function' && fn.length === 0 
        ? () => (fn as () => void)() 
        : fn as IdleRequestCallback,
      { timeout }
    );
  } else {
    setTimeout(fn as () => void, 1);
  }
}

/**
 * 带超时的 Promise
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message || `超时: ${ms}ms`)), ms)
    ),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 时间格式化
// ═══════════════════════════════════════════════════════════════════════════════

/** 时间格式化选项 */
interface FormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

/**
 * 格式化时间戳为本地时间字符串
 * @param timestamp 时间戳
 * @param options 格式化选项
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(timestamp: number, options?: FormatOptions): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * 获取当前日期字符串（ISO 格式）
 * @returns YYYY-MM-DD 格式的日期字符串
 */
export function getCurrentDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 格式化持续时间（毫秒转为可读格式）
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 浏览器 API 封装
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME 类型
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 * @param file 文件对象
 * @returns 文件内容
 */
export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 重试机制
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 重试配置
 */
interface RetryOptions {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  delay?: number;
  /** 延迟倍数（指数退避） */
  backoffFactor?: number;
  /** 判断是否应该重试 */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 带重试的异步操作
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delay = 1000, backoffFactor = 2, shouldRetry } = options;
  let lastError: Error | null = null;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries || (shouldRetry && !shouldRetry(lastError))) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  throw lastError;
}
