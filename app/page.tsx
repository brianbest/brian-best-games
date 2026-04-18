import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import {
  ProfileHero,
  NowPlaying,
  Divider,
  RankedList,
  Heatmap,
  GenreBreakdown,
  CoverGrid,
  Kanban,
  Achievements,
  ShamePile,
} from "@/components/dashboard";

export default function Home() {
  return (
    <div className="dashboard-root">
      <div className="app">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </div>
    </div>
  );
}

async function Dashboard() {
  const data = await getDashboardData();

  return (
    <>
      <ProfileHero profile={data.profile} />
      <NowPlaying data={data.nowPlaying} />

      <Divider tag="░ 01" title="Games I have played" />
      <div className="played-layout">
        <RankedList games={data.topGames} />
        <div style={{ display: "grid", gap: 16 }}>
          <Heatmap data={data.heatmap} />
          <GenreBreakdown genres={data.genres} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <CoverGrid games={data.coverGames} />
      </div>

      <Divider tag="░ 02" title="Games I want to play" />
      <div className="kicker">
        Personal queue &middot; {data.queue.next.length + data.queue.someday.length + data.queue.hold.length} entries &middot; est. {data.totalQueueHours}hr remaining
      </div>
      <Kanban queue={data.queue} />

      <Divider tag="░ 03" title="Rarest moments" />
      <div className="kicker">Achievements earned by &lt;5% of players &middot; annotated field notes</div>
      <Achievements items={data.achievements} />

      <Divider tag="░ 04" title="The shame pile" />
      <ShamePile items={data.shame} />

      <div className="footer">
        <span>END OF RECORD &middot; {data.profile.totalGames.toLocaleString()} titles indexed</span>
        <span>
          {data.live ? "LIVE · Steam API wired" : "PLACEHOLDER · add STEAM_API_KEY + NEXT_PUBLIC_STEAM_VANITY_URL"}
        </span>
        <a className="admin-link" href="/admin">manage queue &rarr;</a>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: "80px 0", textAlign: "center", color: "var(--ink-dim)", fontFamily: "var(--font-mono-stack)", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 11 }}>
      loading record
      <span style={{ animation: "blink 1s steps(2) infinite" }}>_</span>
    </div>
  );
}
