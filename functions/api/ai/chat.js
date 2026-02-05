// Cloudflare Workers AI Chat API
// Path: functions/api/ai/chat.js

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Parse request body
        const body = await request.json();
        const { message, type = 'support', conversationId = null } = body;

        if (!message) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Message required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.substring(7);

        // Verify token with JWT (you'll need to import jwt library)
        // For now, simplified version

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful AmazonReach support assistant. ${message}`
                        }]
                    }]
                })
            }
        );

        const geminiData = await geminiResponse.json();
        const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

        // Save to Firestore (conversation history)
        // ... Firebase code here ...

        return new Response(JSON.stringify({
            success: true,
            response: aiResponse,
            conversationId: conversationId || `conv_${Date.now()}`,
            type
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('AI chat error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
