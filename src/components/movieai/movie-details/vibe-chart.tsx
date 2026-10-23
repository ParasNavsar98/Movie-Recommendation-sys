import { useState } from "react";
import type { VibeItem } from "./types";

interface VibeChartProps {
  data: VibeItem[];
}

export function VibeChart({ data }: VibeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const center = 100;

  // Compute stroke dash offsets
  let cumulativeValue = 0;
  const segments = data.map((item, idx) => {
    const strokeDasharray = `${(item.value / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativeValue / 100) * circumference);
    cumulativeValue += item.value;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeItem =
    hoveredIndex !== null ? data[hoveredIndex] : data[0] ?? { label: "Vibe", value: 100, color: "#8B5CF6" };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold tracking-tight text-white">
          Vibe Chart
        </h2>
        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400/90 bg-purple-950/40 border border-purple-800/40 rounded px-2 py-0.5">
          Audience Tone
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* DONUT SVG CHART */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg
            width="170"
            height="170"
            viewBox="0 0 200 200"
            className="-rotate-90 transform"
            aria-label="Vibe distribution chart"
          >
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#222226"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {segments.map((seg) => {
              const isHovered = hoveredIndex === seg.idx;
              return (
                <circle
                  key={seg.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="butt"
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.5,
                  }}
                  onMouseEnter={() => setHoveredIndex(seg.idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* CENTER TEXT */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span
              className="text-2xl font-bold tracking-tight text-white transition-all"
              style={{ color: activeItem?.color }}
            >
              {activeItem?.value}%
            </span>
            <span className="mt-0.5 line-clamp-1 max-w-[85px] text-[10px] font-medium text-zinc-300">
              {activeItem?.label}
            </span>
          </div>
        </div>

        {/* CATEGORY LEGEND */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  isHovered
                    ? "bg-zinc-800/80 text-white"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="font-semibold text-zinc-400 ml-2">
                  {item.value}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        Deterministic breakdown derived from genre, pacing, and tone metadata.
      </p>
    </div>
  );
}
