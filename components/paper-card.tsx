"use client";

import { useState } from "react";
import type { PaperItem } from "@/types";
import { AffBadge, SourceBadge, CitationBadge } from "./badges";
import { useSearch } from "@/context/search-context";

interface Props {
  paper: PaperItem;
  index: number;
}

export function PaperCard({ paper, index }: Props) {
  const { state, dispatch } = useSearch();
  const [open, setOpen] = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const key = `paper_${index}`;
  const summary = state.paperSummaries[key];

  async function generateSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          content: paper.abstract || paper.title,
          contentType: "学術論文",
          apiKey: state.geminiApiKey,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        dispatch({ type: "SET_PAPER_SUMMARY", payload: { key, summary: data.summary } });
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
      body: JSON.stringify({ item: paper, type: "paper", summary: summary ?? "" }),
    });
    setSaveMsg(res.status === 201 ? "⭐ 保存しました！" : "既に保存済みです");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <h3 className="font-semibold text-base mb-2">
        {paper.url ? (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h3>

      <div className="flex flex-wrap mb-2">
        <SourceBadge source={paper.source} />
        <AffBadge category={paper.affiliationCategory} />
        <CitationBadge count={paper.citationCount} />
      </div>

      <div className="text-sm text-gray-500 mb-1">
        {[paper.year && `📅 ${paper.year}`, paper.authors.slice(0, 3).join(", ") && `👤 ${paper.authors.slice(0, 3).join(", ")}`]
          .filter(Boolean).join(" | ")}
      </div>

      {paper.institutions.length > 0 && (
        <div className="text-sm text-gray-500 mb-2">🏛️ {paper.institutions.join(" / ")}</div>
      )}

      {paper.abstract && (
        <div className="mb-2">
          <button
            onClick={() => setAbstractOpen((v) => !v)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>{abstractOpen ? "▼" : "▶"}</span> アブストラクト
          </button>
          {abstractOpen && (
            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">{paper.abstract}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <div className="flex-1 min-w-0">
          {!summary ? (
            <button
              onClick={generateSummary}
              disabled={loading}
              className="text-sm px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
            >
              {loading ? "生成中…" : "AI 要約を生成"}
            </button>
          ) : null}
        </div>
        <button
          onClick={saveBookmark}
          className="text-sm px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 shrink-0"
        >
          ⭐ 保存
        </button>
      </div>

      {saveMsg && <p className="text-sm text-green-600 mt-1">{saveMsg}</p>}

      {summary && (
        <div className="mt-3">
          <p className="text-sm font-semibold mb-1">AI 要約</p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-800 mb-1"
          >
            {open ? "▼ 折りたたむ" : "▶ 展開する"}
          </button>
          {open && (
            <pre className="text-sm bg-gray-100 p-3 rounded whitespace-pre-wrap font-sans">{summary}</pre>
          )}
        </div>
      )}
    </div>
  );
}
