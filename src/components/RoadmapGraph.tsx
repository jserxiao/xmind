/**
 * RoadmapGraph - 学习思维导图组件
 *
 * 主要功能：
 * 1. 展示树形结构的知识点思维导图
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
import { message, Modal } from 'antd';
import { useConfigStore } from '../store/configStore';
import { useNodeEditorStore } from '../store/nodeEditorStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useHistoryStore } from '../store/historyStore';
import { useUndoRedoShortcuts } from '../hooks/useKeyboardShortcuts';
import type { RoadmapNode } from '../data/roadmapData';
import { loadRoadmapData, enrichWithSubNodes } from '../data/roadmapData';
import type { NodeModel } from '../core/GraphManager';
import { GraphManager } from '../core/GraphManager';
import { NodeRenderer } from '../core/NodeRenderer';
import { EventHandler } from '../core/EventHandler';
import { exportToJPG, exportToPDF } from '../utils/exportMindmap';
import ConfigPanel from './ConfigPanel';
import ContextMenu from './ContextMenu';
import NodeEditorPanel from './NodeEditorPanel';
import SubNodePreviewPanel from './SubNodePreviewPanel';
import {
  findNodeInTree,
  addChildNode,
  updateNodeInTree,
  deleteNodeFromTree,
  createNodeFromFormData,
  updateIndexJson,
  saveMdFile,
  findAncestorMdPath,
  addSectionToMdFile,
  batchDeleteNodes,
  findNodesByIds,
  collectMdPathsFromNode,
  deleteMdFile,
  readMdFile,
  reorderNodeChildren,
} from '../utils/nodeUtils';
import type { DeletedFileInfo } from '../store/historyStore';

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
  
  // ── 数据引用（用于事件回调中获取最新数据） ──
  const rawDataRef = useRef<RoadmapNode | null>(null);

  // ── 右键菜单状态 ──
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: RoadmapNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  // ── 子节点预览状态 ──
  const [previewPanel, setPreviewPanel] = useState<{
    visible: boolean;
    nodeLabel: string;
    mdPath: string | null;
    sectionTitle: string;
    autoFullscreen: boolean;
  }>({ visible: false, nodeLabel: '', mdPath: null, sectionTitle: '', autoFullscreen: false });

  // ── 路由导航 ──
  const navigate = useNavigate();

  // ── Store 状态 ──
  // 获取配置状态用于监听变化
  // 使用 getCurrentConfig 获取当前思维导图的配置
  const getCurrentConfig = useConfigStore((state) => state.getCurrentConfig);
  const currentConfig = getCurrentConfig();
  
  // 节点编辑器 Store
  const { isOpen: isEditorOpen, mode: editorMode, parentNodeId, editingNode, formData, subNodeMdPath } = useNodeEditorStore();
  const openAddPanel = useNodeEditorStore((state) => state.openAddPanel);
  const openEditPanel = useNodeEditorStore((state) => state.openEditPanel);
  const closePanel = useNodeEditorStore((state) => state.closePanel);
  
  // 思维导图 Store
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);
  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);
  const getFullMdPath = useRoadmapStore((state) => state.getFullMdPath);
  
  // 历史记录 Store
  const pushHistory = useHistoryStore((state) => state.pushHistory);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);
  
  // 将对象序列化以便监听内部变化
  const colorsJson = JSON.stringify(currentConfig.colors);
  const layoutJson = JSON.stringify(currentConfig.layout);
  const nodeStylesJson = JSON.stringify(currentConfig.nodeStyles);
  const textStylesJson = JSON.stringify(currentConfig.textStyles);
  
  // 提取常用配置
  const colors = currentConfig.colors;
  const layout = currentConfig.layout;
  const nodeStyles = currentConfig.nodeStyles;
  const textStyles = currentConfig.textStyles;

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
        // 检查是否有有效的路径
        const mdBasePath = getMdBasePath();
        if (!mdBasePath) {
          setLoading(false);
          return;
        }
        
        // 1. 加载数据（使用当前思维导图路径）
        const roadmapPath = mdBasePath.split('/').pop() || '';
        const root = await loadRoadmapData(roadmapPath);
        if (destroyed) return;

        // 2. 丰富数据（添加子节点）
        const enriched = await enrichWithSubNodes(root, roadmapPath);
        if (destroyed) return;

        // 保存原始数据供面板使用
        setRawData(enriched);
        rawDataRef.current = enriched;

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
          onContextMenu: (data) => {
            // 查找节点数据（使用 ref 获取最新数据）
            const currentData = rawDataRef.current;
            const node = currentData ? findNodeInTree(currentData, data.nodeId) : null;
            setContextMenu({
              visible: true,
              x: data.x,
              y: data.y,
              node,
            });
          },
          onDoubleClickPreview: (data) => {
            // 双击预览：打开预览面板并自动进入全屏
            const currentData = rawDataRef.current;
            if (!currentData) return;
            
            const node = findNodeInTree(currentData, data.nodeId);
            if (node) {
              const isSubNode = node.type === 'sub';
              if (isSubNode) {
                const mdPath = findAncestorMdPath(node.id, currentData);
                // 使用 store 方法获取完整路径
                const fullMdPath = mdPath ? getFullMdPath(mdPath) : null;
                setPreviewPanel({
                  visible: true,
                  nodeLabel: node.label,
                  mdPath: fullMdPath,
                  sectionTitle: node.label,
                  autoFullscreen: true,
                });
              } else if (node.mdPath) {
                // 使用 store 方法获取完整路径
                const fullMdPath = getFullMdPath(node.mdPath);
                setPreviewPanel({
                  visible: true,
                  nodeLabel: node.label,
                  mdPath: fullMdPath,
                  sectionTitle: '',
                  autoFullscreen: true,
                });
              }
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
  }, [navigate, onNodeClick, currentRoadmapId, getMdBasePath]);

  // ───────────────────────────────────────────────────────────────────────────
  // 配置变化监听 - 刷新图
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // 当配置变化或切换思维导图时，刷新图
    if (graphManagerRef.current && !loading) {
      console.log('[RoadmapGraph] 配置变化或切换思维导图，刷新图', { colors, layout, nodeStyles, textStyles, currentRoadmapId });
      graphManagerRef.current.refresh();
    }
    // 使用序列化后的字符串作为依赖，确保能检测到对象内部的变化
  }, [colorsJson, layoutJson, nodeStylesJson, textStylesJson, loading, currentRoadmapId]);

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
      exportToJPG(graph, 'Go学习思维导图');
    }
  }, []);

  /** 导出为 PDF */
  const handleExportPDF = useCallback(() => {
    const graph = graphManagerRef.current?.getGraph();
    if (graph) {
      exportToPDF(graph, 'Go学习思维导图');
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 右键菜单操作
  // ───────────────────────────────────────────────────────────────────────────

  /** 添加子节点 */
  const handleAddChild = useCallback(() => {
    if (!contextMenu.node) return;
    openAddPanel(contextMenu.node.id, contextMenu.node);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, openAddPanel]);

  /** 编辑节点 */
  const handleEditNode = useCallback(() => {
    if (!contextMenu.node || !rawData) return;
    
    const node = contextMenu.node;
    
    // 如果是 sub 节点，需要查找父节点的 mdPath
    if (node.type === 'sub') {
      const mdPath = findAncestorMdPath(node.id, rawData);
      openEditPanel(node, mdPath || undefined);
    } else {
      openEditPanel(node);
    }
    
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, rawData, openEditPanel]);

  /** 删除节点 */
  const handleDeleteNode = useCallback(() => {
    if (!contextMenu.node || !rawData) return;
    
    const nodeLabel = contextMenu.node.label;
    const hasChildren = contextMenu.node.children && contextMenu.node.children.length > 0;
    
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除节点「<strong>{nodeLabel}</strong>」吗？</p>
          {hasChildren && (
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              ⚠️ 此操作将同时删除该节点的所有子节点（共 {contextMenu.node.children?.length} 个）。
            </p>
          )}
          <p style={{ color: '#999', marginTop: 8, fontSize: 12 }}>可通过 Ctrl+Z 撤销此操作</p>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const hideLoading = message.loading('正在删除节点...', 0);
        
        try {
          const mdBasePath = getMdBasePath();
          const roadmapPath = mdBasePath.split('/').pop() || '';
          
          // 1. 收集要删除的 MD 文件路径
          const mdPathsToDelete = collectMdPathsFromNode(contextMenu.node!);
          
          // 2. 读取并保存 MD 文件内容（用于撤销时恢复）
          const deletedFiles: DeletedFileInfo[] = [];
          for (const mdPath of mdPathsToDelete) {
            const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
            if (readResult.success && readResult.content) {
              deletedFiles.push({
                path: `${mdPath}.md`,
                content: readResult.content,
              });
            }
          }
          
          // 3. 记录历史（包含被删除的文件信息）
          pushHistory(rawData, `删除节点「${nodeLabel}」`, deletedFiles);
          
          // 4. 删除 MD 文件
          for (const mdPath of mdPathsToDelete) {
            await deleteMdFile(mdPath, roadmapPath);
          }
          
          // 5. 执行删除节点
          const newTree = deleteNodeFromTree(rawData, contextMenu.node!.id);
          setRawData(newTree);
          rawDataRef.current = newTree;
          
          // 更新画布
          const treeData = convertToTreeData(newTree);
          graphManagerRef.current?.setData(treeData);
          
          // 更新 index.json
          const result = await updateIndexJson(roadmapPath, newTree);
          
          hideLoading();
          
          if (result.success) {
            message.success(`节点「${nodeLabel}」已删除（可撤销）`);
          } else {
            message.error(result.message);
          }
        } catch (error) {
          hideLoading();
          message.error('删除节点失败');
        }
      },
    });
    
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.node, rawData, getMdBasePath, pushHistory]);

  /** 关闭右键菜单 */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  /**
   * 内部函数：打开预览面板
   */
  const openPreviewPanel = useCallback((node: RoadmapNode) => {
    if (!rawData) return;
    
    const isSubNode = node.type === 'sub';
    
    if (isSubNode) {
      // sub 节点：查找祖先节点的 mdPath
      const mdPath = findAncestorMdPath(node.id, rawData);
      // 使用 store 方法获取完整路径
      const fullMdPath = mdPath ? getFullMdPath(mdPath) : null;
      setPreviewPanel({
        visible: true,
        nodeLabel: node.label,
        mdPath: fullMdPath,
        sectionTitle: node.label,
        autoFullscreen: false,
      });
    } else if (node.mdPath) {
      // 有 mdPath 的节点（leaf/link）：直接预览整个文件
      const fullMdPath = getFullMdPath(node.mdPath);
      setPreviewPanel({
        visible: true,
        nodeLabel: node.label,
        mdPath: fullMdPath,
        sectionTitle: '', // 空字符串表示预览整个文件
        autoFullscreen: false,
      });
    }
    
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [rawData, getFullMdPath]);

  /** 从右键菜单预览 sub 节点内容 */
  const handlePreviewSubNode = useCallback(() => {
    const node = contextMenu.node;
    if (node) {
      openPreviewPanel(node);
    }
  }, [contextMenu.node, openPreviewPanel]);

  /** 从导航栏预览 sub 节点内容 */
  const handlePreviewSubNodeFromNav = useCallback((node: RoadmapNode) => {
    openPreviewPanel(node);
  }, [openPreviewPanel]);

  /** 关闭预览面板 */
  const handleClosePreview = useCallback(() => {
    setPreviewPanel((prev) => ({ ...prev, visible: false }));
  }, []);

  /** 全屏退出后重新调整画布 */
  const handleExitFullscreen = useCallback(() => {
    // 重新调整画布大小并适应视口
    if (containerRef.current && graphManagerRef.current) {
      graphManagerRef.current.resize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight || window.innerHeight
      );
      graphManagerRef.current.fitView(15);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 节点保存操作
  // ───────────────────────────────────────────────────────────────────────────

  /** 保存节点（添加或编辑） */
  const handleSaveNode = useCallback(async () => {
    if (!rawData) return;

    let newNodeId: string | null = null;
    const hideLoading = message.loading('正在保存...', 0);

    try {
      if (editorMode === 'add' && parentNodeId) {
        // 记录历史
        pushHistory(rawData, `添加节点「${formData.label}」`);
        
        // 添加新节点
        const newNode = createNodeFromFormData(formData, parentNodeId);
        newNodeId = newNode.id;
        const newTree = addChildNode(rawData, parentNodeId, newNode);
        setRawData(newTree);
        rawDataRef.current = newTree;
        
        // 更新画布
        const treeData = convertToTreeData(newTree);
        graphManagerRef.current?.setData(treeData);
        
        // 处理 MD 文件同步
        if (formData.type === 'sub') {
          // sub 类型节点：在父节点的 MD 文件中添加新章节
          const parentNode = findNodeInTree(rawData, parentNodeId);
          const parentMdPath = parentNode?.mdPath;
          
          if (parentMdPath) {
            // 在 MD 文件中添加新章节
            const sectionResult = await addSectionToMdFile(
              parentMdPath,
              formData.label,
              formData.mdContent || undefined,
              getMdBasePath()
            );
            if (!sectionResult.success) {
              message.warning(sectionResult.message);
            }
          } else {
            // 父节点没有 mdPath，尝试向上查找祖先节点
            const ancestorMdPath = findAncestorMdPath(parentNodeId, rawData);
            if (ancestorMdPath) {
              const sectionResult = await addSectionToMdFile(
                ancestorMdPath,
                formData.label,
                formData.mdContent || undefined,
                getMdBasePath()
              );
              if (!sectionResult.success) {
                message.warning(sectionResult.message);
              }
            }
          }
        } else if (formData.mdContent && formData.mdPath) {
          // 非 sub 节点，有 MD 内容：保存 MD 文件（需要添加完整路径）
          const fullMdPath = getFullMdPath(formData.mdPath);
          const mdResult = await saveMdFile(fullMdPath, formData.mdContent);
          if (!mdResult.success) {
            message.warning(mdResult.message);
          }
        } else if (formData.mdPath) {
          // 非 sub 节点，没有内容但有路径：创建默认模板
          const fullMdPath = getFullMdPath(formData.mdPath);
          const template = `# ${formData.label}\n\n${formData.description ? `> ${formData.description}` : ''}\n\n## 概述\n\n<!-- 在这里编写内容 -->\n`;
          await saveMdFile(fullMdPath, template);
        }
        
        // 更新 index.json
        const mdBasePath = getMdBasePath();
        const roadmapPath = mdBasePath.split('/').pop() || '';
        const result = await updateIndexJson(roadmapPath, newTree);
        
        hideLoading();
        
        if (result.success) {
          message.success(`节点「${formData.label}」已添加`);
        } else {
          message.error(result.message);
        }
      } else if (editorMode === 'edit' && editingNode) {
        // 记录历史
        pushHistory(rawData, `编辑节点「${formData.label}」`);
        
        // 编辑现有节点
        newNodeId = editingNode.id;
        const isSubNode = editingNode.type === 'sub';
        
        const updates: Partial<RoadmapNode> = {
          label: formData.label,
          type: formData.type,
          description: formData.description || undefined,
        };
        
        if (formData.type !== 'link' && formData.mdPath && !isSubNode) {
          updates.mdPath = formData.mdPath;
        }
        if (formData.type === 'link' && formData.url) {
          updates.url = formData.url;
        }
        
        const newTree = updateNodeInTree(rawData, editingNode.id, updates);
        setRawData(newTree);
        rawDataRef.current = newTree;
        
        // 更新画布
        const treeData = convertToTreeData(newTree);
        graphManagerRef.current?.setData(treeData);
        
        // 处理 MD 内容保存
        if (isSubNode && formData.mdPath && subNodeMdPath) {
          // sub 节点：只更新对应章节的内容
          const { saveSubNodeSection } = await import('../utils/nodeUtils');
          const oldTitle = editingNode.label;
          const newTitle = formData.label;
          const titleChanged = oldTitle !== newTitle;
          
          if (titleChanged) {
            // 标题改变，需要更新 MD 文件中的章节标题
            const mdResult = await saveSubNodeSection(formData.mdPath, newTitle, formData.mdContent, true, oldTitle, getMdBasePath());
            if (!mdResult.success) {
              message.warning(mdResult.message);
            }
          } else {
            // 只更新内容
            const mdResult = await saveSubNodeSection(formData.mdPath, formData.sectionTitle, formData.mdContent, false, undefined, getMdBasePath());
            if (!mdResult.success) {
              message.warning(mdResult.message);
            }
          }
        } else if (formData.mdContent && formData.mdPath) {
          // 非 sub 节点：保存整个 MD 文件（需要添加完整路径）
          const fullMdPath = getFullMdPath(formData.mdPath);
          const mdResult = await saveMdFile(fullMdPath, formData.mdContent);
          if (!mdResult.success) {
            message.warning(mdResult.message);
          }
        }
        
        // 更新 index.json
        const mdBasePath = getMdBasePath();
        const roadmapPath = mdBasePath.split('/').pop() || '';
        const result = await updateIndexJson(roadmapPath, newTree);
        
        hideLoading();
        
        if (result.success) {
          message.success(`节点「${formData.label}」已更新`);
        } else {
          message.error(result.message);
        }
      }
    } catch (error) {
      hideLoading();
      message.error('保存失败，请重试');
    }
    
    closePanel();
    
    // 跳转到新节点/修改的节点
    if (newNodeId) {
      setTimeout(() => {
        eventHandlerRef.current?.focusNode(newNodeId!);
      }, 300);
    }
  }, [rawData, editorMode, parentNodeId, editingNode, formData, subNodeMdPath, closePanel, pushHistory]);

  /** 添加子节点（从导航面板） */
  const handleAddNodeFromNav = useCallback((parentId: string, parentNode: RoadmapNode | null) => {
    openAddPanel(parentId, parentNode);
  }, [openAddPanel]);

  /** 编辑节点（从导航面板） */
  const handleEditNodeFromNav = useCallback((node: RoadmapNode) => {
    if (!rawData) return;
    
    // 如果是 sub 节点，需要查找父节点的 mdPath
    if (node.type === 'sub') {
      const mdPath = findAncestorMdPath(node.id, rawData);
      openEditPanel(node, mdPath || undefined);
    } else {
      openEditPanel(node);
    }
  }, [rawData, openEditPanel]);

  // ───────────────────────────────────────────────────────────────────────────
  // 撤销/重做功能
  // ───────────────────────────────────────────────────────────────────────────

  /** 处理撤销操作 */
  const handleUndo = useCallback(async () => {
    if (!canUndo() || !rawData) return;
    
    const hideLoading = message.loading('正在撤销...', 0);
    
    try {
      const previousTree = await undo();
      
      if (previousTree) {
        setRawData(previousTree);
        rawDataRef.current = previousTree;
        
        // 更新画布
        const treeData = convertToTreeData(previousTree);
        graphManagerRef.current?.setData(treeData);
        
        hideLoading();
        message.success('已撤销操作');
      } else {
        hideLoading();
      }
    } catch (error) {
      hideLoading();
      message.error('撤销失败');
      console.error('[RoadmapGraph] 撤销失败:', error);
    }
  }, [canUndo, undo, rawData]);

  /** 处理重做操作 */
  const handleRedo = useCallback(async () => {
    if (!canRedo() || !rawData) return;
    
    const hideLoading = message.loading('正在重做...', 0);
    
    try {
      const nextTree = await redo();
      
      if (nextTree) {
        setRawData(nextTree);
        rawDataRef.current = nextTree;
        
        // 更新画布
        const treeData = convertToTreeData(nextTree);
        graphManagerRef.current?.setData(treeData);
        
        hideLoading();
        message.success('已重做操作');
      } else {
        hideLoading();
      }
    } catch (error) {
      hideLoading();
      message.error('重做失败');
      console.error('[RoadmapGraph] 重做失败:', error);
    }
  }, [canRedo, redo, rawData]);

  // 绑定撤销/重做快捷键
  useUndoRedoShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    enabled: !isEditorOpen, // 编辑面板打开时不触发
  });

  /** 删除节点（从导航面板） */
  const handleDeleteNodeFromNav = useCallback(async (node: RoadmapNode) => {
    if (!rawData || node.type === 'root') return;
    
    const nodeLabel = node.label;
    const hasChildren = node.children && node.children.length > 0;
    
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除节点「<strong>{nodeLabel}</strong>」吗？</p>
          {hasChildren && (
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              ⚠️ 此操作将同时删除该节点的所有子节点（共 {node.children?.length} 个）。
            </p>
          )}
          <p style={{ color: '#999', marginTop: 8, fontSize: 12 }}>可通过 Ctrl+Z 撤销此操作</p>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const hideLoading = message.loading('正在删除节点...', 0);
        
        try {
          const mdBasePath = getMdBasePath();
          const roadmapPath = mdBasePath.split('/').pop() || '';
          
          // 1. 收集要删除的 MD 文件路径
          const mdPathsToDelete = collectMdPathsFromNode(node);
          
          // 2. 读取并保存 MD 文件内容（用于撤销时恢复）
          const deletedFiles: DeletedFileInfo[] = [];
          for (const mdPath of mdPathsToDelete) {
            const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
            if (readResult.success && readResult.content) {
              deletedFiles.push({
                path: `${mdPath}.md`,
                content: readResult.content,
              });
            }
          }
          
          // 3. 记录历史（包含被删除的文件信息）
          pushHistory(rawData, `删除节点「${nodeLabel}」`, deletedFiles);
          
          // 4. 删除 MD 文件
          for (const mdPath of mdPathsToDelete) {
            await deleteMdFile(mdPath, roadmapPath);
          }
          
          // 5. 执行删除节点
          const newTree = deleteNodeFromTree(rawData, node.id);
          setRawData(newTree);
          rawDataRef.current = newTree;
          
          // 更新画布
          const treeData = convertToTreeData(newTree);
          graphManagerRef.current?.setData(treeData);
          
          // 更新 index.json
          const result = await updateIndexJson(roadmapPath, newTree);
          
          hideLoading();
          
          if (result.success) {
            message.success(`节点「${nodeLabel}」已删除（可撤销）`);
          } else {
            message.error(result.message);
          }
        } catch (error) {
          hideLoading();
          message.error('删除节点失败');
        }
      },
    });
  }, [rawData, getMdBasePath, pushHistory]);

  /** 批量删除节点 */
  const handleBatchDeleteNodes = useCallback(async (nodeIds: string[]) => {
    if (!rawData || nodeIds.length === 0) return;
    
    const hideLoading = message.loading(`正在删除 ${nodeIds.length} 个节点...`, 0);
    
    try {
      const mdBasePath = getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';
      
      // 1. 找到所有要删除的节点
      const nodesToDelete = findNodesByIds(rawData, nodeIds);
      
      // 2. 收集所有要删除的 MD 文件路径
      const mdPathsToDelete: string[] = [];
      for (const node of nodesToDelete) {
        const mdPaths = collectMdPathsFromNode(node);
        mdPathsToDelete.push(...mdPaths);
      }
      
      // 3. 读取并保存 MD 文件内容（用于撤销时恢复）
      const deletedFiles: DeletedFileInfo[] = [];
      for (const mdPath of mdPathsToDelete) {
        const readResult = await readMdFile(`${mdBasePath}/${mdPath}`);
        if (readResult.success && readResult.content) {
          deletedFiles.push({
            path: `${mdPath}.md`,
            content: readResult.content,
          });
        }
      }
      
      // 4. 记录历史（包含被删除的文件信息）
      pushHistory(rawData, `批量删除 ${nodeIds.length} 个节点`, deletedFiles);
      
      // 5. 删除 MD 文件
      for (const mdPath of mdPathsToDelete) {
        await deleteMdFile(mdPath, roadmapPath);
      }
      
      // 6. 批量删除节点
      const newTree = batchDeleteNodes(rawData, nodeIds);
      setRawData(newTree);
      rawDataRef.current = newTree;
      
      // 更新画布
      const treeData = convertToTreeData(newTree);
      graphManagerRef.current?.setData(treeData);
      
      // 更新 index.json
      const result = await updateIndexJson(roadmapPath, newTree);
      
      hideLoading();
      
      if (result.success) {
        message.success(`成功删除 ${nodeIds.length} 个节点（可撤销）`);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      hideLoading();
      message.error('批量删除失败');
      console.error('批量删除失败:', error);
    }
  }, [rawData, getMdBasePath, pushHistory]);

  /** 节点排序 */
  const handleReorderNodes = useCallback(async (parentId: string, newChildren: RoadmapNode[]) => {
    if (!rawData) return;
    
    const hideLoading = message.loading('正在保存排序...', 0);
    
    try {
      // 记录历史
      pushHistory(rawData, '节点排序');
      
      // 执行排序
      const newTree = reorderNodeChildren(rawData, parentId, newChildren);
      setRawData(newTree);
      rawDataRef.current = newTree;
      
      // 更新画布
      const treeData = convertToTreeData(newTree);
      graphManagerRef.current?.setData(treeData);
      
      // 更新 index.json
      const mdBasePath = getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';
      const result = await updateIndexJson(roadmapPath, newTree);
      
      hideLoading();
      
      if (result.success) {
        message.success('排序已保存（可撤销）');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      hideLoading();
      message.error('排序保存失败');
      console.error('排序保存失败:', error);
    }
  }, [rawData, getMdBasePath, pushHistory]);

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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onAddNode={handleAddNodeFromNav}
        onEditNode={handleEditNodeFromNav}
        onDeleteNode={handleDeleteNodeFromNav}
        onPreviewSubNode={handlePreviewSubNodeFromNav}
        onBatchDeleteNodes={handleBatchDeleteNodes}
        onReorderNodes={handleReorderNodes}
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

      {/* 右键菜单 */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        node={contextMenu.node}
        visible={contextMenu.visible}
        onAddChild={handleAddChild}
        onEdit={handleEditNode}
        onDelete={handleDeleteNode}
        onPreview={handlePreviewSubNode}
        onClose={handleCloseContextMenu}
      />

      {/* 节点编辑面板 */}
      {isEditorOpen && <NodeEditorPanel onSave={handleSaveNode} />}

      {/* 子节点预览面板 */}
      <SubNodePreviewPanel
        isOpen={previewPanel.visible}
        nodeLabel={previewPanel.nodeLabel}
        mdPath={previewPanel.mdPath}
        sectionTitle={previewPanel.sectionTitle}
        autoFullscreen={previewPanel.autoFullscreen}
        onClose={handleClosePreview}
        onExitFullscreen={handleExitFullscreen}
      />
    </div>
  );
};

export default RoadmapGraph;
