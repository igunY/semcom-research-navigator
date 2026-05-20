"use client";

import { useState } from "react";
import { useSearch } from "@/context/search-context";
import { PaperCard } from "@/components/paper-card";
import { NewsCard } from "@/components/news-card";
import { HNCard } from "@/components/hn-card";
import type { PaperItem } from "@/types";

type AffFilter = "全て" | "🎓 Academic（大学）" | "🏢 Corporate（企業）" | "🔀 Mixed";
type SortOpt = "新しい順" | "引用数（多い順）" | "引用数（少ない順）";
type OaFilter = "全て" | "🔓 OA のみ" | "🔒 非 OA のみ";
type TabId = "papers" | "news" | "hn" | "wildcard";

const AFF_MAP: Record<string, PaperItem["affiliationCategory"]> = {
  "🎓 Academic（大学）": "Academic",
  "🏢 Corporate（企業）": "Corporate",
  "🔀 Mixed": "Mixed",
};

export default function SearchPage() {
  const { state } = useSearch();
  const [activeTab, setActiveTab] = useState<TabId>("papers");
  const [affFilter, setAffFilter] = useState<AffFilter>("全て");
  const [sortOpt, setSortOpt] = useState<SortOpt>("新しい順");
  const [oaFilter, setOaFilter] = useState<OaFilter>("全て");

  if (!state.keyword) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">🔭</div>
        <h1 className="text-2xl font-bold mb-2">Research Navigator</h1>
        <p className="text-gray-500 text-sm">
          <span className="lg:hidden">左上のメニューからキーワードを入力して「🔍 検索・収集」を押してください。</span>
          <span className="hidden lg:inline">サイドバーからキーワードを入力・選択して「🔍 検索・収集」を押してください。</span>
        </p>
      </div>
    );
  }

  // ── Filter & sort papers ──
  let filtered = [...state.papers];
  if (affFilter !== "全て") {
    const cat = AFF_MAP[affFilter];
    filtered = filtered.filter((p) => p.affiliationCategory === cat);
  }
  if (oaFilter === "🔓 OA のみ") filtered = filtered.filter((p) => p.isOa);
  else if (oaFilter === "🔒 非 OA のみ") filtered = filtered.filter((p) => !p.isOa);
  if (sortOpt === "新しい順") filtered.sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
  else if (sortOpt === "引用数（多い順）") filtered.sort((a, b) => b.citationCount - a.citationCount);
  else filtered.sort((a, b) => a.citationCount - b.citationCount);

  const academicN = filtered.filter((p) => p.affiliationCategory === "Academic").length;
  const corporateN = filtered.filter((p) => p.affiliationCategory === "Corporate").length;
  const mixedN = filtered.filter((p) => p.affiliationCategory === "Mixed").length;
  const maxCite = Math.max(...filtered.map((p) => p.citationCount), 0);

  const sortedHN = [...state.hn].sort((a, b) => b.points - a.points);

  const tabs: { id: TabId; label: string }[] = [
    { id: "papers", label: `📚 学術論文 (${state.papers.length})` },
    { id: "news", label: `📰 Google News (${state.news.length})` },
    { id: "hn", label: `🟠 Hacker News (${state.hn.length})` },
    ...(state.wildcardKeyword
      ? [{ id: "wildcard" as TabId, label: `🌐 ワイルドカード「${state.wildcardKeyword}」` }]
      : []),
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">「{state.keyword}」の検索結果</h1>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Papers tab ── */}
      {activeTab === "papers" && (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3">🗺️ 業界マップ フィルタ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">所属カテゴリ</label>
                <select
                  value={affFilter}
                  onChange={(e) => setAffFilter(e.target.value as AffFilter)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  {["全て", "🎓 Academic（大学）", "🏢 Corporate（企業）", "🔀 Mixed"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">ソート</label>
                <select
                  value={sortOpt}
                  onChange={(e) => setSortOpt(e.target.value as SortOpt)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  {["引用数（多い順）", "引用数（少ない順）", "新しい順"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">オープンアクセス</label>
                <select
                  value={oaFilter}
                  onChange={(e) => setOaFilter(e.target.value as OaFilter)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  {["全て", "🔓 OA のみ", "🔒 非 OA のみ"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {[
                { label: "表示件数", value: filtered.length },
                { label: "🎓 Academic", value: academicN },
                { label: "🏢 Corporate", value: corporateN },
                { label: "🔀 Mixed", value: mixedN },
                { label: "最大引用数", value: maxCite.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded p-2 border border-gray-200">
                  <div className="text-lg font-bold">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm">該当論文がありません。フィルタを変更してください。</p>
          ) : (
            filtered.map((paper, i) => <PaperCard key={`${paper.url}_${i}`} paper={paper} index={i} />)
          )}
        </div>
      )}

      {/* ── News tab ── */}
      {activeTab === "news" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{state.news.length} 件取得</p>
          {state.news.length === 0 ? (
            <p className="text-gray-500 text-sm">ニュースが見つかりませんでした。</p>
          ) : (
            state.news.map((item, i) => (
              <NewsCard key={`${item.url}_${i}`} item={item} summaryKey={`news_${i}`} />
            ))
          )}
        </div>
      )}

      {/* ── HN tab ── */}
      {activeTab === "hn" && (
        <div>
          {state.hnError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded mb-4">
              {state.hnError}
            </div>
          )}
          <p className="text-sm text-gray-500 mb-3">{sortedHN.length} 件取得（スコア降順）</p>
          {sortedHN.length === 0 ? (
            <p className="text-gray-500 text-sm">HN の投稿が見つかりませんでした。英語キーワードで検索するとヒット率が上がります。</p>
          ) : (
            sortedHN.map((item, i) => <HNCard key={`${item.hnUrl}_${i}`} item={item} index={i} />)
          )}
        </div>
      )}

      {/* ── Wildcard tab ── */}
      {activeTab === "wildcard" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{state.wildcardNews.length} 件取得</p>
          {state.wildcardNews.length === 0 ? (
            <p className="text-gray-500 text-sm">ワイルドカードのニュースが見つかりませんでした。</p>
          ) : (
            state.wildcardNews.map((item, i) => (
              <NewsCard key={`${item.url}_${i}`} item={item} summaryKey={`wc_${i}`} saveType="news" />
            ))
          )}
        </div>
      )}
    </div>
  );
}
