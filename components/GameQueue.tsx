import { readGameOrder, getGameCoverUrl } from "@/lib/steam";
import Image from "next/image";

interface QueueItem {
  appid: number;
  notes: string;
  addedAt: string;
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

  return (
    <div className="space-y-3">
      {order.queue.map((item: QueueItem, index: number) => (
        <GameCard key={item.appid} item={item} rank={index + 1} />
      ))}
    </div>
  );
}

function GameCard({ item, rank }: { item: QueueItem; rank: number }) {
  const coverUrl = getGameCoverUrl(item.appid);

  return (
    <div className="group bg-[#1a1a24] border border-[#2a2a3a] hover:border-[#6c63ff]/50 rounded-xl overflow-hidden flex items-center gap-4 p-3 transition-colors">
      {/* Rank */}
      <div className="w-8 text-center text-[#6b7280] font-mono text-sm font-bold flex-shrink-0">
        {rank}
      </div>

      {/* Cover */}
      <div className="relative w-[120px] h-[56px] flex-shrink-0 rounded-lg overflow-hidden bg-[#0f0f13]">
        <Image
          src={coverUrl}
          alt={`App ${item.appid}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate">App ID: {item.appid}</div>
        {item.notes && (
          <div className="text-[#6b7280] text-sm truncate">{item.notes}</div>
        )}
      </div>
    </div>
  );
}
