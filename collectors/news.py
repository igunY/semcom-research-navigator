from __future__ import annotations

import feedparser
import socket
import ssl
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from bs4 import BeautifulSoup

try:
    import certifi
    _SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CONTEXT = ssl.create_default_context()


@dataclass
class NewsItem:
    title: str
    url: str
    source: str
    published: str
    summary: str


def _strip_html(text: str) -> str:
    return BeautifulSoup(text, "html.parser").get_text(separator=" ").strip()


def fetch_news(keyword: str, max_results: int = 10) -> list[NewsItem]:
    encoded = urllib.parse.quote(keyword)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=ja&gl=JP&ceid=JP:ja"

    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            old_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)
            try:
                handler = urllib.request.HTTPSHandler(context=_SSL_CONTEXT)
                opener = urllib.request.build_opener(handler)
                response = opener.open(url)
                feed = feedparser.parse(response.read())
            finally:
                socket.setdefaulttimeout(old_timeout)

            # feedparser はHTTPエラーでも例外を投げないので手動チェック
            status = getattr(feed, "status", 200)
            if status not in (200, 301, 302, 304):
                raise Exception(f"Google News HTTPエラー: {status}")
            if feed.bozo and not feed.entries:
                bozo_exc = getattr(feed, "bozo_exception", None)
                raise Exception(f"フィード解析失敗: {bozo_exc}")

            items = []
            for entry in feed.entries[:max_results]:
                source = ""
                if hasattr(entry, "source"):
                    source = entry.source.get("title", "")
                raw_summary = entry.get("summary", "")
                clean_summary = _strip_html(raw_summary) if raw_summary else ""
                items.append(NewsItem(
                    title=entry.get("title", "（タイトルなし）"),
                    url=entry.get("link", ""),
                    source=source or "不明",
                    published=entry.get("published", ""),
                    summary=clean_summary,
                ))
            return items
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(3)
    raise last_exc
