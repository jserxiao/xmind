/**
 * useHistory - 通用的撤销/恢复 Hook
 * 
 * 提供状态的历史记录管理，支持：
 * - 撤销 (undo)
 * - 重做 (redo)
 * - 历史记录限制
 * - 状态变更监听
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface HistoryState<T> {
  /** 当前状态 */
  present: T;
  /** 历史记录栈 */
  past: T[];
  /** 未来记录栈（用于重做） */
  future: T[];
}

export interface HistoryActions<T> {
  /** 设置新状态（会清空 future 栈） */
  set: (newState: T) => void;
  /** 撤销 */
  undo: () => T | null;
  /** 重做 */
  redo: () => T | null;
  /** 重置状态（清空历史） */
  reset: (newState: T) => void;
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 历史记录数量 */
  historyLength: number;
}

export interface UseHistoryOptions<T> {
  /** 最大历史记录数量，默认 50 */
  maxHistory?: number;
  /** 状态变更回调（用于持久化） */
  onChange?: (state: T, action: 'set' | 'undo' | 'redo' | 'reset') => void | Promise<void>;
  /** 判断两个状态是否相等，默认使用 JSON.stringify 比较 */
  isEqual?: (a: T, b: T) => boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 默认比较函数
// ═══════════════════════════════════════════════════════════════════════════════

function defaultIsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用的撤销/恢复 Hook
 * 
 * @example
 * ```tsx
 * const [state, historyActions] = useHistory(initialState, {
 *   maxHistory: 30,
 *   onChange: async (newState) => {
 *     await saveToFile(newState);
 *   }
 * });
 * 
 * // 设置新状态
 * historyActions.set(newState);
 * 
 * // 撤销
 * historyActions.undo();
 * 
 * // 重做
 * historyActions.redo();
 * ```
 */
export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions<T> = {}
): [T, HistoryActions<T>] {
  const { maxHistory = 50, onChange, isEqual = defaultIsEqual } = options;

  // 当前状态
  const [state, setState] = useState<T>(initialState);
  
  // 历史栈
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  
  // 防止重复触发 onChange
  const isProcessingRef = useRef(false);

  // 更新状态并记录历史
  const set = useCallback((newState: T) => {
    setState((prevState) => {
      // 如果状态相同，不记录历史
      if (isEqual(prevState, newState)) {
        return prevState;
      }

      // 将当前状态推入 past 栈
      pastRef.current = [...pastRef.current, prevState].slice(-maxHistory);
      
      // 清空 future 栈
      futureRef.current = [];
      
      // 触发变更回调
      if (onChange && !isProcessingRef.current) {
        onChange(newState, 'set');
      }

      return newState;
    });
  }, [maxHistory, onChange, isEqual]);

  // 撤销
  const undo = useCallback((): T | null => {
    if (pastRef.current.length === 0) {
      return null;
    }

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, -1);

    setState((current) => {
      // 将当前状态推入 future 栈
      futureRef.current = [current, ...futureRef.current];
      
      // 更新 past 栈
      pastRef.current = newPast;
      
      // 触发变更回调
      if (onChange && !isProcessingRef.current) {
        isProcessingRef.current = true;
        Promise.resolve(onChange(previous, 'undo')).finally(() => {
          isProcessingRef.current = false;
        });
      }

      return previous;
    });

    return previous;
  }, [onChange]);

  // 重做
  const redo = useCallback((): T | null => {
    if (futureRef.current.length === 0) {
      return null;
    }

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    setState((current) => {
      // 将当前状态推入 past 栈
      pastRef.current = [...pastRef.current, current].slice(-maxHistory);
      
      // 更新 future 栈
      futureRef.current = newFuture;
      
      // 触发变更回调
      if (onChange && !isProcessingRef.current) {
        isProcessingRef.current = true;
        Promise.resolve(onChange(next, 'redo')).finally(() => {
          isProcessingRef.current = false;
        });
      }

      return next;
    });

    return next;
  }, [maxHistory, onChange]);

  // 重置状态
  const reset = useCallback((newState: T) => {
    setState(() => {
      // 清空历史
      pastRef.current = [];
      futureRef.current = [];
      
      // 触发变更回调
      if (onChange) {
        onChange(newState, 'reset');
      }

      return newState;
    });
  }, [onChange]);

  // 计算派生状态
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const historyLength = pastRef.current.length;

  // 同步外部状态变更（当 initialState 改变时）
  useEffect(() => {
    if (!isEqual(state, initialState)) {
      setState(initialState);
    }
  }, [initialState, isEqual, state]);

  const actions: HistoryActions<T> = {
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyLength,
  };

  return [state, actions];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数：创建带持久化的历史管理器
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建一个支持撤销/恢复的状态管理器
 * 用于需要手动控制历史记录的场景
 */
export function createHistoryManager<T>(options: {
  maxHistory?: number;
  onPersist?: (state: T) => void | Promise<void>;
} = {}) {
  const { maxHistory = 50, onPersist } = options;
  
  let present: T | null = null;
  let past: T[] = [];
  let future: T[] = [];

  return {
    /** 获取当前状态 */
    get: () => present,
    
    /** 设置新状态 */
    set: (newState: T) => {
      if (present !== null) {
        past = [...past, present].slice(-maxHistory);
      }
      future = [];
      present = newState;
      onPersist?.(newState);
    },

    /** 撤销 */
    undo: (): T | null => {
      if (past.length === 0) return null;
      const previous = past[past.length - 1];
      past = past.slice(0, -1);
      if (present !== null) {
        future = [present, ...future];
      }
      present = previous;
      onPersist?.(previous);
      return previous;
    },

    /** 重做 */
    redo: (): T | null => {
      if (future.length === 0) return null;
      const next = future[0];
      future = future.slice(1);
      if (present !== null) {
        past = [...past, present].slice(-maxHistory);
      }
      present = next;
      onPersist?.(next);
      return next;
    },

    /** 重置 */
    reset: (newState: T) => {
      past = [];
      future = [];
      present = newState;
      onPersist?.(newState);
    },

    /** 是否可撤销 */
    canUndo: () => past.length > 0,

    /** 是否可重做 */
    canRedo: () => future.length > 0,

    /** 获取历史长度 */
    getHistoryLength: () => past.length,
  };
}
