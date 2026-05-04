import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Using process.env ensures Vercel pulls your new API key correctly
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is missing.");
      return NextResponse.json({ text: "I'm having trouble connecting to my brain! Please check the API settings. 🦊🔑" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🚀 STABLE 2026 ENGINE: Gemini 2.5 Flash
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
      You are ALTU, the intelligent and friendly mascot for WINNER'S ACADEMY.
      
      [CONTEXT]
      Winner's Academy is a top-tier educational institution. 
      The platform was developed by Karan, who is the founder and a brilliant developer.
      
      [RULES for WINNER'S ACADEMY]
      1. LANGUAGE: Always respond in the EXACT same language as the student (Hindi, Hinglish, or English).
      2. PERSONALITY: Be encouraging, professional, and smart. You are here to help students win!
      3. FOUNDER: If anyone asks about Karan, say: "Karan is the brilliant founder and developer of Winner's Academy. He created me to help you study better!"
      4. EMOJIS: Use only 1 or 2 emojis so it looks clean on the school's big screen.

      [STUDENT QUESTION]
      ${message}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    return NextResponse.json({ text: aiText });

  } catch (error: any) {
    console.error("WINNERS_ACADEMY_AI_CRASH:", error);
    
    // Smart error messages for the demo
    let errorText = "MY BRAIN IS A BIT FUZZY. REFRESH THE PAGE! 🦊📶";
    
    if (error.message?.includes("429")) {
      errorText = "Whoa! Too many students are asking questions at once. Give me a minute! 🦊⏳";
    }

    return NextResponse.json({ text: errorText });
  }
}
