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

function generatePostContent(topicObj) {
    const date = new Date().toISOString().split('T')[0];
    const { title, category } = topicObj;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
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
      "author": { "@type": "Organization", "name": "AmazonReach Team" }
    }
    </script>
</head>
<body>
    <!-- Standard Header/Nav would be included here via server-side include or build step -->
    
    <article class="post-content">
        <h1>${title}</h1>
        <p class="post-meta">Published on ${date} • ${category}</p>
        
        <p><strong>Hook:</strong> Why is ${title} trending right now? Because it's a critical component for success in 2026.</p>
        
        <h2>Key Statistics</h2>
        <div class="stat-block">
            "Brands optimizing for ${title} see a significant uplift in conversion." — <em>E-commerce Monthly</em>
        </div>

        <h2>Actionable Strategy</h2>
        <p>Here is how you can leverage this trend:</p>
        <ul>
            <li>Step 1: Audit your current approach to ${category}.</li>
            <li>Step 2: Implement data-driven changes.</li>
            <li>Step 3: Monitor results and iterate.</li>
        </ul>

        <div class="cta-offer">
            <h3>🚀 Scale Faster with AmazonReach</h3>
            <p>Don't guess. Use data. Start your free trial today.</p>
            <a href="/register.html" class="btn">Start Free Trial</a>
        </div>
    </article>
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
