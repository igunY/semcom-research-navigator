"use client";

import { useState } from "react";
import { SearchProvider } from "@/context/search-context";
import { Sidebar } from "./sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SearchProvider>
      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar: drawer on mobile, static on desktop ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="メニューを開く"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-lg font-bold">🔭 Research Navigator</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </SearchProvider>
  );
}
