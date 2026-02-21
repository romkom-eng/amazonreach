// Gemini AI Service
// Handles all AI interactions using Google's Gemini API

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

class GeminiService {
    constructor() {
        this.apiKey = GEMINI_API_KEY;
        this.model = 'gemini-2.0-flash-exp';
    }

    /**
     * Send a chat message to Gemini
     * @param {string} message - User message
     * @param {string} systemPrompt - System instructions
     * @param {Array} conversationHistory - Optional previous messages
     */
    async chat(message, systemPrompt = '', conversationHistory = []) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        try {
            // Build the prompt
            let fullPrompt = systemPrompt ? `${systemPrompt}\n\n` : '';

            // Add conversation history
            if (conversationHistory.length > 0) {
                fullPrompt += conversationHistory.map(msg =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                ).join('\n') + '\n\n';
            }

            fullPrompt += `User: ${message}\nAssistant:`;

            const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                        topP: 0.95
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${error}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response from Gemini API');
            }

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.error('Gemini chat error:', error);
            throw error;
        }
    }

    /**
     * AI Onboarding Assistant
     * Guides new users through setup
     */
    async onboardingChat(userMessage, userInfo, conversationHistory = []) {
        const systemPrompt = `You are an AI assistant for AmazonReach, a platform that helps Amazon sellers scale globally.

Your role is to onboard new users by:
1. Asking about their business (products, target markets, current sales)
2. Understanding their goals (revenue targets, expansion plans)
3. Recommending the right plan and features
4. Helping them set up integrations

User Information:
- Email: ${userInfo.email}
- Company: ${userInfo.companyName || 'Not provided'}
- Current Plan: ${userInfo.plan || 'starter'}

Be friendly, concise, and helpful. Ask one question at a time. When you have enough info, summarize and recommend next steps.`;

        return await this.chat(userMessage, systemPrompt, conversationHistory);
    }

    /**
     * AI Support Assistant
     * Answers customer questions using knowledge base
     */
    async supportChat(userMessage, userInfo, knowledgeBase, conversationHistory = []) {
        const systemPrompt = `You are an expert customer support agent for AmazonReach, an Amazon seller management platform.

Knowledge Base:
${knowledgeBase}

User Information:
- Plan: ${userInfo.plan || 'starter'}
- Email: ${userInfo.email}

Guidelines:
- Answer concisely and accurately based on the knowledge base
- If you don't know something, admit it and offer to create a support ticket
- Be professional but friendly
- Provide step-by-step instructions when needed
- Reference specific features based on user's plan`;

        return await this.chat(userMessage, systemPrompt, conversationHistory);
    }

    /**
     * AI Product Research Assistant
     * Analyzes markets and generates product recommendations
     */
    async productResearch(productInfo) {
        const systemPrompt = `You are an Amazon product research expert. Analyze the following product information and provide:
1. Market viability assessment
2. Suggested pricing strategy
3. Competitive landscape analysis
4. Optimized product title (SEO-friendly)
5. Compelling product description
6. Key selling points

Be specific, data-driven, and actionable.`;

        const prompt = `Product Category: ${productInfo.category}
Target Market: ${productInfo.targetMarket}
Price Range: $${productInfo.priceMin}-${productInfo.priceMax}
${productInfo.helium10Keywords ? `Keywords (from Helium10): ${productInfo.helium10Keywords.join(', ')}` : ''}

Provide a comprehensive product research analysis.`;

        return await this.chat(prompt, systemPrompt);
    }

    /**
     * AI Inventory Optimization
     * Provides restocking recommendations
     */
    async inventoryRecommendations(inventoryData) {
        const systemPrompt = `You are an inventory management expert for e-commerce. Analyze the inventory data and provide:
1. Reorder recommendations
2. Optimal stock levels
3. Seasonal considerations
4. Risk assessment

Be specific with quantities and timing.`;

        const prompt = `Current Inventory:
${inventoryData.items.map(item =>
            `- ${item.name}: ${item.currentStock} units, sells ${item.avgDailySales} per day`
        ).join('\n')}

Provide inventory optimization recommendations.`;

        return await this.chat(prompt, systemPrompt);
    }

    /**
     * Generate automated report summary
     */
    async generateReportSummary(reportData) {
        const systemPrompt = `You are a business analyst. Create a concise, insightful summary of the following data.
Focus on key trends, anomalies, and actionable recommendations.`;

        const prompt = `Sales Data:
- Total Revenue: $${reportData.totalRevenue}
- Orders: ${reportData.totalOrders}
- Average Order Value: $${reportData.avgOrderValue}
- Top Product: ${reportData.topProduct}
- Period: ${reportData.period}

Generate a 3-4 sentence executive summary with 2-3 actionable recommendations.`;

        return await this.chat(prompt, systemPrompt);
    }

    /**
     * Generate Professional Strategy Audit Report
     * Based on user request and manual Helium10 input
     */
    async generateAuditReport(auditRequest, helium10Data) {
        const systemPrompt = `You are a Senior Amazon Strategy Consultant for AmazonReach agency.
Your goal is to write a highly professional, realistic, and objective "Amazon Scale-up Strategy Report".

Guidelines:
1. Tone: Professional, authoritative, and realistic. 
2. Honesty: Do NOT be overly optimistic. Acknowledge high competition and risks. Call out weak areas (e.g., low review count, poor pricing).
3. Structure: 
   - Executive Summary
   - Market Analysis (Competition level)
   - Current Performance Audit (BSR, Revenue)
   - 1-Month Growth Strategy (Vine Program, PPC, SEO)
   - Realistic Revenue Projection (Probability of Success)
4. Use HTML tags (e.g., <h3>, <ul>, <li>, <strong>) for formatting so it renders beautifully on the dashboard.
5. Content length: Comprehensive but concise (about 500-700 words).`;

        const prompt = `
Client Name: ${auditRequest.name}
ASIN/Keyword: ${auditRequest.asin || auditRequest.keyword}
Current Monthly Sales: ${auditRequest.monthly_sales || 'Unknown'}

Helium10 Data Points:
- Monthly Revenue: $${helium10Data.revenue || 'N/A'}
- BSR: ${helium10Data.bsr || 'N/A'}
- Review Count: ${helium10Data.reviews || 'N/A'}
- Top Keyword Search Volume: ${helium10Data.searchVolume || 'N/A'}
- Category Competition Score: ${helium10Data.competitionScore || 'N/A'}/10

Please generate the professional strategy report now.`;

        return await this.chat(prompt, systemPrompt);
    }
}

module.exports = new GeminiService();
