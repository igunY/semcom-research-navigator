import { NextRequest } from "next/server";
import { summarize } from "@/lib/ai/summarizer";

export async function POST(request: NextRequest) {
  const { title, content, contentType, apiKey } = await request.json();

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Gemini API Key が設定されていません" }, { status: 400 });

  try {
    const summary = await summarize(title, content, contentType, key);
    return Response.json({ summary });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
