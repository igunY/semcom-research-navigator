"use client";

import { useState } from "react";
import type { NewsItem } from "@/types";
import { useSearch } from "@/context/search-context";

interface Props {
  item: NewsItem;
  summaryKey: string;
  saveType?: string;
}

export function NewsCard({ item, summaryKey, saveType = "news" }: Props) {
  const { state, dispatch } = useSearch();
  const [descOpen, setDescOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const summary = state.newsSummaries[summaryKey];

  async function generateSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          content: item.summary || item.title,
          contentType: "ニュース記事",
          apiKey: state.geminiApiKey,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        dispatch({ type: "SET_NEWS_SUMMARY", payload: { key: summaryKey, summary: data.summary } });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveBookmark() {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: { ...item, source: "GoogleNews" },
        type: saveType,
        summary: summary ?? "",
      }),
    });
    setSaveMsg(res.status === 201 ? "⭐ 保存しました！" : "既に保存済みです");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <h3 className="font-semibold text-base mb-2">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>

      <div className="flex gap-4 text-sm text-gray-500 mb-2">
        <span>📰 {item.source}</span>
        <span>📅 {item.published}</span>
      </div>

      {item.summary && (
        <div className="mb-2">
          <button
            onClick={() => setDescOpen((v) => !v)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>{descOpen ? "▼" : "▶"}</span> 元の概要
          </button>
          {descOpen && (
            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded"
               dangerouslySetInnerHTML={{ __html: item.summary }}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1">
          {!summary && (
            <button
              onClick={generateSummary}
              disabled={loading}
              className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "生成中…" : "AI 要約を生成"}
            </button>
          )}
          {summary && (
            <pre className="text-sm bg-gray-100 p-3 rounded whitespace-pre-wrap font-sans mt-1">{summary}</pre>
          )}
        </div>
        <button
          onClick={saveBookmark}
          className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 self-start"
        >
          ⭐ 保存
        </button>
      </div>

      {saveMsg && <p className="text-sm text-green-600 mt-1">{saveMsg}</p>}
    </div>
  );
}
