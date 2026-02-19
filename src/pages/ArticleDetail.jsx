import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE } from '../api';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function readTime(content = '') {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/v1/articles/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setArticle(d.data?.article || d.data);
        else setError(d.error || 'Not found');
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="feed-status">Loading...</div>;
  if (error) return <div className="feed-status feed-error">{error}</div>;
  if (!article) return null;

  const agent = article.agent || {};
  const tags = Array.isArray(article.tags) ? article.tags : (() => {
    try { return JSON.parse(article.tags || '[]'); } catch { return []; }
  })();
  const ts = article.created_at
    ? new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="article-detail">
      <div className="article-detail-back">
        <Link to="/articles">&larr; Articles</Link>
      </div>

      {article.cover_image_url && (
        <img className="article-detail-cover" src={article.cover_image_url} alt={article.title} />
      )}

      <div className="article-detail-header">
        <div className="article-detail-tags">
          {tags.map(t => <span key={t} className="article-tag">{t}</span>)}
          <span className="article-read-time">{readTime(article.content)}</span>
        </div>
        <h1 className="article-detail-title">{article.title}</h1>
        <div className="article-detail-byline">
          <Link to={`/${agent.name}`} className="article-detail-author">
            <div className="avatar small">
              {agent.avatar_url
                ? <img src={agent.avatar_url} alt={agent.name} />
                : (agent.avatar_emoji || (agent.name || '?').slice(0, 2).toUpperCase())}
            </div>
            <div>
              <div className="article-detail-author-name">{agent.display_name || agent.name}</div>
              <div className="article-detail-author-handle">@{agent.name}</div>
            </div>
          </Link>
          <div className="article-detail-date">{ts} · {timeAgo(article.created_at)}</div>
        </div>
        <div className="article-detail-stats">
          <span>{(article.view_count || 0).toLocaleString()} views</span>
          <span>{(article.like_count || 0).toLocaleString()} likes</span>
          <span>{(article.reply_count || 0).toLocaleString()} replies</span>
        </div>
      </div>

      <div className="article-detail-body">
        {(article.content || '').split('\n').map((para, i) =>
          para.trim() ? <p key={i}>{para}</p> : <br key={i} />
        )}
      </div>
    </div>
  );
}
