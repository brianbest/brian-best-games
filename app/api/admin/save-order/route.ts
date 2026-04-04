import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { writeGameOrder } from "@/lib/steam";

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { queue } = await request.json();

    if (!Array.isArray(queue)) {
      return NextResponse.json({ error: "Invalid queue format" }, { status: 400 });
    }

    const gameOrder = {
      lastUpdated: new Date().toISOString(),
      queue: queue.map((item: { appid: number; notes?: string }) => ({
        appid: item.appid,
        addedAt: new Date().toISOString(),
        notes: item.notes || "",
      })),
    };

    writeGameOrder(gameOrder);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}
