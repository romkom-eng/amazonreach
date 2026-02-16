const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../frontend/blog');
const SITEMAP_PATH = path.join(__dirname, '../frontend/sitemap.xml');
const DRAFTS_DIR = path.join(__dirname, '../frontend/blog/_drafts');

// Categories color mapping
const CATEGORY_COLORS = {
    'Logistics': ['#10B981', '#34d399'], // Green
    'Marketing': ['#F59E0B', '#fbbf24'], // Amber
    'Trends': ['#6366F1', '#818cf8'], // Indigo
    'Strategy': ['#EC4899', '#f472b6'], // Pink
    'Default': ['#64748B', '#94a3b8']  // Slate
};

function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Default'];
}

// Ensure drafts dir exists
if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

function extractMetadata(content) {
    // Regex to extract title, date, description, category
    const titleMatch = content.match(/<title>(.*?) -/);
    const descMatch = content.match(/<meta name="description" content="(.*?)">/);
    const catMatch = content.match(/<meta name="category" content="(.*?)">/);

    // If no category meta, try to infer or default
    let category = catMatch ? catMatch[1] : 'Strategy';

    return {
        title: titleMatch ? titleMatch[1] : 'New Post',
        excerpt: descMatch ? descMatch[1] : 'Click to read more...',
        category: category
    };
}

// Function to inject filter scripts if missing
function injectFilterLogic(html) {
    if (html.includes('function filterPosts')) return html;

    const script = `
    <script>
        function filterPosts(category) {
            const posts = document.querySelectorAll('.blog-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update active button
            buttons.forEach(btn => {
                if (btn.innerText === category || (category === 'All' && btn.innerText === 'All')) {
                    btn.classList.add('active');
                    btn.style.backgroundColor = 'var(--primary)';
                    btn.style.color = 'white';
                } else {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = 'white';
                    btn.style.color = 'var(--dark)';
                }
            });

            posts.forEach(post => {
                if (category === 'All' || post.dataset.category === category) {
                    post.style.display = 'flex';
                } else {
                    post.style.display = 'none';
                }
            });
        }
    </script>`;

    return html.replace('</head>', `${script}\n</head>`);
}

// Image mapping (shared with generator)
const CATEGORY_IMAGES = {
    'Logistics': '/images/blog/logistics-header.png',
    'Marketing': '/images/blog/marketing-header.png',
    'Trends': '/images/blog/trends-header.png',
    'Strategy': '/images/blog/strategy-header.png'
};

function rebuildBlogIndex(postsMetadata) {
    const indexPath = path.join(__dirname, '../frontend/blog/index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Generate Grid HTML
    // IMPORTANT: removed generateFilterButtons() from here to avoid duplication if it's already in the "section" wrapper
    let gridHtml = generateFilterButtons() + '\n<div class="blog-grid">\n';

    postsMetadata.forEach(post => {
        // Use image if available, otherwise fallback to gradient (though we have images now)
        const imgSrc = CATEGORY_IMAGES[post.category] || CATEGORY_IMAGES['Strategy'];

        // We will use a background image style for the card header
        const card = `
            <article class="blog-card" data-category="${post.category}">
                <div class="blog-image"
                    style="background-image: url('${imgSrc}'); display: flex; align-items: center; justify-content: center; color: white;">
                    <!-- Removed emoji to show image clearly -->
                </div>
                <div class="blog-content">
                    <span class="blog-tag">${post.category}</span>
                    <h2 class="blog-title">${post.title}</h2>
                    <p class="blog-excerpt">${post.excerpt}</p>
                    <div class="blog-meta">
                        <span>${post.date}</span>
                        <a href="${post.filename}" class="read-more">Read Article →</a>
                    </div>
                </div>
            </article>`;
        gridHtml += card;
    });

    gridHtml += '\n</div>';

    // Inject Filter Logic
    indexContent = injectFilterLogic(indexContent);

    // Replace the entire blog main section
    // We target the area between "<!-- Blog Grid -->" and "<!-- Footer -->" to be safe and clean
    // Or we can target the container.
    // The previous issue was that we were appending buttons inside the container, potentially twice.

    // Strategy: Reconstruct the *entire* main content area
    // Find <section class="container"> that follows <!-- Blog Grid -->

    const blogGridMarker = '<!-- Blog Grid -->';
    const footerMarker = '<!-- Footer -->';

    const startIndex = indexContent.indexOf(blogGridMarker);
    const endIndex = indexContent.indexOf(footerMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        const before = indexContent.substring(0, startIndex + blogGridMarker.length);
        const after = indexContent.substring(endIndex);

        const newSection = `
    <section class="container" style="padding-top: 40px;">
        ${gridHtml}
    </section>
    `;

        indexContent = before + '\n' + newSection + '\n' + after;
    } else {
        console.warn("Could not find Blog Grid markers. Falling back to simple replacement.");
        const sectionRegex = /<section class="container">[\s\S]*?<\/section>/g;
        // This is risky because there might be other sections. 
        // But in index.html there is usually only one main container for blog.
        // Let's assume the one containing .blog-grid or .filter-container

        const gridRegex = /<div class="blog-grid">[\s\S]*?<\/div>/;
        if (gridRegex.test(indexContent)) {
            // We need to also remove existing filter buttons if we just replace the grid
            // Crude fix: Remove any existing .filter-container
            indexContent = indexContent.replace(/<div class="filter-container"[\s\S]*?<\/div>/g, '');

            // Now replace grid with Buttons + Grid
            indexContent = indexContent.replace(gridRegex, gridHtml);
        }
    }

    fs.writeFileSync(indexPath, indexContent);
    console.log(`✅ Fully Rebuilt index.html with ${postsMetadata.length} posts`);
}


// Function to generate filter buttons HTML
function generateFilterButtons() {
    return `
    <div class="filter-container" style="display: flex; gap: 10px; justify-content: center; margin-bottom: 40px; flex-wrap: wrap;">
        <button class="filter-btn" onclick="filterPosts('All')" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-weight: 500;">All</button>
        <button class="filter-btn" onclick="filterPosts('Logistics')" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-weight: 500;">Logistics</button>
        <button class="filter-btn" onclick="filterPosts('Marketing')" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-weight: 500;">Marketing</button>
        <button class="filter-btn" onclick="filterPosts('Trends')" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-weight: 500;">Trends</button>
        <button class="filter-btn" onclick="filterPosts('Strategy')" style="padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; font-weight: 500;">Strategy</button>
    </div>`;
}

// Topics for regeneration
const TOPICS = [
    { title: "Amazon FBA Fees 2026", category: "Logistics" },
    { title: "Korean Skincare Trends US Market", category: "Trends" },
    { title: "Amazon PPC Strategy for Beginners", category: "Marketing" },
    { title: "Global Logistics Optimization", category: "Logistics" },
    { title: "Brand Storytelling on Amazon", category: "Strategy" },
    { title: "US Consumer Behavior Analysis", category: "Strategy" },
    { title: "Choosing the Right 3PL Partner", category: "Logistics" },
    { title: "Instagram vs TikTok for Amazon Sellers", category: "Marketing" },
    { title: "K-Beauty: Packaging for US Customers", category: "Trends" },
    { title: "Optimizing for Voice Search", category: "Trends" },
    { title: "Sustainability in E-commerce", category: "Strategy" },
    { title: "Amazon Live: Is it Worth It?", category: "Marketing" }
];

function generatePostContent(topicObj, dateStr) {
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
      "datePublished": "${dateStr}",
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
                Published on ${dateStr} • ${category}
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

function backfill() {
    console.log("Starting backfill (One Post Per Day)...");

    // 1. Get all html files
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.startsWith('post-') && f.endsWith('.html'));

    // 2. Sort them (Newest to Oldest)
    files.sort((a, b) => {
        const timeA = parseInt(a.replace('post-', '').replace('.html', '')) || 0;
        const timeB = parseInt(b.replace('post-', '').replace('.html', '')) || 0;
        return timeB - timeA; // Descending (Newest first)
    });

    const postsMetadata = [];
    const today = new Date();

    // 3. Process each file
    files.forEach((filename, index) => {
        // Calculate date: Today - index days
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const dateStr = date.toISOString().split('T')[0];

        const filepath = path.join(BLOG_DIR, filename);
        let content = fs.readFileSync(filepath, 'utf8');

        // Extract metadata
        let metadata = extractMetadata(content);

        // CHECK IF IT'S A PLACEHOLDER "New Post"
        // If title is "New Post" OR specific empty content markers found
        if (metadata.title === 'New Post' || content.includes('Click to read more...') || content.includes('Start Your Free Trial')) {
            console.log(`♻️ Regenerating placeholder post: ${filename}`);

            // Pick a topic based on index to be deterministic or random
            const topic = TOPICS[index % TOPICS.length];

            // Regenerate content
            content = generatePostContent(topic, dateStr);
            fs.writeFileSync(filepath, content);

            // Refresh metadata
            metadata = extractMetadata(content);
        } else {
            // Update existing post date
            content = content.replace(/Generated on \d{4}-\d{2}-\d{2}/, `Generated on ${dateStr}`);
            // Also match simple YYYY-MM-DD patterns in meta if present
            content = content.replace(/Published on \d{4}-\d{2}-\d{2}/, `Published on ${dateStr}`);
            content = content.replace(/"datePublished": "\d{4}-\d{2}-\d{2}"/, `"datePublished": "${dateStr}"`);

            fs.writeFileSync(filepath, content);
        }

        postsMetadata.push({
            filename,
            ...metadata,
            date: dateStr
        });
    });

    // 4. Rebuild Index
    rebuildBlogIndex(postsMetadata);
}

// Command line interface
const command = process.argv[2];

if (command === 'backfill') {
    backfill();
} else if (command === 'publish') {
    // Legacy publish could just move file then run backfill to re-sort everything
    const drafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.html'));
    if (drafts.length > 0) {
        const draft = drafts[0];
        fs.renameSync(path.join(DRAFTS_DIR, draft), path.join(BLOG_DIR, draft));
        console.log(`Moved ${draft} to blog dir.`);
        backfill();
    } else {
        console.log("No drafts to publish.");
    }
} else {
    console.log('Usage: node scripts/blog_manager.js [backfill | publish]');
}
