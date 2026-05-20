from __future__ import annotations

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "research.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                type                TEXT    NOT NULL,
                title               TEXT    NOT NULL,
                url                 TEXT,
                authors             TEXT,
                institutions        TEXT,
                citation_count      INTEGER DEFAULT 0,
                score               INTEGER DEFAULT 0,
                summary             TEXT,
                abstract            TEXT,
                year                TEXT,
                affiliation_category TEXT,
                source              TEXT,
                created_at          TEXT DEFAULT (datetime('now', 'localtime'))
            );
        """)


def add_bookmark(item: dict, item_type: str, summary: str = "") -> bool:
    """Return False if already bookmarked, True on success."""
    try:
        with _conn() as conn:
            if conn.execute(
                "SELECT id FROM bookmarks WHERE url = ? AND type = ?",
                (item.get("url", ""), item_type),
            ).fetchone():
                return False
            conn.execute(
                """INSERT INTO bookmarks
                   (type, title, url, authors, institutions,
                    citation_count, score, summary, abstract,
                    year, affiliation_category, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_type,
                    item.get("title", ""),
                    item.get("url", ""),
                    json.dumps(
                        item.get("authors") if isinstance(item.get("authors"), list)
                        else [a.strip() for a in (item.get("authors") or "").split(",") if a.strip()],
                        ensure_ascii=False,
                    ),
                    json.dumps(item.get("institutions", []), ensure_ascii=False),
                    item.get("citation_count", 0),
                    item.get("score", 0),
                    summary,
                    item.get("abstract", ""),
                    str(item.get("year", "") or item.get("published", "")),
                    item.get("affiliation_category", ""),
                    item.get("source", ""),
                ),
            )
        return True
    except Exception as e:
        print(f"[DB] add_bookmark error: {e}")
        return False


def get_bookmarks(item_type: str | None = None) -> list[dict]:
    with _conn() as conn:
        if item_type:
            rows = conn.execute(
                "SELECT * FROM bookmarks WHERE type = ? ORDER BY created_at DESC",
                (item_type,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM bookmarks ORDER BY created_at DESC"
            ).fetchall()

        result: list[dict] = []
        for row in rows:
            d = dict(row)
            for key in ("authors", "institutions"):
                try:
                    d[key] = json.loads(d[key]) if d[key] else []
                except Exception:
                    d[key] = []
            result.append(d)
        return result


def delete_bookmark(bookmark_id: int) -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))


def update_bookmark_summary(bookmark_id: int, summary: str) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE bookmarks SET summary = ? WHERE id = ?", (summary, bookmark_id)
        )
