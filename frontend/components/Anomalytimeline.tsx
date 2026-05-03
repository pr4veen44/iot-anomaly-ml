"use client";
// components/AnomalyTimeline.tsx
// Binary strip: each tick = 1 data point, red = anomaly, green = normal

import type { StreamRow } from "../lib/api";

interface Props { data: StreamRow[] }

export default function AnomalyTimeline({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-10 flex items-center justify-center text-muted text-xs font-mono">
        Waiting for data…
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-[1.5px] flex-wrap">
        {data.map((row, i) => (
          <div
            key={i}
            title={`t=${row.timestamp} score=${row.anomaly_score?.toFixed(3)}`}
            className="h-5 flex-1 min-w-[3px] max-w-[10px] rounded-sm transition-colors duration-200"
            style={{
              backgroundColor:
                row.prediction === -1
                  ? "rgba(255,71,87,0.85)"
                  : "rgba(0,255,157,0.35)",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted font-mono">
        <span>
          {new Date(data[0].timestamp * 1000).toISOString().slice(11, 19)} UTC
        </span>
        <span className="flex gap-4">
          <span>
            <span className="inline-block w-2 h-2 rounded-sm bg-danger mr-1" />
            Anomaly
          </span>
          <span>
            <span
              className="inline-block w-2 h-2 rounded-sm mr-1"
              style={{ backgroundColor: "rgba(0,255,157,0.5)" }}
            />
            Normal
          </span>
        </span>
        <span>
          {new Date(data[data.length - 1].timestamp * 1000).toISOString().slice(11, 19)} UTC
        </span>
      </div>
    </div>
  );
}