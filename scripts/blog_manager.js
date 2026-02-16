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

function rebuildBlogIndex(postsMetadata) {
    const indexPath = path.join(__dirname, '../frontend/blog/index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Generate Grid HTML
    let gridHtml = generateFilterButtons() + '\n<div class="blog-grid">\n';

    postsMetadata.forEach(post => {
        const colors = getCategoryColor(post.category);
        const card = `
            <article class="blog-card" data-category="${post.category}">
                <div class="blog-image"
                    style="background-image: linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 40px;">
                    📝</div>
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

    // Replace the entire blog-grid section logic
    // We look for where the section starts and usually ends. 
    // Best way is to regex replace the container or specific known markers

    // Find <div class="blog-grid">...</div> regex is risky with nested divs.
    // We will target the parent <section class="container"> that contains the grid
    const sectionRegex = /<section class="container">\s*<div class="blog-grid">[\s\S]*?<\/div>\s*<\/section>/;

    if (sectionRegex.test(indexContent)) {
        indexContent = indexContent.replace(sectionRegex, `<section class="container">\n${gridHtml}\n</section>`);
    } else {
        // Fallback: try to replace just inner content if we can identify it, or warn
        console.warn("Could not reliably find <section> wrapper. Trying simple replacement.");
        // Try simple replacement of the grid div only if wrapper missing
        const gridRegex = /<div class="blog-grid">[\s\S]*?<\/div>/;
        // insert filter buttons before grid
        const newContent = generateFilterButtons() + '\n' + `<div class="blog-grid">${gridHtml.split('<div class="blog-grid">')[1]}`;
        indexContent = indexContent.replace(gridRegex, newContent);
    }

    fs.writeFileSync(indexPath, indexContent);
    console.log(`✅ Fully Rebuilt index.html with ${postsMetadata.length} posts`);
}


function backfill() {
    console.log("Starting backfill (One Post Per Day)...");

    // 1. Get all html files
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.startsWith('post-') && f.endsWith('.html'));

    // 2. Sort them (Newest to Oldest based on file creation for stability, or just filename)
    // We want the "latest" generated file to be "Today".
    // "Older" generated files to be "Yesterday", etc.
    // Filenames are post-{timestamp}.html, so sorting descending gives newest first.

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

        // Extract current metadata
        const metadata = extractMetadata(content);

        // Update the content with the new Date
        // We need to replace the displayed date in the HTML file itself too!
        // Look for: Generated on YYYY-MM-DD
        // Or: <p class="post-meta">... 2026-02-...</p>

        // Regex for the date pattern in the file
        // Pattern 1: Generated on 2026-02-12
        content = content.replace(/Generated on \d{4}-\d{2}-\d{2}/, `Generated on ${dateStr}`);
        // Pattern 2: "datePublished": "2026-02-12"
        content = content.replace(/"datePublished": "\d{4}-\d{2}-\d{2}"/, `"datePublished": "${dateStr}"`);
        // Pattern 3: <time> or simple text date if present (from previous templates)

        fs.writeFileSync(filepath, content);

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
