import fs from "fs";
import path from "path";

const STEAM_API_BASE = "https://api.steampowered.com";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutes
  img_icon_url: string;
  playtime_2weeks?: number;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
}

export interface GameWithAchievements extends SteamGame {
  achievements?: AchievementStats;
  coverUrl: string;
  playtimeHours: number;
  isRecentlyPlayed: boolean;
}

export async function resolveSteamId(vanityOrId: string): Promise<string> {
  // If we were already given a 17-digit SteamID64, use it directly.
  if (/^\d{17}$/.test(vanityOrId)) {
    return vanityOrId;
  }

  const cacheKey = `vanity:${vanityOrId}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.STEAM_API_KEY;
  const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityOrId}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.response?.success !== 1) {
    throw new Error("Failed to resolve Steam vanity URL");
  }

  const steamId = data.response.steamid;
  setCache(cacheKey, steamId);
  return steamId;
}

export async function getOwnedGames(steamId: string): Promise<SteamGame[]> {
  const cacheKey = `library:${steamId}`;
  const cached = getCached<SteamGame[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.STEAM_API_KEY;
  const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;
  const res = await fetch(url);
  const data = await res.json();

  const games: SteamGame[] = data.response?.games ?? [];
  setCache(cacheKey, games);
  return games;
}

export async function getPlayerAchievements(
  steamId: string,
  appId: number
): Promise<AchievementStats> {
  const cacheKey = `achievements:${steamId}:${appId}`;
  const cached = getCached<AchievementStats>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.STEAM_API_KEY;
  const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.playerstats?.achievements) {
      return { total: 0, unlocked: 0 };
    }

    const achievements = data.playerstats.achievements;
    const total = achievements.length;
    const unlocked = achievements.filter((a: { achieved: number }) => a.achieved === 1).length;
    const stats = { total, unlocked };
    setCache(cacheKey, stats);
    return stats;
  } catch {
    return { total: 0, unlocked: 0 };
  }
}

export function getGameCoverUrl(appId: number): string {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
}

export interface GameOrder {
  lastUpdated: string;
  queue: Array<{
    appid: number;
    addedAt: string;
    notes: string;
  }>;
}

export function readGameOrder(): GameOrder {
  const filePath = path.join(process.cwd(), "data", "game-order.json");
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return { lastUpdated: new Date().toISOString(), queue: [] };
  }
}

export function writeGameOrder(order: GameOrder): void {
  const filePath = path.join(process.cwd(), "data", "game-order.json");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(order, null, 2), "utf-8");
}
