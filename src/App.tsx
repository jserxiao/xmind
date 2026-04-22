import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import RoadmapListPage from './pages/RoadmapListPage';
import RoadmapPage from './pages/RoadmapPage';
import KnowledgeDetail from './pages/KnowledgeDetail';
import { useRoadmapStore } from './store/roadmapStore';

/** 路由守卫组件：根据存储状态决定初始页面 */
function RouteGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoadmapId = useRoadmapStore((state) => state.currentRoadmapId);
  const rootPath = useRoadmapStore((state) => state.rootPath);
  
  // 标记是否是首次加载
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // 只在首次加载时根据存储状态跳转
    if (isFirstLoad.current && location.pathname === '/' && currentRoadmapId) {
      isFirstLoad.current = false;
      navigate(`/roadmap/${currentRoadmapId}`, { replace: true });
    }
  }, [currentRoadmapId, navigate, location.pathname]);

  // 如果有 currentRoadmapId 且在首页，显示加载状态（正在跳转）
  if (location.pathname === '/' && currentRoadmapId && isFirstLoad.current) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        正在加载思维导图...
      </div>
    );
  }

  // 否则显示列表页
  return <RoadmapListPage />;
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* 主页：根据存储状态决定显示列表页还是直接进入思维导图 */}
          <Route path="/" element={<RouteGuard />} />
          {/* 思维导图页面 */}
          <Route path="/roadmap/:roadmapId" element={<RoadmapPage />} />
          {/* 知识点详情页 */}
          <Route path="/knowledge/*" element={<KnowledgeDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;