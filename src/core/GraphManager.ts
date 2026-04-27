/**
 * GraphManager - G6 图实例管理类
 *
 * 负责创建、配置和管理 G6 TreeGraph 实例
 * 提供图的初始化、销毁、缩放、布局等核心操作
 * 支持动态配置更新
 */

import G6, { TreeGraph } from '@antv/g6';
import { useConfigStore } from '../store/configStore';
import type { WatermarkConfig } from '../store/watermarkStore';
import type { MinimapConfig } from '../store/minimapStore';

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
  /** 节点 x 坐标 */
  x?: number;
  /** 节点 y 坐标 */
  y?: number;
  /** 是否有书签标记 */
  hasBookmark?: boolean;
  /** 自定义节点 ID */
  customNodeId?: string;
  /** 自定义节点填充色 */
  customFill?: string;
  /** 自定义节点边框色 */
  customStroke?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 配置获取器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取当前思维导图的配置
 * 从 zustand store 获取最新状态
 */
function getConfig() {
  return useConfigStore.getState().getCurrentConfig();
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
    const { layout, colors, edge } = config;
    
    // 根据布局方向决定边的类型
    const isHorizontal = layout.direction === 'LR';
    const edgeType = isHorizontal ? 'cubic-horizontal' : 'cubic-vertical';
    
    console.log('[GraphManager] refresh 被调用', { 
      layout, 
      primaryColor: colors.primary,
      nodeCount: this.graph.getNodes().length,
      edgeType,
    });
    
    // 刷新所有节点 - 使用 updateItem 触发 update 方法
    this.graph.getNodes().forEach((node: any) => {
      const model = node.getModel();
      // 通过更新模型来触发节点的 update 方法
      this.graph!.updateItem(node, { ...model });
    });
    
    // 更新布局（这会重新计算节点位置）
    this.graph.updateLayout({
      type: layout.type,
      direction: layout.direction,
      getHeight: () => layout.nodeHeight,
      getWidth: () => layout.nodeWidth,
      getVGap: () => layout.vGap,
      getHGap: () => layout.hGap,
    });
    
    // 等待布局完成后更新边的类型和样式
    // 使用 setTimeout 确保布局计算完成后再更新边
    setTimeout(() => {
      if (!this.graph || this.destroyed) return;
      
      this.graph.getEdges().forEach((edgeItem: any) => {
        this.graph!.updateItem(edgeItem, {
          type: edgeType,
          style: {
            stroke: edge.style.stroke,
            lineWidth: edge.style.lineWidth,
            endArrow: isHorizontal 
              ? {
                  path: G6.Arrow.triangle(4, 6, 0),
                  fill: edge.style.endArrow.fill,
                  d: 0,
                }
              : {
                  path: G6.Arrow.triangle(4, 6, 0),
                  fill: edge.style.endArrow.fill,
                  d: 8, // 纵向布局时增加偏移，让箭头靠近节点
                },
          },
        });
      });
      
      // 不再自动调整视口，保持用户当前的视图状态
      // 如果需要适应视口，用户可以手动点击适应按钮
    }, 50);
    
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
    // G6 的 layout 是异步的，changeData 后立即 fitView 会在旧布局上计算边界框。
    // 单帧 rAF 不足以等 layout 完成，双帧 rAF 确保 G6 已计算完节点位置后再适配视口。
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.graph?.fitView(15);
      });
    });
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
  // 水印方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 设置水印（通过 DOM 方式实现）
   * @param config 水印配置
   */
  setWatermark(config: WatermarkConfig): void {
    if (!this.graph || this.destroyed) return;

    // 先移除已有的水印
    this.removeWatermark();

    if (!config.enabled) return;

    // 使用 DOM 方式添加水印
    const canvas = this.container.querySelector('canvas');
    if (!canvas) return;

    // 创建水印层
    const watermarkDiv = document.createElement('div');
    watermarkDiv.id = 'g6-watermark';
    watermarkDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      background-repeat: repeat;
      font-family: ${config.fontFamily};
    `;

    // 创建 SVG 水印
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${config.gapX * 2}" height="${config.gapY * 2}">
        <text
          x="50%"
          y="50%"
          font-size="${config.fontSize}"
          fill="${config.color}"
          fill-opacity="${config.opacity}"
          text-anchor="middle"
          dominant-baseline="middle"
          transform="rotate(${config.rotate}, ${config.gapX}, ${config.gapY})"
        >${config.content}</text>
      </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    watermarkDiv.style.backgroundImage = `url(${url})`;

    // 插入到容器中
    this.container.style.position = 'relative';
    this.container.appendChild(watermarkDiv);

    console.log('[GraphManager] 水印已设置:', config.content);
  }

  /**
   * 移除水印
   */
  removeWatermark(): void {
    const watermarkDiv = document.getElementById('g6-watermark');
    if (watermarkDiv) {
      watermarkDiv.remove();
      console.log('[GraphManager] 水印已移除');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 小地图方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 设置小地图
   * @param config 小地图配置
   */
  setMinimap(config: MinimapConfig): void {
    if (!this.graph || this.destroyed) return;

    // 检查是否已有小地图容器
    let minimapContainer = document.getElementById('g6-minimap-container');
    
    if (!config.enabled) {
      // 关闭小地图：隐藏容器
      if (minimapContainer) {
        minimapContainer.style.display = 'none';
      }
      console.log('[GraphManager] 小地图已关闭');
      return;
    }
    
    // 开启小地图
    if (minimapContainer) {
      // 已存在容器，直接显示
      minimapContainer.style.display = 'block';
      console.log('[GraphManager] 小地图已开启（复用现有容器）');
      return;
    }
    
    // 创建新的小地图容器
    minimapContainer = document.createElement('div');
    minimapContainer.id = 'g6-minimap-container';
    minimapContainer.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      background: ${config.backgroundColor || '#fff'};
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 10;
    `;

    // 插入到容器中
    this.container.style.position = 'relative';
    this.container.appendChild(minimapContainer);

    // 创建小地图插件
    // 注意：不设置 type 或 type: 'default' 可以显示完整内容包括文字
    // delegate 只显示占位框，keyShape 只显示主形状，都不显示文字
    const minimap = new G6.Minimap({
      container: minimapContainer as HTMLDivElement,
      width: config.width || 200,
      height: config.height || 160,
      type: 'delegate', // 只显示简化占位框
      // type: 'keyShape' , //只显示节点主形状
      // 不设置 type - 显示完整内容（包括文字），性能稍差但体验更好
      padding: 10,
    });

    // 尝试使用 addPlugin 方法，如果不存在则直接更新 plugins
    if (typeof this.graph.addPlugin === 'function') {
      this.graph.addPlugin(minimap);
    } else {
      // 备选方案：直接更新 plugins 数组
      const plugins = this.graph.get('plugins') || [];
      this.graph.set('plugins', [...plugins, minimap]);
    }
    
    // 保存插件实例引用
    (this as any)._minimapPlugin = minimap;

    console.log('[GraphManager] 小地图已创建');
  }

  /**
   * 移除小地图
   */
  removeMinimap(): void {
    const minimapContainer = document.getElementById('g6-minimap-container');
    if (minimapContainer) {
      minimapContainer.style.display = 'none';
      console.log('[GraphManager] 小地图已隐藏');
    }
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
