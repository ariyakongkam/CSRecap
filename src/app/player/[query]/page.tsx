import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/motion";
import { CoachSummary, InsightColumns, PlaystyleCard } from "@/components/report/analysis-cards";
import { FocusPlanCard } from "@/components/report/focus-plan";
import { LookupErrorState } from "@/components/report/lookup-error";
import { MapStrip } from "@/components/report/map-strip";
import { ProfileHeader } from "@/components/report/profile-header";
import { StatGrid } from "@/components/report/stat-grid";
import { SearchForm } from "@/components/search-form";
import { progressData } from "@/lib/analysis/progress";
import { decodeParam, getPlayerReport } from "@/lib/player";

type Props = { params: Promise<{ query: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const query = decodeParam((await params).query);
  const result = await getPlayerReport(query);
  if (!result.ok) return { title: "Player not found" };
  const { profile } = result.data;
  return {
    title: `${profile.nickname}: ${result.report.playstyle.name}`,
    description: `${profile.nickname}'s CS2 report: playstyle, strengths, weaknesses and next focus.`,
  };
}

export default async function PlayerPage({ params }: Props) {
  const query = decodeParam((await params).query);
  const result = await getPlayerReport(query);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <LookupErrorState error={result.error} query={query} />
      </div>
    );
  }

  const { data, report } = result;

  // Steam IDs, profile links and case variants all resolve to one canonical URL.
  if (data.profile.nickname !== query) redirect(`/player/${encodeURIComponent(data.profile.nickname)}`);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-md sm:ml-auto">
        <SearchForm size="sm" />
      </div>

      <Reveal>
        <ProfileHeader profile={data.profile} recentResults={data.recentMatches.map((m) => m.won).slice(0, 10)} />
      </Reveal>

      <Reveal delay={0.05}>
        <StatGrid lifetime={data.lifetime} recent={data.recentMatches} />
      </Reveal>

      {report.dataNotes.length > 0 && (
        <div className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-sm text-warn">
          {report.dataNotes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal delay={0.1} className="lg:col-span-2">
          <PlaystyleCard playstyle={report.playstyle} />
        </Reveal>
        <Reveal delay={0.15} className="lg:col-span-3">
          <CoachSummary summary={report.summary} />
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <InsightColumns strengths={report.strengths} weaknesses={report.weaknesses} />
      </Reveal>

      <Reveal delay={0.25}>
        <FocusPlanCard plan={report.focus} progress={progressData(data)} />
      </Reveal>

      <MapStrip maps={data.maps} overallWinRate={data.lifetime.winRate} />

      <p className="px-1 text-xs text-faint">
        Based on {data.lifetime.matches.toLocaleString("en-US")} FACEIT matches and your last {data.recentMatches.length}{" "}
        games. Stats refresh every 10 minutes.
      </p>
    </div>
  );
}
