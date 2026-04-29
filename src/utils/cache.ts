/**
 * 缓存工具模块
 * 
 * 提供内存缓存功能，避免重复读取文件
 * 支持 TTL 过期、LRU 淘汰策略
 */

import {
  CACHE_MD_CONTENT_TTL,
  CACHE_MD_CONTENT_MAX_SIZE,
  CACHE_INDEX_TTL,
  CACHE_INDEX_MAX_SIZE,
  CACHE_NODE_TREE_TTL,
  CACHE_NODE_TREE_MAX_SIZE,
  CACHE_CLEANUP_INTERVAL,
} from '../constants';
import type { RoadmapNode } from '../data/roadmapData';

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
  /** 访问次数 */
  accessCount: number;
}

interface CacheOptions {
  /** 默认过期时间（毫秒），默认 30 秒 */
  defaultTtl?: number;
  /** 最大缓存条目数，默认 100 */
  maxSize?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

interface CacheStats {
  /** 当前缓存大小 */
  size: number;
  /** 最大缓存大小 */
  maxSize: number;
  /** 缓存键列表 */
  keys: string[];
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
}

type EvictionPolicy = 'lru' | 'lfu' | 'fifo';

// ═══════════════════════════════════════════════════════════════════════════════
// Cache 类
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用缓存类
 * 支持 TTL 过期、多种淘汰策略（LRU/LFU/FIFO）
 * 
 * @example
 * ```ts
 * const cache = new Cache<string>('myCache', {
 *   defaultTtl: 60000, // 1分钟
 *   maxSize: 50,
 * });
 * 
 * cache.set('key', 'value');
 * const value = cache.get('key');
 * ```
 */
export class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private readonly debug: boolean;
  private readonly name: string;
  private readonly evictionPolicy: EvictionPolicy;
  
  // 统计信息
  private hits: number = 0;
  private misses: number = 0;

  constructor(name: string, options: CacheOptions & { evictionPolicy?: EvictionPolicy } = {}) {
    this.name = name;
    this.defaultTtl = options.defaultTtl ?? 30000;
    this.maxSize = options.maxSize ?? 100;
    this.debug = options.debug ?? false;
    this.evictionPolicy = options.evictionPolicy ?? 'lru';
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      this.log(`缓存未命中: ${key}`);
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.log(`缓存已过期: ${key}`);
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // 更新访问信息
    entry.lastAccessTime = Date.now();
    entry.accessCount++;
    this.hits++;

    this.log(`缓存命中: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, ttl?: number): void {
    // 如果超过最大缓存数，执行淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      lastAccessTime: Date.now(),
      accessCount: 1,
    };

    this.cache.set(key, entry);
    this.log(`缓存设置: ${key}, TTL: ${entry.ttl}ms`);
  }

  /**
   * 删除缓存
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
    this.hits = 0;
    this.misses = 0;
    this.log('缓存已清空');
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
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
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.log(`清理过期缓存: ${cleaned} 条`);
    return cleaned;
  }

  /**
   * 获取或设置缓存（如果不存在则通过工厂函数创建）
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 批量获取
   */
  getMany(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, this.get(key));
    }
    return result;
  }

  /**
   * 批量设置
   */
  setMany(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const { key, data, ttl } of entries) {
      this.set(key, data, ttl);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 执行淘汰策略
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'fifo':
        keyToEvict = this.findFIFOKey();
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.log(`${this.evictionPolicy.toUpperCase()} 淘汰: ${keyToEvict}`);
    }
  }

  /**
   * 找到最少使用的键（LRU）
   */
  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * 找到访问次数最少的键（LFU）
   */
  private findLFUKey(): string | null {
    let leastKey: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastKey = key;
      }
    }

    return leastKey;
  }

  /**
   * 找到最先加入的键（FIFO）
   */
  private findFIFOKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
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
// 预配置的缓存实例
// ═══════════════════════════════════════════════════════════════════════════════

/** MD 文件内容缓存 */
export const mdContentCache = new Cache<string>('MDContent', {
  defaultTtl: CACHE_MD_CONTENT_TTL,
  maxSize: CACHE_MD_CONTENT_MAX_SIZE,
  debug: false,
});

/** index.json 数据缓存 */
export const indexJsonCache = new Cache<RoadmapNode>('IndexJson', {
  defaultTtl: CACHE_INDEX_TTL,
  maxSize: CACHE_INDEX_MAX_SIZE,
  debug: false,
});

/** 节点树缓存 */
export const nodeTreeCache = new Cache<RoadmapNode>('NodeTree', {
  defaultTtl: CACHE_NODE_TREE_TTL,
  maxSize: CACHE_NODE_TREE_MAX_SIZE,
  debug: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// 缓存辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成缓存键
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.filter(p => p !== null && p !== undefined && p !== '').join(':');
}

/**
 * 解析缓存键
 */
export function parseCacheKey(key: string): string[] {
  return key.split(':');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 缓存清理管理
// ═══════════════════════════════════════════════════════════════════════════════

/** 缓存清理器接口 */
interface CacheCleaner {
  cleanup: () => number;
}

/** 所有需要清理的缓存实例 */
const cachesToClean: CacheCleaner[] = [mdContentCache, indexJsonCache, nodeTreeCache];

/** 清理定时器 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 启动定期清理
 */
export function startCacheCleanup(): void {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    for (const cache of cachesToClean) {
      cache.cleanup();
    }
  }, CACHE_CLEANUP_INTERVAL);
  
  // 防止 Node.js 进程因为定时器而无法退出（Node.js 环境）
  const intervalWithUnref = cleanupInterval as ReturnType<typeof setInterval> & { unref?: () => void };
  if (typeof intervalWithUnref.unref === 'function') {
    intervalWithUnref.unref();
  }
}

/**
 * 停止定期清理
 */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * 清理所有缓存
 */
export function clearAllCaches(): void {
  for (const cache of cachesToClean) {
    if (cache instanceof Cache) {
      cache.clear();
    }
  }
}

/**
 * 获取所有缓存的统计信息
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    mdContent: mdContentCache.getStats(),
    indexJson: indexJsonCache.getStats(),
    nodeTree: nodeTreeCache.getStats(),
  };
}

// 自动启动清理（仅浏览器环境）
if (typeof window !== 'undefined') {
  startCacheCleanup();
}
