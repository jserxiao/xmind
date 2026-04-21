/**
 * Core 模块导出
 *
 * 包含所有核心类：
 * - GraphManager: G6 图实例管理器
 * - NodeRenderer: 自定义节点渲染器
 * - EventHandler: 事件处理器
 */

export { GraphManager } from './GraphManager';
export type { NodeModel, GraphOptions } from './GraphManager';

export { NodeRenderer } from './NodeRenderer';

export { EventHandler } from './EventHandler';
export type { NavigateCallback, EventHandlerConfig } from './EventHandler';
