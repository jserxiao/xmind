import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Select } from 'antd';
import RoadmapGraph from '../components/RoadmapGraph';
import { useRoadmapStore } from '../store/roadmapStore';
import { getDirectoryHandle } from '../utils/fileSystem';

const RoadmapPage: React.FC = () => {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const navigate = useNavigate();
  
  const directoryName = useRoadmapStore((state) => state.directoryName);
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);
  const currentRoadmap = useRoadmapStore((state) => state.currentRoadmap);
  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const clearCurrentRoadmap = useRoadmapStore((state) => state.clearCurrentRoadmap);
  const availableRoadmaps = useRoadmapStore((state) => state.availableRoadmaps);

  // 同步 URL 中的 roadmapId 到 store
  // 只有当 URL 的 roadmapId 和 store 的 currentRoadmapId 不一致时才同步
  useEffect(() => {
    // 如果 store 中没有 currentRoadmapId，说明用户要返回列表，不同步
    if (!currentRoadmapId) return;
    
    // URL 和 store 一致，无需同步
    if (roadmapId === currentRoadmapId) return;
    
    // URL 变化了，需要同步到 store
    if (roadmapId) {
      const roadmap = availableRoadmaps.find(r => r.id === roadmapId);
      if (roadmap) {
        setCurrentRoadmap(roadmap);
      } else {
        // 找不到对应的思维导图，返回列表页
        navigate('/');
      }
    }
  }, [roadmapId, currentRoadmapId, availableRoadmaps, setCurrentRoadmap, navigate]);

  // 如果没有选择目录，跳转到主页
  useEffect(() => {
    if (!getDirectoryHandle()) {
      navigate('/');
    }
  }, [navigate]);

  // 处理返回列表页
  const handleBackToList = () => {
    clearCurrentRoadmap();
    navigate('/');
  };

  // 处理切换思维导图
  const handleRoadmapChange = (newRoadmapId: string) => {
    const roadmap = availableRoadmaps.find(r => r.id === newRoadmapId);
    if (roadmap) {
      setCurrentRoadmap(roadmap);
      navigate(`/roadmap/${newRoadmapId}`);
    }
  };

  // 如果没有设置当前思维导图，显示加载状态
  if (!directoryName || !currentRoadmap) {
    return (
      <div className="roadmap-page">
        <header className="roadmap-page-header">
          <button className="back-to-list-btn" onClick={handleBackToList}>
            ← 返回列表
          </button>
          <h1 className="roadmap-title">加载中...</h1>
          <div className="header-spacer"></div>
        </header>
        <main className="roadmap-page-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在加载思维导图...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="roadmap-page">
      {/* 顶部导航 */}
      <header className="roadmap-page-header">
        <button className="back-to-list-btn" onClick={handleBackToList}>
          ← 返回列表
        </button>
        <h1 className="roadmap-title">{currentRoadmap.name}</h1>
        
        {/* 思维导图切换下拉框 */}
        <div className="roadmap-switcher">
          <Select
            value={currentRoadmap.id}
            onChange={handleRoadmapChange}
            style={{ width: 200 }}
            options={availableRoadmaps.map(r => ({
              value: r.id,
              label: r.name,
            }))}
            placeholder="切换思维导图"
          />
        </div>
      </header>

      {/* 思维导图 */}
      <main className="roadmap-page-content">
        <RoadmapGraph />
      </main>
    </div>
  );
};

export default RoadmapPage;