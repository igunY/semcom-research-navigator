"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/context/search-context";

const PRESET_KEYWORDS = [
  "Semantic Communication", "6G",
  "LLM inference", "Edge AI",
  "quantum communication", "MIMO beamforming",
  "diffusion model", "neuromorphic computing",
];

const COMPOUND_KEYWORDS = [
  "Semantic Communication AI",
  "6G security",
  "LLM edge computing",
  "quantum error correction",
];

interface Props {
  onClose?: () => void;
}

export function Sidebar({ onClose }: Props) {
  const { state, dispatch, doSearch } = useSearch();
  const pathname = usePathname();
  const router = useRouter();

  function setKeyword(kw: string) {
    dispatch({ type: "SET_KEYWORD", payload: kw });
  }

  async function handleSearch() {
    if (!state.keyword.trim()) return;
    onClose?.();
    if (pathname !== "/") router.push("/");
    await doSearch();
  }

  function handleNav() {
    onClose?.();
  }

  return (
    <aside className="w-72 lg:w-64 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-4">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <span className="font-bold text-lg">Research Navigator</span>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded hover:bg-gray-200"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">SemCom / 6G / AI 業界俯瞰ツール</p>

        <hr className="mb-4" />

        {/* ── Navigation ── */}
        <nav className="flex flex-col gap-1 mb-4">
          <a
            href="/"
            onClick={handleNav}
            className={`px-3 py-2 rounded text-sm font-medium ${pathname === "/" ? "bg-indigo-100 text-indigo-700" : "text-gray-700 hover:bg-gray-200"}`}
          >
            🔍 検索・ダッシュボード
          </a>
          <a
            href="/bookmarks"
            onClick={handleNav}
            className={`px-3 py-2 rounded text-sm font-medium ${pathname === "/bookmarks" ? "bg-indigo-100 text-indigo-700" : "text-gray-700 hover:bg-gray-200"}`}
          >
            ⭐ 自分専用の業界地図
          </a>
        </nav>

        <hr className="mb-4" />

        {/* ── Keyword input ── */}
        <label className="text-xs font-semibold text-gray-600 block mb-1">メインキーワード</label>
        <input
          type="text"
          value={state.keyword}
          onChange={(e) => dispatch({ type: "SET_KEYWORD", payload: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="例: Semantic Communication, 6G"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* ── Preset single ── */}
        <p className="text-xs font-semibold text-gray-600 mb-2">プリセット（単一）</p>
        <div className="grid grid-cols-2 gap-1 mb-3">
          {PRESET_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => setKeyword(kw)}
              className="text-xs px-1.5 py-1 border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 text-left leading-tight"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* ── Preset compound ── */}
        <p className="text-xs font-semibold text-gray-600 mb-2">プリセット（複合）</p>
        <div className="grid grid-cols-2 gap-1 mb-4">
          {COMPOUND_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => setKeyword(kw)}
              className="text-xs px-1.5 py-1 border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 text-left leading-tight"
            >
              {kw}
            </button>
          ))}
        </div>

        <hr className="mb-4" />

        {/* ── Wildcard ── */}
        <label className="text-xs font-semibold text-gray-600 block mb-1">ワイルドカード枠</label>
        <input
          type="text"
          value={state.wildcardKeyword}
          onChange={(e) => dispatch({ type: "SET_WILDCARD_KEYWORD", payload: e.target.value })}
          placeholder="例: 就活トレンド, ガジェット"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <hr className="mb-4" />

        {/* ── Max results slider ── */}
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          取得件数: {state.maxResults}
        </label>
        <input
          type="range"
          min={3}
          max={20}
          value={state.maxResults}
          onChange={(e) => dispatch({ type: "SET_MAX_RESULTS", payload: Number(e.target.value) })}
          className="w-full mb-4 accent-indigo-600"
        />

        {/* ── Gemini API Key ── */}
        <label className="text-xs font-semibold text-gray-600 block mb-1">Gemini API Key</label>
        <input
          type="password"
          value={state.geminiApiKey}
          onChange={(e) => dispatch({ type: "SET_GEMINI_KEY", payload: e.target.value })}
          placeholder=".env.local の GOOGLE_GEMINI_API_KEY でも可"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <hr className="mb-4" />

        {/* ── Search button ── */}
        <button
          onClick={handleSearch}
          disabled={state.isLoading || !state.keyword.trim()}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          {state.isLoading ? "収集中…" : "🔍 検索・収集"}
        </button>
      </div>
    </aside>
  );
}
