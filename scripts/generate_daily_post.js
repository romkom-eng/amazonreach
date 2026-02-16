const fs = require('fs');
const path = require('path');

// Configuration
const DRAFTS_DIR = path.join(__dirname, '../frontend/blog/_drafts');
const TOPICS = [
    { title: "Amazon FBA Fees 2026", category: "Logistics" },
    { title: "Korean Skincare Trends US Market", category: "Trends" },
    { title: "Amazon PPC Strategy for Beginners", category: "Marketing" },
    { title: "Global Logistics Optimization", category: "Logistics" },
    { title: "Brand Storytelling on Amazon", category: "Strategy" },
    { title: "US Consumer Behavior Analysis", category: "Strategy" },
    { title: "Choosing the Right 3PL Partner", category: "Logistics" },
    { title: "Instagram vs TikTok for Amazon Sellers", category: "Marketing" },
    { title: "K-Beauty: Packaging for US Customers", category: "Trends" } // added a few more
];

// Ensure directory exists
if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

const CATEGORY_IMAGES = {
    'Logistics': '/images/blog/logistics-header.png',
    'Marketing': '/images/blog/marketing-header.png',
    'Trends': '/images/blog/trends-header.png',
    'Strategy': '/images/blog/strategy-header.png'
};

function generatePostContent(topicObj) {
    const date = new Date().toISOString().split('T')[0];
    const { title, category } = topicObj;
    const headerImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Strategy'];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - AmazonReach Blog</title>
    <meta name="description" content="Expert analysis on ${title} to help you scale your Amazon business globally.">
    <meta name="category" content="${category}">
    <link rel="stylesheet" href="/styles.css">
    
    <!-- GEO Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${title}",
      "datePublished": "${date}",
      "articleSection": "${category}",
      "image": "${headerImage}",
      "author": { "@type": "Organization", "name": "AmazonReach Team" }
    }
    </script>
    <style>
        .post-header {
            padding: 120px 0 60px;
            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${headerImage}');
            background-size: cover;
            background-position: center;
            text-align: center;
            color: white;
        }
        .post-tag {
            display: inline-block;
            padding: 6px 16px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            color: white;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        .post-title {
            font-size: 42px;
            font-weight: 800;
            color: white;
            max-width: 900px;
            margin: 0 auto 24px;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .post-meta {
            color: rgba(255,255,255,0.8);
            font-size: 16px;
        }
        .post-content {
            max-width: 720px;
            margin: 0 auto;
            padding: 60px 20px;
            font-size: 18px;
            color: #334155;
            line-height: 1.8;
        }
        .post-content h2 {
            font-size: 28px;
            font-weight: 700;
            color: var(--dark);
            margin: 48px 0 24px;
        }
        .stat-block {
            border-left: 4px solid var(--primary);
            padding-left: 20px;
            margin: 32px 0;
            font-style: italic;
            color: var(--dark);
            font-weight: 500;
            background: #F8FAFC;
            padding: 24px;
            border-radius: 0 12px 12px 0;
        }
        .cta-offer {
            /* Removed as per request */
            display: none; 
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="nav">
        <div class="nav-container">
            <div class="nav-logo">
                <a href="/" style="text-decoration: none; display: flex; align-items: center; gap: 12px; color: inherit;">
                    <span class="logo-icon">🚀</span>
                    <span class="logo-text">AmazonReach</span>
                </a>
            </div>
            <div class="nav-links">
                <a href="/#features">Features</a>
                <a href="/#pricing">Pricing</a>
                <a href="/blog/">Blog</a>
                <a href="/reviews.html">Reviews</a>
                <a href="/#about">About</a>
                <a href="/login.html" class="nav-login">Sign In</a>
                <a href="/register.html" class="nav-cta">Start Free Trial</a>
            </div>
        </div>
    </nav>

    <!-- Post Header -->
    <header class="post-header">
        <div class="container">
            <span class="post-tag">${category}</span>
            <h1 class="post-title">${title}</h1>
            <div class="post-meta">
                Published on ${date} • ${category}
            </div>
        </div>
    </header>

    <article class="post-content">
        <p><strong>Hook:</strong> Why is ${title} trending right now? Because it's a critical component for success in 2026.</p>
        
        <h2>Key Statistics</h2>
        <div class="stat-block">
            "Brands optimizing for ${title} see a significant uplift in conversion." — <em>E-commerce Monthly</em>
        </div>

        <h2>Actionable Strategy</h2>
        <p>Here is how you can leverage this trend:</p>
        <ul>
            <li>Step 1: Audit your current approach to ${category}.</li>
            <li>Step 2: Implement data-driven changes using the AmazonReach Dashboard.</li>
            <li>Step 3: Monitor results and iterate based on real-time analytics.</li>
        </ul>
        
        <p>Start optimizing your ${category} strategy today with our comprehensive tools.</p>
    </article>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-brand">
                    <div class="logo">
                        <span class="logo-icon">🚀</span>
                        <span class="logo-text">AmazonReach</span>
                    </div>
                    <p>Scale your Amazon business globally</p>
                </div>
                <div class="footer-links">
                    <div class="footer-column">
                        <h4>Product</h4>
                        <a href="/#features">Features</a>
                        <a href="/#pricing">Pricing</a>
                        <a href="/dashboard/dashboard.html">Dashboard</a>
                    </div>
                    <div class="footer-column">
                        <h4>Company</h4>
                        <a href="/#about">About</a>
                        <a href="/blog/">Blog</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 AmazonReach. All rights reserved.</p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

// Main execution
const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
const filename = `post-${Date.now()}.html`;
const filepath = path.join(DRAFTS_DIR, filename);

fs.writeFileSync(filepath, generatePostContent(randomTopic));

console.log(`✅ Generated new draft based on trend: "${topic}"`);
console.log(`📂 Saved to: ${filepath}`);
console.log(`👉 To publish, run: node scripts/blog_manager.js publish`);
