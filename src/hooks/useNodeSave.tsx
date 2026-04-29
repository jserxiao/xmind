/**
 * useNodeSave — 节点 CRUD 操作 Hook
 *
 * 职责：封装所有修改节点树的操作，统一处理「内存状态 → 画布 → 文件系统」三步同步。
 *
 * 通用 CRUD 流程：
 *   1. pushHistory(旧树) — 必须先记录历史，确保撤销能恢复到操作前的完整状态
 *   2. 修改内存中的节点树（add/update/delete/reorder）
 *   3. refreshGraphAndIndex — 同步到 G6 画布 + 写 index.json
 *
 * Sub 节点特殊处理：
 *   sub 节点不存在于 index.json 中，而是作为 MD 文件中的 ## 标题动态生成。
 *   因此添加 sub 节点 = 在 MD 文件中追加章节 → 重新加载整个树，
 *   编辑 sub 节点 = 修改 MD 章节标题/内容 → 同步书签中的旧 ID。
 *
 * 撤销安全性：
 *   executeNodeDelete / executeBatchNodeDelete 返回被删除的 MD 文件内容，
 *   存入 historyStore，撤销时将这些文件写回磁盘。
 */

import { useCallback } from 'react';
import { message, Modal } from 'antd';
import { useNodeEditorStore } from '../store/nodeEditorStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useHistoryStore } from '../store/historyStore';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useConnectionStore } from '../store/connectionStore';
import type { RoadmapNode } from '../data/roadmapData';
import { loadRoadmapData, enrichWithSubNodes } from '../data/roadmapData';
import type { GraphManager } from '../core/GraphManager';
import type { EventHandler } from '../core/EventHandler';
import { convertToTreeData, generateSubNodeId } from '../utils/treeDataUtils';
import {
  findNodeInTree,
  addChildNode,
  updateNodeInTree,
  createNodeFromFormData,
  updateIndexJson,
  saveMdFile,
  findAncestorMdPath,
  findParentWithMdPath,
  addSectionToMdFile,
  executeNodeDelete,
  executeBatchNodeDelete,
  reorderNodeChildren,
  saveSubNodeSection,
  type ConnectionData,
  type BookmarkData,
} from '../utils/nodeUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface UseNodeSaveOptions {
  /** 当前节点树（state 版本，驱动渲染） */
  rawData: RoadmapNode | null;
  /** 节点树的 ref 版本，供事件回调中读取最新值 */
  rawDataRef: React.MutableRefObject<RoadmapNode | null>;
  /** G6 图管理器 ref */
  graphManagerRef: React.MutableRefObject<GraphManager | null>;
  /** 事件处理器 ref（用于操作完成后聚焦节点） */
  eventHandlerRef: React.MutableRefObject<EventHandler | null>;
  /** 当前书签 ID 集合 ref */
  bookmarkIdsRef: React.MutableRefObject<Set<string>>;
  /** 更新节点树状态 */
  setRawData: (data: RoadmapNode | null) => void;
}

interface UseNodeSaveReturn {
  handleSaveNode: () => Promise<void>;
  performNodeDeletion: (node: RoadmapNode, currentData: RoadmapNode) => void;
  handleAIApply: (generatedNodes: GeneratedNode[], targetNode: RoadmapNode) => Promise<void>;
  handleBatchDeleteNodes: (nodeIds: string[]) => Promise<void>;
  handleReorderNodes: (parentId: string, newChildren: RoadmapNode[]) => Promise<void>;
}

/** AI 服务返回的生成节点 */
interface GeneratedNode {
  id?: string;
  label: string;
  type?: 'branch' | 'leaf';
  description?: string;
  mdPath?: string;
  /** MD 插入位置：new=新建文件，parent=插入父级 MD，none=不需要 MD */
  mdInsertPosition?: 'new' | 'parent' | 'none';
  /** 当 mdInsertPosition 为 parent 时，建议插入的位置 */
  mdInsertAfter?: string;
  /** MD 章节内容（仅当 mdInsertPosition 为 parent 时使用） */
  mdContent?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

export function useNodeSave({
  rawData,
  rawDataRef,
  graphManagerRef,
  eventHandlerRef,
  bookmarkIdsRef,
  setRawData,
}: UseNodeSaveOptions): UseNodeSaveReturn {

  // ── Store 选择器 ──

  const {
    isOpen: _editorOpen,
    mode: editorMode,
    parentNodeId,
    editingNode,
    formData,
    subNodeMdPath,
  } = useNodeEditorStore();
  const closePanel = useNodeEditorStore((state) => state.closePanel);

  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);
  const getFullMdPath = useRoadmapStore((state) => state.getFullMdPath);

  const pushHistory = useHistoryStore((state) => state.pushHistory);
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);
  const updateBookmarkNodeId = useBookmarkStore((state) => state.updateBookmarkNodeId);
  const getBookmarks = useBookmarkStore((state) => state.getBookmarks);
  const getConnections = useConnectionStore((state) => state.getConnections);
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 辅助函数：记录历史（包含连线、书签、节点树）
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
  * 记录操作历史（包含完整状态）
  * @param tree 节点树
  * @param description 操作描述
  * @param deletedFiles 被删除的文件列表
  */
  const recordHistory = useCallback((
    tree: RoadmapNode,
    description: string,
    deletedFiles?: Array<{ path: string; content: string }>
  ) => {
    const roadmapPath = getMdBasePath().split('/').pop() || '';
    const currentConnections = getConnections(roadmapPath);
    const currentBookmarks = getBookmarks();
    
    pushHistory(
      tree,
      description,
      deletedFiles,
      currentConnections,
      currentBookmarks,
      roadmapPath
    );
  }, [pushHistory, getMdBasePath, getConnections, getBookmarks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 内部辅助：同步内存状态 → G6 画布 → index.json
  // ═══════════════════════════════════════════════════════════════════════════════
  // 这是所有变更操作的最终收敛点。
  // 调用顺序：setRawData 更新 React 状态 → setData 刷新 G6 画布 → writeFile 持久化

  const refreshGraphAndIndex = useCallback(async (newTree: RoadmapNode) => {
    // 步骤 1：更新 React 状态 + ref（事件回调中读 ref）
    setRawData(newTree);
    rawDataRef.current = newTree;

    // 步骤 2：将新树转换为 G6 格式并推送到画布
    const treeData = convertToTreeData(newTree, bookmarkIdsRef.current);
    graphManagerRef.current?.setData(treeData);

    // 步骤 3：获取连线和书签数据并持久化到文件系统的 index.json
    const mdBasePath = getMdBasePath();
    const roadmapPath = mdBasePath.split('/').pop() || '';
    
    // 从 connectionStore 获取当前思维导图的连线数据
    const connections = useConnectionStore.getState().getConnections(roadmapPath);
    
    // 从 bookmarkStore 获取当前思维导图的书签数据
    const bookmarks = useBookmarkStore.getState().getBookmarks();
    
    return updateIndexJson(
      roadmapPath, 
      newTree, 
      connections as ConnectionData[],
      bookmarks as BookmarkData[]
    );
  }, [setRawData, rawDataRef, graphManagerRef, bookmarkIdsRef, getMdBasePath]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 删除节点
  // ═══════════════════════════════════════════════════════════════════════════════
  // 根据节点类型给出不同的警告：
  //   - sub 节点：警告会删除 MD 中的章节内容
  //   - 有子节点的非 sub：警告会递归删除所有后代
  // executeNodeDelete 返回 deletedFiles（被删除的文件路径+内容），
  // 存到 historyStore 以便撤销时恢复。

  const performNodeDeletion = useCallback((node: RoadmapNode, currentData: RoadmapNode) => {
    const nodeLabel = node.label;
    const isSubNode = node.type === 'sub';
    const hasChildren = node.children && node.children.length > 0;

    // 先将 JSX 赋值给变量，避免内联 JSX 在某些构建工具中产生解析问题
    const deletionWarning = (
      <div>
        <p>确定要删除节点 <strong>{nodeLabel}</strong> 吗？</p>
        {isSubNode && (
          <p style={{ color: '#faad14', marginTop: 8 }}>
            此操作将同时删除 MD 文件中对应的章节内容。
          </p>
        )}
        {hasChildren && (
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            此操作将同时删除该节点的所有子节点（共 {node.children?.length} 个）。
          </p>
        )}
        <p style={{ color: '#999', marginTop: 8, fontSize: 12 }}>可通过 Ctrl+Z 撤销此操作</p>
      </div>
    );

    Modal.confirm({
      title: '确认删除',
      content: deletionWarning,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const hideLoading = message.loading('正在删除节点...', 0);

        try {
          const mdBasePath = getMdBasePath();
          const roadmapPath = mdBasePath.split('/').pop() || '';

          // executeNodeDelete：从树中移除节点 + 删除关联的 MD 文件，
          // 返回新树和已删除文件的内容（用于撤销时恢复）
          const { newTree, deletedFiles } = await executeNodeDelete({
            node,
            rawData: currentData,
            mdBasePath,
            roadmapPath,
          });

          // 注意：recordHistory 必须在 refreshGraphAndIndex 之前，
          // 因为撤销需要知道操作前的状态（currentData）
          recordHistory(currentData, `删除节点「${nodeLabel}」`, deletedFiles);

          const result = await refreshGraphAndIndex(newTree);

          hideLoading();

          if (result.success) {
            message.success(`节点「${nodeLabel}」已删除（可撤销）`);
          } else {
            message.error(result.message);
          }
        } catch {
          hideLoading();
          message.error('删除节点失败');
        }
      },
    });
  }, [getMdBasePath, pushHistory, refreshGraphAndIndex, recordHistory, getConnections, getBookmarks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 保存节点（添加或编辑）
  // ═══════════════════════════════════════════════════════════════════════════════
  // 这是最复杂的操作，根据 editorMode 分两路：
  //
  // 【添加模式】(editorMode === 'add')
  //   普通节点：createNodeFromFormData → addChildNode → refreshGraphAndIndex → saveMdFile
  //   sub 节点：addSectionToMdFile(写入 MD 章节) → 重新 loadRoadmapData + enrich
  //            → refreshGraphAndIndex（因为 sub 节点由 MD 动态派生，需要重新加载）
  //
  // 【编辑模式】(editorMode === 'edit')
  //   普通节点：updateNodeInTree → refreshGraphAndIndex → saveMdFile
  //   sub 节点且标题改变：saveSubNodeSection(定位旧标题替换) →
  //                     更新书签中的节点 ID（因为 sub 节点的 ID 由标题派生）
  //   sub 节点仅内容改变：saveSubNodeSection(只更新内容不改变标题)
  //
  // 每次保存后：closePanel → setTimeout 300ms 后 focusNode 跳转到节点位置。
  // 300ms 的延迟确保 G6 画布已完成 setData 后的布局动画。

  const handleSaveNode = useCallback(async () => {
    if (!rawData) return;

    let newNodeId: string | null = null;
    const hideLoading = message.loading('正在保存...', 0);

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // 添加新节点
      // ═══════════════════════════════════════════════════════════════════════

      if (editorMode === 'add' && parentNodeId) {
        // 先记录历史（操作前的完整树），再执行变更
        recordHistory(rawData, `添加节点「${formData.label}」`);

        const newNode = createNodeFromFormData(formData, parentNodeId);
        newNodeId = newNode.id;

        // ── sub 节点：写入 MD 文件而非 index.json ──
        if (formData.type === 'sub') {
          // 查找目标 MD 文件：先检查父节点的 mdPath，再向上查找祖先节点
          const parentNode = findNodeInTree(rawData, parentNodeId);
          let targetMdPath = parentNode?.mdPath;

          if (!targetMdPath) {
            targetMdPath = findAncestorMdPath(parentNodeId, rawData) ?? undefined;
          }

          if (!targetMdPath) {
            hideLoading();
            message.warning('无法找到对应的 MD 文件，请确保父节点或祖先节点有关联的 MD 文件');
            return;
          }

          // 在 MD 文件中追加 ## 章节
          const sectionResult = await addSectionToMdFile(
            targetMdPath,
            formData.label,
            formData.mdContent || undefined,
            getMdBasePath()
          );

          if (!sectionResult.success) {
            hideLoading();
            message.warning(sectionResult.message);
            return;
          }

          // sub 节点由 MD 动态生成，需要重新加载整个树以获取正确的节点结构
          const mdBasePath = getMdBasePath();
          const roadmapPath = mdBasePath.split('/').pop() || '';
          const freshTree = await loadRoadmapData(roadmapPath);
          const enrichedTree = await enrichWithSubNodes(freshTree, roadmapPath);

          await refreshGraphAndIndex(enrichedTree);

          hideLoading();
          message.success(`节点「${formData.label}」已添加`);
          closePanel();

          // 聚焦到新生成的 sub 节点
          if (parentNode) {
            const newSubNodeId = generateSubNodeId(parentNode.id, formData.label);
            // setTimeout 300ms：等 G6 完成 setData + layout 后再执行 focus
            setTimeout(() => {
              eventHandlerRef.current?.focusNode(newSubNodeId);
            }, 300);
          }
          return;
        }

        // ── 非 sub 节点：正常添加到节点树 ──
        const newTree = addChildNode(rawData, parentNodeId, newNode);
        await refreshGraphAndIndex(newTree);

        // MD 文件同步：有内容则写入，有路径无内容则创建模板
        if (formData.mdContent && formData.mdPath) {
          const fullMdPath = getFullMdPath(formData.mdPath);
          const mdResult = await saveMdFile(fullMdPath, formData.mdContent);
          if (!mdResult.success) message.warning(mdResult.message);
        } else if (formData.mdPath) {
          // 创建默认 MD 模板：一级标题 + 描述引用 + 概述章节
          const fullMdPath = getFullMdPath(formData.mdPath);
          const template = `# ${formData.label}\n\n${formData.description ? `> ${formData.description}` : ''}\n\n## 概述\n\n<!-- 在这里编写内容 -->\n`;
          await saveMdFile(fullMdPath, template);
        }

        hideLoading();
        message.success(`节点「${formData.label}」已添加`);
        closePanel();

        if (newNodeId) {
          setTimeout(() => {
            eventHandlerRef.current?.focusNode(newNodeId!);
          }, 300);
        }
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 编辑现有节点
      // ═══════════════════════════════════════════════════════════════════════

      if (editorMode === 'edit' && editingNode) {
        // 先记录历史，再执行变更
        recordHistory(rawData, `编辑节点「${formData.label}」`);

        newNodeId = editingNode.id;
        const isSubNode = editingNode.type === 'sub';

        // 构建更新字段
        const updates: Partial<RoadmapNode> = {
          label: formData.label,
          type: formData.type,
          description: formData.description || undefined,
          customNodeId: formData.customNodeId,
          customFill: formData.customFill,
          customStroke: formData.customStroke,
        };

        // 非链接节点 + 有 mdPath → 允许更新 mdPath
        if (formData.type !== 'link' && formData.mdPath && !isSubNode) {
          updates.mdPath = formData.mdPath;
        }
        // 链接节点 + 有 url → 更新 url
        if (formData.type === 'link' && formData.url) {
          updates.url = formData.url;
        }

        const newTree = updateNodeInTree(rawData, editingNode.id, updates);
        await refreshGraphAndIndex(newTree);

        // ── sub 节点编辑：更新 MD 文件中的章节 ──
        if (isSubNode && formData.mdPath && subNodeMdPath) {
          const oldTitle = editingNode.label;
          const newTitle = formData.label;
          const titleChanged = oldTitle !== newTitle;

          if (titleChanged) {
            // 标题改变：用旧标题定位章节，替换为新标题 + 新内容
            const mdResult = await saveSubNodeSection(
              formData.mdPath, newTitle, formData.mdContent, true, oldTitle, getMdBasePath()
            );
            if (!mdResult.success) message.warning(mdResult.message);

            // sub 节点的 ID 由父节点 ID + 标题派生。
            // 标题改变后需要同步更新书签中存储的节点 ID，
            // 否则该书签会指向一个不再存在的旧 ID。
            if (hasBookmark(editingNode.id)) {
              const parentNode = findParentWithMdPath(editingNode.id, rawData);
              if (parentNode) {
                const newNodeIdForBookmark = generateSubNodeId(parentNode.id, newTitle);
                updateBookmarkNodeId(editingNode.id, newNodeIdForBookmark, newTitle);
              }
            }
          } else {
            // 仅内容改变：直接保存内容，不改动标题
            const mdResult = await saveSubNodeSection(
              formData.mdPath, formData.sectionTitle, formData.mdContent, false, undefined, getMdBasePath()
            );
            if (!mdResult.success) message.warning(mdResult.message);
          }
        } else if (formData.mdContent && formData.mdPath) {
          // 非 sub 节点：直接写整个 MD 文件
          const fullMdPath = getFullMdPath(formData.mdPath);
          const mdResult = await saveMdFile(fullMdPath, formData.mdContent);
          if (!mdResult.success) message.warning(mdResult.message);
        }

        hideLoading();
        message.success(`节点「${formData.label}」已更新`);
      }
    } catch {
      hideLoading();
      message.error('保存失败，请重试');
    }

    closePanel();

    // 操作完成后自动聚焦到目标节点
    if (newNodeId) {
      setTimeout(() => {
        eventHandlerRef.current?.focusNode(newNodeId!);
      }, 300);
    }
  }, [
    rawData, editorMode, parentNodeId, editingNode, formData, subNodeMdPath,
    closePanel, pushHistory, getMdBasePath, getFullMdPath,
    hasBookmark, updateBookmarkNodeId, refreshGraphAndIndex, eventHandlerRef,
    recordHistory, getConnections, getBookmarks,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // AI 生成节点应用
  // ═══════════════════════════════════════════════════════════════════════════════
  // 将 AI 返回的 GeneratedNode[] 逐个添加到目标节点下。
  // AI 生成的节点 ID 使用 ai-{timestamp}-{random} 格式，确保全局唯一且不与现有节点冲突。
  // 
  // MD 文件处理逻辑：
  // - mdInsertPosition = 'new': 为节点创建新的 MD 文件
  // - mdInsertPosition = 'parent': 在父节点的 MD 文件中添加章节
  // - mdInsertPosition = 'none': 不创建 MD 文件

  const handleAIApply = useCallback(async (generatedNodes: GeneratedNode[], targetNode: RoadmapNode) => {
    if (!rawData) return;

    const mdBasePath = getMdBasePath();
    const roadmapPath = mdBasePath.split('/').pop() || '';

    // 逐个添加：每次 addChildNode 返回新树，作为下一次的输入
    let newTree = rawData;
    const addedCount = generatedNodes.length;
    const mdOperations: { node: GeneratedNode; mdPath: string }[] = [];

    for (const genNode of generatedNodes) {
      // 生成节点 ID
      const nodeId = genNode.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      // 处理 MD 文件路径
      // mdPath 不应该包含 .md 后缀，因为 saveMdFile 会自动添加
      let nodeMdPath = genNode.mdPath?.replace(/\.md$/, '') || undefined;
      
      if (genNode.mdInsertPosition === 'new') {
        // 新建 MD 文件：使用节点 ID 作为文件名
        nodeMdPath = nodeMdPath || `${targetNode.id}/${nodeId}`;
      } else if (genNode.mdInsertPosition === 'parent') {
        // 插入父级 MD：在父节点的 MD 文件中添加章节
        // 这种情况下节点类型必须是 sub，因为它是 MD 文件中的章节
        if (!targetNode.mdPath) {
          console.warn(`[AI] 父节点没有 MD 文件，无法插入章节`);
          message.warning(`节点「${genNode.label}」：父节点没有 MD 文件，无法插入`);
        } else {
          // 处理章节内容
          // 如果有 mdContent，需要移除可能存在的标题行（因为 addSectionToMdFile 会添加标题）
          let sectionContent: string | undefined;
          if (genNode.mdContent) {
            // 移除开头的标题行（如 ### 节点名称 或 ## 节点名称）
            const lines = genNode.mdContent.trim().split('\n');
            const firstLine = lines[0];
            if (/^#{2,6}\s+/.test(firstLine)) {
              // 第一行是标题，移除它
              sectionContent = lines.slice(1).join('\n').trim();
            } else {
              sectionContent = genNode.mdContent;
            }
            // 确保内容以换行开头
            if (!sectionContent.startsWith('\n')) {
              sectionContent = '\n' + sectionContent;
            }
          } else if (genNode.description) {
            sectionContent = `\n\n${genNode.description}`;
          }
          
          const sectionResult = await addSectionToMdFile(
            targetNode.mdPath,
            genNode.label,
            sectionContent,
            roadmapPath
          );
          if (!sectionResult.success) {
            console.warn(`[AI] 添加章节失败: ${sectionResult.message}`);
            message.warning(`节点「${genNode.label}」插入章节失败: ${sectionResult.message}`);
          } else {
            console.log(`[AI] 成功添加章节: ${genNode.label} -> ${targetNode.mdPath}`);
          }
        }
        // 这种情况下节点不需要独立的 mdPath
        nodeMdPath = undefined;
      } else if (genNode.mdInsertPosition === 'none') {
        // 不需要 MD 文件
        nodeMdPath = undefined;
      }

      // 当 mdInsertPosition 为 'parent' 时，节点必须是 sub 类型，并使用 sub 节点的 ID 格式
      const isSubNode = genNode.mdInsertPosition === 'parent';
      const nodeType = isSubNode ? 'sub' : (genNode.type || 'leaf');
      // sub 节点使用特殊的 ID 格式：父节点ID__章节标题
      const finalNodeId = isSubNode ? generateSubNodeId(targetNode.id, genNode.label) : nodeId;

      const newNode: RoadmapNode = {
        id: finalNodeId,
        label: genNode.label,
        type: nodeType,
        description: genNode.description,
        mdPath: nodeMdPath,
        children: [],
      };
      newTree = addChildNode(newTree, targetNode.id, newNode);

      // 记录需要创建的 MD 文件（稍后批量创建）
      if (genNode.mdInsertPosition === 'new' && nodeMdPath) {
        mdOperations.push({ node: genNode, mdPath: nodeMdPath });
      }
    }

    // 创建新的 MD 文件
    for (const { node, mdPath } of mdOperations) {
      // 移除可能存在的 .md 后缀，因为 saveMdFile 会自动添加
      const pathWithoutMd = mdPath.replace(/\.md$/, '');
      const fullMdPath = `${roadmapPath}/${pathWithoutMd}`;
      const defaultContent = `# ${node.label}\n\n${node.description || '<!-- 在这里编写内容 -->'}\n`;
      const result = await saveMdFile(fullMdPath, defaultContent);
      if (!result.success) {
        console.warn(`[AI] 创建 MD 文件失败: ${result.message}`);
      }
    }

    await refreshGraphAndIndex(newTree);
    recordHistory(newTree, `AI 生成 ${addedCount} 个子节点`);
    message.success(`已添加 ${addedCount} 个节点${mdOperations.length > 0 ? `，创建 ${mdOperations.length} 个 MD 文件` : ''}`);
  }, [rawData, getMdBasePath, pushHistory, refreshGraphAndIndex, recordHistory, getConnections, getBookmarks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 批量删除节点
  // ═══════════════════════════════════════════════════════════════════════════════
  // 用于 ConfigPanel 的批量选中删除功能。
  // executeBatchNodeDelete 一次删除多个节点，返回合并后的新树和所有被删除文件的内容。

  const handleBatchDeleteNodes = useCallback(async (nodeIds: string[]) => {
    if (!rawData || nodeIds.length === 0) return;

    const hideLoading = message.loading(`正在删除 ${nodeIds.length} 个节点...`, 0);

    try {
      const mdBasePath = getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';

      const { newTree, deletedFiles } = await executeBatchNodeDelete(
        nodeIds, rawData, mdBasePath, roadmapPath
      );

      // 先记录历史（含已删除文件内容供撤销恢复），再更新画布
      recordHistory(rawData, `批量删除 ${nodeIds.length} 个节点`, deletedFiles);

      const result = await refreshGraphAndIndex(newTree);

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
  }, [rawData, getMdBasePath, pushHistory, refreshGraphAndIndex, recordHistory, getConnections, getBookmarks]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 节点排序
  // ═══════════════════════════════════════════════════════════════════════════════
  // 拖拽排序后调用，将新的 children 顺序写入 parentNode 的 children 数组。
  // reorderNodeChildren 返回新树，然后同步到画布和 index.json。

  const handleReorderNodes = useCallback(async (parentId: string, newChildren: RoadmapNode[]) => {
    if (!rawData) return;

    const hideLoading = message.loading('正在保存排序...', 0);

    try {
      // 先记录历史，再变更
      recordHistory(rawData, '节点排序');

      const newTree = reorderNodeChildren(rawData, parentId, newChildren);
      const result = await refreshGraphAndIndex(newTree);

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
  }, [rawData, pushHistory, refreshGraphAndIndex, recordHistory, getConnections, getBookmarks]);

  return {
    handleSaveNode,
    performNodeDeletion,
    handleAIApply,
    handleBatchDeleteNodes,
    handleReorderNodes,
  };
}
