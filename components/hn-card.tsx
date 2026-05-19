"use client";

import { useState } from "react";
import type { HNItem } from "@/types";
import { ScoreBadge, CommentBadge } from "./badges";

interface Props {
  item: HNItem;
  index: number;
}

export function HNCard({ item, index }: Props) {
  const [saveMsg, setSaveMsg] = useState("");

  async function saveBookmark() {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          title: item.title,
          url: item.url,
          score: item.points,
          source: "HackerNews",
        },
        type: "hackernews",
      }),
    });
    setSaveMsg(res.status === 201 ? "⭐ 保存しました！" : "既に保存済みです");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  return (
    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <h3 className="font-semibold text-base mb-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
          {item.title}
        </a>
        {item.hnUrl && item.hnUrl !== item.url && (
          <a
            href={item.hnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs text-orange-600 hover:underline"
          >
            [HNで議論]
          </a>
        )}
      </h3>

      <div className="flex flex-wrap mb-2">
        <ScoreBadge points={item.points} />
        <CommentBadge count={item.numComments} />
      </div>

      <div className="flex gap-4 text-sm text-gray-500 mb-2">
        <span>🟠 Hacker News</span>
        <span>📅 {item.createdAt.slice(0, 10)}</span>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveBookmark}
          className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
        >
          ⭐ 保存
        </button>
      </div>

      {saveMsg && <p className="text-sm text-green-600 mt-1">{saveMsg}</p>}
    </div>
  );
}
