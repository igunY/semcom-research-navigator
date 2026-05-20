import os
import dataclasses
from datetime import datetime

import streamlit as st
from dotenv import load_dotenv

import database
from collectors.news import fetch_news
from collectors.papers import fetch_papers, PaperItem
from collectors.hacker_news import fetch_hn
from ai.summarizer import summarize

load_dotenv()
database.init_db()

st.set_page_config(
    page_title="Research Navigator",
    page_icon="🔭",
    layout="wide",
)

st.markdown("""
<style>
    .block-container { padding-top: 1.5rem; }
    div[data-testid="stExpander"] { border: 1px solid #e8e8e8; border-radius: 6px; }
    .stCode code { font-size: 0.9rem; white-space: pre-wrap; }
    .aff-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 4px;
    }
</style>
""", unsafe_allow_html=True)

_AFF_EMOJI = {"Academic": "🎓", "Corporate": "🏢", "Mixed": "🔀", "Unknown": "❓"}
_AFF_COLOR = {
    "Academic": ("background:#1a73e8;color:#fff", "Academic"),
    "Corporate": ("background:#e37400;color:#fff", "Corporate"),
    "Mixed": ("background:#7b1fa2;color:#fff", "Mixed"),
    "Unknown": ("background:#888;color:#fff", "Unknown"),
}

PRESET_KEYWORDS = [
    "Semantic Communication", "6G", "LLM inference",
    "Edge AI", "quantum communication", "MIMO beamforming",
    "diffusion model", "neuromorphic computing",
]
COMPOUND_KEYWORDS = [
    "Semantic Communication × AI", "6G × security",
    "LLM × edge computing", "quantum × error correction",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

@st.cache_data(ttl=3600)
def _cached_papers(keyword: str, max_results: int) -> tuple[list[dict], str]:
    items, warn = fetch_papers(keyword, max_results)
    return [dataclasses.asdict(p) for p in items], warn


@st.cache_data(ttl=3600)
def _cached_news(keyword: str, max_results: int) -> list[dict]:
    return [dataclasses.asdict(n) for n in fetch_news(keyword, max_results)]


@st.cache_data(ttl=300)
def _cached_hn(keyword: str, max_results: int = 30) -> list[dict]:
    return [dataclasses.asdict(h) for h in fetch_hn(keyword, max_results)]


def _aff_badge(cat: str) -> str:
    style, label = _AFF_COLOR.get(cat, _AFF_COLOR["Unknown"])
    emoji = _AFF_EMOJI.get(cat, "❓")
    return f'<span class="aff-badge" style="{style}">{emoji} {label}</span>'


def _src_badge(src: str) -> str:
    color = "#1d6340" if src == "OpenAlex" else "#b31217"
    return f'<span class="aff-badge" style="background:{color};color:#fff">{src}</span>'


def _topic_badge(topic: str) -> str:
    return f'<span class="aff-badge" style="background:#0d47a1;color:#fff">🏷️ {topic}</span>'


def _oa_badge() -> str:
    return '<span class="aff-badge" style="background:#2e7d32;color:#fff">🔓 Open Access</span>'


def _pts_badge(pts: int) -> str:
    color = "#ff6600" if pts >= 100 else "#888"
    return f'<span class="aff-badge" style="background:{color};color:#fff">▲ {pts} pts</span>'


def _cmt_badge(n: int) -> str:
    color = "#1a73e8" if n >= 50 else "#888"
    return f'<span class="aff-badge" style="background:{color};color:#fff">💬 {n}</span>'


# ── Session state ─────────────────────────────────────────────────────────────
_DEFAULTS: list[tuple] = [
    ("search_keyword", ""),
    ("wildcard_keyword", ""),
    ("paper_results", []),
    ("news_results", []),
    ("hn_results", []),
    ("wildcard_news_results", []),
    ("paper_summaries", {}),
    ("news_summaries", {}),
    ("paper_error", ""),
    ("hn_error", ""),
    ("page", "search"),
]
for _k, _v in _DEFAULTS:
    if _k not in st.session_state:
        st.session_state[_k] = _v


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("🔭 Research Navigator")
    st.caption("SemCom / 6G / AI 業界俯瞰ツール")
    st.divider()

    page = st.radio(
        "ページ",
        ["🔍 検索・ダッシュボード", "⭐ 自分専用の業界地図"],
        label_visibility="collapsed",
        key="nav_page",
    )
    st.session_state["page"] = "search" if "検索" in page else "bookmarks"
    st.divider()

    keyword = st.text_input(
        "メインキーワード",
        value=st.session_state.search_keyword,
        placeholder="例: Semantic Communication, 6G, LLM",
    )

    st.write("**プリセット（単一）**")
    cols = st.columns(2)
    for i, kw in enumerate(PRESET_KEYWORDS):
        if cols[i % 2].button(kw, key=f"preset_{i}", use_container_width=True):
            st.session_state.search_keyword = kw
            st.rerun()

    st.write("**プリセット（複合）**")
    cols2 = st.columns(2)
    for i, kw in enumerate(COMPOUND_KEYWORDS):
        if cols2[i % 2].button(kw, key=f"cmp_{i}", use_container_width=True):
            st.session_state.search_keyword = kw.replace(" × ", " ")
            st.rerun()

    st.divider()
    wildcard_kw = st.text_input(
        "ワイルドカード枠",
        value=st.session_state.wildcard_keyword,
        placeholder="例: 就活トレンド, 最新ガジェット",
        help="専門外のキーワードを入れると別タブに結果が出ます",
    )
    st.divider()

    max_results = st.slider("1カテゴリの取得件数", min_value=3, max_value=20, value=8)
    api_key = st.text_input(
        "Gemini API Key",
        type="password",
        value=os.getenv("GEMINI_API_KEY", ""),
        help=".env ファイルに GEMINI_API_KEY=xxx と書いても使えます",
    )
    st.divider()

    do_search = st.button("🔍 検索・収集", type="primary", use_container_width=True)

    if do_search:
        kw = keyword.strip()
        if not kw:
            st.warning("キーワードを入力してください")
        else:
            st.session_state.search_keyword = kw
            st.session_state.wildcard_keyword = wildcard_kw.strip()
            st.session_state.paper_summaries = {}
            st.session_state.news_summaries = {}
            st.session_state.paper_error = ""
            st.session_state.hn_error = ""
            with st.spinner("データ収集中… (OpenAlex / HN / Google News)"):
                try:
                    paper_items, _ = _cached_papers(kw, max_results)
                    st.session_state.paper_results = paper_items
                except Exception as e:
                    st.session_state.paper_error = f"論文取得エラー: {e}"
                    st.session_state.paper_results = []
                try:
                    st.session_state.news_results = _cached_news(kw, max_results)
                except Exception as e:
                    st.error(f"Google News 取得エラー: {e}")
                    st.session_state.news_results = []
                try:
                    st.session_state.hn_results = _cached_hn(kw, 30)
                except Exception as e:
                    st.session_state.hn_error = f"Hacker News 取得エラー: {e}"
                    st.session_state.hn_results = []
                if st.session_state.wildcard_keyword:
                    try:
                        st.session_state.wildcard_news_results = _cached_news(
                            st.session_state.wildcard_keyword, max_results
                        )
                    except Exception as e:
                        st.error(f"ワイルドカード取得エラー: {e}")
                        st.session_state.wildcard_news_results = []
                else:
                    st.session_state.wildcard_news_results = []


# ── Search page ───────────────────────────────────────────────────────────────
def render_search_page() -> None:
    if not st.session_state.search_keyword:
        st.title("🔭 Research Navigator")
        st.info("サイドバーからキーワードを入力・選択して「🔍 検索・収集」を押してください。")
        return

    st.title(f"「{st.session_state.search_keyword}」の検索結果")

    papers = st.session_state.paper_results
    news_items = st.session_state.news_results
    hn_items = st.session_state.hn_results
    wc_items = st.session_state.wildcard_news_results

    tab_labels = [
        f"📚 学術論文 ({len(papers)})",
        f"📰 Google News ({len(news_items)})",
        f"🟠 Hacker News ({len(hn_items)})",
    ]
    if st.session_state.wildcard_keyword:
        tab_labels.append(f"🌐 ワイルドカード「{st.session_state.wildcard_keyword}」")

    tabs = st.tabs(tab_labels)
    tab_papers, tab_news, tab_hn = tabs[0], tabs[1], tabs[2]
    tab_wc = tabs[3] if len(tabs) > 3 else None

    # ── 学術論文タブ ─────────────────────────────────────────────────────────
    with tab_papers:
        if st.session_state.paper_error:
            st.error(st.session_state.paper_error)

        if not papers:
            st.info("論文が見つかりませんでした。英語キーワードで再検索してください。")
        else:
            # ── 業界マップ フィルタ ──────────────────────────────────────────
            st.subheader("🗺️ 業界マップ フィルタ")
            fc1, fc2, fc3 = st.columns(3)
            with fc1:
                aff_filter = st.selectbox(
                    "機関タイプ",
                    ["全て", "🎓 Academic（大学）", "🏢 Corporate（企業）", "🔀 Mixed"],
                )
            with fc2:
                sort_opt = st.selectbox(
                    "ソート",
                    ["新しい順", "引用数（多い順）", "引用数（少ない順）"],
                )
            with fc3:
                oa_filter = st.selectbox(
                    "オープンアクセス",
                    ["全て", "🔓 OA のみ", "🔒 非 OA のみ"],
                )

            filtered = list(papers)
            aff_map = {
                "🎓 Academic（大学）": "Academic",
                "🏢 Corporate（企業）": "Corporate",
                "🔀 Mixed": "Mixed",
            }
            if aff_filter != "全て":
                cat = aff_map.get(aff_filter, "")
                filtered = [p for p in filtered if p.get("affiliation_category") == cat]
            if oa_filter == "🔓 OA のみ":
                filtered = [p for p in filtered if p.get("is_oa")]
            elif oa_filter == "🔒 非 OA のみ":
                filtered = [p for p in filtered if not p.get("is_oa")]

            if sort_opt == "新しい順":
                filtered.sort(key=lambda x: x.get("year", "") or "", reverse=True)
            elif sort_opt == "引用数（多い順）":
                filtered.sort(key=lambda x: x.get("citation_count", 0), reverse=True)
            elif sort_opt == "引用数（少ない順）":
                filtered.sort(key=lambda x: x.get("citation_count", 0))

            # ── 業界統計 ────────────────────────────────────────────────────
            academic_n = sum(1 for p in filtered if p.get("affiliation_category") == "Academic")
            corporate_n = sum(1 for p in filtered if p.get("affiliation_category") == "Corporate")
            mixed_n = sum(1 for p in filtered if p.get("affiliation_category") == "Mixed")
            max_cite = max((p.get("citation_count", 0) for p in filtered), default=0)

            m1, m2, m3, m4, m5 = st.columns(5)
            m1.metric("表示件数", len(filtered))
            m2.metric("🎓 Academic", academic_n)
            m3.metric("🏢 Corporate", corporate_n)
            m4.metric("🔀 Mixed", mixed_n)
            m5.metric("最大引用数", f"{max_cite:,}")
            st.divider()

            if not filtered:
                st.info("該当論文がありません。フィルタを変更してください。")
            else:
                for i, paper in enumerate(filtered):
                    _render_paper_card(paper, i, api_key)

    # ── Google News タブ ─────────────────────────────────────────────────────
    with tab_news:
        if not news_items:
            st.info("ニュースが見つかりませんでした。")
        else:
            st.caption(f"{len(news_items)} 件取得")
            for i, item in enumerate(news_items):
                _render_news_card(item, i, api_key)

    # ── Hacker News タブ ─────────────────────────────────────────────────────
    with tab_hn:
        if st.session_state.hn_error:
            st.error(st.session_state.hn_error)
        if not hn_items:
            st.info("HN の投稿が見つかりませんでした。英語キーワードで検索するとヒット率が上がります。")
        else:
            sorted_hn = sorted(hn_items, key=lambda x: x.get("points", 0), reverse=True)
            st.caption(f"{len(sorted_hn)} 件取得（スコア降順）　— キャッシュ: 5分")
            for i, item in enumerate(sorted_hn):
                _render_hn_card(item, i)

    # ── ワイルドカードタブ ───────────────────────────────────────────────────
    if tab_wc is not None:
        with tab_wc:
            if not wc_items:
                st.info("ワイルドカードのニュースが見つかりませんでした。")
            else:
                st.caption(f"{len(wc_items)} 件取得")
                for i, item in enumerate(wc_items):
                    _render_news_card(item, i + 1000, api_key, prefix="wc")


# ── Card renderers ────────────────────────────────────────────────────────────

def _render_paper_card(paper: dict, idx: int, api_key: str) -> None:
    with st.container(border=True):
        title = paper.get("title", "No title")
        url = paper.get("url", "")
        if url:
            st.markdown(f"#### [{title}]({url})")
        else:
            st.markdown(f"#### {title}")

        # Source + affiliation + OA badges
        aff_cat = paper.get("affiliation_category", "Unknown")
        src = paper.get("source", "")
        badges_html = _src_badge(src) + _aff_badge(aff_cat)
        if paper.get("is_oa"):
            badges_html += _oa_badge()
        if paper.get("citation_count", 0):
            badges_html += (
                f'<span class="aff-badge" style="background:#1d6340;color:#fff">'
                f'📊 引用 {paper["citation_count"]:,}</span>'
            )
        st.markdown(badges_html, unsafe_allow_html=True)

        # Topics badges
        topics = paper.get("topics", [])
        if topics:
            st.markdown(" ".join(_topic_badge(t) for t in topics), unsafe_allow_html=True)

        # Meta row
        meta_parts = []
        if paper.get("year"):
            meta_parts.append(f"📅 {paper['year']}")
        if paper.get("authors"):
            meta_parts.append(f"👤 {paper['authors']}")
        if meta_parts:
            st.caption(" | ".join(meta_parts))

        # Institutions
        institutions = paper.get("institutions", [])
        if institutions:
            st.caption("🏛️ " + " / ".join(institutions))

        # Abstract expander
        abstract = paper.get("abstract", "")
        if abstract:
            with st.expander("アブストラクト"):
                st.markdown(abstract)

        # Action buttons
        sum_key = f"paper_{idx}"
        btn_col, save_col = st.columns([4, 1])
        with btn_col:
            if sum_key not in st.session_state.paper_summaries:
                if st.button("AI 要約を生成", key=f"sum_p_{idx}"):
                    if not api_key:
                        st.error("Gemini API Key を設定してください")
                    else:
                        with st.spinner("要約生成中…"):
                            try:
                                result = summarize(title, abstract or title, "学術論文", api_key)
                                st.session_state.paper_summaries[sum_key] = result
                                st.rerun()
                            except Exception as e:
                                st.error(f"要約エラー: {e}")
        with save_col:
            if st.button("⭐ 保存", key=f"bm_p_{idx}"):
                summary = st.session_state.paper_summaries.get(sum_key, "")
                ok = database.add_bookmark(paper, "paper", summary)
                st.toast("⭐ 保存しました！" if ok else "既に保存済みです")

        if sum_key in st.session_state.paper_summaries:
            st.markdown("**AI 要約**　*(右上のコピーボタンで1クリックコピー)*")
            st.code(st.session_state.paper_summaries[sum_key], language=None)


def _render_news_card(item: dict, idx: int, api_key: str, prefix: str = "news") -> None:
    with st.container(border=True):
        title = item.get("title", "（タイトルなし）")
        url = item.get("url", "")
        st.markdown(f"#### [{title}]({url})" if url else f"#### {title}")

        c1, c2 = st.columns([3, 2])
        c1.caption(f"📰 {item.get('source', '不明')}")
        c2.caption(f"📅 {item.get('published', '')}")

        raw_summary = item.get("summary", "")
        if raw_summary:
            with st.expander("元の概要"):
                st.markdown(raw_summary)

        sum_key = f"{prefix}_{idx}"
        btn_col, save_col = st.columns([4, 1])
        if sum_key in st.session_state.news_summaries:
            st.markdown("**AI 要約**")
            st.code(st.session_state.news_summaries[sum_key], language=None)
        else:
            with btn_col:
                if st.button("AI 要約を生成", key=f"sum_{prefix}_{idx}"):
                    if not api_key:
                        st.error("Gemini API Key を設定してください")
                    else:
                        with st.spinner("要約生成中…"):
                            try:
                                content = raw_summary or title
                                result = summarize(title, content, "ニュース記事", api_key)
                                st.session_state.news_summaries[sum_key] = result
                                st.rerun()
                            except Exception as e:
                                st.error(f"要約エラー: {e}")
        with save_col:
            if st.button("⭐ 保存", key=f"bm_{prefix}_{idx}"):
                summary = st.session_state.news_summaries.get(sum_key, "")
                ok = database.add_bookmark(
                    {**item, "source": "GoogleNews"},
                    "news",
                    summary,
                )
                st.toast("⭐ 保存しました！" if ok else "既に保存済みです")


def _render_hn_card(item: dict, idx: int) -> None:
    pts = item.get("points", 0)
    cmts = item.get("num_comments", 0)
    hn_url = item.get("hn_url", "")
    url = item.get("url") or hn_url

    with st.container(border=True):
        st.markdown(
            f"#### [{item.get('title', '（タイトルなし）')}]({url})"
            + (f'　<a href="{hn_url}" target="_blank" style="font-size:0.85rem;">[HNで議論]</a>' if hn_url else ""),
            unsafe_allow_html=True,
        )
        st.markdown(_pts_badge(pts) + _cmt_badge(cmts), unsafe_allow_html=True)

        c1, c2 = st.columns([3, 2])
        c1.caption("🟠 Hacker News")
        c2.caption(f"📅 {item.get('created_at', '')}")

        _, save_col = st.columns([4, 1])
        with save_col:
            if st.button("⭐ 保存", key=f"bm_hn_{idx}"):
                ok = database.add_bookmark(
                    {
                        "title": item.get("title", ""),
                        "url": url,
                        "score": pts,
                        "source": "HackerNews",
                    },
                    "hackernews",
                )
                st.toast("⭐ 保存しました！" if ok else "既に保存済みです")


# ── Bookmarks page ────────────────────────────────────────────────────────────

def render_bookmarks_page() -> None:
    st.title("⭐ 自分専用の業界地図")
    st.caption("保存した論文・ニュース・HN投稿を一覧できます。")

    tab_all, tab_papers, tab_news, tab_hn = st.tabs([
        "🗂️ 全て", "📚 論文", "📰 ニュース", "🟠 Hacker News",
    ])

    with tab_all:
        _render_bookmark_list(database.get_bookmarks())
    with tab_papers:
        _render_bookmark_list(database.get_bookmarks("paper"))
    with tab_news:
        _render_bookmark_list(database.get_bookmarks("news"))
    with tab_hn:
        _render_bookmark_list(database.get_bookmarks("hackernews"))


def _render_bookmark_list(bookmarks: list[dict]) -> None:
    if not bookmarks:
        st.info("ブックマークがありません。")
        return

    for bm in bookmarks:
        with st.container(border=True):
            title = bm.get("title", "No title")
            url = bm.get("url", "")
            col_title, col_del = st.columns([6, 1])
            with col_title:
                st.markdown(f"#### [{title}]({url})" if url else f"#### {title}")
            with col_del:
                if st.button("🗑️ 削除", key=f"del_bm_{bm['id']}"):
                    database.delete_bookmark(bm["id"])
                    st.rerun()

            # Badges
            src = bm.get("source", bm.get("type", ""))
            aff_cat = bm.get("affiliation_category", "")
            badges = ""
            if src in ("OpenAlex", "arXiv"):
                badges += _src_badge(src)
            if aff_cat:
                badges += _aff_badge(aff_cat)
            if bm.get("citation_count", 0):
                badges += (
                    f'<span class="aff-badge" style="background:#1d6340;color:#fff">'
                    f'📊 引用 {bm["citation_count"]:,}</span>'
                )
            if bm.get("score", 0):
                badges += _pts_badge(bm["score"])
            if badges:
                st.markdown(badges, unsafe_allow_html=True)

            # Meta
            meta = []
            if bm.get("year"):
                meta.append(f"📅 {bm['year']}")
            authors = bm.get("authors", [])
            if authors:
                meta.append(f"👤 {', '.join(authors[:3])}")
            if meta:
                st.caption(" | ".join(meta))

            institutions = bm.get("institutions", [])
            if institutions:
                st.caption("🏛️ " + " / ".join(institutions))

            if bm.get("summary"):
                with st.expander("AI 要約"):
                    st.markdown(bm["summary"])

            if bm.get("abstract"):
                with st.expander("アブストラクト"):
                    st.markdown(bm["abstract"])

            st.caption(f"保存日時: {bm.get('created_at', '')}")


# ── Router ────────────────────────────────────────────────────────────────────
if st.session_state["page"] == "bookmarks":
    render_bookmarks_page()
else:
    render_search_page()
