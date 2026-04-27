/**
 * useSecureStorage - 安全存储 Hook
 * 
 * 提供加密的 localStorage 存储功能
 * 使用 Web Crypto API 进行 AES-GCM 加密
 */

import { useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════════════════════

/** 加密算法 */
const ALGORITHM = 'AES-GCM';

/** 密钥长度（位） */
const KEY_LENGTH = 256;

/** 初始化向量长度（字节） */
const IV_LENGTH = 12;

/** 盐值长度（字节） */
const SALT_LENGTH = 16;

/** 迭代次数（用于密钥派生） */
const ITERATIONS = 100000;

/** 哈希算法 */
const HASH_ALGORITHM = 'SHA-256';

/** 存储前缀 */
const STORAGE_PREFIX = 'secure_';

/** 密钥派生用的固定种子（基于应用特征生成） */
const APP_SEED = 'mindmap';

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将 Base64 字符串转换为 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 将字符串编码为 Uint8Array
 */
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * 将 Uint8Array 解码为字符串
 */
function decodeText(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/**
 * 生成加密密钥
 * 使用 PBKDF2 算法从应用种子派生密钥
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  // 导入种子作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encodeText(APP_SEED),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 派生 AES 密钥
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密数据
 * @param plaintext 明文
 * @returns 加密后的 Base64 字符串（包含盐值、IV 和密文）
 */
async function encrypt(plaintext: string): Promise<string> {
  // 生成随机盐值和 IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 派生密钥
  const key = await deriveKey(salt);

  // 加密
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodeText(plaintext)
  );

  // 组合：盐值 + IV + 密文
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * 解密数据
 * @param ciphertext 加密后的 Base64 字符串
 * @returns 解密后的明文
 */
async function decrypt(ciphertext: string): Promise<string> {
  try {
    // 解码 Base64
    const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));

    // 提取盐值、IV 和密文
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = combined.slice(SALT_LENGTH + IV_LENGTH);

    // 派生密钥
    const key = await deriveKey(salt);

    // 解密
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return decodeText(new Uint8Array(decrypted));
  } catch (error) {
    console.error('[SecureStorage] 解密失败:', error);
    throw new Error('解密失败，数据可能已损坏');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecureStorageOptions {
  /** 存储键名前缀 */
  prefix?: string;
}

export interface SecureStorage {
  /**
   * 安全存储数据
   * @param key 存储键名
   * @param value 要存储的值
   */
  setItem: (key: string, value: string) => Promise<void>;

  /**
   * 安全读取数据
   * @param key 存储键名
   * @returns 解密后的值，如果不存在则返回 null
   */
  getItem: (key: string) => Promise<string | null>;

  /**
   * 删除存储的数据
   * @param key 存储键名
   */
  removeItem: (key: string) => void;

  /**
   * 检查是否存在指定键
   * @param key 存储键名
   */
  hasItem: (key: string) => boolean;

  /**
   * 安全存储 JSON 对象
   * @param key 存储键名
   * @param value 要存储的对象
   */
  setJSON: <T>(key: string, value: T) => Promise<void>;

  /**
   * 安全读取 JSON 对象
   * @param key 存储键名
   * @returns 解析后的对象，如果不存在或解析失败则返回 null
   */
  getJSON: <T>(key: string) => Promise<T | null>;

  /**
   * 加密字符串
   * @param plaintext 明文
   * @returns 加密后的字符串
   */
  encryptString: (plaintext: string) => Promise<string>;

  /**
   * 解密字符串
   * @param ciphertext 密文
   * @returns 解密后的字符串
   */
  decryptString: (ciphertext: string) => Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 安全存储 Hook
 * 
 * 提供加密的 localStorage 存储功能
 * 
 * @example
 * ```tsx
 * const secureStorage = useSecureStorage();
 * 
 * // 存储加密数据
 * await secureStorage.setItem('api-key', 'sk-xxxxx');
 * 
 * // 读取解密数据
 * const apiKey = await secureStorage.getItem('api-key');
 * 
 * // 存储加密 JSON
 * await secureStorage.setJSON('config', { provider: 'openai', model: 'gpt-4' });
 * 
 * // 读取解密 JSON
 * const config = await secureStorage.getJSON<{ provider: string }>('config');
 * ```
 */
export function useSecureStorage(options: SecureStorageOptions = {}): SecureStorage {
  const { prefix = STORAGE_PREFIX } = options;

  /**
   * 获取完整的存储键名
   */
  const getFullKey = useCallback((key: string): string => {
    return `${prefix}${key}`;
  }, [prefix]);

  /**
   * 安全存储数据
   */
  const setItem = useCallback(async (key: string, value: string): Promise<void> => {
    try {
      const fullKey = getFullKey(key);
      const encrypted = await encrypt(value);
      localStorage.setItem(fullKey, encrypted);
    } catch (error) {
      console.error('[SecureStorage] 存储失败:', error);
      throw new Error('安全存储失败');
    }
  }, [getFullKey]);

  /**
   * 安全读取数据
   */
  const getItem = useCallback(async (key: string): Promise<string | null> => {
    try {
      const fullKey = getFullKey(key);
      const encrypted = localStorage.getItem(fullKey);
      
      if (!encrypted) {
        return null;
      }

      return await decrypt(encrypted);
    } catch (error) {
      console.error('[SecureStorage] 读取失败:', error);
      // 如果解密失败，删除损坏的数据
      const fullKey = getFullKey(key);
      localStorage.removeItem(fullKey);
      return null;
    }
  }, [getFullKey]);

  /**
   * 删除存储的数据
   */
  const removeItem = useCallback((key: string): void => {
    const fullKey = getFullKey(key);
    localStorage.removeItem(fullKey);
  }, [getFullKey]);

  /**
   * 检查是否存在指定键
   */
  const hasItem = useCallback((key: string): boolean => {
    const fullKey = getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }, [getFullKey]);

  /**
   * 安全存储 JSON 对象
   */
  const setJSON = useCallback(async <T,>(key: string, value: T): Promise<void> => {
    const json = JSON.stringify(value);
    await setItem(key, json);
  }, [setItem]);

  /**
   * 安全读取 JSON 对象
   */
  const getJSON = useCallback(async <T,>(key: string): Promise<T | null> => {
    const json = await getItem(key);
    if (!json) {
      return null;
    }
    
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      console.error('[SecureStorage] JSON 解析失败:', error);
      return null;
    }
  }, [getItem]);

  /**
   * 加密字符串
   */
  const encryptString = useCallback(async (plaintext: string): Promise<string> => {
    return encrypt(plaintext);
  }, []);

  /**
   * 解密字符串
   */
  const decryptString = useCallback(async (ciphertext: string): Promise<string> => {
    return decrypt(ciphertext);
  }, []);

  // 返回存储接口
  return useMemo(() => ({
    setItem,
    getItem,
    removeItem,
    hasItem,
    setJSON,
    getJSON,
    encryptString,
    decryptString,
  }), [setItem, getItem, removeItem, hasItem, setJSON, getJSON, encryptString, decryptString]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 单例导出（用于非 React 环境）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 安全存储单例
 * 可在 React 组件外使用
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const encrypted = await encrypt(value);
    localStorage.setItem(fullKey, encrypted);
  },

  async getItem(key: string): Promise<string | null> {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const encrypted = localStorage.getItem(fullKey);
    
    if (!encrypted) {
      return null;
    }

    try {
      return await decrypt(encrypted);
    } catch (error) {
      console.error('[SecureStorage] 读取失败:', error);
      localStorage.removeItem(fullKey);
      return null;
    }
  },

  removeItem(key: string): void {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(fullKey);
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    await this.setItem(key, json);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const json = await this.getItem(key);
    if (!json) {
      return null;
    }
    
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      console.error('[SecureStorage] JSON 解析失败:', error);
      return null;
    }
  },
};

export default useSecureStorage;
