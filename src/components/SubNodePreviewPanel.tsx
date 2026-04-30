/**
 * SubNodePreviewPanel - 子节点预览面板
 * 
 * 用于预览 sub 类型节点对应的 Markdown 内容片段
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Spin, message } from 'antd';
import { readFile } from '../utils/fileSystem';
import { extractSectionContent } from '../utils/nodeUtils';
import { EMOJI, FullscreenIcon, ExitFullscreenIcon, CloseIcon } from '../constants/icons';
import overlayStyles from '../styles/NodeEditorPanel.module.css';
import styles from '../styles/SubNodePreviewPanel.module.css';

// 动态导入 MDEditor.Markdown（nohighlight 变体，跳过语法高亮依赖以减小包体积）
// 仅在用户打开预览面板时加载
const LazyMarkdownPreview = lazy(() =>
  import('@uiw/react-md-editor/nohighlight').then(mod => ({ default: mod.default.Markdown }))
);

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
  /** 上一个节点回调 */
  onPrevNode?: () => void;
  /** 下一个节点回调 */
  onNextNode?: () => void;
  /** 是否有上一个节点 */
  hasPrevNode?: boolean;
  /** 是否有下一个节点 */
  hasNextNode?: boolean;
}

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
  onPrevNode,
  onNextNode,
  hasPrevNode = false,
  hasNextNode = false,
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
    <div className={overlayStyles.nodeEditorOverlay} onClick={onClose}>
      <div 
        ref={panelRef}
        className={`${styles.subNodePreviewPanel} ${isFullscreen ? styles.fullscreen : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className={overlayStyles.editorHeader}>
          <div className={styles.headerNav}>
            <button 
              className={`${styles.navBtn} ${!hasPrevNode ? styles.navBtnDisabled : ''}`}
              onClick={onPrevNode}
              disabled={!hasPrevNode}
              title={hasPrevNode ? '上一个节点' : '没有上一个节点'}
            >
              ← 上一个
            </button>
            <h2 className={overlayStyles.editorTitle}>
              {EMOJI.EYE} 预览：{nodeLabel}
            </h2>
            <button 
              className={`${styles.navBtn} ${!hasNextNode ? styles.navBtnDisabled : ''}`}
              onClick={onNextNode}
              disabled={!hasNextNode}
              title={hasNextNode ? '下一个节点' : '没有下一个节点'}
            >
              下一个 →
            </button>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.fullscreenBtn} 
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
            <button className={overlayStyles.editorCloseBtn} onClick={onClose}>
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className={styles.previewPanelContent} data-color-mode="light">
          {loading ? (
            <div className={styles.previewLoading}>
              <Spin tip="正在加载内容..." />
            </div>
          ) : error ? (
            <div className={styles.previewError}>
              <span className={styles.errorIcon}>{EMOJI.WARNING}</span>
              <span>{error}</span>
            </div>
          ) : (
            <Suspense fallback={<div className={styles.previewLoading}><Spin tip="正在加载预览..." /></div>}>
              <LazyMarkdownPreview
                source={content || '*暂无内容*'}
                style={{ backgroundColor: 'transparent' }}
              />
            </Suspense>
          )}
        </div>

        {/* 底部提示 */}
        <div className={overlayStyles.editorFooter}>
          <div className={overlayStyles.footerHint}>
            {mdPath && <span className={styles.mdPathHint}>{EMOJI.DOCUMENT} {mdPath}</span>}
          </div>
          <div className={overlayStyles.footerActions}>
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
