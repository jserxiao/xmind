/**
 * 缓存工具模块
 * 
 * 提供内存缓存功能，避免重复读取文件
 * 支持过期时间、最大缓存数量限制
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  /** 缓存数据 */
  data: T;
  /** 缓存时间戳 */
  timestamp: number;
  /** 过期时间（毫秒），0 表示永不过期 */
  ttl: number;
  /** 最后访问时间（用于 LRU 淘汰） */
  lastAccessTime: number;
}

interface CacheOptions {
  /** 默认过期时间（毫秒），默认 30 秒 */
  defaultTtl?: number;
  /** 最大缓存条目数，默认 100 */
  maxSize?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache 类
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用缓存类
 * 支持 TTL 过期、LRU 淘汰策略
 */
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number;
  private maxSize: number;
  private debug: boolean;
  private name: string;

  constructor(name: string, options: CacheOptions = {}) {
    this.name = name;
    this.defaultTtl = options.defaultTtl ?? 30000; // 默认 30 秒
    this.maxSize = options.maxSize ?? 100;
    this.debug = options.debug ?? false;
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期返回 null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.log(`缓存未命中: ${key}`);
      return null;
    }

    // 检查是否过期
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.log(`缓存已过期: ${key}`);
      this.cache.delete(key);
      return null;
    }

    // 更新最后访问时间（用于 LRU 淘汰）
    entry.lastAccessTime = Date.now();

    this.log(`缓存命中: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒），不传使用默认值
   */
  set(key: string, data: T, ttl?: number): void {
    // 如果超过最大缓存数，执行 LRU 淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      lastAccessTime: Date.now(),
    };

    this.cache.set(key, entry);
    this.log(`缓存设置: ${key}, TTL: ${entry.ttl}ms`);
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.log(`缓存删除: ${key}`);
    return result;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.log('缓存已清空');
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // 检查是否过期
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    this.log(`清理过期缓存: ${cleaned} 条`);
    return cleaned;
  }

  /**
   * LRU 淘汰策略：删除最少使用的缓存
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.log(`LRU 淘汰: ${oldestKey}`);
    }
  }

  /**
   * 调试日志
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[${this.name}Cache] ${message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 预定义缓存实例
// ═══════════════════════════════════════════════════════════════════════════════

/** MD 文件内容缓存（默认 60 秒过期，最多 50 个文件） */
export const mdContentCache = new Cache<string>('MDContent', {
  defaultTtl: 60000,
  maxSize: 50,
  debug: false,
});

/** index.json 数据缓存（默认 30 秒过期） */
export const indexJsonCache = new Cache<any>('IndexJson', {
  defaultTtl: 30000,
  maxSize: 20,
  debug: false,
});

/** 节点树缓存 */
export const nodeTreeCache = new Cache<any>('NodeTree', {
  defaultTtl: 30000,
  maxSize: 10,
  debug: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// 缓存辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成缓存键
 * @param parts 缓存键组成部分
 */
export function createCacheKey(...parts: string[]): string {
  return parts.filter(Boolean).join(':');
}

/**
 * 定期清理过期缓存
 * 每 5 分钟执行一次
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCacheCleanup(): void {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    mdContentCache.cleanup();
    indexJsonCache.cleanup();
    nodeTreeCache.cleanup();
  }, 5 * 60 * 1000); // 5 分钟
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// 启动自动清理
if (typeof window !== 'undefined') {
  startCacheCleanup();
}
