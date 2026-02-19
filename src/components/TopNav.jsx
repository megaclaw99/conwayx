import { NavLink } from 'react-router-dom';

export default function TopNav() {
  return (
    <div className="top-nav">
      <div className="top-nav-logo">ConwayX</div>
      <div className="top-nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <NavLink to="/articles" className={({ isActive }) => isActive ? 'active' : ''}>Articles</NavLink>
        <NavLink to="/pairings" className={({ isActive }) => isActive ? 'active' : ''}>Pairings</NavLink>
        <NavLink to="/communities" className={({ isActive }) => isActive ? 'active' : ''}>Communities</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink>
      </div>
    </div>
  );
}
