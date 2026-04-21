/**
 * RoadmapGraph - 学习路线图组件
 *
 * 主要功能：
 * 1. 展示树形结构的知识点路线图
 * 2. 支持节点的展开/收起
 * 3. 支持点击查看知识点详情
 * 4. 提供工具栏操作（缩放、导出等）
 * 5. 提供节点导航面板
 *
 * 架构说明：
 * - GraphManager: 管理 G6 图实例
 * - NodeRenderer: 注册自定义节点渲染器
 * - EventHandler: 处理用户交互事件
 * - ConfigPanel: 左侧配置面板
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../store/configStore';
import type { RoadmapNode } from '../data/roadmapData';
import { loadRoadmapData, enrichWithSubNodes } from '../data/roadmapData';
import type { NodeModel } from '../core/GraphManager';
import { GraphManager } from '../core/GraphManager';
import { NodeRenderer } from '../core/NodeRenderer';
import { EventHandler } from '../core/EventHandler';
import { exportToJPG, exportToPDF } from '../utils/exportMindmap';
import ConfigPanel from './ConfigPanel';

// ─────────────────────────────────────────────────────────────────────────────
// 组件 Props 定义
// ─────────────────────────────────────────────────────────────────────────────

interface RoadmapGraphProps {
  /** 节点点击回调 */
  onNodeClick?: (nodeData: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 数据转换工具函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将 RoadmapNode 转换为 G6 可用的树形数据
 * @param node 原始节点数据
 * @returns G6 节点数据
 */
function convertToTreeData(node: RoadmapNode): NodeModel {
  const nodeData: NodeModel = {
    id: node.id,
    label: node.label,
    mdPath: node.mdPath,
    url: node.url,
    description: node.description,
    originalType: node.type,
  };

  // 根据节点类型设置 G6 节点类型和尺寸
  switch (node.type) {
    case 'root':
      nodeData.type = 'root-node';
      nodeData.size = [220, 70];
      break;
    case 'branch':
      nodeData.type = 'branch-node';
      nodeData.size = [130, 40];
      break;
    case 'leaf':
      nodeData.type = 'leaf-node';
      nodeData.size = [160, 36];
      break;
    case 'link':
      nodeData.type = 'link-node';
      nodeData.size = [150, 30];
      break;
    case 'sub':
      nodeData.type = 'sub-node';
      nodeData.size = [120, 26];
      break;
  }

  // 递归处理子节点
  if (node.children?.length) {
    nodeData.children = node.children.map(convertToTreeData);
  }

  return nodeData;
}

// ─────────────────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────────────────

const RoadmapGraph: React.FC<RoadmapGraphProps> = ({ onNodeClick }) => {
  // ── DOM 引用 ──
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 类实例引用 ──
  const graphManagerRef = useRef<GraphManager | null>(null);
  const eventHandlerRef = useRef<EventHandler | null>(null);
  const nodeRendererRef = useRef<NodeRenderer | null>(null);

  // ── 状态管理 ──
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RoadmapNode | null>(null);

  // ── 路由导航 ──
  const navigate = useNavigate();

  // ── Store 状态 ──
  // 获取配置状态用于监听变化
  // 使用 JSON.stringify 来确保能检测到对象内部的变化
  const colors = useConfigStore((state) => state.colors);
  const layout = useConfigStore((state) => state.layout);
  
  // 将对象序列化以便监听内部变化
  const colorsJson = JSON.stringify(colors);
  const layoutJson = JSON.stringify(layout);

  // ───────────────────────────────────────────────────────────────────────────
  // 初始化图实例
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    // 标记组件是否已卸载
    let destroyed = false;

    /**
     * 初始化函数
     * 异步加载数据、创建图实例、绑定事件
     */
    const init = async () => {
      try {
        // 1. 加载数据
        const root = await loadRoadmapData();
        if (destroyed) return;

        // 2. 丰富数据（添加子节点）
        const enriched = await enrichWithSubNodes(root);
        if (destroyed) return;

        // 保存原始数据供面板使用
        setRawData(enriched);

        // 3. 注册自定义节点
        if (!nodeRendererRef.current) {
          nodeRendererRef.current = new NodeRenderer();
        }
        nodeRendererRef.current.registerAll();

        // 4. 创建图管理器
        const container = containerRef.current!;
        graphManagerRef.current = new GraphManager({
          container,
          width: container.clientWidth || window.innerWidth,
          height: container.clientHeight || window.innerHeight,
        });

        // 5. 初始化图
        const treeData = convertToTreeData(enriched);
        graphManagerRef.current.initialize(treeData);

        // 6. 创建事件处理器
        eventHandlerRef.current = new EventHandler({
          graphManager: graphManagerRef.current,
          container,
          onNavigate: (data) => {
            if (data.mdPath) {
              navigate(`/knowledge/${data.mdPath.replace('.md', '')}`, {
                state: {
                  label: data.label,
                  mdPath: data.mdPath,
                  description: data.description,
                  url: data.url,
                },
              });
            } else if (data.url) {
              window.open(data.url, '_blank');
            }
          },
        });

        // 7. 绑定事件
        eventHandlerRef.current.bindAll();

        // 8. 初始定位：直接聚焦根节点，不使用动画
        setTimeout(() => {
          if (destroyed || !graphManagerRef.current) return;
          
          // 直接定位到根节点，不使用动画
          const graph = graphManagerRef.current!.getGraph();
          if (graph) {
            const rootNode = graph.findById(treeData.id);
            if (rootNode) {
              // 先将根节点移到中心
              graph.focusItem(rootNode, false);
              // 设置初始缩放比例
              graph.zoomTo(1.0, { x: graph.get('width') / 2, y: graph.get('height') / 2 });
            }
          }
        }, 100);

        setLoading(false);
      } catch (err) {
        console.error('[RoadmapGraph] 初始化失败:', err);
        setLoading(false);
      }
    };

    init();

    // ── 窗口大小调整处理 ──
    const handleResize = () => {
      if (!containerRef.current || !graphManagerRef.current) return;
      graphManagerRef.current.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight || window.innerHeight
      );
      graphManagerRef.current.fitView(15);
    };
    window.addEventListener('resize', handleResize);

    // ── 清理函数 ──
    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleResize);

      // 销毁事件处理器
      if (eventHandlerRef.current) {
        eventHandlerRef.current.destroy();
        eventHandlerRef.current = null;
      }

      // 销毁图管理器
      if (graphManagerRef.current) {
        graphManagerRef.current.destroy();
        graphManagerRef.current = null;
      }
    };
  }, [navigate, onNodeClick]);

  // ───────────────────────────────────────────────────────────────────────────
  // 配置变化监听 - 刷新图
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // 当配置变化时，刷新图
    if (graphManagerRef.current && !loading) {
      console.log('[RoadmapGraph] 配置变化，刷新图', { colors, layout });
      graphManagerRef.current.refresh();
    }
    // 使用序列化后的字符串作为依赖，确保能检测到对象内部的变化
  }, [colorsJson, layoutJson, loading]);

  // ───────────────────────────────────────────────────────────────────────────
  // 工具栏操作方法
  // ───────────────────────────────────────────────────────────────────────────

  /** 适应视口 */
  const fitView = useCallback(() => {
    graphManagerRef.current?.fitView(15);
  }, []);

  /** 放大 */
  const zoomIn = useCallback(() => {
    graphManagerRef.current?.zoomIn();
  }, []);

  /** 缩小 */
  const zoomOut = useCallback(() => {
    graphManagerRef.current?.zoomOut();
  }, []);

  /** 重置缩放 */
  const resetZoom = useCallback(() => {
    graphManagerRef.current?.resetZoom();
  }, []);

  /** 聚焦到指定节点 */
  const focusNode = useCallback((nodeId: string) => {
    eventHandlerRef.current?.focusNode(nodeId);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 导出功能
  // ───────────────────────────────────────────────────────────────────────────

  /** 导出为 JPG */
  const handleExportJPG = useCallback(() => {
    const graph = graphManagerRef.current?.getGraph();
    if (graph) {
      exportToJPG(graph, 'Go学习路线图');
    }
  }, []);

  /** 导出为 PDF */
  const handleExportPDF = useCallback(() => {
    const graph = graphManagerRef.current?.getGraph();
    if (graph) {
      exportToPDF(graph, 'Go学习路线图');
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 渲染
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="graph-container">
      {/* 左侧配置栏 */}
      <ConfigPanel
        rawData={rawData}
        onFocusNode={focusNode}
        onFitView={fitView}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onExportJPG={handleExportJPG}
        onExportPDF={handleExportPDF}
      />

      {/* 右侧画布区域（全屏） */}
      <div className="graph-stage">
        {/* 加载状态 */}
        {loading && (
          <div className="graph-loading">
            <div className="loading-spinner-small"></div>
            <span>正在加载数据...</span>
          </div>
        )}

        {/* G6 画布容器 */}
        <div ref={containerRef} className="graph-canvas" />
      </div>
    </div>
  );
};

export default RoadmapGraph;
