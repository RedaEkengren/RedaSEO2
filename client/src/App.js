import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios to use your local server
const API_BASE = 'http://localhost:5000';

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

function App() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeWebsite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await axios.post(`${API_BASE}/api/analyze`, { url });
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Title Tag</h4>
                <p className="metric-value">{analysis.title}</p>
                <span className={`metric-status ${analysis.titleLength >= 30 && analysis.titleLength <= 60 ? 'good' : 'warning'}`}>
                  {analysis.titleLength} characters
                </span>
              </div>

              <div className="metric-card">
                <h4>Meta Description</h4>
                <p className="metric-value">
                  {analysis.metaDescription === 'Missing' ? 'Not found' : analysis.metaDescription}
                </p>
                <span className={`metric-status ${analysis.metaDescriptionLength >= 120 && analysis.metaDescriptionLength <= 160 ? 'good' : 'warning'}`}>
                  {analysis.metaDescriptionLength} characters
                </span>
              </div>

              <div className="metric-card">
                <h4>Headings</h4>
                <p className="metric-value">H1: {analysis.h1Count}, H2: {analysis.h2Count}</p>
                <span className={`metric-status ${analysis.h1Count === 1 ? 'good' : 'warning'}`}>
                  {analysis.h1Count === 1 ? 'Perfect' : analysis.h1Count === 0 ? 'Missing H1' : 'Multiple H1s'}
                </span>
              </div>

              <div className="metric-card">
                <h4>Images</h4>
                <p className="metric-value">{analysis.imgCount} total images</p>
                <span className={`metric-status ${analysis.imgWithoutAlt === 0 ? 'good' : 'warning'}`}>
                  {analysis.imgWithoutAlt} missing alt text
                </span>
              </div>

              <div className="metric-card">
                <h4>Content</h4>
                <p className="metric-value">{analysis.wordCount} words</p>
                <span className={`metric-status ${analysis.wordCount >= 300 ? 'good' : 'warning'}`}>
                  {analysis.wordCount >= 300 ? 'Good length' : 'Too short'}
                </span>
              </div>

              <div className="metric-card">
                <h4>Links</h4>
                <p className="metric-value">
                  Internal: {analysis.internalLinks}, External: {analysis.externalLinks}
                </p>
                <span className="metric-status good">Analyzed</span>
              </div>
            </div>

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="recommendations">
                <h3>Recommendations</h3>
                <ul>
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className={`recommendation ${rec.type}`}>
                      <span className={`rec-icon ${rec.type}`}>
                        {rec.type === 'error' ? '⚠️' : rec.type === 'warning' ? '⚡' : 'ℹ️'}
                      </span>
                      {rec.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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