"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeaderboardRow {
  name: string;
  copies: number;
  designs: number;
  total: number;
}

type Tab = "writers" | "designers";

const TABS: { key: Tab; label: string }[] = [
  { key: "writers", label: "Writers" },
  { key: "designers", label: "Designers" },
];

// Pixel-based bar heights: a percentage height would collapse to 0 here because
// the flex column has no definite parent height for the % to resolve against.
const PLOT_PX = 120;

// Top-3 leaderboard of work created. A small tab re-ranks by the selected role —
// Writers by copies authored, Designers by designs claimed, All by the combined
// total. The #1 column is marked with a trophy.
export function TeamLeaderboard({ data }: { data: LeaderboardRow[] }) {
  const [tab, setTab] = useState<Tab>("writers");

  const valueOf = (r: LeaderboardRow) =>
    tab === "writers" ? r.copies : tab === "designers" ? r.designs : r.total;

  const rows = [...data]
    .filter((r) => valueOf(r) > 0)
    .sort((a, b) => valueOf(b) - valueOf(a))
    .slice(0, 3);

  const max = Math.max(...rows.map(valueOf), 1);

  return (
    <div>
      {/* Role tab */}
      <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[10px]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded px-2 py-0.5 font-semibold transition-colors",
              tab === t.key
                ? "bg-[#2a78d6] text-white"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[10px] text-gray-400">
          No {tab === "writers" ? "copies" : tab === "designers" ? "designs" : "work"} created yet.
        </div>
      ) : (
        <div className="flex items-end justify-around gap-4 pt-6">
          {rows.map((p, i) => {
            const value = valueOf(p);
            const barPx = Math.max(6, Math.round((value / max) * PLOT_PX));
            const isTop = i === 0;
            return (
              <div key={p.name + i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="flex flex-col items-center leading-none">
                  {isTop && <Trophy className="w-3.5 h-3.5 text-amber-500 mb-0.5" />}
                  <span className="text-[9px] font-semibold text-gray-500">{value}</span>
                </span>
                <div
                  className="w-full max-w-[52px] rounded-t-md hover:opacity-80 transition-opacity cursor-default"
                  style={{ height: barPx, background: "#2a78d6" }}
                  title={`${p.name}: ${p.copies} copies · ${p.designs} designs`}
                />
                <span
                  className="text-[9px] text-gray-500 font-medium truncate max-w-full"
                  title={p.name}
                >
                  {p.name}
                </span>
                <span className="text-[8px] text-gray-400">#{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
