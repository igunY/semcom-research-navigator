"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { PaperItem, NewsItem, HNItem } from "@/types";

interface SearchState {
  keyword: string;
  wildcardKeyword: string;
  maxResults: number;
  geminiApiKey: string;
  papers: PaperItem[];
  news: NewsItem[];
  hn: HNItem[];
  wildcardNews: NewsItem[];
  paperWarning: string;
  hnError: string;
  isLoading: boolean;
  paperSummaries: Record<string, string>;
  newsSummaries: Record<string, string>;
}

type Action =
  | { type: "SET_KEYWORD"; payload: string }
  | { type: "SET_WILDCARD_KEYWORD"; payload: string }
  | { type: "SET_MAX_RESULTS"; payload: number }
  | { type: "SET_GEMINI_KEY"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_RESULTS"; payload: Omit<SearchState, "keyword" | "wildcardKeyword" | "maxResults" | "geminiApiKey" | "isLoading" | "paperSummaries" | "newsSummaries"> }
  | { type: "SET_PAPER_SUMMARY"; payload: { key: string; summary: string } }
  | { type: "SET_NEWS_SUMMARY"; payload: { key: string; summary: string } }
  | { type: "RESET_SUMMARIES" };

const initialState: SearchState = {
  keyword: "",
  wildcardKeyword: "",
  maxResults: 8,
  geminiApiKey: "",
  papers: [],
  news: [],
  hn: [],
  wildcardNews: [],
  paperWarning: "",
  hnError: "",
  isLoading: false,
  paperSummaries: {},
  newsSummaries: {},
};

function reducer(state: SearchState, action: Action): SearchState {
  switch (action.type) {
    case "SET_KEYWORD": return { ...state, keyword: action.payload };
    case "SET_WILDCARD_KEYWORD": return { ...state, wildcardKeyword: action.payload };
    case "SET_MAX_RESULTS": return { ...state, maxResults: action.payload };
    case "SET_GEMINI_KEY": return { ...state, geminiApiKey: action.payload };
    case "SET_LOADING": return { ...state, isLoading: action.payload };
    case "SET_RESULTS": return { ...state, ...action.payload };
    case "SET_PAPER_SUMMARY":
      return { ...state, paperSummaries: { ...state.paperSummaries, [action.payload.key]: action.payload.summary } };
    case "SET_NEWS_SUMMARY":
      return { ...state, newsSummaries: { ...state.newsSummaries, [action.payload.key]: action.payload.summary } };
    case "RESET_SUMMARIES":
      return { ...state, paperSummaries: {}, newsSummaries: {} };
    default: return state;
  }
}

interface SearchContextValue {
  state: SearchState;
  doSearch: () => Promise<void>;
  dispatch: React.Dispatch<Action>;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const doSearch = useCallback(async () => {
    if (!state.keyword.trim()) return;
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "RESET_SUMMARIES" });

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: state.keyword,
          maxResults: state.maxResults,
          wildcardKeyword: state.wildcardKeyword || undefined,
        }),
      });
      const data = await res.json();
      dispatch({
        type: "SET_RESULTS",
        payload: {
          papers: data.papers ?? [],
          news: data.news ?? [],
          hn: data.hn ?? [],
          wildcardNews: data.wildcardNews ?? [],
          paperWarning: data.paperWarning ?? "",
          hnError: data.hnError ?? "",
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.keyword, state.wildcardKeyword, state.maxResults]);

  return (
    <SearchContext.Provider value={{ state, doSearch, dispatch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside SearchProvider");
  return ctx;
}
