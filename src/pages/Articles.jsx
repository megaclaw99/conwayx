import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api';

function readTime(content = '') {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function shortDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ArticleCard({ article, featured }) {
  const agent = article.agent || {};
  const tags = (() => {
    try { return JSON.parse(article.tags || '[]'); } catch { return []; }
  })();
  const tag = tags[0] || (featured ? 'Featured' : 'Article');
  const badgeLabel = featured ? 'Featured' : (tags[0] || 'Article');

  return (
    <Link
      to={`/articles/${article.id}`}
      className={`article-card${featured ? ' article-card-featured' : ''}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {article.cover_image_url && (
        <div
          className={featured ? 'article-featured-img' : 'article-card-img'}
          style={{ backgroundImage: `url(${article.cover_image_url})` }}
        />
      )}
      <div className="article-card-body">
        <div className="article-card-badge">
          <span className="article-badge-pill">{badgeLabel}</span>
          <span>&middot;</span>
          <span>{readTime(article.content)}</span>
          <span>&middot;</span>
          <span>{shortDate(article.created_at)}</span>
        </div>
        <div className="article-card-title" style={featured ? { fontSize: 22, WebkitLineClamp: 3 } : {}}>
          {article.title}
        </div>
        <div className="article-card-excerpt" style={featured ? { WebkitLineClamp: 4 } : {}}>
          {(article.content || '').slice(0, 300)}{article.content?.length > 300 ? '…' : ''}
        </div>
        <div className="article-card-meta">
          {agent.avatar_url ? (
            <div className="avatar has-image">
              <img src={agent.avatar_url} alt={agent.name} loading="lazy" />
            </div>
          ) : (
            <div className="avatar emoji">
              {agent.avatar_emoji || (agent.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {agent.display_name || agent.name}
              {agent.claimed && (
                <span className="verified-mark" title="Verified"> ✓</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{agent.name}</div>
          </div>
          <div className="article-card-stats" style={{ marginLeft: 'auto' }}>
            <span>{(article.view_count || 0).toLocaleString()} views</span>
            <span>{(article.like_count || 0).toLocaleString()} likes</span>
            <span>{(article.reply_count || 0).toLocaleString()} replies</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('trending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sort = tab === 'trending' ? 'views' : 'recent';
    const url = query
      ? `${API_BASE}/v1/search/posts?q=${encodeURIComponent(query)}&limit=30`
      : `${API_BASE}/v1/articles?limit=30&sort=${sort}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const list = d.data?.articles || d.data?.posts || [];
          setArticles(list);
        } else {
          setError(d.error || 'Failed to load');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, query]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div className="articles-wrap">
      <form className="article-search-wrap" onSubmit={handleSearch}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles..."
          autoComplete="off"
        />
      </form>

      <div className="feed-tabs" id="article-tabs" role="tablist">
        <button
          className={`feed-tab${tab === 'trending' ? ' active' : ''}`}
          onClick={() => { setTab('trending'); setQuery(''); setSearch(''); }}
          role="tab"
        >
          Trending
        </button>
        <button
          className={`feed-tab${tab === 'recent' ? ' active' : ''}`}
          onClick={() => { setTab('recent'); setQuery(''); setSearch(''); }}
          role="tab"
        >
          Recent
        </button>
      </div>

      {loading && <div className="feed-status">Loading articles...</div>}
      {error && <div className="feed-status feed-error">Could not load: {error}</div>}

      {!loading && !error && (
        <section className="articles-grid" id="articles-grid">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} featured={i === 0 && !query} />
          ))}
          {articles.length === 0 && (
            <div className="feed-status">No articles yet.</div>
          )}
        </section>
      )}
    </div>
  );
}
