import { ExternalLink } from "lucide-react";
import type { PlayerProfile } from "@/lib/faceit/types";

function flag(country: string | null): string | null {
  if (!country || !/^[a-z]{2}$/i.test(country)) return null;
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function levelColor(level: number | null): string {
  if (!level) return "var(--faint)";
  if (level >= 10) return "#ff4d4d";
  if (level >= 8) return "#ff8a3d";
  if (level >= 4) return "#ffcc33";
  if (level >= 2) return "#3ddc97";
  return "#cfd3dc";
}

export function LevelBadge({ level, size = 56 }: { level: number | null; size?: number }) {
  const color = levelColor(level);
  const r = 22;
  const c = 2 * Math.PI * r;
  const progress = level ? level / 10 : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={level ? `Level ${level}` : "No level"}>
      <svg viewBox="0 0 52 52" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="var(--surface-2)" stroke="rgb(255 255 255 / 0.08)" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${c * progress} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold" style={{ color }}>
        {level ?? "–"}
      </span>
    </div>
  );
}

export function ProfileHeader({ profile, recentResults }: { profile: PlayerProfile; recentResults: boolean[] }) {
  const f = flag(profile.country);
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="glow-accent pointer-events-none absolute -top-24 -right-24 size-72 opacity-60" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- FACEIT CDN avatar, small and already optimized
            <img
              src={profile.avatar}
              alt=""
              width={72}
              height={72}
              className="size-16 shrink-0 rounded-2xl border border-line-strong object-cover sm:size-[72px]"
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 font-display text-2xl font-bold text-muted sm:size-[72px]">
              {profile.nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest text-faint uppercase">Player report</p>
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{profile.nickname}</h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
              {f && <span aria-hidden="true">{f}</span>}
              {profile.region && <span>{profile.region}</span>}
              {profile.faceitUrl && (
                <a
                  href={profile.faceitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-faint transition hover:text-text"
                >
                  FACEIT profile <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 sm:gap-6">
          {recentResults.length > 0 && (
            <div className="hidden md:block">
              <p className="mb-1.5 text-right text-xs text-faint">Last {recentResults.length}</p>
              <div className="flex gap-1" aria-label={`Recent results: ${recentResults.map((w) => (w ? "W" : "L")).join(" ")}`}>
                {recentResults.map((w, i) => (
                  <span
                    key={i}
                    className={`grid size-6 place-items-center rounded-md text-[11px] font-bold ${
                      w ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
                    }`}
                  >
                    {w ? "W" : "L"}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <LevelBadge level={profile.level} />
            <div>
              <p className="text-xs text-faint">FACEIT Elo</p>
              <p className="tabular font-display text-2xl font-bold">{profile.elo?.toLocaleString("en-US") ?? "–"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
