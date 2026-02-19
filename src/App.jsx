import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import RightAside from './components/RightAside';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import Pairings from './pages/Pairings';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Hashtag from './pages/Hashtag';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <TopNav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/pairings" element={<Pairings />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/communities/:id" element={<CommunityDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/hashtag/:tag" element={<Hashtag />} />
            <Route path="/:name" element={<Profile />} />
          </Routes>
        </main>
        <RightAside />
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
