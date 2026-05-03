"use client";
// components/Controls.tsx
// Start / Pause / Inject Anomaly / Jump to Anomaly / Reset

interface Props {
  running: boolean;
  onStart:         () => void;
  onPause:         () => void;
  onInject:        () => void;
  onJump:          (intervalIndex: number) => void;
  onJumpNormal:    () => void;
  onReset:         () => void;
}

const JUMP_LABELS = [
  { index: 0, label: "Day 1 · 18:21" },
  { index: 1, label: "Day 2 · 02:26" },
  { index: 2, label: "Day 2 · 08:54" },
];

export default function Controls({
  running,
  onStart,
  onPause,
  onInject,
  onJump,
  onJumpNormal,
  onReset,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5 flex flex-col gap-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted">
        Controls
      </h3>

      {/* Primary controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={running ? onPause : onStart}
          className="flex-1 min-w-[100px] py-2 px-4 rounded-lg font-display font-semibold text-sm
                     transition-all duration-200 border"
          style={{
            background:  running ? "rgba(255,71,87,0.15)" : "rgba(0,255,157,0.15)",
            borderColor: running ? "#ff4757" : "#00ff9d",
            color:       running ? "#ff4757" : "#00ff9d",
          }}
        >
          {running ? "⏸ Pause" : "▶ Start"}
        </button>

        <button
          onClick={onInject}
          className="flex-1 min-w-[100px] py-2 px-4 rounded-lg font-display font-semibold text-sm
                     transition-all duration-200 border border-warning
                     text-warning hover:bg-warning/10 active:scale-95"
        >
          ⚡ Inject Anomaly
        </button>

        <button
          onClick={onReset}
          className="py-2 px-4 rounded-lg font-display font-semibold text-sm
                     transition-all duration-200 border border-border
                     text-muted hover:border-text hover:text-text active:scale-95"
        >
          ↺ Reset
        </button>
      </div>

      {/* Jump to normal (ground-truth) region */}
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-widest mb-2">
          Jump to Normal Data
        </p>
        <button
          onClick={onJumpNormal}
          className="py-1.5 px-3 rounded-lg text-xs font-mono border border-accent/50
                     text-accent hover:bg-accent/10 transition-all duration-200 active:scale-95"
        >
          ✓ First normal segment
        </button>
        <p className="text-[9px] text-muted font-mono mt-1.5 leading-relaxed">
          First row outside labeled anomaly time windows (GT).
        </p>
      </div>

      {/* Jump-to-anomaly buttons */}
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-widest mb-2">
          Jump to Anomaly Interval
        </p>
        <div className="flex flex-wrap gap-2">
          {JUMP_LABELS.map(({ index, label }) => (
            <button
              key={index}
              onClick={() => onJump(index)}
              className="py-1.5 px-3 rounded-lg text-xs font-mono border border-danger/50
                         text-danger hover:bg-danger/10 transition-all duration-200 active:scale-95"
            >
              ⏩ {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted">
        <div
          className={`w-2 h-2 rounded-full ${running ? "bg-accent blink" : "bg-border"}`}
        />
        {running ? "Live · polling every 1s" : "Paused"}
      </div>
    </div>
  );
}