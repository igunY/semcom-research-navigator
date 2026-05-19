"use client";

import { useState, useEffect, useCallback } from "react";
import { BookmarkCard } from "@/components/bookmark-card";
import type { BookmarkRow } from "@/types";

type TabId = "all" | "paper" | "news" | "hackernews";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "🗂️ 全て" },
  { id: "paper", label: "📚 論文" },
  { id: "news", label: "📰 ニュース" },
  { id: "hackernews", label: "🟠 Hacker News" },
];

export default function BookmarksPage() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = activeTab === "all" ? "/api/bookmarks" : `/api/bookmarks?type=${activeTab}`;
    const res = await fetch(url);
    const data = await res.json();
    setBookmarks(data);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  function handleDelete(id: number) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">⭐ 自分専用の業界地図</h1>
      <p className="text-sm text-gray-500 mb-4">保存した論文・ニュース・HN投稿を一覧できます。</p>

      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中…</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-gray-500 text-sm">ブックマークがありません。</p>
      ) : (
        bookmarks.map((bm) => (
          <BookmarkCard key={bm.id} bookmark={bm} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
