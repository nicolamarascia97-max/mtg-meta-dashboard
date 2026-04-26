"use client";

import React, { useMemo, useState } from "react";
import { toPng } from "html-to-image";

type Entry = {
  name: string;
  players: number;
  card?: any;
  offset?: { x: number; y: number };
};

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState("");
  const [players, setPlayers] = useState("");

  const size = 750;
  const cx = size / 2;
  const cy = size / 2;

  const radius = 300;
  const innerRadius = 60;

  // 📡 Scryfall API
  async function fetchCard(archetype: string) {
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(archetype)}`
      );
      const data = await res.json();
      return data?.data?.[0] || null;
    } catch {
      return null;
    }
  }

  async function addEntry() {
    if (!name || !players) return;

    const card = await fetchCard(name);

    setEntries((prev) => [
      ...prev,
      {
        name,
        players: parseInt(players),
        card,
        offset: { x: 0, y: 0 },
      },
    ]);

    setName("");
    setPlayers("");
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const total = useMemo(
    () => entries.reduce((a, b) => a + b.players, 0),
    [entries]
  );

  const angles = useMemo(() => {
    let acc = 0;

    return entries.map((e) => {
      const angle = total ? (e.players / total) * 360 : 0;

      const start = acc;
      const end = acc + angle;

      acc += angle;

      return { ...e, start, end };
    });
  }, [entries, total]);

  function polar(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arc(start: number, end: number) {
    const large = end - start > 180 ? 1 : 0;

    const p1 = polar(end, radius);
    const p2 = polar(start, radius);
    const p3 = polar(start, innerRadius);
    const p4 = polar(end, innerRadius);

    return `
      M ${p1.x} ${p1.y}
      A ${radius} ${radius} 0 ${large} 0 ${p2.x} ${p2.y}
      L ${p3.x} ${p3.y}
      A ${innerRadius} ${innerRadius} 0 ${large} 1 ${p4.x} ${p4.y}
      Z
    `;
  }

  function startDrag(
    i: number,
    startX: number,
    startY: number,
    base: { x: number; y: number }
  ) {
    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      setEntries((prev) => {
        const copy = [...prev];

        copy[i] = {
          ...copy[i],
          offset: {
            x: base.x + dx,
            y: base.y + dy,
          },
        };

        return copy;
      });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // 🚀 EXPORT PNG
  async function exportPNG() {
    const node = document.querySelector("svg") as unknown as HTMLElement;
    if (!node) return;

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
    });

    const link = document.createElement("a");
    link.download = "mtg-meta.png";
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-6 text-gray-900">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold">MTG Meta Dashboard Pro</h1>
        <p className="text-gray-600">
          Build & visualize your meta in real time
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* INPUT */}
        <div className="bg-white p-5 rounded-2xl shadow border">

          <h2 className="font-semibold mb-3">Add Archetype</h2>

          <input
            className="w-full border p-2 rounded mb-2"
            placeholder="Archetype"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full border p-2 rounded mb-2"
            placeholder="Players"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          />

          <button
            onClick={addEntry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
          >
            Add Deck
          </button>

          <div className="mt-4 space-y-2 text-sm">
            {entries.map((e, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span>{e.name}</span>

                <div className="flex gap-2 items-center">
                  <span className="font-semibold">{e.players}</span>
                  <button
                    onClick={() => removeEntry(i)}
                    className="text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* CHART */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow border flex flex-col items-center">

          <div className="flex items-center justify-between w-full mb-3">
            <h2 className="font-semibold">Meta Breakdown</h2>

            <button
              onClick={exportPNG}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Export PNG
            </button>
          </div>

          <div className="w-full overflow-auto flex justify-center">

            <svg width={size} height={size}>

              <defs>
                {angles.map((e, i) => (
                  <clipPath key={i} id={`clip-${i}`}>
                    <path d={arc(e.start, e.end)} />
                  </clipPath>
                ))}
              </defs>

              {angles.map((e, i) => {
                const offset = e.offset || { x: 0, y: 0 };

                return (
                  <g key={i}>

                    {/* SLICE */}
                    <path
                      d={arc(e.start, e.end)}
                      fill={COLORS[i % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />

                    {/* IMAGE */}
                    {e.card?.image_uris?.normal && (
                      <image
                        href={e.card.image_uris.normal}
                        width={750}
                        height={750}
                        x={-375 + offset.x}
                        y={-375 + offset.y}
                        clipPath={`url(#clip-${i})`}
                        preserveAspectRatio="xMidYMid slice"
                        style={{ cursor: "grab", pointerEvents: "all" }}
                        onPointerDown={(ev) => {
                          ev.preventDefault();

                          const base = e.offset || { x: 0, y: 0 };

                          startDrag(i, ev.clientX, ev.clientY, base);
                        }}
                      />
                    )}

                  </g>
                );
              })}

            </svg>
          </div>

          <div className="text-sm text-gray-500 mt-3">
            Total Players: {total}
          </div>

        </div>
      </div>
    </div>
  );
}