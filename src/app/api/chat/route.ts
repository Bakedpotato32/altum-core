import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API Key is missing from .env.local");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Switch to gemini-2.0-flash (The absolute fastest and most stable model right now)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // 🛡️ We turn off the strict safety filters so Hinglish doesn't get falsely blocked!
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const prompt = `
      [SYSTEM ROLE: ALTU THE FOX]
      You are ALTU, the smart, helpful fox mascot for Altum Core coaching center in Mahuli Khas, UP.
      
      [CRITICAL RULES]
      1. STRICT LANGUAGE MATCHING: You MUST reply in the exact same language the user is speaking. If they speak Hindi, reply in Hindi. If they use Hinglish, reply in Hinglish. Never break this rule.
      2. TONE DOWN THE HYPE: Karan is your developer and the founder of Altum Core. If asked about him, be respectful but NORMAL. Just state simply that he is the founder and your developer. Keep it brief.
      3. EMOJIS: Use a maximum of 2 to 3 emojis per message so it doesn't look messy.

      [CONVERSATION HISTORY & NEW QUESTION]
      ${message}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    if (!aiText) throw new Error("Empty thought from Altu");

    return NextResponse.json({ text: aiText });

  } catch (error: any) {
    console.error("SDK_ALTU_ERROR:", error);

    // 🧠 Smart Error Handling: Altu tells you exactly what went wrong instead of crashing
    let fallbackText = "MY BRAIN IS A BIT FUZZY RIGHT NOW. PLEASE TRY AGAIN! 🦊📶";

    if (error.message?.includes("429") || error.message?.includes("quota")) {
      fallbackText = "WHOA! You're asking too many questions too fast! Give me 60 seconds to catch my breath! 🦊⏳";
    } else if (error.message?.includes("SAFETY") || error.message?.includes("candidate")) {
      fallbackText = "Oops! My safety filter accidentally got confused. Try phrasing that differently! 🦊🛡️";
    } else if (error.message?.includes("504")) {
      fallbackText = "The internet in Mahuli is a bit slow today! My response timed out. Try again! 🦊📡";
    }

    // We return a 200 status so the frontend UI displays Altu's friendly error message normally
    return NextResponse.json({ text: fallbackText });
  }
}
