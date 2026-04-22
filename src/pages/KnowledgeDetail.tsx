import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { marked } from 'marked';
import { useRoadmapStore } from '../store/roadmapStore';

const KnowledgeDetail: React.FC = () => {
  // 使用通配符路由，从 location.pathname 获取完整路径
  const location = useLocation();
  const navigate = useNavigate();
  // 从 /knowledge/ 后面获取路径
  const path = location.pathname.replace('/knowledge/', '') || '';
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从路由 state 获取额外信息
  const state = location.state as {
    label?: string;
    mdPath?: string;
    description?: string;
    url?: string;
  } | null;

  // 获取当前思维导图路径
  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);

  useEffect(() => {
    const fetchMarkdown = async () => {
      setLoading(true);
      setError(null);
      
      const mdBasePath = getMdBasePath();
      if (!mdBasePath) {
        setError('未选择思维导图');
        setLoading(false);
        return;
      }
      
      try {
        // 使用思维导图路径构建完整路径
        const response = await fetch(`/${mdBasePath}/${path}.md`);
        if (!response.ok) {
          throw new Error('未找到该知识点的 Markdown 文件');
        }
        const text = await response.text();
        const htmlContent = await marked(text);
        setContent(htmlContent);
      } catch (err) {
        console.error('Failed to load markdown:', err);
        setError(err instanceof Error ? err.message : '加载失败');
        
        // 如果加载失败，显示默认内容
        const defaultContent = `
# ${state?.label || path}

> ${state?.description || '知识点'}

## 📖 简介

这是一个关于 **${state?.label || path}** 的知识点页面。

## 🔗 相关资源

${state?.url ? `- [访问资源](${state.url})` : ''}

## 💡 学习建议

1. 理解基本概念
2. 动手实践
3. 查阅官方文档

---

*此内容来自学习思维导图项目*
`;
        const htmlContent = await marked(defaultContent);
        setContent(htmlContent);
      } finally {
        setLoading(false);
      }
    };

    if (path) {
      fetchMarkdown();
    }
  }, [path, state, getMdBasePath]);

  return (
    <div className="knowledge-detail">
      {/* 头部导航 */}
      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 返回思维导图
        </button>
        <div className="header-info">
          <h1>{state?.label || path?.split('/').pop() || '知识点详情'}</h1>
          {state?.description && (
            <p className="header-desc">{state.description}</p>
          )}
        </div>
        {state?.url && (
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-btn"
          >
            🔗 访问原始资源
          </a>
        )}
      </header>

      {/* 面包屑导航 */}
      <nav className="breadcrumb">
        <span onClick={() => navigate('/')}>📘 学习思维导图</span>
        {path && path.split('/').map((segment, index) => (
          <span key={index} className="breadcrumb-separator"> / </span>
        ))}
        {path && path.split('/').map((segment, index) => (
          <span key={index} className="breadcrumb-item active">
            {segment}
          </span>
        ))}
      </nav>

      {/* 内容区域 */}
      <main className="detail-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在加载内容...</p>
          </div>
        ) : error && !content ? (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button onClick={() => navigate(-1)} className="back-btn-inline">
              返回思维导图
            </button>
          </div>
        ) : (
          <article
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </main>

      {/* 底部操作栏 */}
      {!loading && content && (
        <footer className="detail-footer">
          <button className="footer-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            ⬆ 回到顶部
          </button>
          <button className="footer-btn" onClick={() => navigate(-1)}>
            ← 返回思维导图
          </button>
        </footer>
      )}
    </div>
  );
};

export default KnowledgeDetail;
