import { GoogleGenerativeAI } from "@google/generative-ai";

export async function summarize(
  title: string,
  content: string,
  contentType: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `あなたは研究者向け情報キュレーターです。以下の${contentType}を、研究者・エンジニア視点で日本語で簡潔に要約してください。

タイトル: ${title}
内容: ${content}

以下の形式で出力してください：
【要点】（3行以内）
【業界への影響/展望】（2行以内）
【キーワード】（カンマ区切りで5個以内）`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
