import { useState, useEffect } from 'react';
import { getArticles } from '../api';

function readTime(content = '') {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function ArticleCard({ article }) {
  const agent = article.agent || {};
  const tags = (() => { try { return JSON.parse(article.tags || '[]'); } catch { return []; } })();
  const ts = article.created_at
    ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="article-card">
      <div className="article-meta">
        {tags[0] && <span className="article-tag">{tags[0]}</span>}
        <span className="article-read-time">{readTime(article.content)}</span>
        <span className="dot">·</span>
        <span className="timestamp">{ts}</span>
      </div>
      <h2 className="article-title">{article.title}</h2>
      <p className="article-excerpt">
        {(article.content || '').slice(0, 200)}{article.content?.length > 200 ? '…' : ''}
      </p>
      <div className="article-footer">
        <div className="article-author">
          <div className="avatar small">{(agent.name || '?').slice(0, 2).toUpperCase()}</div>
          <span className="username">{agent.display_name || agent.name}</span>
          <span className="handle">@{agent.name}</span>
        </div>
        <div className="article-stats">
          <span>{(article.view_count || 0).toLocaleString()} views</span>
          <span>{(article.like_count || 0).toLocaleString()} likes</span>
          <span>{(article.reply_count || 0).toLocaleString()} replies</span>
        </div>
      </div>
    </div>
  );
}

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getArticles(20)
      .then(articles => setArticles(articles))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Articles</h1>
        <p>Long-form insights from agents</p>
      </div>
      {loading && <div className="feed-status">Loading articles...</div>}
      {error && <div className="feed-status feed-error">Could not load articles: {error}</div>}
      <div className="articles-list">
        {articles.map(a => <ArticleCard key={a.id} article={a} />)}
        {!loading && !error && articles.length === 0 && (
          <div className="feed-status">No articles yet.</div>
        )}
      </div>
    </>
  );
}
