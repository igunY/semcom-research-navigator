from __future__ import annotations

import re
import requests
from dataclasses import dataclass, field
from datetime import date, timedelta

OPENALEX_BASE = "https://api.openalex.org"
_OA_HEADERS = {"User-Agent": "ResearchNavigator/1.0 (mailto:hamayuzuki628@gmail.com)"}


@dataclass
class PaperItem:
    title: str
    url: str
    authors: str
    published: str
    abstract: str
    source: str = "OpenAlex"
    citation_count: int = 0
    institutions: list[str] = field(default_factory=list)
    affiliation_category: str = "Unknown"  # Academic / Corporate / Mixed / Unknown
    arxiv_id: str = ""
    year: str = ""
    topics: list[str] = field(default_factory=list)
    is_oa: bool = False


def _clean_keyword(keyword: str) -> str:
    keyword = re.sub(r"[/／×]", " ", keyword)
    keyword = keyword.replace("　", " ")
    return " ".join(keyword.split())


def _classify_inst_type(type_str: str) -> str:
    t = (type_str or "").lower()
    if t == "education":
        return "Academic"
    if t in ("company", "nonprofit", "government", "facility", "archive", "healthcare", "funder"):
        return "Corporate"
    return "Unknown"


def _reconstruct_abstract(inverted_index: dict | None) -> str:
    if not inverted_index:
        return ""
    try:
        max_pos = max(pos for positions in inverted_index.values() for pos in positions)
    except ValueError:
        return ""
    words = [""] * (max_pos + 1)
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word
    return " ".join(w for w in words if w)


def _fetch_openalex(query: str, per_page: int = 20) -> list[PaperItem]:
    from_date = (date.today() - timedelta(days=365)).isoformat()
    params = {
        "search": query,
        "per-page": per_page,
        "select": (
            "id,title,doi,publication_year,cited_by_count,"
            "authorships,abstract_inverted_index,topics,open_access"
        ),
        "sort": "publication_date:desc",
        "from_publication_date": from_date,
    }
    try:
        r = requests.get(
            f"{OPENALEX_BASE}/works",
            params=params,
            headers=_OA_HEADERS,
            timeout=15,
        )
        r.raise_for_status()
        results: list[PaperItem] = []
        for work in r.json().get("results", []):
            abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
            if not abstract:
                continue

            authors_list: list[str] = []
            inst_names: list[str] = []
            inst_categories: set[str] = set()

            for authorship in work.get("authorships", []):
                name = authorship.get("author", {}).get("display_name", "")
                if name:
                    authors_list.append(name)
                for inst in authorship.get("institutions", []):
                    inst_name = inst.get("display_name", "")
                    if inst_name and inst_name not in inst_names:
                        inst_names.append(inst_name)
                    cat = _classify_inst_type(inst.get("type", ""))
                    if cat != "Unknown":
                        inst_categories.add(cat)

            if "Academic" in inst_categories and "Corporate" in inst_categories:
                aff_cat = "Mixed"
            elif "Academic" in inst_categories:
                aff_cat = "Academic"
            elif "Corporate" in inst_categories:
                aff_cat = "Corporate"
            else:
                aff_cat = "Unknown"

            doi = work.get("doi") or ""
            url = doi if doi.startswith("http") else (f"https://doi.org/{doi}" if doi else "")
            arxiv_id = ""
            if "arxiv" in doi.lower():
                arxiv_id = doi.split("arxiv.")[-1].strip("/").lower()

            authors_str = ", ".join(authors_list[:3])
            if len(authors_list) > 3:
                authors_str += " ほか"
            year = str(work.get("publication_year", "")) if work.get("publication_year") else ""

            topics_list = [
                t.get("display_name", "")
                for t in work.get("topics", [])
                if t.get("display_name")
            ][:5]

            is_oa = bool((work.get("open_access") or {}).get("is_oa", False))

            results.append(PaperItem(
                title=work.get("title") or "No title",
                url=url,
                authors=authors_str,
                published=year,
                abstract=abstract,
                source="OpenAlex",
                citation_count=work.get("cited_by_count", 0) or 0,
                institutions=inst_names[:5],
                affiliation_category=aff_cat,
                arxiv_id=arxiv_id,
                year=year,
                topics=topics_list,
                is_oa=is_oa,
            ))
        return results
    except Exception as e:
        print(f"[OpenAlex] error: {e}")
        return []


def fetch_papers(keyword: str, max_results: int = 10) -> tuple[list[PaperItem], str]:
    query = _clean_keyword(keyword)
    return _fetch_openalex(query, max(max_results, 20)), ""
