/**
 * useKeyboardShortcuts - 键盘快捷键 Hook
 * 
 * 提供全局和局部键盘快捷键绑定
 */

import { useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShortcutHandler {
  /** 快捷键组合，如 'ctrl+z', 'ctrl+shift+z', 'ctrl+y' */
  key: string;
  /** 回调函数 */
  callback: (e: KeyboardEvent) => void;
  /** 是否阻止默认行为，默认 true */
  preventDefault?: boolean;
  /** 是否阻止事件冒泡，默认 false */
  stopPropagation?: boolean;
  /** 描述（用于提示） */
  description?: string;
}

export interface UseKeyboardShortcutsOptions {
  /** 是否启用，默认 true */
  enabled?: boolean;
  /** 目标元素，默认 document */
  target?: HTMLElement | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 解析快捷键
// ═══════════════════════════════════════════════════════════════════════════════

interface ParsedKey {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

function parseShortcut(shortcut: string): ParsedKey {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() || '';
  
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key,
  };
}

function matchesShortcut(e: KeyboardEvent, parsed: ParsedKey): boolean {
  const actualKey = e.key.toLowerCase();
  
  return (
    e.ctrlKey === parsed.ctrl &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt &&
    e.metaKey === parsed.meta &&
    actualKey === parsed.key
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 绑定键盘快捷键
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'ctrl+z', callback: handleUndo, description: '撤销' },
 *   { key: 'ctrl+y', callback: handleRedo, description: '重做' },
 *   { key: 'ctrl+shift+z', callback: handleRedo, description: '重做' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, target } = options;
  const shortcutsRef = useRef(shortcuts);
  
  // 更新 ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const parsed = parseShortcut(shortcut.key);
      
      if (matchesShortcut(e, parsed)) {
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        if (shortcut.stopPropagation) {
          e.stopPropagation();
        }
        shortcut.callback(e);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target || document;
    targetElement.addEventListener('keydown', handleKeyDown as any);
    
    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [enabled, target, handleKeyDown]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 专用 Hook：撤销/重做快捷键
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseUndoRedoShortcutsOptions {
  /** 撤销回调 */
  onUndo: () => void;
  /** 重做回调 */
  onRedo: () => void;
  /** 是否启用 */
  enabled?: boolean;
  /** 是否可以撤销 */
  canUndo?: boolean;
  /** 是否可以重做 */
  canRedo?: boolean;
}

/**
 * 撤销/重做快捷键 Hook
 * 
 * @example
 * ```tsx
 * useUndoRedoShortcuts({
 *   onUndo: handleUndo,
 *   onRedo: handleRedo,
 *   canUndo: history.canUndo(),
 *   canRedo: history.canRedo(),
 * });
 * ```
 */
export function useUndoRedoShortcuts(options: UseUndoRedoShortcutsOptions) {
  const { onUndo, onRedo, enabled = true, canUndo = true, canRedo = true } = options;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      onUndo();
    }
  }, [onUndo, canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      onRedo();
    }
  }, [onRedo, canRedo]);

  useKeyboardShortcuts(
    [
      { key: 'ctrl+z', callback: handleUndo, description: '撤销' },
      { key: 'meta+z', callback: handleUndo, description: '撤销 (Mac)' },
      { key: 'ctrl+y', callback: handleRedo, description: '重做' },
      { key: 'meta+y', callback: handleRedo, description: '重做 (Mac)' },
      { key: 'ctrl+shift+z', callback: handleRedo, description: '重做' },
      { key: 'meta+shift+z', callback: handleRedo, description: '重做 (Mac)' },
    ],
    { enabled }
  );
}
