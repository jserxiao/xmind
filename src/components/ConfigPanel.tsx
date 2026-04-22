/**
 * ConfigPanel - 配置栏组件
 * 
 * 左侧可折叠的配置面板，包含：
 * - 标题和提示信息
 * - 工具栏按钮（缩放、导出等）
 * - 节点导航面板
 * - 配置项（颜色、尺寸等）
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Input, Spin, Tag } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { useConfigStore } from '../store/configStore';
import type { RoadmapNode } from '../data/roadmapData';
import {
  collectNodesWithMdPath,
  searchMdContent,
  type MdSearchResult,
} from '../utils/nodeUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// 组件 Props
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfigPanelProps {
  /** 节点数据（用于导航面板） */
  rawData: RoadmapNode | null;
  /** 聚焦节点回调 */
  onFocusNode: (nodeId: string) => void;
  /** 工具栏操作 */
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExportJPG: () => void;
  onExportPDF: () => void;
  /** 节点编辑操作 */
  onAddNode?: (parentId: string, parentNode: RoadmapNode | null) => void;
  onEditNode?: (node: RoadmapNode) => void;
  onDeleteNode?: (node: RoadmapNode) => void;
  /** 预览 sub 节点回调 */
  onPreviewSubNode?: (node: RoadmapNode) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 子组件：颜色输入
// ═══════════════════════════════════════════════════════════════════════════════

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => (
  <div className="config-row">
    <span className="config-label">{label}</span>
    <div className="config-color-wrapper">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="config-color-input"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="config-text-input"
        placeholder="#000000"
      />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 子组件：数字输入
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min = 0, max = 1000, step = 1 }) => (
  <div className="config-row">
    <span className="config-label">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="config-number-input"
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════════════════════

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  rawData,
  onFocusNode,
  onFitView,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExportJPG,
  onExportPDF,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onPreviewSubNode,
}) => {
  // ── 状态 ──
  const [activeTab, setActiveTab] = useState<'nav' | 'config'>('nav');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [mdSearchResults, setMdSearchResults] = useState<MdSearchResult[]>([]);
  const [isSearchingMd, setIsSearchingMd] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ── Store ──
  const {
    panelExpanded,
    togglePanel,
    colors,
    updateColors,
    layout,
    updateLayout,
    zoom,
    updateZoom,
    resetAll,
  } = useConfigStore();
  
  // 包装 updateColors 以添加日志
  const handleUpdateColors = useCallback((updates: Partial<typeof colors>) => {
    console.log('[ConfigPanel] 更新颜色', updates);
    updateColors(updates);
  }, [updateColors]);
  
  // ── 搜索过滤 ──
  const filteredData = useMemo(() => {
    if (!rawData || !searchKeyword.trim()) return rawData;
    
    const keyword = searchKeyword.toLowerCase().trim();
    
    function filterNode(node: RoadmapNode): RoadmapNode | null {
      // 检查当前节点是否匹配
      const labelMatch = node.label.toLowerCase().includes(keyword);
      const descMatch = node.description?.toLowerCase().includes(keyword);
      
      // 递归过滤子节点
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((n): n is RoadmapNode => n !== null);
      
      // 如果当前节点匹配或有匹配的子节点，保留
      if (labelMatch || descMatch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      
      return null;
    }
    
    const result = filterNode(rawData);
    return result;
  }, [rawData, searchKeyword]);
  
  // ── MD 内容搜索 ──
  // 收集所有有 mdPath 的节点
  const nodesWithMdPath = useMemo(() => {
    if (!rawData) return [];
    return collectNodesWithMdPath(rawData);
  }, [rawData]);
  
  // 异步搜索 MD 内容
  useEffect(() => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 如果搜索词为空，清空结果
    if (!searchKeyword.trim()) {
      setMdSearchResults([]);
      return;
    }
    
    // 防抖：延迟 300ms 后执行搜索
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingMd(true);
      try {
        const results = await searchMdContent(searchKeyword, nodesWithMdPath);
        setMdSearchResults(results);
      } catch (error) {
        console.error('[ConfigPanel] MD 搜索失败:', error);
        setMdSearchResults([]);
      } finally {
        setIsSearchingMd(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchKeyword, nodesWithMdPath]);
  
  // 高亮匹配文本
  const highlightText = useCallback((text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + keyword.length);
    const after = text.slice(index + keyword.length);
    
    return (
      <>
        {before}
        <span className="tree-label-highlight">{match}</span>
        {after}
      </>
    );
  }, []);
  
  // ── 渲染树节点 ──
  const renderTree = useCallback((nodes: RoadmapNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = !!node.children?.length;
      const isRoot = node.type === 'root';
      const isSubNode = node.type === 'sub';
      
      return (
        <div key={node.id}>
          <div
            className="tree-node-content"
            style={{ paddingLeft: `${depth * 16 + 10}px` }}
          >
            <span
              className="tree-icon"
              style={{
                color:
                  {
                    root: colors.primary,
                    branch: colors.primary,
                    leaf: colors.success,
                    link: colors.warning,
                    sub: colors.link,
                  }[node.type] || '#888',
              }}
            >
              {node.type === 'root'
                ? '📘'
                : node.type === 'branch'
                  ? '📂'
                  : node.type === 'leaf'
                    ? '🟢'
                    : node.type === 'link'
                      ? '🔗'
                      : '📝'}
            </span>
            <span 
              className="tree-label" 
              title={node.label}
              onClick={() => onFocusNode(node.id)}
            >
              {searchKeyword 
                ? highlightText(node.label.replace(/\n/g, ' ').slice(0, 25), searchKeyword)
                : node.label.replace(/\n/g, ' ').slice(0, 25)}
            </span>
            
            {/* 操作按钮 */}
            <div className="tree-node-actions">
              {/* sub 类型节点显示预览和编辑按钮 */}
              {isSubNode ? (
                <>
                  {onPreviewSubNode && (
                    <button
                      className="tree-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewSubNode(node);
                      }}
                      title="预览内容"
                    >
                      👁️
                    </button>
                  )}
                  {onEditNode && (
                    <button
                      className="tree-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditNode(node);
                      }}
                      title="编辑章节"
                    >
                      ✏️
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onAddNode && (
                    <button
                      className="tree-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNode(node.id, node);
                      }}
                      title="添加子节点"
                    >
                      ➕
                    </button>
                  )}
                  {onEditNode && (
                    <button
                      className="tree-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditNode(node);
                      }}
                      title="编辑节点"
                    >
                      ✏️
                    </button>
                  )}
                  {onDeleteNode && !isRoot && (
                    <button
                      className="tree-action-btn tree-action-btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node);
                      }}
                      title="删除节点"
                    >
                      🗑️
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {hasChildren && (
            <div className="tree-children">{renderTree(node.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  }, [colors, onFocusNode, onAddNode, onEditNode, onDeleteNode, onPreviewSubNode, searchKeyword, highlightText]);
  
  // ── 收起状态只显示展开按钮 ──
  if (!panelExpanded) {
    return (
      <div className="config-panel config-panel-collapsed">
        <button className="config-toggle-btn" onClick={togglePanel} title="展开配置栏">
          ▶
        </button>
      </div>
    );
  }
  
  return (
    <div className="config-panel config-panel-expanded">
      {/* 折叠按钮 */}
      <button className="config-toggle-btn config-toggle-collapse" onClick={togglePanel} title="收起配置栏">
        ◀
      </button>
      
      {/* 标题区域 */}
      <div className="config-header">
        <h2 className="config-title">📘 Go 学习路线图</h2>
        <p className="config-subtitle">点击 📖 进入详情 | ± 展开/收起</p>
      </div>
      
      {/* 工具栏 */}
      <div className="config-toolbar">
        <button onClick={onFitView} className="config-tool-btn" title="适应画布">
          ⊞ 适应
        </button>
        <button onClick={onZoomIn} className="config-tool-btn" title="放大">
          🔍+
        </button>
        <button onClick={onZoomOut} className="config-tool-btn" title="缩小">
          🔍−
        </button>
        <button onClick={onResetZoom} className="config-tool-btn" title="实际大小">
          1:1
        </button>
      </div>
      
      {/* Tab 切换 */}
      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'nav' ? 'active' : ''}`}
          onClick={() => setActiveTab('nav')}
        >
          🌳 导航
        </button>
        <button
          className={`config-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ 配置
        </button>
      </div>
      
      {/* Tab 内容 */}
      <div className="config-content">
        {activeTab === 'nav' ? (
          // 节点导航面板
          <div className="config-nav-panel">
            {/* 搜索框 */}
            <div className="tree-search-box">
              <Input
                placeholder="搜索节点或文档内容..."
                prefix={<SearchOutlined />}
                suffix={isSearchingMd ? <Spin size="small" /> : null}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                size="small"
              />
            </div>
            
            {/* MD 内容搜索结果 */}
            {searchKeyword.trim() && mdSearchResults.length > 0 && (
              <div className="md-search-results">
                <div className="md-search-header">
                  <FileTextOutlined /> 文档内容匹配 ({mdSearchResults.length})
                </div>
                {mdSearchResults.map((result) => (
                  <div
                    key={result.nodeId}
                    className="md-search-item"
                    onClick={() => onFocusNode(result.nodeId)}
                  >
                    <div className="md-search-item-title">
                      {highlightText(result.nodeLabel, searchKeyword)}
                    </div>
                    {result.matches.slice(0, 2).map((match, idx) => (
                      <div key={idx} className="md-search-item-context">
                        ...{highlightText(match, searchKeyword)}...
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            
            {filteredData ? (
              <div className="tree-panel-body">{renderTree([filteredData])}</div>
            ) : (
              <div className="config-loading">
                {searchKeyword ? '未找到匹配的节点' : '加载中...'}
              </div>
            )}
          </div>
        ) : (
          // 配置面板
          <div className="config-settings-panel">
            {/* 颜色配置 */}
            <div className="config-section">
              <h3 className="config-section-title">🎨 颜色配置</h3>
              <ColorInput
                label="主色调"
                value={colors.primary}
                onChange={(v) => handleUpdateColors({ primary: v })}
              />
              <ColorInput
                label="主色深"
                value={colors.primaryDark}
                onChange={(v) => handleUpdateColors({ primaryDark: v })}
              />
              <ColorInput
                label="主色浅"
                value={colors.primaryLight}
                onChange={(v) => handleUpdateColors({ primaryLight: v })}
              />
              <ColorInput
                label="成功色"
                value={colors.success}
                onChange={(v) => handleUpdateColors({ success: v })}
              />
              <ColorInput
                label="警告色"
                value={colors.warning}
                onChange={(v) => handleUpdateColors({ warning: v })}
              />
              <ColorInput
                label="链接色"
                value={colors.link}
                onChange={(v) => handleUpdateColors({ link: v })}
              />
            </div>
            
            {/* 布局配置 */}
            <div className="config-section">
              <h3 className="config-section-title">📐 布局配置</h3>
              <NumberInput
                label="水平间距"
                value={layout.hGap}
                onChange={(v) => updateLayout({ hGap: v })}
                min={10}
                max={200}
              />
              <NumberInput
                label="垂直间距"
                value={layout.vGap}
                onChange={(v) => updateLayout({ vGap: v })}
                min={5}
                max={100}
              />
            </div>
            
            {/* 缩放配置 */}
            <div className="config-section">
              <h3 className="config-section-title">🔍 缩放配置</h3>
              <NumberInput
                label="最小缩放"
                value={zoom.minZoom}
                onChange={(v) => updateZoom({ minZoom: v })}
                min={0.01}
                max={1}
                step={0.01}
              />
              <NumberInput
                label="最大缩放"
                value={zoom.maxZoom}
                onChange={(v) => updateZoom({ maxZoom: v })}
                min={1}
                max={50}
              />
              <NumberInput
                label="灵敏度"
                value={zoom.sensitivity}
                onChange={(v) => updateZoom({ sensitivity: v })}
                min={1}
                max={10}
              />
            </div>
            
            {/* 重置按钮 */}
            <div className="config-section">
              <button onClick={resetAll} className="config-reset-btn">
                🔄 重置所有配置
              </button>
            </div>
            
            {/* 导出按钮 */}
            <div className="config-section">
              <div className="config-export-group">
                <button onClick={onExportJPG} className="config-export-btn">
                  🖼️ 导出 PNG
                </button>
                <button onClick={onExportPDF} className="config-export-btn">
                  📄 导出 PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 图例 */}
      <div className="config-legend">
        <div className="legend-item">
          <span className="legend-color legend-root"></span>
          <span>根节点</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-branch"></span>
          <span>分类</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-leaf"></span>
          <span>知识点</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-link"></span>
          <span>外部资源</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-sub"></span>
          <span>细分知识点</span>
        </div>
      </div>
      
      {/* 底部提示 */}
      <div className="config-footer">
        拖拽平移 · 滚轮缩放
      </div>
    </div>
  );
};

export default ConfigPanel;
