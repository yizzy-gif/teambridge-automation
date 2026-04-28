/* ─────────────────────────────────────────────────────────────────────────────
   StepLineChart — modelled on TeambridgeCode's TimeSavedChart.

   Visual treatment per bucket:
     · top "cap" line (one horizontal segment per bucket, no vertical
       connectors)
     · soft slate gradient fill underneath, fading from the cap down to the
       baseline
     · gridlines spanning the full plot width, y-axis labels in the left
       gutter at the card's edge so they don't overlap the first bucket
     · sparse x-axis labels with edge-anchored first / last entries

   Colour scale = Slate. Stroke uses --Alloy-slate-500 / --Alloy-slate-400
   so the curve reads as muted chrome; the fill fades from slate-300 at
   30% opacity to fully transparent at the baseline.
   ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useId, useRef, useState } from 'react';
import styles from './StepLineChart.module.css';

export interface StepLineChartProps {
  /** Per-bucket numeric values plotted on the y-axis. */
  values: number[];
  /** Per-bucket x-axis labels (same length as `values`). */
  labels: string[];
  /** Total chart height in px (the card layout sets this). */
  height?: number;
  /** Optional accessible label for the SVG. */
  ariaLabel?: string;
}

function niceRound(v: number): number {
  if (v <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const candidates = [1, 1.2, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.5, 2.8, 3, 3.2, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10];
  const normalized = v / mag;
  for (const c of candidates) {
    if (c >= normalized) return c * mag;
  }
  return 10 * mag;
}

export function StepLineChart({ values, labels, height = 160, ariaLabel }: StepLineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // Stable per-instance gradient IDs so multiple charts on the page don't
  // collide on `<defs>` lookups.
  const uid = useId();
  const strokeId = `slc-stroke-${uid}`;
  const fillId   = `slc-fill-${uid}`;

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Layout ─────────────────────────────────────────────────────────────────
  const padL = 32; // y-axis label gutter
  const padR = 0;
  const padT = 16;
  const padB = 24;
  const innerW = Math.max(width - padL - padR, 1);
  const innerH = Math.max(height - padT - padB, 1);

  const maxVal = values.length > 0 ? Math.max(0, ...values) : 0;
  const niceMax = maxVal > 0 ? niceRound(maxVal) : 4;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax * i) / tickCount);

  const yFor = (v: number) => padT + innerH - (v / niceMax) * innerH;
  const bandW = innerW / Math.max(1, values.length);
  const leftFor = (i: number) => padL + bandW * i;
  const rightFor = (i: number) => padL + bandW * (i + 1);
  const centerFor = (i: number) => padL + bandW * (i + 0.5);

  // Top cap line — one horizontal segment per bucket, no vertical connectors.
  const stepPath = (() => {
    if (values.length === 0) return '';
    const parts: string[] = [];
    values.forEach((v, i) => {
      const y = yFor(v);
      const xL = leftFor(i);
      const xR = rightFor(i);
      parts.push(`M ${xL} ${y}`);
      parts.push(`L ${xR} ${y}`);
    });
    return parts.join(' ');
  })();

  // Filled bars — one per bucket, gradient fades downward.
  const fillBars: Array<{ x: number; y: number; width: number; height: number }> = [];
  values.forEach((v, i) => {
    if (v <= 0) return;
    const topY = yFor(v);
    const xL = leftFor(i);
    const xR = rightFor(i);
    fillBars.push({
      x: xL,
      y: topY,
      width: Math.max(xR - xL, 0),
      height: padT + innerH - topY,
    });
  });

  const hovered = hoverIndex !== null && hoverIndex < values.length ? values[hoverIndex] : null;

  return (
    <div ref={wrapRef} className={styles.wrap} style={{ height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {/* Vertical slate gradient (slate-500 → slate-400) for the cap
              line. Reads as muted chrome rather than competing primary
              data colour. */}
          <linearGradient id={strokeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--Alloy-slate-500)" />
            <stop offset="100%" stopColor="var(--Alloy-slate-400)" />
          </linearGradient>
          {/* Slate fill — soft 30% slate-300 at the cap fading to fully
              transparent at the baseline so the bucket reads as a soft
              mound rather than a hard bar. */}
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--Alloy-slate-300)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--Alloy-slate-300)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines + labels in the left gutter. */}
        {ticks.map((t, i) => (
          <g key={`t-${i}`}>
            <line
              x1={0}
              x2={width - padR}
              y1={yFor(t)}
              y2={yFor(t)}
              className={styles.gridLine}
            />
            <text
              x={0}
              y={yFor(t) - 6}
              textAnchor="start"
              className={styles.axisLabel}
            >
              {t < 1 && t > 0 ? t.toFixed(1) : Math.round(t)}
            </text>
          </g>
        ))}

        {/* Filled buckets. */}
        {fillBars.map((b, i) => (
          <rect
            key={`b-${i}`}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill={`url(#${fillId})`}
          />
        ))}

        {/* Top cap line over every bucket. */}
        {stepPath && (
          <path
            d={stepPath}
            className={styles.stepPath}
            stroke={`url(#${strokeId})`}
          />
        )}

        {/* Hover dot on the bucket cap. */}
        {hovered != null && hoverIndex !== null && hovered > 0 && (
          <circle
            cx={centerFor(hoverIndex)}
            cy={yFor(hovered)}
            r={4}
            className={styles.hoverDot}
          />
        )}

        {/* Hit areas — one full-height column per bucket so hover/focus
            anywhere over a bucket reveals its dot + tooltip. */}
        {values.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={leftFor(i)}
            y={padT}
            width={bandW}
            height={innerH}
            className={styles.hitArea}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}

        {/* X-axis labels — sparse for dense ranges, edge-anchored for
            first / last so they hug the card edges. */}
        {(() => {
          const minSpacingPx = 60;
          const step = Math.max(1, Math.ceil(minSpacingPx / bandW));
          const lastIdx = values.length - 1;
          return labels.map((lbl, i) => {
            const isFirst = i === 0;
            const isLast = i === lastIdx;
            const isEdge = isFirst || isLast;
            if (!isEdge && i % step !== 0) return null;
            if (!lbl) return null;
            const x = isFirst
              ? padL
              : isLast
                ? width - padR
                : centerFor(i);
            const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
            return (
              <text
                key={`xl-${i}`}
                x={x}
                y={height - padB + 18}
                textAnchor={anchor}
                className={styles.axisLabel}
              >
                {lbl}
              </text>
            );
          });
        })()}
      </svg>

      {/* Tooltip — absolutely positioned in the wrap so it can sit above
          the SVG hit area. */}
      {hovered != null && hoverIndex !== null && hovered > 0 && (
        <div
          className={styles.tooltip}
          style={{
            left: `${centerFor(hoverIndex)}px`,
            top: `${yFor(hovered)}px`,
          }}
        >
          <div className={styles.tooltipLabel}>{labels[hoverIndex]}</div>
          <div className={styles.tooltipRow}>{hovered} runs</div>
        </div>
      )}
    </div>
  );
}
