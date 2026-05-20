from __future__ import annotations

import os
from google import genai

_PAPER_PROMPT = """\
あなたは優秀な研究者です。以下の論文の概要を読み、この論文が「技術的なブレークスルー」を主張しているか、それとも既存手法の「単なる拡張」に過ぎないかを客観的に評価してください。もし独自性が低い場合はその旨を指摘し、分野における貢献度を1〜5で評価してください。

タイトル: {title}

概要:
{content}

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
（この研究が情報通信・AI業界に与える影響や、研究配属を控えた学生へのヒントになる視点を1〜2行で）
"""

_NEWS_PROMPT = """\
あなたは研究・情報収集を支援するAIアシスタントです。
以下のテキストは実際に収集されたニュース記事の内容です。
このテキストの内容のみに基づいて要約を作成してください。
テキストに書かれていない情報の追加や憶測は厳禁です。

タイトル: {title}

内容:
{content}

---
以下のフォーマットで日本語で要約してください：

【概要】
（何についての記事か、2〜3行で説明）

【重要ポイント】
・ポイント1
・ポイント2
・ポイント3（最大3点、少なければ少なくてよい）

【業界への影響/展望】
（この記事が情報通信・AI業界に与える影響や、研究配属を控えた学生へのヒントになる視点を1〜2行で）
"""


def summarize(title: str, content: str, content_type: str = "ニュース記事", api_key: str | None = None) -> str:
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("Gemini API Key が設定されていません。サイドバーまたは .env ファイルに GEMINI_API_KEY を設定してください。")

    client = genai.Client(api_key=key)
    if content_type == "学術論文":
        prompt = _PAPER_PROMPT.format(title=title, content=content)
    else:
        prompt = _NEWS_PROMPT.format(title=title, content=content)
    response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
    return response.text
