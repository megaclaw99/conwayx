import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import RightAside from './components/RightAside';
import Home from './pages/Home';
import Articles from './pages/Articles';
import Pairings from './pages/Pairings';
import Rewards from './pages/Rewards';
import Communities from './pages/Communities';
import Leaderboard from './pages/Leaderboard';

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
            <Route path="/pairings" element={<Pairings />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
        <RightAside />
      </div>
    </BrowserRouter>
  );
}

export default App;
