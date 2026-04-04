import { NextResponse } from "next/server";
import { getOwnedGames, resolveSteamId } from "@/lib/steam";

export async function GET() {
  try {
    if (!process.env.STEAM_API_KEY) {
      return NextResponse.json({ error: "Steam API key not configured" }, { status: 503 });
    }
    const vanityUrl = process.env.NEXT_PUBLIC_STEAM_VANITY_URL || "Ocelotgamer";
    const steamId = await resolveSteamId(vanityUrl);
    const games = await getOwnedGames(steamId);
    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error fetching library:", error);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}
