import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LifetimeStats, RecentMatch } from "@/lib/faceit/types";

interface Stat {
  label: string;
  value: string;
  /** Recent (last N matches) comparison. */
  recent?: { text: string; dir: "up" | "down" | "flat" };
}

function trend(recent: number, career: number, threshold: number): "up" | "down" | "flat" {
  if (recent - career >= threshold) return "up";
  if (career - recent >= threshold) return "down";
  return "flat";
}

export function StatGrid({ lifetime, recent }: { lifetime: LifetimeStats; recent: RecentMatch[] }) {
  const n = recent.length;
  const rKills = n ? recent.reduce((s, m) => s + m.kills, 0) : 0;
  const rDeaths = n ? recent.reduce((s, m) => s + m.deaths, 0) : 0;
  const rKd = rDeaths ? rKills / rDeaths : null;
  const rWin = n ? (recent.filter((m) => m.won).length / n) * 100 : null;
  const rHs = n ? recent.reduce((s, m) => s + m.headshotPct, 0) / n : null;
  const rAdrList = recent.map((m) => m.adr).filter((a): a is number => a !== null);
  const rAdr = rAdrList.length === n && n ? rAdrList.reduce((s, a) => s + a, 0) / n : null;
  const rAvgKills = n ? rKills / n : null;
  const showRecent = n >= 5;

  const stats: Stat[] = [
    { label: "Matches", value: lifetime.matches.toLocaleString("en-US") },
    {
      label: "Win rate",
      value: `${Math.round(lifetime.winRate)}%`,
      recent: showRecent && rWin !== null ? { text: `${Math.round(rWin)}%`, dir: trend(rWin, lifetime.winRate, 5) } : undefined,
    },
    {
      label: "K/D",
      value: lifetime.kd.toFixed(2),
      recent: showRecent && rKd !== null ? { text: rKd.toFixed(2), dir: trend(rKd, lifetime.kd, 0.05) } : undefined,
    },
    {
      label: "Avg kills",
      value: lifetime.avgKills !== null ? lifetime.avgKills.toFixed(1) : "–",
      recent:
        showRecent && rAvgKills !== null && lifetime.avgKills !== null
          ? { text: rAvgKills.toFixed(1), dir: trend(rAvgKills, lifetime.avgKills, 1) }
          : undefined,
    },
    {
      label: "Headshot %",
      value: `${Math.round(lifetime.headshotPct)}%`,
      recent: showRecent && rHs !== null ? { text: `${Math.round(rHs)}%`, dir: trend(rHs, lifetime.headshotPct, 3) } : undefined,
    },
    {
      label: "ADR",
      value: lifetime.adr !== null ? Math.round(lifetime.adr).toString() : "–",
      recent:
        showRecent && rAdr !== null && lifetime.adr !== null
          ? { text: Math.round(rAdr).toString(), dir: trend(rAdr, lifetime.adr, 4) }
          : undefined,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card px-4 py-4">
            <p className="text-xs font-medium text-faint">{s.label}</p>
            <p className="tabular mt-1 font-display text-2xl font-bold sm:text-[28px]">{s.value}</p>
            {s.recent ? (
              <p
                className={`mt-1 flex items-center gap-1 text-xs ${
                  s.recent.dir === "up" ? "text-good" : s.recent.dir === "down" ? "text-bad" : "text-faint"
                }`}
              >
                {s.recent.dir === "up" && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
                {s.recent.dir === "down" && <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                <span className="tabular">{s.recent.text}</span>
                <span className="text-faint">recent</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-faint">career</p>
            )}
          </div>
        ))}
      </div>
      {showRecent && (
        <p className="mt-2 px-1 text-xs text-faint">Career averages. &ldquo;Recent&rdquo; is your last {n} matches.</p>
      )}
    </div>
  );
}
