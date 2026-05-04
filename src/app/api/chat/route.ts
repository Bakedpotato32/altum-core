import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // 🛡️ SECURITY FIX: Vercel prefers process.env directly in the call
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
      return NextResponse.json({ text: "I can't find my API key! Check Vercel Settings. 🦊🔑" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🚀 2026 UPGRADE: Using Gemini 2.5 Flash (Most stable free model)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const prompt = `
      [SYSTEM ROLE: ALTU THE FOX]
      You are ALTU, the smart mascot for Altum Core in Mahuli, UP.
      
      [RULES]
      1. Use the SAME language as the user (Hindi/Hinglish/English).
      2. Karan is your founder/dev. Be chill about it.
      3. Max 2 emojis. Keep it fast.

      [USER MESSAGE]
      ${message}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    return NextResponse.json({ text: aiText });

  } catch (error: any) {
    console.error("ALTU_BRAIN_CRASH:", error);
    
    // 🧠 Identifying the exact issue for you
    if (error.message?.includes("429")) return NextResponse.json({ text: "Too many students asking questions! Wait 1 minute. 🦊⏳" });
    if (error.message?.includes("model not found")) return NextResponse.json({ text: "Google retired my old brain. Update to 2.5 Flash! 🦊🧠" });

    return NextResponse.json({ text: "MY BRAIN IS FUZZY. REFRESH THE PAGE! 🦊📶" });
  }
}
