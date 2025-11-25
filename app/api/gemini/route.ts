// app/api/gemini/route.ts
import { NextResponse } from 'next/server';

const DEFAULT_MODEL = 'gemini-flash-latest';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const message: string = body.message ?? '';
        const model: string = body.model || DEFAULT_MODEL;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { reply: 'Server error: GEMINI_API_KEY is not set in environment.' },
                { status: 500 }
            );
        }

        const prompt = `
You are an English Technical Writer AI.

Tasks:
1. Detect mixed Indonesian + English sentences.
2. Translate Indonesian parts to natural English.
3. Fix all grammar issues and make the sentence clear and natural.
4. Return exactly this structure:

Corrected:
<corrected, natural, clear sentence>

Professional:
<more formal / business version>

Casual:
<slightly relaxed, conversational version>
    
User input:
${message}
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const result = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        const data = await result.json();
        // console.log("=== GEMINI API RESPONSE ===");
        // console.log("Status:", result.status);
        // console.log(JSON.stringify(data, null, 2));

        // Check for API errors (invalid key, quota, etc.)
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            const errorMessage = data.error.message || "Unknown error";
            const errorCode = data.error.code || result.status;

            if (errorCode === 400 && errorMessage.includes("API_KEY_INVALID")) {
                return NextResponse.json({
                    reply: "❌ ERROR: Invalid GEMINI_API_KEY. Please check your .env.local file and make sure the API key is correct."
                });
            }

            if (errorCode === 403 || errorMessage.includes("permission")) {
                return NextResponse.json({
                    reply: "❌ ERROR: API key does not have permission. Check your Google Cloud project settings."
                });
            }

            return NextResponse.json({
                reply: `❌ Gemini API Error (${errorCode}): ${apiKey}`
            });
        }

        let reply = "";
        // v1beta format
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
        }
        // Some models return directly under "text"
        else if (data?.text) {
            reply = data.text;
        }
        // Safety fallback
        else {
            console.error("Unexpected Gemini response format");
            console.error("Keys in response:", Object.keys(data));
            return NextResponse.json({
                reply: "Gemini error: unexpected response format. Check server logs for details."
            });
        }

        return NextResponse.json({ reply });
    } catch (err) {
        console.error('Gemini API error:', err);
        return NextResponse.json(
            { reply: 'Internal server error calling Gemini API.' },
            { status: 500 }
        );
    }
}
