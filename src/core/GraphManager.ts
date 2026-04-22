/**
 * GraphManager - G6 图实例管理类
 *
 * 负责创建、配置和管理 G6 TreeGraph 实例
 * 提供图的初始化、销毁、缩放、布局等核心操作
 * 支持动态配置更新
 */

import G6, { TreeGraph } from '@antv/g6';
import { useConfigStore } from '../store/configStore';

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

/** 图配置选项 */
export interface GraphOptions {
  /** 容器元素 */
  container: HTMLElement;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/** 节点模型数据 */
export interface NodeModel {
  id: string;
  label: string;
  type?: string;
  originalType?: string;
  mdPath?: string;
  url?: string;
  description?: string;
  children?: NodeModel[];
  collapsed?: boolean;
  size?: [number, number];
}

// ─────────────────────────────────────────────────────────────────────────────
// 配置获取器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取当前配置
 * 从 zustand store 获取最新状态
 */
function getConfig() {
  return useConfigStore.getState();
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphManager 类
// ─────────────────────────────────────────────────────────────────────────────

export class GraphManager {
  /** G6 图实例 */
  private graph: TreeGraph | null = null;

  /** 容器元素引用 */
  private container: HTMLElement;

  /** 图的宽度 */
  private width: number;

  /** 图的高度 */
  private height: number;

  /** 是否已销毁 */
  private destroyed = false;

  /**
   * 构造函数
   * @param options 图配置选项
   */
  constructor(options: GraphOptions) {
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 初始化方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 初始化图实例
   * @param data 树形数据
   * @returns G6.TreeGraph 实例
   */
  initialize(data: NodeModel): TreeGraph {
    // 如果已存在实例，先销毁
    if (this.graph) {
      this.graph.destroy();
    }

    // 获取当前配置
    const config = getConfig();
    const { layout, zoom, animation, edge } = config;

    // 创建 TreeGraph 实例
    this.graph = new G6.TreeGraph({
      container: this.container,
      width: this.width,
      height: this.height,

      // 交互模式配置
      modes: {
        default: [
          // 拖拽画布平移（左键拖拽）
          { 
            type: 'drag-canvas', 
            enableOptimize: false, // 禁用优化，保持拖动时显示所有元素
            // direction: 'both' 在 G6 4.x 中需要用两个独立的 behavior 或删除此选项
          },
          // 滚轮缩放画布
          { 
            type: 'zoom-canvas', 
            sensitivity: zoom.sensitivity, 
            minZoom: zoom.minZoom, 
            maxZoom: zoom.maxZoom,
          },
        ],
      },

      // 边的默认配置
      defaultEdge: {
        type: edge.type,
        style: {
          stroke: edge.style.stroke,
          lineWidth: edge.style.lineWidth,
          endArrow: {
            path: G6.Arrow.triangle(4, 6, 0),
            fill: edge.style.endArrow.fill,
            d: 0,
          },
        },
      },

      // 布局配置
      layout: {
        type: layout.type,
        direction: layout.direction,
        getId: (d: any) => d.id,
        getHeight: () => layout.nodeHeight,
        getWidth: () => layout.nodeWidth,
        getVGap: () => layout.vGap,
        getHGap: () => layout.hGap,
      },

      // 动画配置
      animate: true,
      animateCfg: {
        duration: animation.duration,
        easing: animation.easing,
      },
    });

    // 加载数据并渲染
    this.graph.data(data);
    this.graph.render();

    return this.graph;
  }

  /**
   * 刷新图（使用最新配置重新渲染所有节点）
   */
  refresh(): void {
    if (!this.graph || this.destroyed) return;
    
    // 更新布局配置
    const config = getConfig();
    const { layout, colors } = config;
    
    console.log('[GraphManager] refresh 被调用', { 
      layout, 
      primaryColor: colors.primary,
      nodeCount: this.graph.getNodes().length 
    });
    
    // 刷新所有节点 - 使用 updateItem 触发 update 方法
    this.graph.getNodes().forEach((node: any) => {
      const model = node.getModel();
      // 通过更新模型来触发节点的 update 方法
      this.graph!.updateItem(node, { ...model });
    });
    
    // 刷新所有边
    this.graph.getEdges().forEach((edge: any) => {
      this.graph!.refreshItem(edge);
    });
    
    // 更新布局
    this.graph.updateLayout({
      type: layout.type,
      direction: layout.direction,
      getHeight: () => layout.nodeHeight,
      getWidth: () => layout.nodeWidth,
      getVGap: () => layout.vGap,
      getHGap: () => layout.hGap,
    });
    
    console.log('[GraphManager] refresh 完成');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 图操作方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 调整画布大小
   * @param width 新宽度
   * @param height 新高度
   */
  resize(width: number, height: number): void {
    if (!this.graph || this.destroyed) return;
    this.width = width;
    this.height = height;
    this.graph.changeSize(width, height);
  }

  /**
   * 适应视口
   * @param padding 边距
   */
  fitView(padding = 15): void {
    if (!this.graph || this.destroyed) return;
    this.graph.fitView(padding);
  }

  /**
   * 聚焦到指定节点
   * @param nodeId 节点 ID
   * @param animate 是否使用动画
   */
  focusNode(nodeId: string, animate = true): void {
    if (!this.graph || this.destroyed) return;

    const item = this.graph.findById(nodeId);
    if (!item) return;

    this.graph.focusItem(item, animate, {
      easing: 'easeCubic',
      duration: 400,
    });
  }

  /**
   * 缩放到指定比例
   * @param zoom 缩放比例
   * @param center 缩放中心点
   * @param animate 是否使用动画
   */
  zoomTo(zoom: number, center?: { x: number; y: number }, animate = true): void {
    if (!this.graph || this.destroyed) return;

    const options = center ? { ...center } : undefined;

    if (animate) {
      this.graph.zoomTo(zoom, options as any, true, {
        easing: 'easeCubic',
        duration: 250,
      });
    } else {
      this.graph.zoomTo(zoom, options as any);
    }
  }

  /**
   * 放大
   */
  zoomIn(): void {
    if (!this.graph) return;
    const currentZoom = this.graph.getZoom();
    this.zoomTo(currentZoom * 1.3, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }

  /**
   * 缩小
   */
  zoomOut(): void {
    if (!this.graph) return;
    const currentZoom = this.graph.getZoom();
    this.zoomTo(currentZoom * 0.77, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }

  /**
   * 重置缩放为 1:1
   */
  resetZoom(): void {
    this.zoomTo(1, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }

  /**
   * 更新节点
   * @param nodeId 节点 ID
   * @param model 新的节点模型
   */
  updateNode(nodeId: string, model: Partial<NodeModel>): void {
    if (!this.graph) return;
    const item = this.graph.findById(nodeId);
    if (item) {
      this.graph.updateItem(item, model);
    }
  }

  /**
   * 重新布局
   * @param animate 是否使用动画
   */
  layout(animate = false): void {
    if (!this.graph) return;
    this.graph.layout(animate);
  }

  /**
   * 更新图数据
   * @param data 新的树形数据
   */
  setData(data: NodeModel): void {
    if (!this.graph) return;
    this.graph.changeData(data);
    this.graph.layout(false);
    this.graph.fitView(15);
  }

  /**
   * 切换节点的展开/收起状态
   * @param nodeId 节点 ID
   */
  toggleCollapse(nodeId: string): void {
    if (!this.graph) return;

    const item = this.graph.findById(nodeId);
    if (!item) return;

    const model = item.getModel() as NodeModel;
    if (!model.children?.length) return;

    const newCollapsed = !model.collapsed;
    console.log(`[toggle] ${model.label}: collapsed=${newCollapsed}, children=${model.children?.length}`);

    this.graph.updateItem(item, { collapsed: newCollapsed });
    this.graph.layout(false);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 事件绑定方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 绑定事件监听器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  on(eventName: string, handler: (evt: any) => void): void {
    if (!this.graph) return;
    this.graph.on(eventName, handler);
  }

  /**
   * 解绑事件监听器
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  off(eventName: string, handler?: (evt: any) => void): void {
    if (!this.graph) return;
    this.graph.off(eventName, handler);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 查询方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 获取图实例
   * @returns G6.TreeGraph 实例
   */
  getGraph(): TreeGraph | null {
    return this.graph;
  }

  /**
   * 根据 ID 查找节点
   * @param nodeId 节点 ID
   * @returns 节点实例
   */
  findNode(nodeId: string): any {
    if (!this.graph) return null;
    return this.graph.findById(nodeId);
  }

  /**
   * 获取节点模型
   * @param nodeId 节点 ID
   * @returns 节点模型数据
   */
  getNodeModel(nodeId: string): NodeModel | null {
    if (!this.graph) return null;
    const item = this.graph.findById(nodeId);
    return item ? (item.getModel() as NodeModel) : null;
  }

  /**
   * 获取当前缩放比例
   * @returns 缩放比例
   */
  getZoom(): number {
    return this.graph?.getZoom() || 1;
  }

  /**
   * 获取画布宽度
   * @returns 宽度
   */
  getWidth(): number {
    return this.graph?.get('width') || 0;
  }

  /**
   * 获取画布高度
   * @returns 高度
   */
  getHeight(): number {
    return this.graph?.get('height') || 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 生命周期方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 销毁图实例
   */
  destroy(): void {
    if (this.destroyed) return;

    if (this.graph) {
      this.graph.destroy();
      this.graph = null;
    }

    this.destroyed = true;
  }

  /**
   * 检查是否已销毁
   * @returns 是否已销毁
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
