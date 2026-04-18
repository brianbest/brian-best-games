import {
  readGameOrder,
  getGameCoverUrl,
  getOwnedGames,
  getPlayerAchievements,
  resolveSteamId,
  type SteamGame,
  type AchievementStats,
} from "@/lib/steam";
import Image from "next/image";

interface QueueItem {
  appid: number;
  notes: string;
  addedAt: string;
}

interface EnrichedQueueItem extends QueueItem {
  name: string;
  playtimeHours: number;
  playtime2WeeksHours: number;
  isCurrentlyPlaying: boolean;
  achievements?: AchievementStats;
  owned: boolean;
}

export default async function GameQueue() {
  const order = readGameOrder();

  if (order.queue.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-[#2a2a3a] rounded-xl">
        <div className="text-4xl mb-3">🎮</div>
        <p className="text-[#6b7280]">No games in queue yet.</p>
        <p className="text-[#6b7280] text-sm mt-1">
          Add games from the{" "}
          <a href="/admin" className="text-[#6c63ff] hover:underline">
            admin panel
          </a>
          .
        </p>
      </div>
    );
  }

  const vanityOrId = process.env.NEXT_PUBLIC_STEAM_VANITY_URL;
  const hasApi = Boolean(process.env.STEAM_API_KEY && vanityOrId);

  let enriched: EnrichedQueueItem[];

  if (!hasApi) {
    enriched = order.queue.map((item) => ({
      ...item,
      name: `App ${item.appid}`,
      playtimeHours: 0,
      playtime2WeeksHours: 0,
      isCurrentlyPlaying: false,
      owned: false,
    }));
  } else {
    const steamId = await resolveSteamId(vanityOrId as string);
    const allGames = await getOwnedGames(steamId);
    const gamesMap = new Map<number, SteamGame>(allGames.map((g) => [g.appid, g]));

    // "Currently playing" = highest playtime in last 2 weeks
    const mostRecent = allGames
      .filter((g) => (g.playtime_2weeks || 0) > 0)
      .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0))[0];
    const currentlyPlayingId = mostRecent?.appid;

    enriched = await Promise.all(
      order.queue.map(async (item) => {
        const game = gamesMap.get(item.appid);
        const achievements = game
          ? await getPlayerAchievements(steamId, item.appid).catch(() => undefined)
          : undefined;
        return {
          ...item,
          name: game?.name ?? `App ${item.appid}`,
          playtimeHours: game ? Math.round(game.playtime_forever / 60) : 0,
          playtime2WeeksHours: game
            ? Math.round(((game.playtime_2weeks ?? 0) / 60) * 10) / 10
            : 0,
          isCurrentlyPlaying: item.appid === currentlyPlayingId,
          achievements:
            achievements && achievements.total > 0 ? achievements : undefined,
          owned: Boolean(game),
        };
      })
    );
  }

  return (
    <div className="space-y-3">
      {enriched.map((item, index) => (
        <GameCard key={item.appid} item={item} rank={index + 1} />
      ))}
    </div>
  );
}

function GameCard({ item, rank }: { item: EnrichedQueueItem; rank: number }) {
  const coverUrl = getGameCoverUrl(item.appid);
  const storeUrl = `https://store.steampowered.com/app/${item.appid}`;

  const achievementPct =
    item.achievements && item.achievements.total > 0
      ? Math.round((item.achievements.unlocked / item.achievements.total) * 100)
      : null;

  return (
    <a
      href={storeUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="group bg-[#1a1a24] border border-[#2a2a3a] hover:border-[#6c63ff]/50 rounded-xl overflow-hidden flex items-stretch gap-4 p-3 transition-colors"
    >
      <div className="w-8 self-center text-center text-[#6b7280] font-mono text-sm font-bold flex-shrink-0">
        {rank}
      </div>

      <div className="relative w-[184px] h-[86px] flex-shrink-0 rounded-lg overflow-hidden bg-[#0f0f13]">
        <Image
          src={coverUrl}
          alt={item.name}
          fill
          className="object-cover group-hover:scale-[1.02] transition-transform"
          sizes="184px"
          unoptimized
        />
        {item.isCurrentlyPlaying && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#4ade80]">
              Playing
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-[#6c63ff] transition-colors">
              {item.name}
            </h3>
            {!item.owned && (
              <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400/80 border border-amber-400/30 rounded px-1.5 py-0.5 flex-shrink-0">
                Not in library
              </span>
            )}
          </div>
          {item.notes && (
            <div className="text-[#9ca3af] text-sm truncate mt-0.5">{item.notes}</div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#6b7280] font-mono">
          <Stat
            icon="⏱"
            label={`${item.playtimeHours.toLocaleString()} h`}
            title="Total playtime"
          />
          {item.playtime2WeeksHours > 0 && (
            <Stat
              icon="↗"
              label={`${item.playtime2WeeksHours} h / 2w`}
              title="Playtime in the last 2 weeks"
              accent
            />
          )}
          {achievementPct !== null && item.achievements && (
            <div className="flex items-center gap-2" title="Achievements">
              <span>🏆</span>
              <div className="w-20 h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6c63ff] rounded-full"
                  style={{ width: `${achievementPct}%` }}
                />
              </div>
              <span>
                {item.achievements.unlocked}/{item.achievements.total}
              </span>
            </div>
          )}
          <span className="text-[#3f3f52]">#{item.appid}</span>
        </div>
      </div>
    </a>
  );
}

function Stat({
  icon,
  label,
  title,
  accent,
}: {
  icon: string;
  label: string;
  title?: string;
  accent?: boolean;
}) {
  return (
    <span
      title={title}
      className={`flex items-center gap-1 ${accent ? "text-[#4ade80]" : ""}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
