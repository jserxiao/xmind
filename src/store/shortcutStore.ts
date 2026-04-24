/**
 * 快捷键配置 Store
 * 
 * 管理用户自定义快捷键设置
 * 支持持久化存储
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 快捷键动作类型 */
export type ShortcutAction = 
  | 'undo'          // 撤销
  | 'redo'          // 重做
  | 'save'          // 保存
  | 'search'        // 搜索
  | 'addNode'       // 添加节点
  | 'deleteNode'    // 删除节点
  | 'editNode'      // 编辑节点
  | 'zoomIn'        // 放大
  | 'zoomOut'       // 缩小
  | 'resetZoom'     // 重置缩放
  | 'fitView'       // 适应视图
  | 'togglePanel'   // 切换面板
  | 'exportJPG'     // 导出JPG
  | 'exportPDF'     // 导出PDF
  | 'toggleBookmark' // 切换书签
  | 'nextBookmark'   // 下一个书签
  | 'prevBookmark';  // 上一个书签

/** 快捷键配置 */
export interface ShortcutConfig {
  /** 动作ID */
  action: ShortcutAction;
  /** 快捷键组合 (如 'ctrl+z') */
  key: string;
  /** 动作名称 */
  name: string;
  /** 动作描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 分类 */
  category: 'edit' | 'view' | 'node' | 'export';
}

/** 快捷键 Store 状态 */
interface ShortcutStore {
  /** 快捷键配置映射 */
  shortcuts: Record<ShortcutAction, ShortcutConfig>;
  
  /** 更新快捷键 */
  updateShortcut: (action: ShortcutAction, key: string) => void;
  
  /** 启用/禁用快捷键 */
  toggleShortcut: (action: ShortcutAction, enabled: boolean) => void;
  
  /** 重置为默认快捷键 */
  resetShortcuts: () => void;
  
  /** 获取快捷键配置 */
  getShortcut: (action: ShortcutAction) => ShortcutConfig;
  
  /** 检查快捷键是否冲突 */
  checkConflict: (key: string, excludeAction?: ShortcutAction) => ShortcutAction | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 默认快捷键配置
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutConfig> = {
  undo: {
    action: 'undo',
    key: 'ctrl+z',
    name: '撤销',
    description: '撤销上一步操作',
    enabled: true,
    category: 'edit',
  },
  redo: {
    action: 'redo',
    key: 'ctrl+y',
    name: '重做',
    description: '重做已撤销的操作',
    enabled: true,
    category: 'edit',
  },
  save: {
    action: 'save',
    key: 'ctrl+s',
    name: '保存',
    description: '保存当前思维导图',
    enabled: true,
    category: 'edit',
  },
  search: {
    action: 'search',
    key: 'ctrl+f',
    name: '搜索',
    description: '搜索节点内容',
    enabled: true,
    category: 'edit',
  },
  addNode: {
    action: 'addNode',
    key: 'ctrl+n',
    name: '添加节点',
    description: '添加新节点',
    enabled: true,
    category: 'node',
  },
  deleteNode: {
    action: 'deleteNode',
    key: 'delete',
    name: '删除节点',
    description: '删除选中的节点',
    enabled: true,
    category: 'node',
  },
  editNode: {
    action: 'editNode',
    key: 'enter',
    name: '编辑节点',
    description: '编辑选中的节点',
    enabled: true,
    category: 'node',
  },
  zoomIn: {
    action: 'zoomIn',
    key: 'ctrl+=',
    name: '放大',
    description: '放大视图',
    enabled: true,
    category: 'view',
  },
  zoomOut: {
    action: 'zoomOut',
    key: 'ctrl+-',
    name: '缩小',
    description: '缩小视图',
    enabled: true,
    category: 'view',
  },
  resetZoom: {
    action: 'resetZoom',
    key: 'ctrl+0',
    name: '重置缩放',
    description: '重置为默认缩放比例',
    enabled: true,
    category: 'view',
  },
  fitView: {
    action: 'fitView',
    key: 'ctrl+1',
    name: '适应视图',
    description: '适应整个思维导图到视口',
    enabled: true,
    category: 'view',
  },
  togglePanel: {
    action: 'togglePanel',
    key: 'ctrl+shift+b',
    name: '切换面板',
    description: '显示/隐藏侧边面板',
    enabled: true,
    category: 'view',
  },
  exportJPG: {
    action: 'exportJPG',
    key: 'ctrl+shift+j',
    name: '导出JPG',
    description: '导出为JPG图片',
    enabled: true,
    category: 'export',
  },
  exportPDF: {
    action: 'exportPDF',
    key: 'ctrl+shift+p',
    name: '导出PDF',
    description: '导出为PDF文档',
    enabled: true,
    category: 'export',
  },
  toggleBookmark: {
    action: 'toggleBookmark',
    key: 'ctrl+b',
    name: '切换书签',
    description: '为当前节点添加或移除书签',
    enabled: true,
    category: 'node',
  },
  nextBookmark: {
    action: 'nextBookmark',
    key: 'ctrl+]',
    name: '下一个书签',
    description: '跳转到下一个书签节点',
    enabled: true,
    category: 'node',
  },
  prevBookmark: {
    action: 'prevBookmark',
    key: 'ctrl+[',
    name: '上一个书签',
    description: '跳转到上一个书签节点',
    enabled: true,
    category: 'node',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Store 实现
// ═══════════════════════════════════════════════════════════════════════════════

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set, get) => ({
      shortcuts: { ...DEFAULT_SHORTCUTS },

      updateShortcut: (action, key) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: {
              ...state.shortcuts[action],
              key,
            },
          },
        }));
      },

      toggleShortcut: (action, enabled) => {
        set((state) => ({
          shortcuts: {
            ...state.shortcuts,
            [action]: {
              ...state.shortcuts[action],
              enabled,
            },
          },
        }));
      },

      resetShortcuts: () => {
        set({ shortcuts: { ...DEFAULT_SHORTCUTS } });
      },

      getShortcut: (action) => {
        return get().shortcuts[action];
      },

      checkConflict: (key, excludeAction) => {
        const { shortcuts } = get();
        const normalizedKey = key.toLowerCase();
        
        for (const [action, config] of Object.entries(shortcuts)) {
          if (action !== excludeAction && config.key.toLowerCase() === normalizedKey) {
            return action as ShortcutAction;
          }
        }
        
        return null;
      },
    }),
    {
      name: 'shortcut-config-storage',
      partialize: (state) => ({
        shortcuts: state.shortcuts,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取分类名称
 */
export function getCategoryName(category: ShortcutConfig['category']): string {
  const names = {
    edit: '编辑',
    view: '视图',
    node: '节点',
    export: '导出',
  };
  return names[category];
}

/**
 * 格式化快捷键显示
 */
export function formatShortcut(key: string): string {
  return key
    .replace(/ctrl/gi, 'Ctrl')
    .replace(/shift/gi, 'Shift')
    .replace(/alt/gi, 'Alt')
    .replace(/meta/gi, '⌘')
    .replace(/\+/g, ' + ')
    .toUpperCase();
}
