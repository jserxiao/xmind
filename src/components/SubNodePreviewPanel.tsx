/**
 * SubNodePreviewPanel - 子节点预览面板
 * 
 * 用于预览 sub 类型节点对应的 Markdown 内容片段
 */

import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Spin, message } from 'antd';

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
  /** 要预览的章节标题 */
  sectionTitle: string;
  /** 关闭回调 */
  onClose: () => void;
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
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const SubNodePreviewPanel: React.FC<SubNodePreviewPanelProps> = ({
  isOpen,
  nodeLabel,
  mdPath,
  sectionTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        // 添加时间戳参数避免浏览器缓存
        const res = await fetch(`/md/${mdPath}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        const sectionContent = extractSectionContent(text, sectionTitle);
        
        if (sectionContent) {
          setContent(sectionContent);
        } else {
          setError(`未找到章节「${sectionTitle}」的内容`);
        }
      } catch (err) {
        setError(`加载失败: ${err}`);
        message.error('加载内容失败');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, mdPath, sectionTitle]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="node-editor-overlay" onClick={onClose}>
      <div 
        className="sub-node-preview-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="editor-header">
          <h2 className="editor-title">
            👁️ 预览：{nodeLabel}
          </h2>
          <button className="editor-close-btn" onClick={onClose}>
            ✕
          </button>
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
