import { NextResponse } from "next/server";
import { getPlayerAchievements, resolveSteamId } from "@/lib/steam";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appid: string }> }
) {
  try {
    const { appid } = await params;
    if (!process.env.STEAM_API_KEY) {
      return NextResponse.json({ error: "Steam API key not configured" }, { status: 503 });
    }
    const vanityUrl = process.env.NEXT_PUBLIC_STEAM_VANITY_URL || "Ocelotgamer";
    const steamId = await resolveSteamId(vanityUrl);
    const achievements = await getPlayerAchievements(steamId, parseInt(appid));
    return NextResponse.json(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}
