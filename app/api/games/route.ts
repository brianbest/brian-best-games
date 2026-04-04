import { NextResponse } from "next/server";
import { readGameOrder, getOwnedGames, resolveSteamId, getGameCoverUrl } from "@/lib/steam";

export async function GET() {
  try {
    const vanityUrl = process.env.NEXT_PUBLIC_STEAM_VANITY_URL || "Ocelotgamer";
    const gameOrder = readGameOrder();

    if (!process.env.STEAM_API_KEY) {
      // Return empty data if no API key configured
      return NextResponse.json({ queue: [], stats: { totalGames: 0, totalHours: 0, totalAchievements: 0 } });
    }

    const steamId = await resolveSteamId(vanityUrl);
    const allGames = await getOwnedGames(steamId);

    const gamesMap = new Map(allGames.map((g) => [g.appid, g]));

    // Sort by most recently played to find "currently playing"
    const recentlyPlayed = allGames
      .filter((g) => (g.playtime_2weeks || 0) > 0)
      .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0));
    const currentlyPlayingId = recentlyPlayed[0]?.appid;

    const queue = gameOrder.queue
      .map((item) => {
        const game = gamesMap.get(item.appid);
        if (!game) return null;
        return {
          appid: item.appid,
          name: game.name,
          coverUrl: getGameCoverUrl(item.appid),
          playtimeHours: Math.round(game.playtime_forever / 60),
          isCurrentlyPlaying: item.appid === currentlyPlayingId,
          notes: item.notes,
          addedAt: item.addedAt,
        };
      })
      .filter(Boolean);

    const totalHours = Math.round(allGames.reduce((sum, g) => sum + g.playtime_forever, 0) / 60);

    return NextResponse.json({
      queue,
      stats: {
        totalGames: allGames.length,
        totalHours,
        totalAchievements: 0,
        lastUpdated: gameOrder.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}
