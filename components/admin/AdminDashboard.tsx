"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
}

interface QueueItem {
  appid: number;
  name: string;
  notes: string;
}

function getGameCoverUrl(appId: number): string {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
}

function SortableGameItem({
  item,
  rank,
  onRemove,
}: {
  item: QueueItem;
  rank: number;
  onRemove: (appid: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.appid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl flex items-center gap-3 p-3 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-[#6b7280] hover:text-white cursor-grab active:cursor-grabbing px-1 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      {/* Rank */}
      <div className="w-6 text-center text-[#6b7280] font-mono text-sm font-bold flex-shrink-0">
        {rank}
      </div>

      {/* Cover */}
      <div className="relative w-[100px] h-[47px] flex-shrink-0 rounded-lg overflow-hidden bg-[#0f0f13]">
        <Image
          src={getGameCoverUrl(item.appid)}
          alt={item.name}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{item.name}</div>
        <div className="text-[#6b7280] text-xs">ID: {item.appid}</div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.appid)}
        className="text-[#6b7280] hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 px-2"
        aria-label="Remove from queue"
      >
        ✕
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const [library, setLibrary] = useState<SteamGame[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/steam/library");
      const data = await res.json();
      if (data.games) {
        setLibrary(data.games.sort((a: SteamGame, b: SteamGame) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error("Failed to fetch library:", err);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      if (data.queue) {
        setQueue(
          data.queue.map((item: { appid: number; name?: string; notes?: string }) => ({
            appid: item.appid,
            name: item.name || `App ${item.appid}`,
            notes: item.notes || "",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQueue((items) => {
        const oldIndex = items.findIndex((i) => i.appid === active.id);
        const newIndex = items.findIndex((i) => i.appid === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function addToQueue(game: SteamGame) {
    if (queue.some((q) => q.appid === game.appid)) return;
    setQueue((prev) => [...prev, { appid: game.appid, name: game.name, notes: "" }]);
  }

  function removeFromQueue(appid: number) {
    setQueue((prev) => prev.filter((q) => q.appid !== appid));
  }

  async function saveOrder() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/save-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: queue.map((q) => ({ appid: q.appid, notes: q.notes })) }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const queueIds = new Set(queue.map((q) => q.appid));
  const filteredLibrary = library.filter(
    (g) =>
      !queueIds.has(g.appid) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Queue Panel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Play Queue{" "}
            <span className="text-[#6b7280] font-normal text-base">({queue.length})</span>
          </h2>
          <button
            onClick={saveOrder}
            disabled={saving}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              saveStatus === "saved"
                ? "bg-[#4ade80] text-black"
                : saveStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-[#6c63ff] hover:bg-[#7c73ff] text-white"
            } disabled:opacity-50`}
          >
            {saving ? "Saving..." : saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "Error!" : "Save Order"}
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2a2a3a] rounded-xl text-[#6b7280]">
            Add games from your library →
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={queue.map((q) => q.appid)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {queue.map((item, index) => (
                  <SortableGameItem
                    key={item.appid}
                    item={item}
                    rank={index + 1}
                    onRemove={removeFromQueue}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Library Panel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Steam Library{" "}
            <span className="text-[#6b7280] font-normal text-base">
              {library.length > 0 ? `(${library.length})` : ""}
            </span>
          </h2>
          <button
            onClick={fetchLibrary}
            disabled={libraryLoading}
            className="px-3 py-1.5 border border-[#2a2a3a] hover:border-[#6c63ff] rounded-xl text-sm text-[#6b7280] hover:text-white transition-colors disabled:opacity-50"
          >
            {libraryLoading ? "Loading..." : "↺ Refresh"}
          </button>
        </div>

        {library.length === 0 && !libraryLoading && (
          <div className="text-center py-8 border border-dashed border-[#2a2a3a] rounded-xl">
            <p className="text-[#6b7280] mb-3">Click Refresh to load your Steam library</p>
            <button
              onClick={fetchLibrary}
              className="px-4 py-2 bg-[#6c63ff] hover:bg-[#7c73ff] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Load Library
            </button>
          </div>
        )}

        {library.length > 0 && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
              className="w-full bg-[#0f0f13] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6c63ff] transition-colors mb-3"
            />
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredLibrary.map((game) => (
                <div
                  key={game.appid}
                  className="bg-[#1a1a24] border border-[#2a2a3a] hover:border-[#6c63ff]/50 rounded-xl flex items-center gap-3 p-3 cursor-pointer group transition-colors"
                  onClick={() => addToQueue(game)}
                >
                  <div className="relative w-[80px] h-[37px] flex-shrink-0 rounded overflow-hidden bg-[#0f0f13]">
                    <Image
                      src={getGameCoverUrl(game.appid)}
                      alt={game.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{game.name}</div>
                    <div className="text-[#6b7280] text-xs">
                      {Math.round(game.playtime_forever / 60)}h played
                    </div>
                  </div>
                  <span className="text-[#6c63ff] text-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    +
                  </span>
                </div>
              ))}
              {filteredLibrary.length === 0 && search && (
                <p className="text-[#6b7280] text-center py-4">No games match &quot;{search}&quot;</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
