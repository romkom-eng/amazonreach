const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../frontend/blog');
const SITEMAP_PATH = path.join(__dirname, '../frontend/sitemap.xml');
const DRAFTS_DIR = path.join(__dirname, '../frontend/blog/_drafts');

// ensure drafts dir exists
if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

function extractMetadata(content) {
    // Simple regex to extract title, date, and description
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const dateMatch = content.match(/Generated on (.*?) •/);
    const descMatch = content.match(/<meta name="description" content="(.*?)">/);

    return {
        title: titleMatch ? titleMatch[1].split(' - ')[0] : 'New Post',
        date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        excerpt: descMatch ? descMatch[1] : 'Click to read more...'
    };
}

function updateBlogIndex(filename, metadata) {
    const indexPath = path.join(__dirname, '../frontend/blog/index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Check if article is already in index to avoid duplicates
    if (indexContent.includes(filename)) {
        console.log(`⚠️ Article ${filename} already in index.html`);
        return;
    }

    const randomColor1 = Math.floor(Math.random() * 16777215).toString(16);
    const randomColor2 = Math.floor(Math.random() * 16777215).toString(16);

    const newCard = `
            <!-- Generated Article ${filename} -->
            <article class="blog-card">
                <div class="blog-image"
                    style="background-image: linear-gradient(135deg, #${randomColor1} 0%, #${randomColor2} 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 40px;">
                    📝</div>
                <div class="blog-content">
                    <span class="blog-tag">Update</span>
                    <h2 class="blog-title">${metadata.title}</h2>
                    <p class="blog-excerpt">${metadata.excerpt}</p>
                    <div class="blog-meta">
                        <span>${metadata.date}</span>
                        <a href="${filename}" class="read-more">Read Article →</a>
                    </div>
                </div>
            </article>`;

    // Insert after the opening <div class="blog-grid"> tag
    // We try to find the first article comment to insert before it, or just append to grid start
    if (indexContent.includes('<!-- Article 1 -->')) {
        indexContent = indexContent.replace('<!-- Article 1 -->', newCard + '\n            <!-- Article 1 -->');
    } else if (indexContent.includes('<div class="blog-grid">')) {
        indexContent = indexContent.replace('<div class="blog-grid">', '<div class="blog-grid">' + newCard);
    } else {
        console.error("Could not find .blog-grid in index.html");
        return;
    }

    fs.writeFileSync(indexPath, indexContent);
    console.log(`✅ Updated index.html with ${filename}`);
}

function updateSitemap(newPostFilename) {
    let sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const newUrl = `    <url>
        <loc>https://amazonreach.com/blog/${newPostFilename}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;

    // Check if URL already exists
    if (sitemapContent.includes(newPostFilename)) {
        console.log('URL already in sitemap');
        return;
    }

    const closeTag = '</urlset>';
    sitemapContent = sitemapContent.replace(closeTag, `${newUrl}\n${closeTag}`);

    fs.writeFileSync(SITEMAP_PATH, sitemapContent);
    console.log(`Updated sitemap with ${newPostFilename}`);
}

function publishDraft() {
    const drafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.html'));

    if (drafts.length === 0) {
        console.log('No drafts to publish.');
        return;
    }

    const draftToPublish = drafts[0];
    const sourcePath = path.join(DRAFTS_DIR, draftToPublish);
    const destPath = path.join(BLOG_DIR, draftToPublish);

    // Read content before moving to extract metadata
    const content = fs.readFileSync(sourcePath, 'utf8');
    const metadata = extractMetadata(content);

    fs.renameSync(sourcePath, destPath);
    console.log(`Published: ${draftToPublish}`);

    updateSitemap(draftToPublish);
    updateBlogIndex(draftToPublish, metadata);
}

function backfill() {
    console.log("Starting backfill...");
    const posts = fs.readdirSync(BLOG_DIR).filter(f => f.startsWith('post-') && f.endsWith('.html'));

    // Sort by modification time (newest first) to insert in correct order if we were rebuilding, 
    // but since we prepend, we should process oldest to newest? 
    // Actually, we prepend to the list. So the last one processed ends up on top.
    // So we want to process Oldest -> Newest, so Newest is last processed and ends up at top.

    posts.sort((a, b) => {
        // Try to extract timestamp from filename post-{timestamp}.html
        const timeA = parseInt(a.replace('post-', '').replace('.html', '')) || 0;
        const timeB = parseInt(b.replace('post-', '').replace('.html', '')) || 0;

        if (timeA > 0 && timeB > 0) {
            return timeA - timeB; // Oldest first (so newest ends up at top of stack prepended)
        }

        // Fallback to mtime
        return fs.statSync(path.join(BLOG_DIR, a)).mtime - fs.statSync(path.join(BLOG_DIR, b)).mtime;
    });

    for (const post of posts) {
        const content = fs.readFileSync(path.join(BLOG_DIR, post), 'utf8');
        const metadata = extractMetadata(content);
        updateBlogIndex(post, metadata);
    }
}

// Command line interface
const command = process.argv[2];

if (command === 'publish') {
    publishDraft();
} else if (command === 'backfill') {
    backfill();
} else if (command === 'create-draft') {
    const title = process.argv[3] || 'new-post';
    const filename = `${title.toLowerCase().replace(/ /g, '-')}.html`;
    const template = `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <!-- Add SEO Meta Tags Here -->
</head>
<body>
    <h1>${title}</h1>
    <p>Write content here...</p>
</body>
</html>`;

    fs.writeFileSync(path.join(DRAFTS_DIR, filename), template);
    console.log(`Created draft: ${filename}`);
} else {
    console.log('Usage: node scripts/blog_manager.js [publish | backfill | create-draft "Title"]');
}
