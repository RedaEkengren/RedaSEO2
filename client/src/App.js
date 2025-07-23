import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios to use your local server
const API_BASE = '';

// Score visualization component
const ScoreCircle = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="score-circle">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={getScoreColor(score)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="score-text">
        <span className="score-number">{score}</span>
        <span className="score-label">SEO Score</span>
      </div>
    </div>
  );
};

// Mini score component for score breakdown
const MiniScore = ({ label, score, maxScore }) => {
  const percentage = (score / maxScore) * 100;
  const getColor = (pct) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="mini-score">
      <div className="mini-score-label">{label}</div>
      <div className="mini-score-bar">
        <div 
          className="mini-score-fill" 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getColor(percentage)
          }}
        />
      </div>
      <div className="mini-score-value">{score}/{maxScore}</div>
    </div>
  );
};

function App() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const analyzeWebsite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, { url });
      setAnalysis(response.data);
      setActiveTab('overview');
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="tab-content overview-tab">
      {/* Score Breakdown */}
      <div className="score-breakdown-section">
        <h3>SEO Score Breakdown</h3>
        <div className="score-breakdown-grid">
          <MiniScore label="Title & Meta" score={analysis.scoreBreakdown.title + analysis.scoreBreakdown.metaDescription} maxScore={30} />
          <MiniScore label="Headings" score={analysis.scoreBreakdown.headings} maxScore={15} />
          <MiniScore label="Content" score={analysis.scoreBreakdown.content} maxScore={15} />
          <MiniScore label="Images" score={analysis.scoreBreakdown.images} maxScore={10} />
          <MiniScore label="Technical" score={analysis.scoreBreakdown.technical} maxScore={10} />
          <MiniScore label="Social" score={analysis.scoreBreakdown.social} maxScore={10} />
          <MiniScore label="Mobile" score={analysis.scoreBreakdown.mobile} maxScore={10} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <span className="stat-value">{analysis.wordCount}</span>
          <span className="stat-label">Words</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🖼️</span>
          <span className="stat-value">{analysis.images.total}</span>
          <span className="stat-label">Images</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔗</span>
          <span className="stat-value">{analysis.links.total}</span>
          <span className="stat-label">Links</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{analysis.headings.h1.count}</span>
          <span className="stat-label">H1 Tags</span>
        </div>
      </div>

      {/* Top Recommendations */}
      <div className="top-recommendations">
        <h3>Top Recommendations</h3>
        {analysis.recommendations.slice(0, 5).map((rec, index) => (
          <div key={index} className={`recommendation ${rec.type}`}>
            <span className={`rec-icon ${rec.type}`}>
              {rec.type === 'error' ? '⚠️' : rec.type === 'warning' ? '⚡' : 'ℹ️'}
            </span>
            <div className="rec-content">
              <p>{rec.text}</p>
              <span className="rec-impact">{rec.impact} impact</span>
            </div>
          </div>
        ))}
        {analysis.recommendations.length > 5 && (
          <button 
            className="view-all-btn"
            onClick={() => setActiveTab('recommendations')}
          >
            View all {analysis.recommendations.length} recommendations →
          </button>
        )}
      </div>
    </div>
  );

  const renderMetaTab = () => (
    <div className="tab-content meta-tab">
      {/* Title Section */}
      <div className="meta-section">
        <h3>Title Tag</h3>
        <div className="meta-item">
          <div className="meta-value">{analysis.title}</div>
          <div className="meta-info">
            <span className={`status-badge ${analysis.titleLength >= 30 && analysis.titleLength <= 60 ? 'good' : 'warning'}`}>
              {analysis.titleLength} characters
            </span>
            <span className="meta-recommendation">Recommended: 30-60 characters</span>
          </div>
        </div>
      </div>

      {/* Meta Description */}
      <div className="meta-section">
        <h3>Meta Description</h3>
        <div className="meta-item">
          <div className="meta-value">
            {analysis.metaDescription === 'Missing' ? <em>No meta description found</em> : analysis.metaDescription}
          </div>
          <div className="meta-info">
            <span className={`status-badge ${analysis.metaDescriptionLength >= 120 && analysis.metaDescriptionLength <= 160 ? 'good' : 'warning'}`}>
              {analysis.metaDescriptionLength} characters
            </span>
            <span className="meta-recommendation">Recommended: 120-160 characters</span>
          </div>
        </div>
      </div>

      {/* Additional Meta Tags */}
      <div className="meta-section">
        <h3>Additional Meta Tags</h3>
        <div className="meta-grid">
          <div className="meta-grid-item">
            <span className="meta-label">Keywords:</span>
            <span className="meta-value-small">{analysis.metaKeywords}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Robots:</span>
            <span className="meta-value-small">{analysis.metaRobots}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Canonical URL:</span>
            <span className="meta-value-small">{analysis.canonicalUrl}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Viewport:</span>
            <span className="meta-value-small">{analysis.viewport}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Charset:</span>
            <span className="meta-value-small">{analysis.charset}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Language:</span>
            <span className="meta-value-small">{analysis.language}</span>
          </div>
        </div>
      </div>

      {/* Open Graph */}
      <div className="meta-section">
        <h3>Open Graph Tags</h3>
        <div className="meta-grid">
          <div className="meta-grid-item">
            <span className="meta-label">OG Title:</span>
            <span className="meta-value-small">{analysis.openGraph.title}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">OG Description:</span>
            <span className="meta-value-small">{analysis.openGraph.description}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">OG Image:</span>
            <span className="meta-value-small">{analysis.openGraph.image}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">OG Type:</span>
            <span className="meta-value-small">{analysis.openGraph.type}</span>
          </div>
        </div>
      </div>

      {/* Twitter Cards */}
      <div className="meta-section">
        <h3>Twitter Cards</h3>
        <div className="meta-grid">
          <div className="meta-grid-item">
            <span className="meta-label">Card Type:</span>
            <span className="meta-value-small">{analysis.twitter.card}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Title:</span>
            <span className="meta-value-small">{analysis.twitter.title}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Description:</span>
            <span className="meta-value-small">{analysis.twitter.description}</span>
          </div>
          <div className="meta-grid-item">
            <span className="meta-label">Image:</span>
            <span className="meta-value-small">{analysis.twitter.image}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContentTab = () => (
    <div className="tab-content content-tab">
      {/* Headings Structure */}
      <div className="content-section">
        <h3>Heading Structure</h3>
        <div className="heading-structure">
          <div className="heading-level">
            <span className="heading-tag">H1</span>
            <span className={`heading-count ${analysis.headings.h1.count === 1 ? 'good' : 'warning'}`}>
              {analysis.headings.h1.count}
            </span>
            {analysis.headings.h1.texts.length > 0 && (
              <div className="heading-texts">
                {analysis.headings.h1.texts.map((text, i) => (
                  <div key={i} className="heading-text">{text}</div>
                ))}
              </div>
            )}
          </div>
          <div className="heading-level">
            <span className="heading-tag">H2</span>
            <span className="heading-count">{analysis.headings.h2.count}</span>
          </div>
          <div className="heading-level">
            <span className="heading-tag">H3</span>
            <span className="heading-count">{analysis.headings.h3.count}</span>
          </div>
          <div className="heading-level">
            <span className="heading-tag">H4</span>
            <span className="heading-count">{analysis.headings.h4.count}</span>
          </div>
          <div className="heading-level">
            <span className="heading-tag">H5</span>
            <span className="heading-count">{analysis.headings.h5.count}</span>
          </div>
          <div className="heading-level">
            <span className="heading-tag">H6</span>
            <span className="heading-count">{analysis.headings.h6.count}</span>
          </div>
        </div>
      </div>

      {/* Content Analysis */}
      <div className="content-section">
        <h3>Content Analysis</h3>
        <div className="content-stats">
          <div className="content-stat">
            <span className="stat-label">Word Count:</span>
            <span className={`stat-value ${analysis.wordCount >= 300 ? 'good' : 'warning'}`}>
              {analysis.wordCount} words
            </span>
          </div>
          <div className="content-stat">
            <span className="stat-label">Content Quality:</span>
            <span className="stat-value">
              {analysis.wordCount >= 1000 ? 'Comprehensive' : 
               analysis.wordCount >= 500 ? 'Good' : 
               analysis.wordCount >= 300 ? 'Adequate' : 'Too short'}
            </span>
          </div>
        </div>
      </div>

      {/* Keyword Density */}
      <div className="content-section">
        <h3>Top Keywords</h3>
        <div className="keyword-list">
          {analysis.keywordDensity.map((keyword, index) => (
            <div key={index} className="keyword-item">
              <span className="keyword-word">{keyword.word}</span>
              <span className="keyword-count">{keyword.count} times</span>
              <span className="keyword-density">{keyword.density}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Images Analysis */}
      <div className="content-section">
        <h3>Images Analysis</h3>
        <div className="images-stats">
          <div className="image-stat">
            <span className="stat-label">Total Images:</span>
            <span className="stat-value">{analysis.images.total}</span>
          </div>
          <div className="image-stat">
            <span className="stat-label">Without Alt Text:</span>
            <span className={`stat-value ${analysis.images.withoutAlt === 0 ? 'good' : 'warning'}`}>
              {analysis.images.withoutAlt}
            </span>
          </div>
          <div className="image-stat">
            <span className="stat-label">With Lazy Loading:</span>
            <span className="stat-value">{analysis.images.withLazyLoad}</span>
          </div>
        </div>
        
        {analysis.images.details.length > 0 && (
          <div className="images-list">
            <h4>Image Details (First 10)</h4>
            {analysis.images.details.map((img, index) => (
              <div key={index} className="image-item">
                <span className="image-src">{img.src}</span>
                <span className={`image-alt ${img.alt ? 'good' : 'warning'}`}>
                  {img.alt || 'No alt text'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Links Analysis */}
      <div className="content-section">
        <h3>Links Analysis</h3>
        <div className="links-stats">
          <div className="link-stat">
            <span className="stat-label">Internal Links:</span>
            <span className="stat-value">{analysis.links.internal}</span>
          </div>
          <div className="link-stat">
            <span className="stat-label">External Links:</span>
            <span className="stat-value">{analysis.links.external}</span>
          </div>
          <div className="link-stat">
            <span className="stat-label">Nofollow Links:</span>
            <span className="stat-value">{analysis.links.nofollow}</span>
          </div>
          <div className="link-stat">
            <span className="stat-label">Broken Anchors:</span>
            <span className={`stat-value ${analysis.links.broken === 0 ? 'good' : 'warning'}`}>
              {analysis.links.broken}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechnicalTab = () => (
    <div className="tab-content technical-tab">
      {/* Security */}
      <div className="tech-section">
        <h3>Security</h3>
        <div className="tech-items">
          <div className="tech-item">
            <span className="tech-label">HTTPS:</span>
            <span className={`tech-value ${analysis.technical.https ? 'good' : 'error'}`}>
              {analysis.technical.https ? '✓ Enabled' : '✗ Not enabled'}
            </span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Mixed Content:</span>
            <span className={`tech-value ${!analysis.technical.mixedContent ? 'good' : 'warning'}`}>
              {analysis.technical.mixedContent ? 'Found' : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="tech-section">
        <h3>Performance Indicators</h3>
        <div className="tech-items">
          <div className="tech-item">
            <span className="tech-label">Inline Styles:</span>
            <span className="tech-value">{analysis.technical.inlineStyles}</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">External CSS:</span>
            <span className="tech-value">{analysis.technical.externalCSS}</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">External JS:</span>
            <span className="tech-value">{analysis.technical.externalJS}</span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Inline JS:</span>
            <span className="tech-value">{analysis.technical.inlineJS}</span>
          </div>
        </div>
      </div>

      {/* Structured Data */}
      <div className="tech-section">
        <h3>Structured Data</h3>
        <div className="tech-items">
          <div className="tech-item">
            <span className="tech-label">Schema.org:</span>
            <span className={`tech-value ${analysis.technical.hasSchema ? 'good' : 'warning'}`}>
              {analysis.technical.hasSchema ? '✓ Found' : '✗ Not found'}
            </span>
          </div>
          {analysis.technical.schemaTypes.length > 0 && (
            <div className="tech-item">
              <span className="tech-label">Schema Types:</span>
              <span className="tech-value">{analysis.technical.schemaTypes.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Optimization */}
      <div className="tech-section">
        <h3>Mobile Optimization</h3>
        <div className="tech-items">
          <div className="tech-item">
            <span className="tech-label">Viewport Meta:</span>
            <span className={`tech-value ${analysis.mobile.hasViewport ? 'good' : 'error'}`}>
              {analysis.mobile.hasViewport ? '✓ Present' : '✗ Missing'}
            </span>
          </div>
          <div className="tech-item">
            <span className="tech-label">Responsive Images:</span>
            <span className={`tech-value ${analysis.mobile.hasResponsiveImages ? 'good' : 'warning'}`}>
              {analysis.mobile.hasResponsiveImages ? '✓ Found' : '✗ Not found'}
            </span>
          </div>
        </div>
      </div>

      {/* Alternate Languages */}
      {analysis.alternateLanguages.length > 0 && (
        <div className="tech-section">
          <h3>Alternate Languages</h3>
          <div className="alt-languages">
            {analysis.alternateLanguages.map((lang, index) => (
              <div key={index} className="alt-language">
                <span className="lang-code">{lang.lang}</span>
                <span className="lang-url">{lang.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="tab-content recommendations-tab">
      <h3>All Recommendations ({analysis.recommendations.length})</h3>
      
      {/* Group recommendations by impact */}
      {['high', 'medium', 'low'].map(impact => {
        const recs = analysis.recommendations.filter(r => r.impact === impact);
        if (recs.length === 0) return null;
        
        return (
          <div key={impact} className="recommendations-group">
            <h4 className={`impact-heading ${impact}`}>
              {impact === 'high' ? '🔴 High Impact' : 
               impact === 'medium' ? '🟡 Medium Impact' : 
               '🟢 Low Impact'}
            </h4>
            {recs.map((rec, index) => (
              <div key={index} className={`recommendation ${rec.type}`}>
                <span className={`rec-icon ${rec.type}`}>
                  {rec.type === 'error' ? '⚠️' : rec.type === 'warning' ? '⚡' : 'ℹ️'}
                </span>
                <div className="rec-content">
                  <p>{rec.text}</p>
                  <div className="rec-meta">
                    <span className="rec-category">{rec.category}</span>
                    <span className="rec-impact">{rec.impact} impact</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="App">
      <header className="app-header">
        <h1>SEO Analyzer</h1>
        <p>Analyze your website's SEO performance instantly</p>
      </header>

      <main className="main-content">
        <form onSubmit={analyzeWebsite} className="url-form">
          <div className="input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              required
              className="url-input"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="analyze-btn"
            >
              {loading ? 'Analyzing...' : 'Analyze SEO'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Analyzing your website's SEO...</p>
          </div>
        )}

        {analysis && (
          <div className="results-container">
            <div className="results-header">
              <h2>SEO Analysis Results</h2>
              <p className="analyzed-url">{analysis.url}</p>
            </div>

            <div className="score-section">
              <ScoreCircle score={analysis.seoScore} />
              <div className="score-description">
                <h3>Overall SEO Score</h3>
                <p>
                  {analysis.seoScore >= 80 ? 'Excellent! Your SEO is well optimized.' :
                   analysis.seoScore >= 60 ? 'Good, but there\'s room for improvement.' :
                   'Needs work. Several SEO issues found.'}
                </p>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-navigation">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'meta' ? 'active' : ''}`}
                onClick={() => setActiveTab('meta')}
              >
                Meta Tags
              </button>
              <button 
                className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                Content
              </button>
              <button 
                className={`tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
                onClick={() => setActiveTab('technical')}
              >
                Technical
              </button>
              <button 
                className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommendations')}
              >
                Recommendations
                <span className="rec-count">{analysis.recommendations.length}</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-container">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'meta' && renderMetaTab()}
              {activeTab === 'content' && renderContentTab()}
              {activeTab === 'technical' && renderTechnicalTab()}
              {activeTab === 'recommendations' && renderRecommendationsTab()}
            </div>

            {/* Export Button */}
            <div className="results-actions">
              <button 
                className="export-btn"
                onClick={() => {
                  const dataStr = JSON.stringify(analysis, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `seo-analysis-${new Date().toISOString().split('T')[0]}.json`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
              >
                Export Analysis (JSON)
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2025 SEO Analyzer - Improve your website's search rankings</p>
      </footer>
    </div>
  );
}

export default App;