/**
 * EventHandler - 图事件处理器
 *
 * 负责处理图的各种交互事件：
 * - 节点点击（展开/收起、查看详情）
 * - 节点悬停（高亮效果）
 * - 聚焦动画（节点定位与缩放）
 */

import { GraphManager } from './GraphManager';
import type { NodeModel } from './GraphManager';
import { TEXT_TRUNCATE } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

/** 导航回调函数类型 */
export type NavigateCallback = (data: {
  mdPath?: string;
  url?: string;
  label: string;
  description?: string;
}) => void;

/** 右键菜单回调函数类型 */
export type ContextMenuCallback = (data: {
  nodeId: string;
  nodeType: string;
  label: string;
  x: number;
  y: number;
}) => void;

/** 双击预览回调函数类型 */
export type DoubleClickPreviewCallback = (data: {
  nodeId: string;
  nodeType: string;
  label: string;
  mdPath?: string;
}) => void;

/** 事件处理器配置 */
export interface EventHandlerConfig {
  /** 图管理器实例 */
  graphManager: GraphManager;
  /** 容器元素（用于设置鼠标样式） */
  container: HTMLElement;
  /** 导航回调（查看详情时触发） */
  onNavigate?: NavigateCallback;
  /** 右键菜单回调 */
  onContextMenu?: ContextMenuCallback;
  /** 双击预览回调（全屏预览 MD 内容） */
  onDoubleClickPreview?: DoubleClickPreviewCallback;
}

/** 节点类型对应的缩放比例 */
const ZOOM_LEVELS: Record<string, number> = {
  root: 1.0,      // 根节点：1:1 原始大小，展示根节点和第一层子节点
  branch: 2.0,    // 分支节点：放大到 2 倍
  sub: 3.5,       // 子节点：放大到 3.5 倍
  leaf: 2.8,      // 叶子节点：放大到 2.8 倍
  link: 2.8,      // 链接节点：放大到 2.8 倍
};

// ─────────────────────────────────────────────────────────────────────────────
// EventHandler 类
// ─────────────────────────────────────────────────────────────────────────────

export class EventHandler {
  /** 图管理器实例 */
  private graphManager: GraphManager;

  /** 容器元素 */
  private container: HTMLElement;

  /** 导航回调 */
  private onNavigate?: NavigateCallback;

  /** 右键菜单回调 */
  private onContextMenu?: ContextMenuCallback;

  /** 双击预览回调 */
  private onDoubleClickPreview?: DoubleClickPreviewCallback;

  /** 聚焦队列（用于处理连续的聚焦请求） */
  private focusQueue: string[] = [];

  /** requestAnimationFrame ID */
  private rafId: number = 0;

  /** 是否正在执行动画 */
  private isAnimating: boolean = false;

  /** 当前高亮的节点 ID */
  private highlightedNodeId: string | null = null;

  /** 高亮效果定时器 */
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 构造函数
   * @param config 配置选项
   */
  constructor(config: EventHandlerConfig) {
    this.graphManager = config.graphManager;
    this.container = config.container;
    this.onNavigate = config.onNavigate;
    this.onContextMenu = config.onContextMenu;
    this.onDoubleClickPreview = config.onDoubleClickPreview;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 事件绑定方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定所有事件
   */
  bindAll(): void {
    this.bindNodeClick();
    this.bindNodeHover();
    this.bindNodeContextMenu();
    this.bindNodeDoubleClick();
    console.log('[EventHandler] 所有事件已绑定');
  }

  /**
   * 解绑所有事件
   */
  unbindAll(): void {
    const graph = this.graphManager.getGraph();
    if (graph) {
      graph.off('node:click');
      graph.off('node:mouseenter');
      graph.off('node:mouseleave');
      graph.off('node:mousemove');
      graph.off('node:contextmenu');
      graph.off('node:dblclick');
    }
    // 取消未执行的动画帧
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    console.log('[EventHandler] 所有事件已解绑');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 节点点击事件
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定节点点击事件
   */
  private bindNodeClick(): void {
    this.graphManager.on('node:click', (evt: any) => {
      const { item, target } = evt;
      if (!item) return;

      const model = item.getModel();
      const targetName = target?.get('name') || '';

      // 展开/收起按钮点击
      if (this.isToggleButton(targetName)) {
        this.handleToggleClick(model.id);
        return;
      }
    });
  }

  /**
   * 判断是否为详情图标
   * @param targetName 目标名称
   * @returns 是否为详情图标
   */
  private isDetailIcon(targetName: string): boolean {
    return targetName.includes('detail-icon');
  }

  /**
   * 判断是否为展开/收起按钮
   * @param targetName 目标名称
   * @returns 是否为展开/收起按钮
   */
  private isToggleButton(targetName: string): boolean {
    return targetName.includes('toggle');
  }

  /**
   * 处理展开/收起点击
   * @param nodeId 节点 ID
   */
  private handleToggleClick(nodeId: string): void {
    this.graphManager.toggleCollapse(nodeId);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 节点右键菜单事件
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定节点右键菜单事件
   */
  private bindNodeContextMenu(): void {
    this.graphManager.on('node:contextmenu', (evt: any) => {
      if (!evt.item) return;

      const model = evt.item.getModel();
      
      // 阻止默认右键菜单
      evt.preventDefault?.();
      
      // 触发右键菜单回调
      if (this.onContextMenu) {
        this.onContextMenu({
          nodeId: model.id,
          nodeType: model.originalType || 'leaf',
          label: model.label,
          x: evt.clientX,
          y: evt.clientY,
        });
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 节点双击事件
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定节点双击事件
   */
  private bindNodeDoubleClick(): void {
    this.graphManager.on('node:dblclick', (evt: any) => {
      const { item, target } = evt;
      if (!item || !this.onDoubleClickPreview) return;

      const model = item.getModel();
      const targetName = target?.get('name') || '';

      // 排除展开/收起按钮的双击
      if (this.isToggleButton(targetName)) return;

      // 判断是否符合预览条件
      // 1. sub 类型节点
      // 2. 有 mdPath 的节点（leaf/link）
      const isSubNode = model.originalType === 'sub';
      const hasMdPath = !!model.mdPath;

      if (isSubNode || hasMdPath) {
        this.onDoubleClickPreview({
          nodeId: model.id,
          nodeType: model.originalType || 'leaf',
          label: model.label,
          mdPath: model.mdPath,
        });
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 节点悬停事件
  // ───────────────────────────────────────────────────────────────────────────

  /** tooltip DOM 元素 */
  private tooltipEl: HTMLDivElement | null = null;

  /**
   * 创建 tooltip DOM 元素
   */
  private createTooltip(): void {
    if (this.tooltipEl) return;
    
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.style.cssText = `
      position: fixed;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 9999;
      max-width: 300px;
      word-break: break-all;
      line-height: 1.4;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);
  }

  /**
   * 显示 tooltip
   */
  private showTooltip(text: string, x: number, y: number): void {
    if (!this.tooltipEl) this.createTooltip();
    if (!this.tooltipEl) return;
    
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = `${x + 10}px`;
    this.tooltipEl.style.top = `${y - 10}px`;
  }

  /**
   * 隐藏 tooltip
   */
  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  /**
   * 绑定节点悬停事件
   */
  private bindNodeHover(): void {
    // 鼠标进入节点
    this.graphManager.on('node:mouseenter', (evt: any) => {
      if (!evt.item) return;

      const targetName = evt.target?.get('name') || '';
      const model = evt.item.getModel();

      // 根据目标设置不同的悬停状态
      if (this.isDetailIcon(targetName)) {
        this.graphManager.getGraph()?.setItemState(evt.item, 'icon-hover', true);
      } else {
        this.graphManager.getGraph()?.setItemState(evt.item, 'hover', true);
      }

      // 如果文本被截断，显示完整内容的 tooltip
      const label = model.label || '';
      const maxLen = this.getMaxLabelLength(model.originalType);
      if (label.length > maxLen) {
        this.showTooltip(label, evt.clientX, evt.clientY);
      }

      // 设置鼠标样式
      this.container.style.cursor = 'pointer';
    });

    // 鼠标移动时更新 tooltip 位置
    this.graphManager.on('node:mousemove', (evt: any) => {
      if (!evt.item) return;
      const model = evt.item.getModel();
      const label = model.label || '';
      const maxLen = this.getMaxLabelLength(model.originalType);
      
      if (label.length > maxLen) {
        this.showTooltip(label, evt.clientX, evt.clientY);
      }
    });

    // 鼠标离开节点
    this.graphManager.on('node:mouseleave', (evt: any) => {
      if (!evt.item) return;

      // 清除所有悬停状态
      this.graphManager.getGraph()?.setItemState(evt.item, 'hover', false);
      this.graphManager.getGraph()?.setItemState(evt.item, 'icon-hover', false);

      // 隐藏 tooltip
      this.hideTooltip();

      // 恢复默认鼠标样式
      this.container.style.cursor = 'default';
    });
  }

  /**
   * 根据节点类型获取最大标签长度
   */
  private getMaxLabelLength(nodeType?: string): number {
    return TEXT_TRUNCATE.maxLength[nodeType as keyof typeof TEXT_TRUNCATE.maxLength] || TEXT_TRUNCATE.maxLength.root;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 聚焦动画
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 聚焦到指定节点（带动画）
   * @param nodeId 节点 ID
   */
  focusNode(nodeId: string): void {
    // 将请求加入队列
    this.focusQueue.push(nodeId);

    // 如果没有正在执行的动画，开始处理队列
    if (!this.rafId && !this.isAnimating) {
      this.rafId = requestAnimationFrame(() => this.processFocusQueue());
    }
  }

  /**
   * 处理聚焦队列
   */
  private processFocusQueue(): void {
    const nodeId = this.focusQueue.shift();
    if (!nodeId) {
      this.rafId = 0;
      return;
    }

    const model = this.graphManager.getNodeModel(nodeId);
    if (!model) {
      this.rafId = 0;
      return;
    }

    // 标记动画开始
    this.isAnimating = true;
    this.rafId = 0;

    // 计算目标缩放比例
    const targetZoom = this.getTargetZoom(model.originalType || 'leaf');
    const graph = this.graphManager.getGraph();
    if (!graph) {
      this.isAnimating = false;
      return;
    }

    const cx = this.graphManager.getWidth() / 2;
    const cy = this.graphManager.getHeight() / 2;

    console.log(`[focus] → "${model.label}" | zoom=${targetZoom}`);

    // 步骤1: focusItem 将节点移到视口中心（带动画）
    this.graphManager.focusNode(nodeId, true);

    // 步骤2: focusItem 动画结束后，以画布中心为锚点放大
    setTimeout(() => {
      this.graphManager.zoomTo(targetZoom, { x: cx, y: cy }, true);

      // 解锁动画状态
      setTimeout(() => {
        this.isAnimating = false;

        // 如果队列中还有请求，继续处理
        if (this.focusQueue.length > 0) {
          this.rafId = requestAnimationFrame(() => this.processFocusQueue());
        }
      }, 300);
    }, 450);
  }

  /**
   * 获取目标缩放比例
   * @param nodeType 节点类型
   * @returns 缩放比例
   */
  private getTargetZoom(nodeType: string): number {
    return ZOOM_LEVELS[nodeType] || 2.8;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 节点高亮方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 高亮指定节点（搜索跳转时调用）
   * @param nodeId 节点 ID
   * @param duration 高亮持续时间（毫秒），默认 2000ms
   */
  highlightNode(nodeId: string, duration = 2000): void {
    const graph = this.graphManager.getGraph();
    if (!graph) return;

    // 先清除之前的高亮
    this.clearHighlight();

    const item = graph.findById(nodeId);
    if (!item) return;

    this.highlightedNodeId = nodeId;

    // 添加高亮状态
    item.setState('highlight', true);

    // 设置定时器，自动清除高亮
    this.highlightTimer = setTimeout(() => {
      this.clearHighlight();
    }, duration);

    console.log(`[EventHandler] 节点高亮: ${nodeId}`);
  }

  /**
   * 清除高亮效果
   */
  clearHighlight(): void {
    // 清除定时器
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }

    // 清除节点高亮状态
    if (this.highlightedNodeId) {
      const graph = this.graphManager.getGraph();
      if (graph) {
        const item = graph.findById(this.highlightedNodeId);
        if (item) {
          item.setState('highlight', false);
        }
      }
      this.highlightedNodeId = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 生命周期方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 销毁事件处理器
   */
  destroy(): void {
    this.unbindAll();
    this.focusQueue = [];
    this.onNavigate = undefined;
    
    // 清理高亮效果
    this.clearHighlight();
    
    // 清理 tooltip
    if (this.tooltipEl) {
      document.body.removeChild(this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
