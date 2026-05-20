"use client";

import { useState } from "react";
import { AffBadge, SourceBadge, CitationBadge, ScoreBadge } from "./badges";
import type { BookmarkRow } from "@/types";

interface Props {
  bookmark: BookmarkRow;
  onDelete: (id: number) => void;
}

export function BookmarkCard({ bookmark, onDelete }: Props) {
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/bookmarks/${bookmark.id}`, { method: "DELETE" });
    onDelete(bookmark.id);
    setLoading(false);
  }

  const paper = bookmark.type === "paper";
  const hn = bookmark.type === "hackernews";

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base">
          {bookmark.url ? (
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
              {bookmark.title}
            </a>
          ) : (
            bookmark.title
          )}
        </h3>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm px-2 py-1 text-red-500 border border-red-200 rounded hover:bg-red-50 whitespace-nowrap disabled:opacity-50"
        >
          🗑️ 削除
        </button>
      </div>

      <div className="flex flex-wrap mt-2 mb-1">
        {paper && bookmark.source === "OpenAlex" && (
          <SourceBadge source={bookmark.source} />
        )}
        {bookmark.affiliationCategory && <AffBadge category={bookmark.affiliationCategory} />}
        {paper && <CitationBadge count={bookmark.citationCount} />}
        {hn && <ScoreBadge points={bookmark.score} />}
      </div>

      {(bookmark.year || bookmark.authors.length > 0) && (
        <div className="text-sm text-gray-500 mb-1">
          {[bookmark.year && `📅 ${bookmark.year}`, bookmark.authors.slice(0, 3).join(", ") && `👤 ${bookmark.authors.slice(0, 3).join(", ")}`]
            .filter(Boolean).join(" | ")}
        </div>
      )}

      {bookmark.institutions.length > 0 && (
        <div className="text-sm text-gray-500 mb-2">🏛️ {bookmark.institutions.join(" / ")}</div>
      )}

      {bookmark.summary && (
        <div className="mb-2">
          <button
            onClick={() => setSummaryOpen((v) => !v)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>{summaryOpen ? "▼" : "▶"}</span> AI 要約
          </button>
          {summaryOpen && (
            <pre className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap font-sans">
              {bookmark.summary}
            </pre>
          )}
        </div>
      )}

      {bookmark.abstract && (
        <div className="mb-2">
          <button
            onClick={() => setAbstractOpen((v) => !v)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>{abstractOpen ? "▼" : "▶"}</span> アブストラクト
          </button>
          {abstractOpen && (
            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">{bookmark.abstract}</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2">
        保存日時: {new Date(bookmark.createdAt).toLocaleString("ja-JP")}
      </div>
    </div>
  );
}
