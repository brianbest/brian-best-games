import Image from "next/image";
import type {
  AchievementMoment,
  KanbanData,
  NowPlayingData,
  ProfileSummary,
  QueueEntry,
  ShameEntry,
  TopGame,
} from "@/lib/dashboard-data";

// ============================================================
// Profile hero
// ============================================================
export function ProfileHero({ profile }: { profile: ProfileSummary }) {
  return (
    <section className="hero">
      <div className="avatar-box">
        <span className="corner tl">&#x250C;&#x2500;</span>
        <span className="corner tr">&#x2500;&#x2510;</span>
        <span className="corner bl">&#x2514;&#x2500;</span>
        <span className="corner br">&#x2500;&#x2518;</span>
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.name}
            width={200}
            height={200}
            unoptimized
          />
        ) : (
          <span className="mono-big">{profile.avatarSeed}</span>
        )}
      </div>

      <div className="profile-info">
        <div className="name-line">
          <h1>{profile.name}</h1>
          <span className="status-online">{profile.status}</span>
        </div>
        <div className="metaline">
          <span>lvl_{profile.level}</span>
          <span className="sep">&#x2502;</span>
          <span>joined {profile.joined}</span>
          <span className="sep">&#x2502;</span>
          <span>{profile.friends} friends</span>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="n">{profile.totalGames.toLocaleString()}</div>
            <div className="l">games owned</div>
          </div>
          <div className="stat">
            <div className="n">{profile.totalHours.toLocaleString()}</div>
            <div className="l">total hours</div>
          </div>
          <div className="stat">
            <div className="n">{profile.hoursThisYear.toLocaleString()}</div>
            <div className="l">hrs &middot; 2026</div>
          </div>
          <div className="stat">
            <div className="n">{Math.round(profile.totalHours / 24 / 7)}w</div>
            <div className="l">equiv. weeks</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Now-playing banner
// ============================================================
export function NowPlaying({ data }: { data: NowPlayingData | null }) {
  if (!data) return null;
  return (
    <div className="now-playing">
      <span className="tag">NOW PLAYING</span>
      <div>
        <div className="title">{data.title}</div>
        <div className="meta">
          session {data.sessionHours}hr &middot; total {data.totalHours}hr lifetime
        </div>
      </div>
      <div className="live">
        <div>&#x25B6; live</div>
        <div>{data.totalHours}hr lifetime</div>
      </div>
    </div>
  );
}

// ============================================================
// Section divider — magazine department header
// ============================================================
export function Divider({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="divider">
      <span className="tag">{tag}</span>
      <h2>{title}</h2>
    </div>
  );
}

// ============================================================
// Played: ranked list
// ============================================================
export function RankedList({ games }: { games: TopGame[] }) {
  if (games.length === 0) return null;
  const max = games[0].hours || 1;
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="title">TOP BY HOURS &middot; {games.length} rows</span>
        <span className="dots">&#x25CF; &#x25CF; &#x25CF;</span>
      </div>
      <div className="panel-body" style={{ padding: "6px 14px", maxHeight: 520, overflowY: "auto" }}>
        {games.map((g, i) => (
          <div className="bar-row" key={g.appid}>
            <div className="rank">{String(i + 1).padStart(2, "0")}</div>
            <div className="name">
              <div className="t">{g.title}</div>
              <div className="bar">
                <span style={{ width: `${(g.hours / max) * 100}%` }} />
              </div>
            </div>
            <div className="hrs">
              {g.hours.toLocaleString()}
              <small>hr</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Activity heatmap (52w calendar)
// ============================================================
export function Heatmap({ data }: { data: number[][] }) {
  const months = ["MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB","MAR","APR"];
  const flat = data.flat();
  const total = flat.reduce((a, b) => a + b, 0);
  const days = flat.filter((v) => v > 0).length;
  let best = 0;
  let cur = 0;
  for (const v of flat) {
    if (v > 0) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="title">ACTIVITY &middot; LAST 52W</span>
        <span className="dots">&#x25CF; &#x25CF; &#x25CF;</span>
      </div>
      <div className="panel-body">
        <div className="hm-months">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="heatmap">
          {data.map((col, i) => (
            <div className="hm-col" key={i}>
              {col.map((v, j) => (
                <div key={j} className={`hm-cell v${v}`} title={`w${i} d${j} · ${v}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="hm-legend">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>
              <strong>{days}</strong> active days
            </span>
            <span>
              <strong>{best}</strong> longest streak
            </span>
            <span>
              ~<strong>{Math.round(total * 0.7)}</strong>hr logged
            </span>
          </div>
          <div className="swatches">
            <span>less</span>
            <div className="hm-cell v0" />
            <div className="hm-cell v1" />
            <div className="hm-cell v2" />
            <div className="hm-cell v3" />
            <div className="hm-cell v4" />
            <span>more</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Genre breakdown (bar strip)
// ============================================================
export function GenreBreakdown({ genres }: { genres: Array<[string, number]> }) {
  if (genres.length === 0) return null;
  const max = genres[0][1] || 1;
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="title">GENRE BREAKDOWN &middot; HOURS</span>
        <span className="dots">&#x25CF; &#x25CF; &#x25CF;</span>
      </div>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {genres.slice(0, 8).map(([g, h]) => (
          <div className="genre-row" key={g}>
            <span className="g-label">{g}</span>
            <div className="g-bar">
              <span style={{ width: `${(h / max) * 100}%` }} />
            </div>
            <span className="g-val">{h.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Cover grid — typographic placeholder cards
// ============================================================
export function CoverGrid({ games }: { games: TopGame[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="title">LIBRARY &middot; GRID &middot; sort: hours desc</span>
        <span className="dots">&#x25CF; &#x25CF; &#x25CF;</span>
      </div>
      <div className="panel-body">
        <div className="cover-grid">
          {games.map((g) => (
            <a
              className="cover"
              key={g.appid}
              href={g.storeUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <div className="top">
                <span>{g.genre.toUpperCase()}</span>
                {g.achievPct !== null && <span>{g.achievPct}%</span>}
              </div>
              <div className="mid">{g.title}</div>
              <div className="bot">
                <div className="hrs">{g.hours.toLocaleString()}</div>
                <div className="l">hours &middot; last {g.lastPlayed}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Kanban: three-column queue
// ============================================================
function KanbanCard({ item }: { item: QueueEntry }) {
  return (
    <div className="kcard">
      <div className="top">
        <div className="t">{item.title}</div>
        <span className={`pri ${item.priority}`}>{item.priority}</span>
      </div>
      <div className="meta">
        <span>~{item.hours_est}hr</span>
        <span>&#x25F7; est</span>
      </div>
      <div className="reason">&ldquo;{item.reason}&rdquo;</div>
    </div>
  );
}

export function Kanban({ queue }: { queue: KanbanData }) {
  const cols: Array<{ key: keyof KanbanData; title: string; sub: string; items: QueueEntry[] }> = [
    { key: "next", title: "NEXT UP", sub: "actively queued", items: queue.next },
    { key: "someday", title: "SOMEDAY", sub: "backlog, no rush", items: queue.someday },
    { key: "hold", title: "ON HOLD", sub: "paused mid-playthrough", items: queue.hold },
  ];
  return (
    <div className="kanban">
      {cols.map((c) => (
        <div className="kcol" key={c.key}>
          <div className="kcol-head">
            <div className="h-wrap">
              <div className="h">{c.title}</div>
              <div className="sub">{c.sub}</div>
            </div>
            <span className="count">{String(c.items.length).padStart(2, "0")}</span>
          </div>
          <div className="kcol-body">
            {c.items.length === 0 ? (
              <div
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  padding: "16px 0",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                &mdash; empty &mdash;
              </div>
            ) : (
              c.items.map((it, i) => <KanbanCard key={`${it.title}-${i}`} item={it} />)
            )}
          </div>
          <div className="kcol-foot">
            <span>~{c.items.reduce((a, b) => a + b.hours_est, 0)}hr total</span>
            <span>drag to reorder</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Achievements — story cards
// ============================================================
export function Achievements({ items }: { items: AchievementMoment[] }) {
  if (items.length === 0) return null;
  return (
    <div className="achievements">
      {items.map((a) => (
        <div className="ach-card" key={`${a.game}-${a.title}`}>
          <div className="ach-icon">{a.icon}</div>
          <div className="ach-meta">
            <div className="game">{a.game}</div>
            <div className="t">{a.title}</div>
            <div className="rarity">&#x25C2; {a.rarity}% global &middot; rare</div>
            <div className="moment">{a.moment}</div>
            <div className="date">unlocked {a.unlocked.toLowerCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Shame pile — unplayed titles
// ============================================================
export function ShamePile({ items }: { items: ShameEntry[] }) {
  if (items.length === 0) return null;
  const totalPaid = items.length * 40;
  return (
    <div className="panel shame">
      <div className="panel-head">
        <span className="title">
          &#x25B2; UNPLAYED SHAME PILE &middot; {items.length} TITLES &middot; ~${totalPaid.toLocaleString()} wasted
        </span>
        <span className="dots">&#x25CF; &#x25CF; &#x25CF;</span>
      </div>
      <div className="shame-list">
        {items.map((g, i) =>
          g.storeUrl ? (
            <a
              className="shame-item"
              key={`${g.title}-${i}`}
              href={g.storeUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="t">{g.title}</span>
              <span className="d">owned {g.owned}</span>
            </a>
          ) : (
            <div className="shame-item" key={`${g.title}-${i}`}>
              <span className="t">{g.title}</span>
              <span className="d">owned {g.owned}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
