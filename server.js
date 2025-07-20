const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Removed lighthouse for now - we'll add it later
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per windowMs
});
app.use('/api/', limiter);

// SEO Analysis Functions
async function analyzePage(url) {
  try {
    // Get page content
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)' }
    });
    const $ = cheerio.load(response.data);
    
    // Basic SEO checks
    const analysis = {
      url: url,
      title: $('title').text() || 'Missing',
      titleLength: $('title').text().length,
      metaDescription: $('meta[name="description"]').attr('content') || 'Missing',
      metaDescriptionLength: ($('meta[name="description"]').attr('content') || '').length,
      h1Count: $('h1').length,
      h1Text: $('h1').first().text() || 'Missing',
      h2Count: $('h2').length,
      imgCount: $('img').length,
      imgWithoutAlt: $('img').filter((i, el) => !$(el).attr('alt')).length,
      internalLinks: $('a[href^="/"], a[href*="' + new URL(url).hostname + '"]').length,
      externalLinks: $('a[href^="http"]').not('[href*="' + new URL(url).hostname + '"]').length,
      wordCount: $('body').text().replace(/\s+/g, ' ').split(' ').length,
      timestamp: new Date()
    };
    
    // Calculate SEO score
    analysis.seoScore = calculateSEOScore(analysis);
    analysis.recommendations = generateRecommendations(analysis);
    
    return analysis;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

function calculateSEOScore(analysis) {
  let score = 0;
  
  // Title checks (25 points)
  if (analysis.title && analysis.title !== 'Missing') score += 10;
  if (analysis.titleLength >= 30 && analysis.titleLength <= 60) score += 15;
  
  // Meta description (20 points)
  if (analysis.metaDescription && analysis.metaDescription !== 'Missing') score += 10;
  if (analysis.metaDescriptionLength >= 120 && analysis.metaDescriptionLength <= 160) score += 10;
  
  // Headers (20 points)
  if (analysis.h1Count === 1) score += 15;
  if (analysis.h2Count > 0) score += 5;
  
  // Images (15 points)
  if (analysis.imgWithoutAlt === 0 && analysis.imgCount > 0) score += 15;
  
  // Content (20 points)
  if (analysis.wordCount > 300) score += 10;
  if (analysis.wordCount > 1000) score += 10;
  
  return Math.min(score, 100);
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.title === 'Missing') {
    recommendations.push({ type: 'error', text: 'Add a title tag to your page' });
  } else if (analysis.titleLength < 30 || analysis.titleLength > 60) {
    recommendations.push({ type: 'warning', text: 'Title should be 30-60 characters long' });
  }
  
  if (analysis.metaDescription === 'Missing') {
    recommendations.push({ type: 'error', text: 'Add a meta description' });
  } else if (analysis.metaDescriptionLength < 120 || analysis.metaDescriptionLength > 160) {
    recommendations.push({ type: 'warning', text: 'Meta description should be 120-160 characters' });
  }
  
  if (analysis.h1Count === 0) {
    recommendations.push({ type: 'error', text: 'Add an H1 tag to your page' });
  } else if (analysis.h1Count > 1) {
    recommendations.push({ type: 'warning', text: 'Use only one H1 tag per page' });
  }
  
  if (analysis.imgWithoutAlt > 0) {
    recommendations.push({ type: 'warning', text: `${analysis.imgWithoutAlt} images missing alt text` });
  }
  
  if (analysis.wordCount < 300) {
    recommendations.push({ type: 'info', text: 'Consider adding more content (300+ words recommended)' });
  }
  
  return recommendations;
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const analysis = await analyzePage(url);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SEO Analyzer API running on port ${PORT}`);
});