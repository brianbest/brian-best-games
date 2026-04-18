import {
  getOwnedGames,
  getPlayerAchievements,
  resolveSteamId,
  getGameCoverUrl,
  readGameOrder,
  type SteamGame,
} from "@/lib/steam";

const STEAM_API_BASE = "https://api.steampowered.com";

export interface ProfileSummary {
  name: string;
  realName: string;
  steamId: string;
  vanity: string;
  joined: string;
  country: string;
  level: number;
  totalGames: number;
  totalHours: number;
  hoursThisYear: number;
  avatarSeed: string;
  avatarUrl?: string;
  status: string;
  currentGame?: string;
  friends: number;
  profileUrl?: string;
}

export interface TopGame {
  appid: number;
  title: string;
  hours: number;
  genre: string;
  lastPlayed: string;
  achievPct: number | null;
  owned: string;
  coverUrl: string;
  storeUrl: string;
}

export interface QueueEntry {
  appid?: number;
  title: string;
  hours_est: number;
  priority: "HIGH" | "MED" | "LOW" | "HOLD";
  reason: string;
}

export interface KanbanData {
  next: QueueEntry[];
  someday: QueueEntry[];
  hold: QueueEntry[];
}

export interface AchievementMoment {
  title: string;
  game: string;
  rarity: number;
  unlocked: string;
  icon: string;
  moment: string;
}

export interface ShameEntry {
  appid?: number;
  title: string;
  owned: string;
  storeUrl?: string;
}

export interface NowPlayingData {
  title: string;
  sessionHours: number;
  totalHours: number;
  appid?: number;
  storeUrl?: string;
}

export interface DashboardData {
  profile: ProfileSummary;
  nowPlaying: NowPlayingData | null;
  topGames: TopGame[];
  coverGames: TopGame[];
  heatmap: number[][];
  genres: Array<[string, number]>;
  queue: KanbanData;
  achievements: AchievementMoment[];
  shame: ShameEntry[];
  totalQueueHours: number;
  live: boolean;
}

// ------------------------------------------------------------
// Deterministic heatmap (same algorithm as the design mock)
// Steam API doesn't expose daily-playtime history, so it stays
// placeholder until a backend logger is added.
// ------------------------------------------------------------
function buildHeatmap(): number[][] {
  const weeks = 52;
  const out: number[][] = [];
  let seed = 9871;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let w = 0; w < weeks; w++) {
    const col: number[] = [];
    const weekBias = w < 8 ? 0.3 : w < 20 ? 0.7 : w < 32 ? 0.4 : w < 44 ? 0.9 : 0.6;
    for (let d = 0; d < 7; d++) {
      const weekend = d === 5 || d === 6;
      const r = rand();
      let v = 0;
      if (r < 0.18) v = 0;
      else if (r < 0.45) v = 1;
      else if (r < 0.72) v = 2;
      else if (r < 0.9) v = 3;
      else v = 4;
      if (weekend && r > 0.3) v = Math.min(4, v + 1);
      if (rand() > weekBias) v = Math.max(0, v - 1);
      col.push(v);
    }
    out.push(col);
  }
  return out;
}

// ------------------------------------------------------------
// Genre mapping — Steam's GetOwnedGames doesn't return genres
// without per-app store calls. A curated map covers the
// most-played titles; the rest fall into "Uncategorized".
// ------------------------------------------------------------
const GENRE_MAP: Record<number, string> = {
  730: "Shooter",           // Counter-Strike 2
  1245620: "Soulslike",     // Elden Ring
  294100: "Sim",            // RimWorld
  413150: "Sim",            // Stardew Valley
  570: "MOBA",              // Dota 2
  427520: "Sim",            // Factorio
  1145360: "Roguelike",     // Hades
  646570: "Roguelike",      // Slay the Spire
  105600: "Sandbox",        // Terraria
  292030: "RPG",            // Witcher 3
  548430: "Co-op",          // Deep Rock Galactic
  1086940: "RPG",           // Baldur's Gate 3
  367520: "Metroidvania",   // Hollow Knight
  526870: "Sim",            // Satisfactory
  1091500: "RPG",           // Cyberpunk 2077
  881100: "Roguelike",      // Noita
  632470: "RPG",            // Disco Elysium
  582010: "Action",         // Monster Hunter World
  1794680: "Roguelike",     // Vampire Survivors
  753640: "Adventure",      // Outer Wilds
  264710: "Survival",       // Subnautica
  504230: "Platformer",     // Celeste
  620: "Puzzle",            // Portal 2
  550: "Co-op",             // Left 4 Dead 2
  588650: "Roguelike",      // Dead Cells
  1092790: "Card",          // Inscryption
  590380: "Strategy",       // Into the Breach
  553420: "Adventure",      // Tunic
  268910: "Platformer",     // Cuphead
  653530: "Puzzle",         // Return of the Obra Dinn
  505230: "Horror",         // Pathologic 2
  220: "Shooter",           // Half-Life 2
  391540: "RPG",            // Undertale
  1049410: "Puzzle",        // Superliminal
  383870: "Adventure",      // Firewatch
  1174180: "Open World",    // RDR 2
  1850570: "Adventure",     // Death Stranding
  1328670: "RPG",           // Disco Elysium: Final Cut
  1687950: "JRPG",          // Persona 5 Royal
  2679460: "JRPG",          // Metaphor: ReFantazio
  1262350: "Horror",        // Signalis
  2315690: "Horror",        // Alan Wake 2
};

function genreFor(appid: number, name?: string): string {
  if (GENRE_MAP[appid]) return GENRE_MAP[appid];
  if (!name) return "Uncategorized";
  const n = name.toLowerCase();
  if (/shoot|cs:|counter|call of duty|battlefield/.test(n)) return "Shooter";
  if (/rpg|role/.test(n)) return "RPG";
  if (/survive|surviv/.test(n)) return "Survival";
  if (/puzzle/.test(n)) return "Puzzle";
  return "Uncategorized";
}

// ------------------------------------------------------------
// Steam user summary (name, avatar, profile URL, online status)
// ------------------------------------------------------------
interface PlayerSummary {
  personaname: string;
  realname?: string;
  avatarfull: string;
  profileurl: string;
  personastate: number;
  gameextrainfo?: string;
  loccountrycode?: string;
  timecreated?: number;
}

async function getPlayerSummary(steamId: string): Promise<PlayerSummary | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;
  const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response?.players?.[0] ?? null;
  } catch {
    return null;
  }
}

interface FriendSummary {
  steamid: string;
}

async function getFriendCount(steamId: string): Promise<number> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return 0;
  const url = `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return 0;
    const data = await res.json();
    const list = (data.friendslist?.friends ?? []) as FriendSummary[];
    return list.length;
  } catch {
    return 0;
  }
}

async function getSteamLevel(steamId: string): Promise<number> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return 0;
  const url = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${apiKey}&steamid=${steamId}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.response?.player_level ?? 0;
  } catch {
    return 0;
  }
}

// ------------------------------------------------------------
// Placeholder dataset — matches the design's data.js so the
// layout renders end-to-end without a Steam API key.
// ------------------------------------------------------------
const PLACEHOLDER_PROFILE: ProfileSummary = {
  name: "Ocelotgamer",
  realName: "Brian",
  steamId: "76561198042317294",
  vanity: "ocelotgamer",
  joined: "May 14, 2011",
  country: "US",
  level: 47,
  totalGames: 412,
  totalHours: 6847,
  hoursThisYear: 412,
  avatarSeed: "OG",
  status: "ONLINE",
  currentGame: "Elden Ring",
  friends: 87,
};

const PLACEHOLDER_GAMES: Array<Omit<TopGame, "coverUrl" | "storeUrl">> = [
  { appid: 730, title: "Counter-Strike 2", hours: 1847, genre: "Shooter", lastPlayed: "2d", achievPct: 42, owned: "2012-08-21" },
  { appid: 1245620, title: "Elden Ring", hours: 612, genre: "Soulslike", lastPlayed: "today", achievPct: 88, owned: "2022-02-25" },
  { appid: 294100, title: "Rimworld", hours: 487, genre: "Sim", lastPlayed: "14d", achievPct: 71, owned: "2018-10-17" },
  { appid: 413150, title: "Stardew Valley", hours: 392, genre: "Sim", lastPlayed: "3w", achievPct: 96, owned: "2016-03-01" },
  { appid: 570, title: "Dota 2", hours: 341, genre: "MOBA", lastPlayed: "6mo", achievPct: 12, owned: "2013-07-09" },
  { appid: 427520, title: "Factorio", hours: 287, genre: "Sim", lastPlayed: "2mo", achievPct: 54, owned: "2018-01-11" },
  { appid: 1145360, title: "Hades", hours: 241, genre: "Roguelike", lastPlayed: "5mo", achievPct: 83, owned: "2020-09-17" },
  { appid: 646570, title: "Slay the Spire", hours: 218, genre: "Roguelike", lastPlayed: "3mo", achievPct: 67, owned: "2019-01-23" },
  { appid: 105600, title: "Terraria", hours: 194, genre: "Sandbox", lastPlayed: "1y", achievPct: 78, owned: "2014-05-12" },
  { appid: 292030, title: "Witcher 3", hours: 186, genre: "RPG", lastPlayed: "8mo", achievPct: 91, owned: "2015-05-19" },
  { appid: 548430, title: "Deep Rock Galactic", hours: 172, genre: "Co-op", lastPlayed: "1w", achievPct: 44, owned: "2020-05-13" },
  { appid: 1086940, title: "Baldur's Gate 3", hours: 164, genre: "RPG", lastPlayed: "4mo", achievPct: 34, owned: "2023-08-03" },
  { appid: 367520, title: "Hollow Knight", hours: 142, genre: "Metroidvania", lastPlayed: "2y", achievPct: 97, owned: "2017-02-24" },
  { appid: 526870, title: "Satisfactory", hours: 128, genre: "Sim", lastPlayed: "7mo", achievPct: 29, owned: "2020-06-08" },
  { appid: 1091500, title: "Cyberpunk 2077", hours: 119, genre: "RPG", lastPlayed: "1y", achievPct: 62, owned: "2020-12-10" },
  { appid: 881100, title: "Noita", hours: 108, genre: "Roguelike", lastPlayed: "9mo", achievPct: 41, owned: "2020-10-15" },
  { appid: 632470, title: "Disco Elysium", hours: 94, genre: "RPG", lastPlayed: "2y", achievPct: 88, owned: "2019-10-16" },
  { appid: 582010, title: "Monster Hunter World", hours: 87, genre: "Action", lastPlayed: "1y", achievPct: 38, owned: "2018-08-09" },
  { appid: 1794680, title: "Vampire Survivors", hours: 73, genre: "Roguelike", lastPlayed: "4mo", achievPct: 72, owned: "2022-01-20" },
  { appid: 753640, title: "Outer Wilds", hours: 62, genre: "Adventure", lastPlayed: "2y", achievPct: 100, owned: "2020-06-18" },
];

const PLACEHOLDER_SHAME: ShameEntry[] = [
  { appid: 1174180, title: "Red Dead Redemption 2", owned: "2019-12-05" },
  { appid: 1850570, title: "Death Stranding", owned: "2020-07-14" },
  { appid: 1328670, title: "Disco Elysium: Final Cut", owned: "2021-03-30" },
  { appid: 1687950, title: "Persona 5 Royal", owned: "2022-10-21" },
  { appid: 2679460, title: "Metaphor: ReFantazio", owned: "2024-10-11" },
  { appid: 1262350, title: "Signalis", owned: "2022-10-27" },
  { appid: 2315690, title: "Alan Wake 2", owned: "2024-10-22" },
];

const PLACEHOLDER_QUEUE: KanbanData = {
  next: [
    { title: "Metaphor: ReFantazio", hours_est: 80, priority: "HIGH", reason: "Been on shelf since launch. Next after ER." },
    { title: "Alan Wake 2", hours_est: 22, priority: "HIGH", reason: "Finally on Steam. Horror October vibes." },
    { title: "Pacific Drive", hours_est: 30, priority: "MED", reason: "Heard the sound design is wild." },
    { title: "Tactical Breach Wizards", hours_est: 15, priority: "MED", reason: "Into the Breach energy." },
  ],
  someday: [
    { title: "Red Dead Redemption 2", hours_est: 70, priority: "LOW", reason: "Need a long winter." },
    { title: "Death Stranding", hours_est: 50, priority: "LOW", reason: "Mood-dependent." },
    { title: "Disco Elysium: Final Cut", hours_est: 40, priority: "LOW", reason: "Replay when I forget the plot." },
    { title: "Signalis", hours_est: 12, priority: "LOW", reason: "Queued for spooky season." },
    { title: "Dragon's Dogma 2", hours_est: 60, priority: "LOW", reason: "Waiting for patches." },
  ],
  hold: [
    { title: "Baldur's Gate 3", hours_est: 40, priority: "HOLD", reason: "Stuck in Act 2. Party wipe. Morale low." },
    { title: "Pathologic 2", hours_est: 25, priority: "HOLD", reason: "Day 6. I am dying. Everyone is dying." },
    { title: "Cyberpunk 2077", hours_est: 20, priority: "HOLD", reason: "Phantom Liberty unopened." },
  ],
};

const PLACEHOLDER_ACHIEVEMENTS: AchievementMoment[] = [
  {
    title: "LEGEND OF THE LANDS BETWEEN",
    game: "Elden Ring",
    rarity: 0.8,
    unlocked: "Apr 02, 2026",
    icon: "\u25B2",
    moment: "Rang the final bell at 4:17 AM after a 6-hour Malenia gauntlet. Died 247 times to her, total. Beat the game at 612 hours with a STR/FAI build, Blasphemous Blade + Mohg's Spear. Didn't cheese. Roommate heard me scream.",
  },
  {
    title: "MR. PERFECT",
    game: "Hollow Knight",
    rarity: 0.3,
    unlocked: "Aug 14, 2024",
    icon: "\u25C6",
    moment: "Pantheon of Hallownest, no-damage run. Took 4 months of attempts. Final Absolute Radiance on the last boss, 1 mask left, nail-art to finish. The silence after the hit was holy.",
  },
  {
    title: "TRUE DETECTIVE",
    game: "Return of the Obra Dinn",
    rarity: 1.2,
    unlocked: "Jul 11, 2023",
    icon: "\u25C9",
    moment: "Identified all 60 crew fates on first playthrough without the triple-confirm cheat. Sat with a real paper notebook for 16 hours. The flag-counting chapter broke me but the Henry Evans reveal healed me.",
  },
  {
    title: "FOUNDRY AT SCALE",
    game: "Factorio",
    rarity: 2.1,
    unlocked: "Mar 30, 2024",
    icon: "\u2B22",
    moment: "10k science-per-minute megabase on a vanilla save. 287 hours on one world. Deathworld settings. A single biter never breached the perimeter because the flamethrowers never stopped.",
  },
  {
    title: "THE PACIFIST",
    game: "Undertale",
    rarity: 4.1,
    unlocked: "Feb 08, 2022",
    icon: "\u2665",
    moment: "True pacifist on first run. No guide. No spoilers. Cried during Asgore. Cried harder during Asriel. 8 hours total, straight through.",
  },
  {
    title: "SHOW ME WHAT YOU GOT",
    game: "Hades",
    rarity: 3.4,
    unlocked: "Jan 19, 2023",
    icon: "\u263C",
    moment: "32-heat clear with the Twin Fists. Eris Rail spam, Ares aspect. Got the Theseus/Asterius dialogue tree I hadn't seen in 241 hours.",
  },
];

function computeGenres(games: Array<{ hours: number; genre: string }>): Array<[string, number]> {
  const g: Record<string, number> = {};
  for (const x of games) {
    if (!x.genre || x.genre === "Uncategorized") continue;
    g[x.genre] = (g[x.genre] ?? 0) + x.hours;
  }
  return Object.entries(g).sort((a, b) => b[1] - a[1]);
}

function enrichCover(game: Omit<TopGame, "coverUrl" | "storeUrl">): TopGame {
  return {
    ...game,
    coverUrl: getGameCoverUrl(game.appid),
    storeUrl: `https://store.steampowered.com/app/${game.appid}`,
  };
}

export function getPlaceholderDashboard(): DashboardData {
  const topGames = PLACEHOLDER_GAMES.map(enrichCover);
  return {
    profile: PLACEHOLDER_PROFILE,
    nowPlaying: {
      title: "Elden Ring",
      sessionHours: 2.2,
      totalHours: 612,
      appid: 1245620,
      storeUrl: "https://store.steampowered.com/app/1245620",
    },
    topGames: topGames.slice(0, 20),
    coverGames: topGames.slice(0, 18),
    heatmap: buildHeatmap(),
    genres: computeGenres(PLACEHOLDER_GAMES),
    queue: PLACEHOLDER_QUEUE,
    achievements: PLACEHOLDER_ACHIEVEMENTS,
    shame: PLACEHOLDER_SHAME.map((s) => ({
      ...s,
      storeUrl: s.appid ? `https://store.steampowered.com/app/${s.appid}` : undefined,
    })),
    totalQueueHours:
      PLACEHOLDER_QUEUE.next.concat(PLACEHOLDER_QUEUE.someday, PLACEHOLDER_QUEUE.hold).reduce(
        (a, b) => a + b.hours_est,
        0
      ),
    live: false,
  };
}

// ------------------------------------------------------------
// Real Steam build — only runs when STEAM_API_KEY +
// NEXT_PUBLIC_STEAM_VANITY_URL are set.
// ------------------------------------------------------------
function seededReasons(title: string): string {
  // Deterministic placeholder reason per queued title (no backend notes yet).
  const reasons = [
    "On the shortlist — next window I clear.",
    "Heard enough good things to commit.",
    "Queued for a weekend.",
    "Vibes-dependent. Waiting for the right mood.",
    "A friend won't stop asking me to try it.",
  ];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return reasons[Math.abs(h) % reasons.length];
}

function estimateHours(game: SteamGame | undefined): number {
  if (!game) return 20;
  if (game.playtime_forever > 0) return Math.max(5, Math.round(game.playtime_forever / 60));
  return 20;
}

function lastPlayedLabel(game: SteamGame): string {
  if ((game.playtime_2weeks ?? 0) > 0) return "this week";
  if (game.playtime_forever === 0) return "never";
  return "archived";
}

async function buildRealDashboard(): Promise<DashboardData | null> {
  const vanityOrId = process.env.NEXT_PUBLIC_STEAM_VANITY_URL;
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey || !vanityOrId) return null;

  const steamId = await resolveSteamId(vanityOrId).catch(() => null);
  if (!steamId) return null;

  const [owned, summary, level, friendCount] = await Promise.all([
    getOwnedGames(steamId).catch(() => [] as SteamGame[]),
    getPlayerSummary(steamId),
    getSteamLevel(steamId),
    getFriendCount(steamId),
  ]);

  if (owned.length === 0) return null;

  const totalMinutes = owned.reduce((a, b) => a + b.playtime_forever, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const hoursThisYear = Math.round(
    owned.reduce((a, b) => a + (b.playtime_2weeks ?? 0), 0) / 60 * 26
  );

  const joined = summary?.timecreated
    ? new Date(summary.timecreated * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";
  const personaState = summary?.personastate ?? 0;
  const statusMap: Record<number, string> = {
    0: "OFFLINE", 1: "ONLINE", 2: "BUSY", 3: "AWAY",
    4: "SNOOZE", 5: "LOOKING TO TRADE", 6: "LOOKING TO PLAY",
  };

  const name = summary?.personaname ?? vanityOrId;
  const avatarSeed = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  const profile: ProfileSummary = {
    name,
    realName: summary?.realname ?? name,
    steamId,
    vanity: vanityOrId,
    joined,
    country: summary?.loccountrycode ?? "—",
    level,
    totalGames: owned.length,
    totalHours,
    hoursThisYear,
    avatarSeed,
    avatarUrl: summary?.avatarfull,
    status: statusMap[personaState] ?? "ONLINE",
    currentGame: summary?.gameextrainfo,
    friends: friendCount,
    profileUrl: summary?.profileurl,
  };

  const ranked = [...owned]
    .filter((g) => g.playtime_forever > 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever);

  const topGames: TopGame[] = ranked.slice(0, 20).map((g) => ({
    appid: g.appid,
    title: g.name,
    hours: Math.round(g.playtime_forever / 60),
    genre: genreFor(g.appid, g.name),
    lastPlayed: lastPlayedLabel(g),
    achievPct: null,
    owned: "library",
    coverUrl: getGameCoverUrl(g.appid),
    storeUrl: `https://store.steampowered.com/app/${g.appid}`,
  }));

  const coverGames: TopGame[] = ranked.slice(0, 18).map((g) => ({
    appid: g.appid,
    title: g.name,
    hours: Math.round(g.playtime_forever / 60),
    genre: genreFor(g.appid, g.name),
    lastPlayed: lastPlayedLabel(g),
    achievPct: null,
    owned: "library",
    coverUrl: getGameCoverUrl(g.appid),
    storeUrl: `https://store.steampowered.com/app/${g.appid}`,
  }));

  // Current session from Steam presence OR most-played-2wk fallback
  const mostRecent = [...owned]
    .filter((g) => (g.playtime_2weeks ?? 0) > 0)
    .sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0))[0];
  const currentAppid = summary?.gameextrainfo
    ? ranked.find((g) => g.name === summary.gameextrainfo)?.appid
    : mostRecent?.appid;
  const currentGame = currentAppid
    ? owned.find((g) => g.appid === currentAppid)
    : undefined;
  const nowPlaying: NowPlayingData | null = currentGame
    ? {
        title: currentGame.name,
        sessionHours: Math.round(((currentGame.playtime_2weeks ?? 0) / 60) * 10) / 10,
        totalHours: Math.round(currentGame.playtime_forever / 60),
        appid: currentGame.appid,
        storeUrl: `https://store.steampowered.com/app/${currentGame.appid}`,
      }
    : null;

  // Queue from game-order.json mapped into Next Up column.
  const order = readGameOrder();
  const ownedByAppId = new Map<number, SteamGame>(owned.map((g) => [g.appid, g]));
  const next: QueueEntry[] = order.queue.map((q) => {
    const game = ownedByAppId.get(q.appid);
    return {
      appid: q.appid,
      title: game?.name ?? `App ${q.appid}`,
      hours_est: estimateHours(game),
      priority: "HIGH" as const,
      reason: q.notes || seededReasons(game?.name ?? `App ${q.appid}`),
    };
  });

  // Shame pile: owned games with 0 hours.
  const unplayed = owned.filter((g) => g.playtime_forever === 0);
  const shame: ShameEntry[] = unplayed.slice(0, 32).map((g) => ({
    appid: g.appid,
    title: g.name,
    owned: "library",
    storeUrl: `https://store.steampowered.com/app/${g.appid}`,
  }));

  // Someday / On Hold — derive from unplayed + stalled (have hours but no recent)
  const someday: QueueEntry[] = unplayed.slice(0, 5).map((g) => ({
    appid: g.appid,
    title: g.name,
    hours_est: 30,
    priority: "LOW",
    reason: seededReasons(g.name),
  }));
  const stalled = owned
    .filter((g) => g.playtime_forever > 0 && (g.playtime_2weeks ?? 0) === 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 3);
  const hold: QueueEntry[] = stalled.map((g) => ({
    appid: g.appid,
    title: g.name,
    hours_est: Math.max(10, Math.round(g.playtime_forever / 60 / 4)),
    priority: "HOLD",
    reason: seededReasons(g.name),
  }));

  const genres = computeGenres(
    ranked.map((g) => ({ hours: Math.round(g.playtime_forever / 60), genre: genreFor(g.appid, g.name) }))
  );

  const totalQueueHours =
    next.reduce((a, b) => a + b.hours_est, 0) +
    someday.reduce((a, b) => a + b.hours_est, 0) +
    hold.reduce((a, b) => a + b.hours_est, 0);

  // Achievements — rare unlocks on owned games with achievements.
  // Moments stay placeholder; Steam API doesn't store user-written moments.
  const top6 = ranked.slice(0, 6);
  const achievements: AchievementMoment[] = [];
  const placeholderIcons = ["\u25B2", "\u25C6", "\u25C9", "\u2B22", "\u2665", "\u263C"];
  for (let i = 0; i < top6.length; i++) {
    const g = top6[i];
    try {
      const a = await getPlayerAchievements(steamId, g.appid);
      if (a.total === 0) continue;
      const pct = Math.round((a.unlocked / a.total) * 100);
      achievements.push({
        title: `${Math.max(5, 100 - pct)}% COMPLETIONIST`,
        game: g.name,
        rarity: pct,
        unlocked: "—",
        icon: placeholderIcons[i % placeholderIcons.length],
        moment: `${a.unlocked} of ${a.total} achievements unlocked across ${Math.round(g.playtime_forever / 60)} hours. Steam doesn't surface individual rare-moment narration — this is an aggregate view.`,
      });
      if (achievements.length >= 6) break;
    } catch {
      // ignore
    }
  }

  return {
    profile,
    nowPlaying,
    topGames,
    coverGames,
    heatmap: buildHeatmap(),
    genres,
    queue: { next, someday, hold },
    achievements: achievements.length > 0 ? achievements : PLACEHOLDER_ACHIEVEMENTS,
    shame,
    totalQueueHours,
    live: true,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const real = await buildRealDashboard().catch(() => null);
  return real ?? getPlaceholderDashboard();
}
