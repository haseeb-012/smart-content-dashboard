"use client";

import { useState } from "react";
import { compact } from "@/lib/utils";

/** Minimal accessible SVG charts (no chart library needed for v1). */
export function LineChart({ data, label, kind = "line" }: { data: Array<{ x: string; y: number }>; label: string; kind?: "line" | "bar" }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 180, P = 28;
  const max = Math.max(1, ...data.map((d) => d.y));
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.y)}`).join(" ");
  const bw = Math.max(2, (W - P * 2) / data.length - 3);
  const total = data.reduce((s, d) => s + d.y, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label={`${label}: total ${compact(total)} over ${data.length} days, peak ${compact(max)}`} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" />
            <text x={P - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="var(--subtle)">{compact(max * t)}</text>
          </g>
        ))}
        {kind === "bar"
          ? data.map((d, i) => (
              <rect key={d.x} x={x(i) - bw / 2} y={y(d.y)} width={bw} height={H - P - y(d.y)} rx="2" fill={hover === i ? "var(--accent)" : "#a9c3ff"} onMouseEnter={() => setHover(i)} />
            ))
          : (
            <>
              <path d={`${path} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="var(--accent)" opacity="0.08" />
              <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
              {data.map((d, i) => (
                <rect key={d.x} x={x(i) - 6} y={P} width="12" height={H - P * 2} fill="transparent" onMouseEnter={() => setHover(i)} />
              ))}
              {hover !== null && <circle cx={x(hover)} cy={y(data[hover].y)} r="4" fill="var(--accent)" />}
            </>
          )}
        <text x={P} y={H - 8} fontSize="10" fill="var(--subtle)">{data[0]?.x}</text>
        <text x={W - P} y={H - 8} textAnchor="end" fontSize="10" fill="var(--subtle)">{data.at(-1)?.x}</text>
      </svg>
      <figcaption className="h-5 text-xs text-muted tabular">
        {hover !== null ? `${data[hover].x}: ${compact(data[hover].y)}` : "Hover the chart for daily values"}
      </figcaption>
    </figure>
  );
}
