import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import KnowledgeDetail from './pages/KnowledgeDetail';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/knowledge/*" element={<KnowledgeDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
