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
import { useConnectionStore } from '../store/connectionStore';

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

  /** 聚焦动画定时器 ID */
  private focusTimer1: ReturnType<typeof setTimeout> | null = null;
  private focusTimer2: ReturnType<typeof setTimeout> | null = null;

  /** 当前高亮的节点 ID */
  private highlightedNodeId: string | null = null;

  /** 高亮效果定时器 */
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  /** 连线绘制临时线条 DOM */
  private connectionLineEl: SVGLineElement | null = null;
  
  /** 连线绘制 SVG 容器 */
  private connectionSvgEl: SVGSVGElement | null = null;
  
  /** 是否正在绘制连线 */
  private isDrawingConnection: boolean = false;

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
    this.bindConnectionEvents();
    this.bindViewportChange();
    console.log('[EventHandler] 所有事件已绑定');
  }

  /**
   * 绑定视图变化事件（用于更新连线位置）
   */
  private bindViewportChange(): void {
    const graph = this.graphManager.getGraph();
    if (!graph) return;

    // 监听缩放事件
    graph.on('viewportchange', (evt: any) => {
      // 视图变化时更新连线位置
      this.graphManager.updateConnectionLinesPosition();
    });
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
      graph.off('node:mousedown');
      graph.off('viewportchange');
    }
    // 取消未执行的动画帧
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    // 清除聚焦动画定时器
    if (this.focusTimer1) {
      clearTimeout(this.focusTimer1);
      this.focusTimer1 = null;
    }
    if (this.focusTimer2) {
      clearTimeout(this.focusTimer2);
      this.focusTimer2 = null;
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
    this.focusTimer1 = setTimeout(() => {
      this.focusTimer1 = null;
      this.graphManager.zoomTo(targetZoom, { x: cx, y: cy }, true);

      // 解锁动画状态
      this.focusTimer2 = setTimeout(() => {
        this.focusTimer2 = null;
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
  // 连线绘制方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定连线绘制事件
   */
  private bindConnectionEvents(): void {
    // 节点 mousedown - 开始连线
    this.graphManager.on('node:mousedown', (evt: any) => {
      console.log('[EventHandler] node:mousedown 触发', evt);
      const mode = useConnectionStore.getState().connectionMode;
      console.log('[EventHandler] 当前连线模式:', mode);
      if (mode !== 'active') return;
      if (!evt.item) return;

      const model = evt.item.getModel();
      const targetName = evt.target?.get('name') || '';
      
      // 排除展开/收起按钮
      if (this.isToggleButton(targetName)) return;

      // 开始绘制连线
      this.startConnectionDrawing(model.id, evt);
    });

    // 画布 mousemove - 更新连线位置
    this.container.addEventListener('mousemove', this.handleConnectionMouseMove);

    // 画布 mouseup - 结束连线
    this.container.addEventListener('mouseup', this.handleConnectionMouseUp);
    
    console.log('[EventHandler] 连线事件已绑定');
  }

  /**
   * 开始绘制连线
   */
  private startConnectionDrawing(sourceId: string, evt: any): void {
    const center = this.graphManager.getNodeCenter(sourceId);
    if (!center) return;

    this.isDrawingConnection = true;
    useConnectionStore.getState().startDrawing(sourceId);

    // 创建 SVG 容器
    this.createConnectionSvg();

    // 创建临时连线
    if (this.connectionSvgEl) {
      const graph = this.graphManager.getGraph();
      const point = graph?.getCanvasByPoint(center.x, center.y);
      
      if (point) {
        this.connectionLineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.connectionLineEl.setAttribute('x1', String(point.x));
        this.connectionLineEl.setAttribute('y1', String(point.y));
        this.connectionLineEl.setAttribute('x2', String(point.x));
        this.connectionLineEl.setAttribute('y2', String(point.y));
        this.connectionLineEl.setAttribute('stroke', '#52c41a');
        this.connectionLineEl.setAttribute('stroke-width', '2');
        this.connectionLineEl.setAttribute('stroke-dasharray', '5,5');
        this.connectionLineEl.setAttribute('stroke-linecap', 'round');
        
        this.connectionSvgEl.appendChild(this.connectionLineEl);
      }
    }

    console.log(`[EventHandler] 开始绘制连线，起点: ${sourceId}`);
  }

  /**
   * 创建连线 SVG 容器
   */
  private createConnectionSvg(): void {
    if (this.connectionSvgEl) return;

    this.connectionSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.connectionSvgEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    `;
    
    // 将 SVG 插入到 canvas 元素之前，确保线条渲染在节点下方
    const canvas = this.container.querySelector('canvas');
    if (canvas) {
      this.container.insertBefore(this.connectionSvgEl, canvas);
    } else {
      this.container.appendChild(this.connectionSvgEl);
    }
  }

  /**
   * 处理连线 mousemove
   */
  private handleConnectionMouseMove = (evt: MouseEvent): void => {
    if (!this.isDrawingConnection || !this.connectionLineEl) return;

    const rect = this.container.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    this.connectionLineEl.setAttribute('x2', String(x));
    this.connectionLineEl.setAttribute('y2', String(y));

    // 更新 store 中的鼠标位置
    useConnectionStore.getState().updateMousePosition(x, y);
  };

  /**
   * 处理连线 mouseup
   */
  private handleConnectionMouseUp = (evt: MouseEvent): void => {
    // 只有在绘制连线状态时才处理
    if (!this.isDrawingConnection) return;

    // 检查是否点击了右键菜单或其子元素（右键菜单应该在 body 下，不在容器内）
    const target = evt.target as HTMLElement;
    const isContextMenuClick = target.closest('.ant-dropdown, .ant-modal, .ant-menu');
    if (isContextMenuClick) {
      // 如果点击的是菜单/弹窗，取消连线绘制但不处理连线逻辑
      this.isDrawingConnection = false;
      useConnectionStore.getState().cancelDrawing();
      this.clearConnectionLine();
      console.log('[EventHandler] 点击菜单，取消连线绘制');
      return;
    }

    this.isDrawingConnection = false;

    const graph = this.graphManager.getGraph();
    
    // 将画布坐标转换为图坐标
    const point = graph?.getPointByClient(evt.clientX, evt.clientY);
    
    // 查找该位置的节点
    let targetNodeId: string | null = null;
    if (point && graph) {
      const nodes = graph.getNodes();
      for (const node of nodes) {
        const bbox = node.getBBox();
        if (
          point.x >= bbox.minX &&
          point.x <= bbox.maxX &&
          point.y >= bbox.minY &&
          point.y <= bbox.maxY
        ) {
          targetNodeId = node.getModel().id;
          break;
        }
      }
    }

    // 结束连线绘制
    useConnectionStore.getState().endDrawing(targetNodeId);

    // 清理临时连线
    this.clearConnectionLine();

    console.log(`[EventHandler] 结束连线绘制，目标: ${targetNodeId || '无'}`);
  };

  /**
   * 清理临时连线
   */
  private clearConnectionLine(): void {
    if (this.connectionLineEl && this.connectionSvgEl) {
      this.connectionSvgEl.removeChild(this.connectionLineEl);
      this.connectionLineEl = null;
    }
  }

  /**
   * 移除连线 SVG 容器
   */
  private removeConnectionSvg(): void {
    this.clearConnectionLine();
    if (this.connectionSvgEl) {
      this.container.removeChild(this.connectionSvgEl);
      this.connectionSvgEl = null;
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
    this.isAnimating = false;
    this.onNavigate = undefined;

    // 清理高亮效果
    this.clearHighlight();
    
    // 清理连线绘制
    this.container.removeEventListener('mousemove', this.handleConnectionMouseMove);
    this.container.removeEventListener('mouseup', this.handleConnectionMouseUp);
    this.removeConnectionSvg();
    
    // 清理 tooltip
    if (this.tooltipEl) {
      document.body.removeChild(this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
