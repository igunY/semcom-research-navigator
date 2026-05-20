import requests
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class HNItem:
    title: str
    url: str
    hn_url: str
    points: int
    num_comments: int
    created_at: str


def fetch_hn(keyword: str, max_results: int = 30) -> list[HNItem]:
    resp = requests.get(
        "https://hn.algolia.com/api/v1/search_by_date",
        params={"query": keyword, "tags": "story", "hitsPerPage": max_results},
        timeout=10,
    )
    resp.raise_for_status()

    items: list[HNItem] = []
    for hit in resp.json().get("hits", [])[:max_results]:
        object_id = hit.get("objectID", "")
        hn_url = f"https://news.ycombinator.com/item?id={object_id}"

        raw_url = hit.get("url") or ""
        url = raw_url if raw_url else hn_url

        raw_dt = hit.get("created_at", "")
        try:
            dt = datetime.fromisoformat(raw_dt.replace("Z", "+00:00"))
            # 日本時間（UTC+9）に変換して表示
            from datetime import timedelta
            jst = dt.astimezone(timezone(timedelta(hours=9)))
            created_at = jst.strftime("%Y-%m-%d %H:%M JST")
        except Exception:
            created_at = raw_dt

        items.append(HNItem(
            title=hit.get("title") or "（タイトルなし）",
            url=url,
            hn_url=hn_url,
            points=hit.get("points") or 0,
            num_comments=hit.get("num_comments") or 0,
            created_at=created_at,
        ))

    return items
