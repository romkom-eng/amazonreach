// API Endpoint: Helium 10 Keyword Analysis
// Path: /api/helium10/analyze.js
// Analyzes keywords from Google Sheets and writes AI insights back

const gemini = require('../../backend/services/gemini');
const sheets = require('../../backend/services/sheets');
const email = require('../../backend/services/email');

const SHEET_ID = process.env.HELIUM10_SHEET_ID || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@amazonreach.com';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!SHEET_ID) {
            return res.status(400).json({
                success: false,
                error: 'Google Sheets not configured. Set HELIUM10_SHEET_ID environment variable.'
            });
        }

        console.log('🔑 Analyzing Helium 10 keywords...');

        // Read keywords from Google Sheets
        const keywords = await sheets.analyzeKeywords(SHEET_ID);

        if (keywords.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No keywords found in sheet',
                analyzed: []
            });
        }

        const analyzed = [];

        // Analyze each keyword with AI
        for (let i = 0; i < keywords.length; i++) {
            const kw = keywords[i];

            // Build AI prompt for keyword analysis
            const prompt = `Analyze this Amazon keyword for 2026:

Keyword: ${kw.keyword}
Search Volume: ${kw.searchVolume}
Competition: ${kw.competition}

Provide:
1. Niche Score (1-10): How profitable is this niche?
2. Recommendation: Should seller pursue this? (Consider: competition, search volume, trends)
3. Related Keywords: 3-5 trending related keywords for 2026 (eco-friendly, AI-compatible, etc.)

Format as JSON:
{
  "nicheScore": 7.5,
  "recommendation": "Highly recommended - good volume, moderate competition",
  "relatedKeywords": ["eco-friendly earbuds", "AI wireless headphones", "sustainable audio"]
}`;

            try {
                const aiResponse = await gemini.chat(prompt);

                // Extract JSON from AI response
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);

                    // Write results back to sheet
                    await sheets.writeKeywordAnalysis(SHEET_ID, 'Sheet1', i + 2, analysis);

                    analyzed.push({
                        keyword: kw.keyword,
                        ...analysis
                    });

                    console.log(`✅ Analyzed: ${kw.keyword} - Score: ${analysis.nicheScore}`);
                }
            } catch (error) {
                console.error(`Failed to analyze ${kw.keyword}:`, error);
            }
        }

        // Generate summary report
        const topKeywords = analyzed
            .filter(a => a.nicheScore >= 7)
            .sort((a, b) => b.nicheScore - a.nicheScore)
            .slice(0, 5);

        const reportHtml = `
      <h2>🔑 Helium 10 Keyword Analysis Report</h2>
      <p>Analysis complete for ${analyzed.length} keywords.</p>
      
      <h3>Top 5 Golden Keywords:</h3>
      <ol>
        ${topKeywords.map(kw => `
          <li>
            <strong>${kw.keyword}</strong> - Score: ${kw.nicheScore}/10<br/>
            ${kw.recommendation}
          </li>
        `).join('')}
      </ol>
      
      <p>Full analysis available in your Google Sheet.</p>
    `;

        // Send email report
        await email.sendEmail(
            ADMIN_EMAIL,
            '🔑 Helium 10 Keyword Analysis Complete',
            reportHtml
        );

        return res.status(200).json({
            success: true,
            message: `Analyzed ${analyzed.length} keywords`,
            topKeywords,
            analyzed,
            sheetUpdated: true,
            emailSent: true
        });

    } catch (error) {
        console.error('Helium 10 analysis error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};
