import { readGameOrder } from "@/lib/steam";

interface Stats {
  totalGames: number;
  totalHours: number;
  totalAchievements: number;
  lastUpdated?: string;
}

async function fetchStats(): Promise<Stats> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/games`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    return data.stats ?? { totalGames: 0, totalHours: 0, totalAchievements: 0 };
  } catch {
    // Fallback: count queue items
    const order = readGameOrder();
    return {
      totalGames: order.queue.length,
      totalHours: 0,
      totalAchievements: 0,
    };
  }
}

export default async function StatsBar() {
  const stats = await fetchStats();

  const items = [
    { label: "Games in Library", value: stats.totalGames.toLocaleString(), icon: "🎮" },
    { label: "Hours Played", value: stats.totalHours.toLocaleString(), icon: "⏱️" },
    { label: "In Queue", value: "—", icon: "📋" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 flex items-center gap-4"
        >
          <span className="text-2xl">{item.icon}</span>
          <div>
            <div className="text-2xl font-bold text-white">{item.value}</div>
            <div className="text-[#6b7280] text-sm">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
