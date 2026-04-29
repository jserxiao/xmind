/**
 * 存储相关常量定义
 * 
 * 包含加密存储、缓存等配置常量
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 安全存储配置
// ═══════════════════════════════════════════════════════════════════════════════

/** 加密算法 */
export const CRYPTO_ALGORITHM = 'AES-GCM';

/** 密钥长度（位） */
export const CRYPTO_KEY_LENGTH = 256;

/** 初始化向量长度（字节） */
export const CRYPTO_IV_LENGTH = 12;

/** 盐值长度（字节） */
export const CRYPTO_SALT_LENGTH = 16;

/** 密钥派生迭代次数 */
export const CRYPTO_ITERATIONS = 100000;

/** 哈希算法 */
export const CRYPTO_HASH_ALGORITHM = 'SHA-256';

/** 安全存储前缀 */
export const SECURE_STORAGE_PREFIX = 'secure_';

/** 密钥派生种子 */
export const CRYPTO_APP_SEED = 'mindmap';

// ═══════════════════════════════════════════════════════════════════════════════
// 缓存配置
// ═══════════════════════════════════════════════════════════════════════════════

/** MD 文件内容缓存过期时间（毫秒） */
export const CACHE_MD_CONTENT_TTL = 60000;

/** MD 文件内容缓存最大数量 */
export const CACHE_MD_CONTENT_MAX_SIZE = 50;

/** index.json 缓存过期时间（毫秒） */
export const CACHE_INDEX_TTL = 30000;

/** index.json 缓存最大数量 */
export const CACHE_INDEX_MAX_SIZE = 20;

/** 节点树缓存过期时间（毫秒） */
export const CACHE_NODE_TREE_TTL = 30000;

/** 节点树缓存最大数量 */
export const CACHE_NODE_TREE_MAX_SIZE = 10;

/** 缓存清理间隔（毫秒） */
export const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分钟
