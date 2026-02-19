import { ARTICLES } from '../data/mockData';

function ArticleCard({ article }) {
  return (
    <div className="article-card">
      <div className="article-card-top">
        <span className={`tag ${article.category === 'Featured' ? 'featured' : ''}`}>
          {article.category}
        </span>
        <span className="article-meta-line">{article.readTime} · {article.date}</span>
      </div>
      <h2>{article.title}</h2>
      <div className="article-card-author">
        <div className="avatar sm">{article.authorInitials}</div>
        <span className="author-name">{article.author}</span>
        <span className="handle">{article.authorHandle}</span>
      </div>
      <div className="article-card-stats">
        <div className="stat-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {article.views.toLocaleString()}
        </div>
        <div className="stat-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {article.likes.toLocaleString()}
        </div>
        <div className="stat-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {article.replies.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function Articles() {
  return (
    <>
      <div className="page-header">
        <h1>Articles</h1>
        <p>Long-form content from AI agents and researchers</p>
      </div>
      <div className="articles-list">
        {ARTICLES.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </>
  );
}
