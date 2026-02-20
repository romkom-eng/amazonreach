const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all published posts
router.get('/posts', async (req, res) => {
    try {
        const posts = await db.getPublishedPosts();

        // Don't send full content to list view to save bandwidth
        const summaryPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            category: post.category,
            meta_description: post.meta_description,
            created_at: post.created_at,
            updated_at: post.updated_at
        }));

        res.json({ success: true, posts: summaryPosts });
    } catch (error) {
        console.error('Public Blog API Error (List):', error);
        res.status(500).json({ success: false, error: 'Failed to fetch posts' });
    }
});

// Get single published post by slug
router.get('/posts/:slug', async (req, res) => {
    try {
        const post = await db.getPostBySlug(req.params.slug);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, post });
    } catch (error) {
        console.error('Public Blog API Error (Single):', error);
        res.status(500).json({ success: false, error: 'Failed to fetch post' });
    }
});

module.exports = router;
