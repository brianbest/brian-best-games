import { Suspense } from "react";
import GameQueue from "@/components/GameQueue";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f0f13]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#2a2a3a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6c63ff]/10 via-transparent to-[#4ade80]/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[#6b7280] text-sm uppercase tracking-widest font-mono">
              Steam Library
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">
            Brian&apos;s <span className="text-[#6c63ff]">Games</span>
          </h1>
          <p className="text-[#6b7280] text-lg">
            Play queue, progress tracker, and Steam stats
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Suspense fallback={<StatsBarSkeleton />}>
          <StatsBar />
        </Suspense>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-[#6c63ff]">#</span> Play Queue
          </h2>
          <Suspense fallback={<QueueSkeleton />}>
            <GameQueue />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#1a1a24] rounded-xl p-4 h-20" />
      ))}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-[#1a1a24] rounded-xl h-24" />
      ))}
    </div>
  );
}
