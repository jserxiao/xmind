/**
 * 节点编辑器状态管理 Store
 * 
 * 管理节点编辑面板的打开/关闭、表单数据、节点CRUD操作
 */

import { create } from 'zustand';
import type { RoadmapNode } from '../data/roadmapData';
import { extractSectionContent } from '../utils/nodeUtils';
import { readFile } from '../utils/fileSystem';
import { useRoadmapStore } from './roadmapStore';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export type NodeType = 'root' | 'branch' | 'leaf' | 'link' | 'sub';

/** 表单数据 */
export interface NodeFormData {
  label: string;
  type: NodeType;
  icon: string;
  description: string;
  mdPath: string;
  url: string;
  mdContent: string;
  /** sub 节点专用：章节标题 */
  sectionTitle: string;
}

/** 编辑器状态 */
export interface NodeEditorState {
  // ── 面板状态 ──
  /** 面板是否打开 */
  isOpen: boolean;
  /** 编辑模式：add 添加 | edit 编辑 */
  mode: 'add' | 'edit';
  
  // ── 节点信息 ──
  /** 添加模式下的父节点ID */
  parentNodeId: string | null;
  /** 编辑模式下的当前节点 */
  editingNode: RoadmapNode | null;
  
  // ── sub 节点专用 ──
  /** sub 节点的 MD 文件路径（从父节点获取） */
  subNodeMdPath: string | null;
  
  // ── 表单数据 ──
  formData: NodeFormData;
  
  // ── 原始 MD 内容（用于取消时恢复）──
  originalMdContent: string;
  
  // ── 加载状态 ──
  isLoadingMd: boolean;
  
  // ── 操作方法 ──
  /** 打开添加面板 */
  openAddPanel: (parentNodeId: string, parentNode: RoadmapNode | null) => void;
  /** 打开编辑面板 */
  openEditPanel: (node: RoadmapNode, mdPath?: string) => void;
  /** 关闭面板 */
  closePanel: () => void;
  /** 更新表单数据 */
  updateFormData: (data: Partial<NodeFormData>) => void;
  /** 设置 MD 内容 */
  setMdContent: (content: string) => void;
  /** 加载 MD 内容（异步） */
  loadMdContent: (mdPath: string, sectionTitle?: string) => Promise<void>;
  /** 重置表单 */
  resetForm: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 默认值
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_FORM_DATA: NodeFormData = {
  label: '',
  type: 'leaf',
  icon: '',
  description: '',
  mdPath: '',
  url: '',
  mdContent: '',
  sectionTitle: '',
};

/** 根据节点类型获取默认图标 */
export function getDefaultIcon(type: NodeType): string {
  switch (type) {
    case 'root': return '📘';
    case 'branch': return '📂';
    case 'leaf': return '🟢';
    case 'link': return '🔗';
    case 'sub': return '📝';
    default: return '📄';
  }
}

/** 根据节点类型获取建议的子节点类型 */
export function getSuggestedChildType(parentType: NodeType): NodeType {
  switch (parentType) {
    case 'root': return 'branch';
    case 'branch': return 'leaf';
    case 'leaf': return 'sub';
    case 'link': return 'sub';
    default: return 'leaf';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 创建 Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useNodeEditorStore = create<NodeEditorState>((set, get) => ({
  // 初始状态
  isOpen: false,
  mode: 'add',
  parentNodeId: null,
  editingNode: null,
  subNodeMdPath: null,
  formData: { ...DEFAULT_FORM_DATA },
  originalMdContent: '',
  isLoadingMd: false,
  
  // 打开添加面板
  openAddPanel: (parentNodeId, parentNode) => {
    const suggestedType = parentNode ? getSuggestedChildType(parentNode.type) : 'leaf';
    set({
      isOpen: true,
      mode: 'add',
      parentNodeId,
      editingNode: null,
      formData: {
        ...DEFAULT_FORM_DATA,
        type: suggestedType,
        icon: getDefaultIcon(suggestedType),
      },
      originalMdContent: '',
    });
  },
  
  // 打开编辑面板
  openEditPanel: (node, mdPath) => {
    const isSubNode = node.type === 'sub';
    
    set({
      isOpen: true,
      mode: 'edit',
      parentNodeId: null,
      editingNode: node,
      subNodeMdPath: mdPath || null,
      formData: {
        label: node.label,
        type: node.type,
        icon: '', // 从节点获取图标，如果有
        description: node.description || '',
        mdPath: isSubNode ? (mdPath || '') : (node.mdPath || ''),
        url: node.url || '',
        mdContent: '', // MD内容需要异步加载
        sectionTitle: isSubNode ? node.label : '',
      },
      originalMdContent: '',
      isLoadingMd: false,
    });
    
    // 如果是 sub 节点，需要加载对应章节的内容
    if (isSubNode && mdPath) {
      // 使用 store 方法获取完整路径
      const fullMdPath = useRoadmapStore.getState().getFullMdPath(mdPath);
      get().loadMdContent(fullMdPath, node.label);
    } else if (node.mdPath) {
      // 非 sub 节点，加载整个 MD 文件
      const fullMdPath = useRoadmapStore.getState().getFullMdPath(node.mdPath);
      get().loadMdContent(fullMdPath);
    }
  },
  
  // 关闭面板
  closePanel: () => {
    set({
      isOpen: false,
      mode: 'add',
      parentNodeId: null,
      editingNode: null,
      subNodeMdPath: null,
      formData: { ...DEFAULT_FORM_DATA },
      originalMdContent: '',
      isLoadingMd: false,
    });
  },
  
  // 更新表单数据
  updateFormData: (data) => {
    set((state) => ({
      formData: {
        ...state.formData,
        ...data,
      },
    }));
  },
  
  // 设置 MD 内容
  setMdContent: (content) => {
    set((state) => ({
      formData: {
        ...state.formData,
        mdContent: content,
      },
    }));
  },
  
  // 加载 MD 内容（异步）
  loadMdContent: async (mdPath, sectionTitle) => {
    set({ isLoadingMd: true });
    
    try {
      // 构建 MD 文件路径，确保有 .md 后缀
      const mdPathWithExt = mdPath.endsWith('.md') ? mdPath : `${mdPath}.md`;
      
      // 使用 File System API 读取文件
      const result = await readFile(mdPathWithExt);
      
      if (result.success && result.content) {
        const content = result.content;
        
        // 如果指定了章节标题，只提取该章节的内容
        let finalContent = content;
        if (sectionTitle) {
          finalContent = extractSectionContent(content, sectionTitle);
        }
        
        set((state) => ({
          formData: {
            ...state.formData,
            mdContent: finalContent,
          },
          originalMdContent: finalContent,
          isLoadingMd: false,
        }));
      } else {
        // 文件不存在或读取失败，使用默认模板
        const defaultContent = sectionTitle 
          ? '<!-- 在这里编写章节内容 -->'
          : `# ${get().formData.label}\n\n## 概述\n\n<!-- 在这里编写内容 -->\n`;
        set((state) => ({
          formData: {
            ...state.formData,
            mdContent: defaultContent,
          },
          originalMdContent: defaultContent,
          isLoadingMd: false,
        }));
      }
    } catch (error) {
      console.error('[NodeEditorStore] 加载 MD 内容失败:', error);
      set({ isLoadingMd: false });
    }
  },
  
  // 重置表单
  resetForm: () => {
    set({
      formData: { ...DEFAULT_FORM_DATA },
      originalMdContent: '',
    });
  },
}));
