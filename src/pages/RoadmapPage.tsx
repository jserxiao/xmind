import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Select } from 'antd';
import RoadmapGraph from '../components/RoadmapGraph';
import { useRoadmapStore } from '../store/roadmapStore';
import styles from '../styles/RoadmapPage.module.css';

const RoadmapPage: React.FC = () => {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const navigate = useNavigate();
  
  const directoryName = useRoadmapStore((state) => state.directoryName);
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);
  const currentRoadmap = useRoadmapStore((state) => state.currentRoadmap);
  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const clearCurrentRoadmap = useRoadmapStore((state) => state.clearCurrentRoadmap);
  const availableRoadmaps = useRoadmapStore((state) => state.availableRoadmaps);

  // 标记是否正在离开页面（返回列表页）
  const isLeavingRef = useRef(false);

  // 刷新页面时，恢复当前思维导图
  // 逻辑：如果 URL 有 roadmapId 但 store 中没有 currentRoadmapId，说明是刷新页面，尝试恢复
  useEffect(() => {
    // 如果正在离开页面，不恢复状态
    if (isLeavingRef.current) return;
    
    if (!roadmapId) return;
    
    // 如果 store 中有 currentRoadmapId 且与 URL 一致，说明状态正常，无需处理
    if (currentRoadmapId && roadmapId === currentRoadmapId) return;
    
    // 如果 store 中有 currentRoadmapId 但与 URL 不一致，说明是切换，也不在这里处理
    if (currentRoadmapId && roadmapId !== currentRoadmapId) return;
    
    // store 中没有 currentRoadmapId，说明是刷新页面，尝试从缓存恢复
    const roadmap = availableRoadmaps.find(r => r.id === roadmapId);
    if (roadmap) {
      setCurrentRoadmap(roadmap);
    } else {
      // 找不到对应的思维导图，返回列表页
      navigate('/');
    }
  }, [roadmapId, currentRoadmapId, availableRoadmaps, setCurrentRoadmap, navigate]);

  // 处理返回列表页
  const handleBackToList = () => {
    isLeavingRef.current = true;  // 标记正在离开
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
      <div className={styles.roadmapPage}>
        <header className={styles.roadmapPageHeader}>
          <button className={styles.backToListBtn} onClick={handleBackToList}>
            ← 返回列表
          </button>
          <h1 className={styles.roadmapTitle}>加载中...</h1>
          <div className={styles.headerSpacer}></div>
        </header>
        <main className={styles.roadmapPageContent}>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在加载思维导图...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.roadmapPage}>
      {/* 顶部导航 */}
      <header className={styles.roadmapPageHeader}>
        <button className={styles.backToListBtn} onClick={handleBackToList}>
          ← 返回列表
        </button>
        <h1 className={styles.roadmapTitle}>{currentRoadmap.name}</h1>
        
        {/* 思维导图切换下拉框 */}
        <div className={styles.roadmapSwitcher}>
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
      <main className={styles.roadmapPageContent}>
        <RoadmapGraph />
      </main>
    </div>
  );
};

export default RoadmapPage;
