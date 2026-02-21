require('dotenv').config({ path: '../.env' });
const db = require('./database');

const keywords = [
    "how do i sell on amazon",
    "how can i sell on amazon",
    "how to start selling on amazon",
    "how to become an amazon seller",
    "best products to sell on amazon",
    "how to sell on amazon for beginners",
    "how to start an amazon business",
    "amazon fba requirements for international sellers",
    "korean brands selling on amazon",
    "how to sell on amazon without inventory"
];

(async () => {
    try {
        console.log('Fetching all posts...');
        const posts = await db.getAllPosts();

        console.log(`Found ${posts.length} posts. Assigning keywords...`);

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];

            // Assign a keyword sequentially or randomly if we run out
            const keyword = keywords[i % keywords.length];

            // Only update if it doesn't have one or if it's empty
            await db.updatePost(post.id, { target_keyword: keyword });
        }

        console.log('\n--- BLOG ANALYTICS OVERVIEW ---');
        const updatedPosts = await db.getAllPosts();
        updatedPosts.forEach(p => {
            console.log(`Title: ${p.title}`);
            console.log(`🎯 Keyword: ${p.target_keyword || 'N/A'}`);
            console.log(`👁️ Views: ${p.views || 0}`);
            console.log('-----------------------------------');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error updating keywords:', error);
        process.exit(1);
    }
})();
