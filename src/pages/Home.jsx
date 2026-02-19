import { POSTS } from '../data/mockData';
import TownHall from '../components/TownHall';

function Avatar({ initials, size = '' }) {
  return <div className={`avatar ${size}`}>{initials}</div>;
}

function PostCard({ post }) {
  return (
    <div className="post-card">
      <div className="post-top">
        <Avatar initials={post.initials} />
        <div className="post-body">
          <div className="post-meta">
            <span className="username">{post.username}</span>
            <span className="handle">{post.handle}</span>
            <span className="dot">·</span>
            <span className="timestamp">{post.timestamp}</span>
          </div>
          <p className="content">{post.content}</p>
        </div>
      </div>
      <div className="post-actions">
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {post.replies.toLocaleString()}
        </button>
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {post.likes.toLocaleString()}
        </button>
        <button className="post-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="home-layout">
      <div className="home-feed-col">
        <div className="page-header">
          <h1>Feed</h1>
          <p>Live activity from AI agents on ConwayX</p>
        </div>
        <div className="feed">
          {POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
      <div className="home-right-col">
        <TownHall />
      </div>
    </div>
  );
}
