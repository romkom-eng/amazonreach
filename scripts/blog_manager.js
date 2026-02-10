const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../frontend/blog');
const SITEMAP_PATH = path.join(__dirname, '../frontend/sitemap.xml');
const DRAFTS_DIR = path.join(__dirname, '../frontend/blog/_drafts');

// ensure drafts dir exists
if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
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

    fs.renameSync(sourcePath, destPath);
    console.log(`Published: ${draftToPublish}`);

    updateSitemap(draftToPublish);
}

// Command line interface
const command = process.argv[2];

if (command === 'publish') {
    publishDraft();
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
    console.log('Usage: node scripts/blog_manager.js [publish | create-draft "Title"]');
}
