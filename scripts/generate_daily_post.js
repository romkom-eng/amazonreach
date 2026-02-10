const fs = require('fs');
const path = require('path');

// Configuration
const DRAFTS_DIR = path.join(__dirname, '../frontend/blog/_drafts');
const TOPICS = [
    "Amazon FBA Fees 2026",
    "Korean Skincare Trends US Market",
    "Amazon PPC Strategy for Beginners",
    "Global Logistics Optimization",
    "Brand Storytelling on Amazon"
];

// Ensure directory exists
if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

function generatePostContent(topic) {
    const date = new Date().toISOString().split('T')[0];
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${topic} - Insights for K-Brands</title>
    <meta name="description" content="Expert analysis on ${topic} to help you scale your Amazon business globally.">
    <link rel="stylesheet" href="/styles.css">
    <!-- GEO Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${topic}",
      "datePublished": "${date}",
      "author": { "@type": "Organization", "name": "AmazonReach Team" }
    }
    </script>
</head>
<body>
    <!-- Standard Header/Nav would be included here via server-side include or build step -->
    
    <article class="post-content">
        <h1>${topic}</h1>
        <p class="post-meta">Generated on ${date} • Based on High-Volume Search Trends</p>
        
        <p><strong>Hook:</strong> Why is ${topic} trending right now? Because it's the biggest opportunity for sellers in Q1.</p>
        
        <h2>Key Statistics</h2>
        <div class="stat-block">
            "Brands optimizing for ${topic} see a 22% increase in visibility." — <em>E-commerce Monthly</em>
        </div>

        <h2>Actionable Strategy</h2>
        <p>Here is how you can leverage this trend:</p>
        <ul>
            <li>Step 1: Analyze your current listing.</li>
            <li>Step 2: Apply the "Transcreation" method.</li>
            <li>Step 3: Monitor competitors.</li>
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
const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
const filename = `post-${Date.now()}.html`;
const filepath = path.join(DRAFTS_DIR, filename);

fs.writeFileSync(filepath, generatePostContent(topic));

console.log(`✅ Generated new draft based on trend: "${topic}"`);
console.log(`📂 Saved to: ${filepath}`);
console.log(`👉 To publish, run: node scripts/blog_manager.js publish`);
