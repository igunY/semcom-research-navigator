import { GoogleGenerativeAI } from "@google/generative-ai";

const PAPER_PROMPT = (title: string, content: string) => `\
あなたは優秀な研究者です。以下の論文の概要を読み、この論文が「技術的なブレークスルー」を主張しているか、それとも既存手法の「単なる拡張」に過ぎないかを客観的に評価してください。もし独自性が低い場合はその旨を指摘し、分野における貢献度を1〜5で評価してください。

タイトル: ${title}

概要:
${content}

---
以下のフォーマットで日本語で回答してください：

【概要】
（何についての研究か、2〜3行で説明）

【評価: ブレークスルー or 単なる拡張】
（この論文が真に新しい技術的貢献をしているか、既存手法の段階的な改良に過ぎないかを客観的に述べる）

【独自性の指摘】
（独自性が低ければその理由を具体的に。高ければ「独自性あり」と記載）

【貢献度スコア: X / 5】
（1〜5で評価し、その根拠を1行で）

【業界への影響/展望】
（この研究が情報通信・AI業界に与える影響や、研究配属を控えた学生へのヒントになる視点を1〜2行で）`;

const NEWS_PROMPT = (title: string, content: string, contentType: string) => `\
あなたは研究者向け情報キュレーターです。以下の${contentType}を、研究者・エンジニア視点で日本語で簡潔に要約してください。

タイトル: ${title}
内容: ${content}

以下の形式で出力してください：
【要点】（3行以内）
【業界への影響/展望】（2行以内）
【キーワード】（カンマ区切りで5個以内）`;

export async function summarize(
  title: string,
  content: string,
  contentType: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt =
    contentType === "学術論文"
      ? PAPER_PROMPT(title, content)
      : NEWS_PROMPT(title, content, contentType);

  const result = await model.generateContent(prompt);
  return result.response.text();
}
