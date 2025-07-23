const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// RateLimit
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();

// Trust proxy för DigitalOcean
app.set('trust proxy', 1);

// Basic middleware
app.use(cors());
app.use(express.json());

// Rate limiter med KORREKT IP-detektering för Cloudflare/DigitalOcean
const analyzeRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 analyser per IP
  
  // CUSTOM keyGenerator som tar FÖRSTA IP från x-forwarded-for
  keyGenerator: (req, res) => {
    // pick the first IP from x‑forwarded‑for, or fall back
    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded
      ? forwarded.split(',')[0].trim()
      : req.ip;
    
    req.ip = clientIP;
    console.log(`🔑 Rate limit key: ${clientIP}`);
    // Delegate to the IPv6‑safe helper
    return ipKeyGenerator(req, res);
  },
  message: { error: 'Du har nått dagens gräns på 10 analyser. Försök igen imorgon!' },
  standardHeaders: true,
  legacyHeaders: false,
  legacyMemoryStore: true
});

// DEBUG middleware - ta bort efter test
app.use('/api/analyze', (req, res, next) => {
  console.log(`🔍 Request IP: ${req.ip}`);
  console.log(`🕐 Time: ${new Date()}`);
  next();
});

// Enhanced SEO analysis function
async function analyzePage(url) {
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0; +https://seoanalyze.se)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    const finalUrl = response.request.res.responseUrl || url;
    
    // Basic Meta Tags
    const title = $('title').text().trim() || 'Missing';
    const titleLength = title.length;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 'Missing';
    const metaDescriptionLength = metaDescription === 'Missing' ? 0 : metaDescription.length;
    const metaKeywords = $('meta[name="keywords"]').attr('content')?.trim() || 'Missing';
    const metaRobots = $('meta[name="robots"]').attr('content')?.trim() || 'Not specified';
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || 'Missing';
    const viewport = $('meta[name="viewport"]').attr('content') || 'Missing';
    const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || 'Not specified';
    
    // Open Graph Tags
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || 'Missing';
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || 'Missing';
    const ogImage = $('meta[property="og:image"]').attr('content') || 'Missing';
    const ogType = $('meta[property="og:type"]').attr('content') || 'Missing';
    const ogUrl = $('meta[property="og:url"]').attr('content') || 'Missing';
    
    // Twitter Cards
    const twitterCard = $('meta[name="twitter:card"]').attr('content') || 'Missing';
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || 'Missing';
    const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || 'Missing';
    const twitterImage = $('meta[name="twitter:image"]').attr('content') || 'Missing';
    
    // Language and Localization
    const htmlLang = $('html').attr('lang') || 'Missing';
    const alternateLanguages = [];
    $('link[rel="alternate"][hreflang]').each((i, elem) => {
      alternateLanguages.push({
        lang: $(elem).attr('hreflang'),
        url: $(elem).attr('href')
      });
    });
    
    // Headings Analysis
    const h1Count = $('h1').length;
    const h1Texts = [];
    $('h1').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) h1Texts.push(text);
    });
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const h4Count = $('h4').length;
    const h5Count = $('h5').length;
    const h6Count = $('h6').length;
    
    // **NEW: Check heading hierarchy (no level skipping)**
    const headingLevels = $('h1,h2,h3,h4,h5,h6').map((i, el) => +el.tagName[1]).get();
    let hasHeadingSkip = false;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i-1] > 1) {
        hasHeadingSkip = true;
        break;
      }
    }
    
    // Content Analysis
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(word => word.length > 0).length;
    
    // Keyword Density Analysis (top 10 keywords)
    const words = bodyText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Ignore short words
    
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    const keywordDensity = Object.entries(wordFrequency)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / words.length) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // **NEW: Focus keyword analysis**
    const focusKeyword = keywordDensity[0]?.word || '';
    const hasFocusInTitle = focusKeyword && title.toLowerCase().includes(focusKeyword);
    const hasFocusInMeta = focusKeyword && metaDescription.toLowerCase().includes(focusKeyword);
    
    // Images Analysis
    const images = [];
    $('img').each((i, elem) => {
      const img = $(elem);
      images.push({
        src: img.attr('src') || 'Missing',
        alt: img.attr('alt') || '',
        title: img.attr('title') || '',
        width: img.attr('width') || 'Not specified',
        height: img.attr('height') || 'Not specified',
        loading: img.attr('loading') || 'Not specified'
      });
    });
    
    const imgCount = images.length;
    const imgWithoutAlt = images.filter(img => !img.alt).length;
    const imgWithLazyLoad = images.filter(img => img.loading === 'lazy').length;
    
    // **NEW: Check for oversized images (>300KB)**
    const checkImageSize = async (imgSrc) => {
      try {
        const fullUrl = new URL(imgSrc, finalUrl).href;
        const response = await axios.head(fullUrl, { timeout: 8000 });
        const contentLength = parseInt(response.headers['content-length'] || '0');
        return contentLength;
      } catch (error) {
        return 0; // Unable to determine size
      }
    };
    
    let oversizedImages = 0;
    let imageCheckPromises = [];
    
    // Check first 10 images for performance
    for (let i = 0; i < Math.min(images.length, 10); i++) {
      const img = images[i];
      if (img.src && img.src !== 'Missing' && !img.src.startsWith('data:')) {
        imageCheckPromises.push(
          checkImageSize(img.src).then(size => {
            if (size > 300000) { // 300KB
              oversizedImages++;
              images[i].oversized = true;
              images[i].size = size;
            }
            return size;
          }).catch(() => 0)
        );
      }
    }
    
    // Wait for image size checks (with timeout)
    try {
      await Promise.allSettled(imageCheckPromises);
    } catch (error) {
      console.log('Some image size checks failed:', error);
    }
    
    // Links Analysis
    const links = [];
    $('a[href]').each((i, elem) => {
      const link = $(elem);
      const href = link.attr('href');
      if (href) {
        links.push({
          href,
          text: link.text().trim(),
          title: link.attr('title') || '',
          rel: link.attr('rel') || '',
          target: link.attr('target') || ''
        });
      }
    });
    
    const internalLinks = links.filter(link => {
      const href = link.href;
      return href.startsWith('/') || href.includes(new URL(finalUrl).hostname);
    }).length;
    
    const externalLinks = links.filter(link => {
      const href = link.href;
      return href.startsWith('http') && !href.includes(new URL(finalUrl).hostname);
    }).length;
    
    const nofollowLinks = links.filter(link => link.rel.includes('nofollow')).length;
    const brokenAnchors = links.filter(link => link.href === '#' || link.href === '').length;
    
    // Schema.org / Structured Data
    const schemaScripts = [];
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const schema = JSON.parse($(elem).text());
        schemaScripts.push(schema);
      } catch (e) {
        // Invalid JSON
      }
    });
    const hasSchema = schemaScripts.length > 0;
    const schemaTypes = schemaScripts.map(s => s['@type']).filter(Boolean);
    
    // Performance Indicators
    const inlineStyles = $('style').length + $('[style]').length;
    const externalCSS = $('link[rel="stylesheet"]').length;
    const externalJS = $('script[src]').length;
    const inlineJS = $('script:not([src])').length - schemaScripts.length; // Exclude schema scripts
    
    // Mobile & Responsive
    const hasViewport = viewport !== 'Missing';
    const hasResponsiveImages = images.some(img => 
      img.src.includes('srcset') || $(`img[src="${img.src}"]`).attr('srcset')
    );
    
    // Security
    const hasHTTPS = finalUrl.startsWith('https://');
    const mixedContent = hasHTTPS && (
      images.some(img => img.src.startsWith('http://')) ||
      links.some(link => link.href.startsWith('http://'))
    );
    
    // SEO Score Calculation (Enhanced)
    let score = 0;
    const scoreBreakdown = {
      title: 0,
      metaDescription: 0,
      headings: 0,
      content: 0,
      images: 0,
      technical: 0,
      social: 0,
      mobile: 0
    };
    
    // Title scoring (15 points)
    if (title !== 'Missing') {
      scoreBreakdown.title += 7;
      if (titleLength >= 30 && titleLength <= 60) scoreBreakdown.title += 5;
      else if (titleLength > 0 && titleLength < 30) scoreBreakdown.title += 2;
      else if (titleLength > 60 && titleLength <= 70) scoreBreakdown.title += 2;
      
      // **NEW: Focus keyword in title bonus**
      if (hasFocusInTitle) scoreBreakdown.title += 3;
    }
    
    // Meta Description scoring (15 points)
    if (metaDescription !== 'Missing') {
      scoreBreakdown.metaDescription += 7;
      if (metaDescriptionLength >= 120 && metaDescriptionLength <= 160) scoreBreakdown.metaDescription += 5;
      else if (metaDescriptionLength >= 50 && metaDescriptionLength < 120) scoreBreakdown.metaDescription += 2;
      else if (metaDescriptionLength > 160 && metaDescriptionLength <= 200) scoreBreakdown.metaDescription += 2;
      
      // **NEW: Focus keyword in meta description bonus**
      if (hasFocusInMeta) scoreBreakdown.metaDescription += 3;
    }
    
    // Headings scoring (15 points)
    if (h1Count === 1) scoreBreakdown.headings += 10;
    else if (h1Count === 2) scoreBreakdown.headings += 5;
    if (h2Count > 0) scoreBreakdown.headings += 2;
    
    // **NEW: Heading hierarchy bonus**
    if (!hasHeadingSkip && headingLevels.length > 1) scoreBreakdown.headings += 3;
    
    // Content scoring (15 points)
    if (wordCount >= 300) scoreBreakdown.content += 10;
    else if (wordCount >= 150) scoreBreakdown.content += 5;
    if (keywordDensity.length >= 5) scoreBreakdown.content += 5;
    
    // Images scoring (10 points)
    if (imgCount > 0) {
      scoreBreakdown.images += 3;
      if (imgWithoutAlt === 0) scoreBreakdown.images += 4;
      else if (imgWithoutAlt < imgCount * 0.2) scoreBreakdown.images += 2;
      
      // **NEW: Penalty for oversized images**
      if (oversizedImages === 0) scoreBreakdown.images += 3;
      else if (oversizedImages < imgCount * 0.3) scoreBreakdown.images += 1;
    }
    
    // Technical SEO scoring (10 points)
    if (hasHTTPS) scoreBreakdown.technical += 3;
    if (canonicalUrl !== 'Missing') scoreBreakdown.technical += 2;
    if (hasSchema) scoreBreakdown.technical += 3;
    if (metaRobots !== 'Missing') scoreBreakdown.technical += 2;
    
    // Social scoring (10 points)
    if (ogTitle !== 'Missing' && ogDescription !== 'Missing') scoreBreakdown.social += 5;
    if (ogImage !== 'Missing') scoreBreakdown.social += 3;
    if (twitterCard !== 'Missing') scoreBreakdown.social += 2;
    
    // Mobile scoring (10 points)
    if (hasViewport) scoreBreakdown.mobile += 7;
    if (hasResponsiveImages) scoreBreakdown.mobile += 3;
    
    // Calculate total score
    score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
    
    // Generate Recommendations
    const recommendations = [];
    
    // Title recommendations
    if (title === 'Missing') {
      recommendations.push({ 
        type: 'error', 
        category: 'title',
        text: 'Lägg till en title-tagg på din sida',
        impact: 'high'
      });
    } else if (titleLength < 30) {
      recommendations.push({ 
        type: 'warning', 
        category: 'title',
        text: 'Din title är för kort. Sikta på 30-60 tecken för bästa resultat',
        impact: 'medium'
      });
    } else if (titleLength > 60) {
      recommendations.push({ 
        type: 'warning', 
        category: 'title',
        text: 'Din title är för lång och kan bli avklippt i sökresultaten',
        impact: 'medium'
      });
    }
    
    // **NEW: Focus keyword in title recommendation**
    if (focusKeyword && !hasFocusInTitle) {
      recommendations.push({
        type: 'info',
        category: 'title',
        text: `Överväg att inkludera ditt huvudnyckelord "${focusKeyword}" i title-taggen`,
        impact: 'medium'
      });
    }
    
    // Meta description recommendations
    if (metaDescription === 'Missing') {
      recommendations.push({ 
        type: 'error', 
        category: 'meta',
        text: 'Lägg till en meta description för att förbättra klickfrekvensen',
        impact: 'high'
      });
    } else if (metaDescriptionLength < 120) {
      recommendations.push({ 
        type: 'warning', 
        category: 'meta',
        text: 'Din meta description är för kort. Använd 120-160 tecken',
        impact: 'medium'
      });
    } else if (metaDescriptionLength > 160) {
      recommendations.push({ 
        type: 'warning', 
        category: 'meta',
        text: 'Din meta description är för lång och kommer klippas av',
        impact: 'medium'
      });
    }
    
    // **NEW: Focus keyword in meta description recommendation**
    if (focusKeyword && !hasFocusInMeta && metaDescription !== 'Missing') {
      recommendations.push({
        type: 'info',
        category: 'meta',
        text: `Överväg att inkludera ditt huvudnyckelord "${focusKeyword}" i meta description`,
        impact: 'medium'
      });
    }
    
    // Heading recommendations
    if (h1Count === 0) {
      recommendations.push({ 
        type: 'error', 
        category: 'headings',
        text: 'Lägg till en H1-rubrik på din sida',
        impact: 'high'
      });
    } else if (h1Count > 1) {
      recommendations.push({ 
        type: 'warning', 
        category: 'headings',
        text: `Du har ${h1Count} H1-rubriker. Använd endast en H1 per sida`,
        impact: 'medium'
      });
    }
    
    // **NEW: Heading hierarchy recommendation**
    if (hasHeadingSkip) {
      recommendations.push({
        type: 'warning',
        category: 'headings',
        text: 'Rubriker hoppar över nivåer (t.ex. H2 → H4). Behåll logisk hierarki.',
        impact: 'medium'
      });
    }
    
    if (h2Count === 0) {
      recommendations.push({ 
        type: 'info', 
        category: 'headings',
        text: 'Överväg att lägga till H2-rubriker för bättre struktur',
        impact: 'low'
      });
    }
    
    // Content recommendations
    if (wordCount < 300) {
      recommendations.push({ 
        type: 'warning', 
        category: 'content',
        text: `Din sida har endast ${wordCount} ord. Sikta på minst 300 ord för bättre SEO`,
        impact: 'high'
      });
    }
    
    // Image recommendations
    if (imgWithoutAlt > 0) {
      recommendations.push({ 
        type: 'error', 
        category: 'images',
        text: `${imgWithoutAlt} bilder saknar alt-text. Detta påverkar tillgänglighet och SEO`,
        impact: 'medium'
      });
    }
    
    // **NEW: Oversized images recommendation**
    if (oversizedImages > 0) {
      recommendations.push({
        type: 'warning',
        category: 'images',
        text: `${oversizedImages} bilder är större än 300KB. Komprimera för snabbare laddning`,
        impact: 'medium'
      });
    }
    
    if (imgCount > 5 && imgWithLazyLoad === 0) {
      recommendations.push({ 
        type: 'info', 
        category: 'images',
        text: 'Överväg lazy loading för bilder för bättre prestanda',
        impact: 'low'
      });
    }
    
    // Technical recommendations
    if (!hasHTTPS) {
      recommendations.push({ 
        type: 'error', 
        category: 'technical',
        text: 'Din sida använder inte HTTPS. Detta påverkar säkerhet och ranking',
        impact: 'high'
      });
    }
    
    if (canonicalUrl === 'Missing') {
      recommendations.push({ 
        type: 'info', 
        category: 'technical',
        text: 'Lägg till en canonical URL för att undvika duplicate content',
        impact: 'medium'
      });
    }
    
    if (!hasSchema) {
      recommendations.push({ 
        type: 'info', 
        category: 'technical',
        text: 'Lägg till strukturerad data (Schema.org) för rikare sökresultat',
        impact: 'medium'
      });
    }
    
    if (htmlLang === 'Missing') {
      recommendations.push({ 
        type: 'warning', 
        category: 'technical',
        text: 'Ange språk med lang-attribut på html-taggen',
        impact: 'medium'
      });
    }
    
    // Social recommendations
    if (ogTitle === 'Missing' || ogDescription === 'Missing') {
      recommendations.push({ 
        type: 'info', 
        category: 'social',
        text: 'Lägg till Open Graph-taggar för bättre delning på sociala medier',
        impact: 'low'
      });
    }
    
    if (ogImage === 'Missing') {
      recommendations.push({ 
        type: 'info', 
        category: 'social',
        text: 'Lägg till en Open Graph-bild för attraktivare delningar',
        impact: 'low'
      });
    }
    
    // Mobile recommendations
    if (!hasViewport) {
      recommendations.push({ 
        type: 'error', 
        category: 'mobile',
        text: 'Saknar viewport meta-tagg. Din sida är inte mobiloptimerad',
        impact: 'high'
      });
    }
    
    // Link recommendations
    if (brokenAnchors > 0) {
      recommendations.push({ 
        type: 'warning', 
        category: 'links',
        text: `${brokenAnchors} länkar saknar destination (href="#" eller tomt)`,
        impact: 'low'
      });
    }
    
    if (externalLinks > 0 && nofollowLinks === 0) {
      recommendations.push({ 
        type: 'info', 
        category: 'links',
        text: 'Överväg att använda rel="nofollow" på externa länkar du inte vill ge link juice',
        impact: 'low'
      });
    }
    
    // Sort recommendations by impact
    const impactOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
    
    // Return comprehensive analysis
    return {
      url: finalUrl,
      timestamp: new Date(),
      
      // Basic Info
      title,
      titleLength,
      metaDescription,
      metaDescriptionLength,
      metaKeywords,
      metaRobots,
      canonicalUrl,
      viewport,
      charset,
      language: htmlLang,
      alternateLanguages,
      
      // **NEW: Focus keyword analysis**
      focusKeyword,
      hasFocusInTitle,
      hasFocusInMeta,
      
      // Headings
      headings: {
        h1: { count: h1Count, texts: h1Texts },
        h2: { count: h2Count },
        h3: { count: h3Count },
        h4: { count: h4Count },
        h5: { count: h5Count },
        h6: { count: h6Count },
        hasSkip: hasHeadingSkip // **NEW**
      },
      
      // Content
      wordCount,
      keywordDensity,
      
      // Images
      images: {
        total: imgCount,
        withoutAlt: imgWithoutAlt,
        withLazyLoad: imgWithLazyLoad,
        oversized: oversizedImages, // **NEW**
        details: images.slice(0, 10) // First 10 images
      },
      
      // Links
      links: {
        internal: internalLinks,
        external: externalLinks,
        nofollow: nofollowLinks,
        broken: brokenAnchors,
        total: links.length
      },
      
      // Social Media
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        type: ogType,
        url: ogUrl
      },
      
      twitter: {
        card: twitterCard,
        title: twitterTitle,
        description: twitterDescription,
        image: twitterImage
      },
      
      // Technical SEO
      technical: {
        https: hasHTTPS,
        mixedContent,
        hasSchema,
        schemaTypes,
        inlineStyles,
        externalCSS,
        externalJS,
        inlineJS
      },
      
      // Mobile
      mobile: {
        hasViewport,
        hasResponsiveImages
      },
      
      // Scores
      seoScore: Math.min(score, 100),
      scoreBreakdown,
      
      // Recommendations
      recommendations
    };
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    message: 'SEO Analyzer API is running!'
  });
});

// Debug endpoint - ta bort efter test
app.get('/api/debug-ip', (req, res) => {
  res.json({
    detectedIP: req.ip,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    },
    connection: req.connection.remoteAddress
  });
});

// Analyze route med rate limiting
app.post('/api/analyze', analyzeRateLimit, async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log(`✅ Request allowed for IP: ${req.ip}`);
    if (req.rateLimit) {
      console.log(`📊 Remaining: ${req.rateLimit.remaining}/${req.rateLimit.limit}`);
    }
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL
    let validatedUrl;
    try {
      validatedUrl = new URL(url);
      if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format. Please include http:// or https://' });
    }
    
    const analysis = await analyzePage(validatedUrl.href);
    res.json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if React build exists
const buildPath = path.join(__dirname, 'client', 'build');
const indexPath = path.join(buildPath, 'index.html');

console.log('Checking for React build...');
console.log('Build path:', buildPath);
console.log('Index path:', indexPath);
console.log('Build exists:', fs.existsSync(buildPath));
console.log('Index exists:', fs.existsSync(indexPath));

// Serve React static files if they exist
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('✅ Serving React app from:', buildPath);
}

// Results page BEFORE the wildcard
app.get('/results', (req, res) => {
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: 'React build not available' });
});

// Final catch‑all – MUST be the very last route
// `/{*splat}` also matches the root path `/`
app.get('/{*splat}', (req, res) => {
     if (req.path.startsWith('/api')) {
       return res.status(404).json({ error: 'API endpoint not found' });
     }
     if (fs.existsSync(indexPath)) {
       return res.sendFile(indexPath);
     }
     res.status(404).json({ error: 'React app not built' });
   });

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).json({ 
      error: 'Page not found',
      availableRoutes: ['/', '/api/health', '/api/analyze', '/results']
    });
  }
});