import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoadmapStore, type RoadmapMeta } from '../store/roadmapStore';

const RoadmapListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const rootPath = useRoadmapStore((state) => state.rootPath);
  const setRootPath = useRoadmapStore((state) => state.setRootPath);
  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const availableRoadmaps = useRoadmapStore((state) => state.availableRoadmaps);
  const setAvailableRoadmaps = useRoadmapStore((state) => state.setAvailableRoadmaps);

  // 当 rootPath 变化时，扫描文件夹获取思维导图列表
  useEffect(() => {
    if (!rootPath) {
      setAvailableRoadmaps([]);
      return;
    }

    const scanRoadmaps = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 尝试读取根目录下的文件夹列表
        // 通过尝试获取各子文件夹的 index.json 来判断是否是有效的思维导图
        const roadmaps: RoadmapMeta[] = [];
        
        // 常见的思维导图文件夹名称（可以根据需要扩展）
        const commonFolders = [
          'go-learning-roadmap',
          'test',
          // 可以添加更多可能的文件夹名
        ];
        
        // 尝试检测每个文件夹
        for (const folderName of commonFolders) {
          try {
            const res = await fetch(`/${rootPath}/${folderName}/index.json`);
            if (res.ok) {
              const data = await res.json();
              // 从 index.json 中提取思维导图信息
              roadmaps.push({
                id: folderName,
                name: data.label || folderName,
                path: folderName,
                description: data.description || `${folderName} 思维导图`,
                icon: data.icon || '📚',
                color: data.color || '#1890ff',
              });
            }
          } catch {
            // 忽略无法访问的文件夹
          }
        }
        
        // 如果没有找到任何思维导图，显示提示
        if (roadmaps.length === 0) {
          setError('未在所选文件夹中找到有效的思维导图');
        }
        
        setAvailableRoadmaps(roadmaps);
      } catch (err) {
        console.error('扫描思维导图失败:', err);
        setError('扫描思维导图失败，请检查文件夹路径是否正确');
      } finally {
        setLoading(false);
      }
    };

    scanRoadmaps();
  }, [rootPath, setAvailableRoadmaps]);

  // 处理文件夹选择
  const handleSelectFolder = () => {
    // 使用 prompt 让用户输入文件夹路径
    const inputPath = prompt('请输入思维导图根文件夹路径（如：md 或 public/md）：', rootPath || 'md');
    
    if (inputPath !== null && inputPath.trim()) {
      const path = inputPath.trim();
      // 移除开头的斜杠（如果有）
      const normalizedPath = path.replace(/^\/+/, '');
      setRootPath(normalizedPath);
    }
  };

  // 处理思维导图点击
  const handleRoadmapClick = (roadmap: RoadmapMeta) => {
    setCurrentRoadmap(roadmap);
    navigate(`/roadmap/${roadmap.id}`);
  };

  // 如果没有选择根文件夹，显示选择界面
  if (!rootPath) {
    return (
      <div className="roadmap-list-page">
        <div className="folder-select-container">
          <div className="folder-select-card">
            <div className="folder-icon">📁</div>
            <h2>选择思维导图文件夹</h2>
            <p className="folder-hint">
              请选择包含思维导图的根文件夹
            </p>
            <button className="select-folder-btn" onClick={handleSelectFolder}>
              选择文件夹
            </button>
            <p className="folder-example">
              示例：<code>md</code> 或 <code>public/md</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roadmap-list-page">
      {/* 头部 */}
      <header className="roadmap-list-header">
        <div className="header-content">
          <h1 className="main-title">
            <span className="title-icon">🧠</span>
            思维导图中心
          </h1>
          <p className="subtitle">
            当前文件夹：<code>{rootPath}</code>
            <button className="change-folder-btn" onClick={handleSelectFolder}>
              更换
            </button>
          </p>
        </div>
      </header>

      {/* 思维导图列表 */}
      <main className="roadmap-list-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在扫描思维导图...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button className="retry-btn" onClick={handleSelectFolder}>
              重新选择文件夹
            </button>
          </div>
        ) : availableRoadmaps.length === 0 ? (
          <div className="empty-state">
            <p>未找到任何思维导图</p>
            <button className="retry-btn" onClick={handleSelectFolder}>
              选择其他文件夹
            </button>
          </div>
        ) : (
          <div className="roadmap-grid">
            {availableRoadmaps.map((roadmap) => (
              <div
                key={roadmap.id}
                className="roadmap-card"
                onClick={() => handleRoadmapClick(roadmap)}
                style={{ '--card-color': roadmap.color } as React.CSSProperties}
              >
                <div className="card-icon" style={{ backgroundColor: roadmap.color }}>
                  {roadmap.icon}
                </div>
                <div className="card-content">
                  <h3 className="card-title">{roadmap.name}</h3>
                  <p className="card-description">{roadmap.description}</p>
                </div>
                <div className="card-action">
                  <span className="action-text">进入</span>
                  <span className="action-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部 */}
      <footer className="roadmap-list-footer">
        <p>💡 提示：点击思维导图卡片进入对应的配置页面</p>
      </footer>
    </div>
  );
};

export default RoadmapListPage;