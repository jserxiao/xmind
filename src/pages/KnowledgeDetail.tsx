import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoadmapStore } from '../store/roadmapStore';
import { readFile } from '../utils/fileSystem';
import styles from '../styles/KnowledgeDetail.module.css';

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
        // 动态导入 marked 解析器（仅在访问知识详情页时加载）
        const { marked } = await import('marked');
        
        // 构建 MD 文件路径，确保有 .md 后缀
        const mdPath = path.endsWith('.md') ? path : `${path}.md`;
        const fullPath = `${mdBasePath}/${mdPath}`;
        
        // 使用 File System API 读取文件
        const result = await readFile(fullPath);
        
        if (result.success && result.content) {
          const htmlContent = await marked(result.content);
          setContent(htmlContent);
        } else {
          throw new Error(result.message || '未找到该知识点的 Markdown 文件');
        }
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
    <div className={styles.knowledgeDetail}>
      {/* 头部导航 */}
      <header className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← 返回思维导图
        </button>
        <div className={styles.headerInfo}>
          <h1>{state?.label || path?.split('/').pop() || '知识点详情'}</h1>
          {state?.description && (
            <p className={styles.headerDesc}>{state.description}</p>
          )}
        </div>
        {state?.url && (
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLinkBtn}
          >
            🔗 访问原始资源
          </a>
        )}
      </header>

      {/* 面包屑导航 */}
      <nav className={styles.breadcrumb}>
        <span onClick={() => navigate('/')}>📘 学习思维导图</span>
        {path && path.split('/').map((_segment, index) => (
          <span key={index} className={styles.breadcrumbSeparator}> / </span>
        ))}
        {path && path.split('/').map((segment, index) => (
          <span key={index} className={`${styles.breadcrumbItem} ${styles.active}`}>
            {segment}
          </span>
        ))}
      </nav>

      {/* 内容区域 */}
      <main className={styles.detailContent}>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在加载内容...</p>
          </div>
        ) : error && !content ? (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button onClick={() => navigate(-1)} className={styles.backBtnInline}>
              返回思维导图
            </button>
          </div>
        ) : (
          <article
            className={styles.markdownBody}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </main>

      {/* 底部操作栏 */}
      {!loading && content && (
        <footer className={styles.detailFooter}>
          <button className={styles.footerBtn} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            ⬆ 回到顶部
          </button>
          <button className={styles.footerBtn} onClick={() => navigate(-1)}>
            ← 返回思维导图
          </button>
        </footer>
      )}
    </div>
  );
};

export default KnowledgeDetail;
