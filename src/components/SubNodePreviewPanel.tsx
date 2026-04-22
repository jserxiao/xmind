/**
 * SubNodePreviewPanel - 子节点预览面板
 * 
 * 用于预览 sub 类型节点对应的 Markdown 内容片段
 */

import { useState, useEffect, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Spin, message } from 'antd';
import { readFile } from '../utils/fileSystem';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface SubNodePreviewPanelProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 节点标题 */
  nodeLabel: string;
  /** MD 文件路径 */
  mdPath: string | null;
  /** 要预览的章节标题（可选，不传则预览整个文件） */
  sectionTitle?: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 是否自动进入全屏模式 */
  autoFullscreen?: boolean;
  /** 全屏退出回调 */
  onExitFullscreen?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从 Markdown 内容中提取指定章节的内容
 */
function extractSectionContent(mdContent: string, sectionTitle: string): string {
  const normalized = mdContent.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  let inTargetSection = false;
  let content: string[] = [];
  let targetLevel = 2; // ## 开头的标题级别
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      if (!inTargetSection) {
        // 还没进入目标章节，检查是否匹配
        if (title === sectionTitle) {
          inTargetSection = true;
          targetLevel = level;
          continue; // 跳过章节标题本身
        }
      } else {
        // 已经在目标章节内，检查是否遇到同级或更高级标题
        if (level <= targetLevel) {
          // 遇到同级或更高级标题，结束当前章节
          break;
        }
      }
    } else if (inTargetSection) {
      content.push(line);
    }
  }
  
  return content.join('\n').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 全屏 SVG 图标
// ═══════════════════════════════════════════════════════════════════════════════

const FullscreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const SubNodePreviewPanel: React.FC<SubNodePreviewPanelProps> = ({
  isOpen,
  nodeLabel,
  mdPath,
  sectionTitle,
  onClose,
  autoFullscreen = false,
  onExitFullscreen,
}) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredAutoFullscreen = useRef(false);

  // 加载内容
  useEffect(() => {
    if (!isOpen || !mdPath) {
      setContent('');
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 构建 MD 文件路径，确保有 .md 后缀
        const mdPathWithExt = mdPath.endsWith('.md') ? mdPath : `${mdPath}.md`;
        
        // 使用 File System API 读取文件
        const result = await readFile(mdPathWithExt);
        
        if (!result.success || !result.content) {
          throw new Error(result.message || '读取文件失败');
        }
        
        const text = result.content;
        
        // 如果有章节标题，提取章节内容；否则使用整个文件内容
        if (sectionTitle) {
          const sectionContent = extractSectionContent(text, sectionTitle);
          if (sectionContent) {
            setContent(sectionContent);
          } else {
            setError(`未找到章节「${sectionTitle}」的内容`);
          }
        } else {
          setContent(text);
        }
      } catch (err: any) {
        setError(`加载失败: ${err.message || err}`);
        message.error('加载内容失败');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, mdPath, sectionTitle]);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // 退出全屏时触发回调，让父组件可以调整画布
      if (wasFullscreen && !nowFullscreen && onExitFullscreen) {
        // 延迟一帧确保浏览器完成全屏退出
        requestAnimationFrame(() => {
          onExitFullscreen();
        });
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, onExitFullscreen]);

  // 自动全屏（仅在打开时触发一次）
  useEffect(() => {
    if (isOpen && autoFullscreen && panelRef.current && !hasTriggeredAutoFullscreen.current) {
      hasTriggeredAutoFullscreen.current = true;
      // 延迟一帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        panelRef.current?.requestFullscreen().catch(() => {
          // 自动全屏失败时静默处理
        });
      });
    }
    
    // 关闭时重置标记
    if (!isOpen) {
      hasTriggeredAutoFullscreen.current = false;
    }
  }, [isOpen, autoFullscreen]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 切换全屏
  const toggleFullscreen = async () => {
    if (!panelRef.current) return;
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await panelRef.current.requestFullscreen();
      }
    } catch (err) {
      console.error('全屏切换失败:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="node-editor-overlay" onClick={onClose}>
      <div 
        ref={panelRef}
        className={`sub-node-preview-panel ${isFullscreen ? 'fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="editor-header">
          <h2 className="editor-title">
            👁️ 预览：{nodeLabel}
          </h2>
          <div className="header-actions">
            <button 
              className="fullscreen-btn" 
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
            <button className="editor-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="preview-panel-content" data-color-mode="light">
          {loading ? (
            <div className="preview-loading">
              <Spin tip="正在加载内容..." />
            </div>
          ) : error ? (
            <div className="preview-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          ) : (
            <MDEditor.Markdown
              source={content || '*暂无内容*'}
              style={{ backgroundColor: 'transparent' }}
            />
          )}
        </div>

        {/* 底部提示 */}
        <div className="editor-footer">
          <div className="footer-hint">
            {mdPath && <span className="md-path-hint">📄 {mdPath}</span>}
          </div>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubNodePreviewPanel;
