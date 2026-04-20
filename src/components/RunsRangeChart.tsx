/* Step-line chart for Runs Over Time. Shows runs per bucket (hour/day/month)
   with a smooth morph between time ranges. Mirrors the reference credit chart
   but wired to the workflow-runs stream. */

import { useEffect, useRef, useState } from 'react';
import styles from './RunsRangeChart.module.css';

export interface RunsRangePoint {
  label:   string;
  runs:    number;
  success: number;
  hasData: boolean;
}

interface RunsRangeChartProps {
  data:    RunsRangePoint[];
  height?: number;
}

function fmtRuns(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString('en-US');
}

function fmtRunsAxis(n: number): string {
  if (n === 0)         return '0';
  if (n >= 1_000_000)  return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)      return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function niceRound(v: number): number {
  if (v === 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const normalized = v / mag;
  const candidates = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const c of candidates) if (c >= normalized) return c * mag;
  return 10 * mag;
}

function resample(values: number[], targetLen: number): number[] {
  if (values.length === 0)          return new Array(targetLen).fill(0);
  if (values.length === targetLen)  return values.slice();
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const t = targetLen === 1 ? 0 : (i / (targetLen - 1)) * (values.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, values.length - 1);
    const frac = t - lo;
    out.push(values[lo] + (values[hi] - values[lo]) * frac);
  }
  return out;
}

const easeInOutQuart = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export function RunsRangeChart({ data, height = 220 }: RunsRangeChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  // ── Morph animation between data generations ────────────────────────────────
  const [animProgress, setAnimProgress] = useState(1);
  const fromDataRef = useRef<RunsRangePoint[]>(data);
  const lastDataRef = useRef<RunsRangePoint[]>(data);

  useEffect(() => {
    if (lastDataRef.current === data) return;
    fromDataRef.current = lastDataRef.current;
    lastDataRef.current = data;

    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setAnimProgress(1);
      return;
    }

    const start = performance.now();
    const duration = 560;
    setAnimProgress(0);

    let rafId: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setAnimProgress(easeInOutQuart(t));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [data]);

  const fromData = animProgress < 1 ? fromDataRef.current : data;

  // ── Layout ────────────────────────────────────────────────────────────────
  const padL = 44;
  const padR = 0;
  const padT = 20;
  const padB = 20;
  const innerW = Math.max(width - padL - padR, 1);
  const innerH = height - padT - padB;

  const renderN  = Math.max(fromData.length, data.length);
  const fromVals = resample(fromData.map(d => (d.hasData ? d.runs : 0)), renderN);
  const toVals   = resample(data.map(d => (d.hasData ? d.runs : 0)), renderN);
  const blended  = fromVals.map((v, i) => v + (toVals[i] - v) * animProgress);

  const maxVal = Math.max(...blended, 0);
  const niceMax = maxVal > 0 ? niceRound(maxVal) : 10;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax * i) / tickCount);

  const yFor = (v: number) => padT + innerH - (v / niceMax) * innerH;
  const bandW = innerW / renderN;
  const leftFor  = (i: number) => padL + bandW * i;
  const rightFor = (i: number) => padL + bandW * (i + 1);

  const stepPath = (() => {
    const parts: string[] = [];
    blended.forEach((v, i) => {
      const y = yFor(v);
      parts.push(`M ${leftFor(i)} ${y}`);
      parts.push(`L ${rightFor(i)} ${y}`);
    });
    return parts.join(' ');
  })();

  const fillBars: Array<{ x: number; y: number; width: number; height: number }> = [];
  blended.forEach((v, i) => {
    if (v <= 0) return;
    const topY = yFor(v);
    fillBars.push({
      x: leftFor(i),
      y: topY,
      width: Math.max(rightFor(i) - leftFor(i), 0),
      height: padT + innerH - topY,
    });
  });

  const labelsBandW   = innerW / data.length;
  const labelsLeftFor   = (i: number) => padL + labelsBandW * i;
  const labelsCenterFor = (i: number) => padL + labelsBandW * (i + 0.5);

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={wrapRef} className={styles.wrap} style={{ height }}>
      <svg className={styles.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* matcha-400 → green-400 gradient */}
          <linearGradient id="runs-chart-stroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B0DC35" /> {/* matcha-400 */}
            <stop offset="100%" stopColor="#4FBD5A" /> {/* green-400 */}
          </linearGradient>
          <linearGradient id="runs-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B0DC35" stopOpacity="0.32" /> {/* matcha-400 */}
            <stop offset="100%" stopColor="#4FBD5A" stopOpacity="0"    /> {/* green-400 */}
          </linearGradient>
        </defs>

        {/* Gridlines + Y-axis labels */}
        {ticks.map((t, i) => (
          <g key={`t-${i}`}>
            <line className={styles.gridLine} x1={0} x2={width - padR} y1={yFor(t)} y2={yFor(t)} />
            <text className={styles.axisLabel} x={0} y={yFor(t) - 6} textAnchor="start">
              {fmtRunsAxis(t)}
            </text>
          </g>
        ))}

        {fillBars.map((b, i) => (
          <rect key={`b-${i}`} className={styles.fillBar} x={b.x} y={b.y} width={b.width} height={b.height} />
        ))}

        {stepPath && <path className={styles.stepPath} d={stepPath} />}

        {hovered && hoverIndex !== null && hovered.hasData && animProgress === 1 && (
          <circle
            className={styles.hoverDot}
            cx={labelsCenterFor(hoverIndex)}
            cy={yFor(hovered.runs)}
            r={4}
          />
        )}

        {animProgress === 1 && data.map((d, i) => (
          <rect
            key={`hit-${i}`}
            className={styles.hitArea}
            x={labelsLeftFor(i)}
            y={padT}
            width={labelsBandW}
            height={innerH}
            onMouseEnter={() => d.hasData && setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}

        {/* X-axis labels — sparse for dense ranges, edges anchored to container */}
        {(() => {
          const minSpacingPx = 48;
          const step = Math.max(1, Math.ceil(minSpacingPx / labelsBandW));
          const lastIdx = data.length - 1;
          return data.map((d, i) => {
            const isFirst = i === 0;
            const isLast  = i === lastIdx;
            if (!(isFirst || isLast) && i % step !== 0) return null;
            const x = isFirst ? padL : isLast ? width - padR : labelsCenterFor(i);
            const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
            return (
              <text
                key={`xl-${i}`}
                className={styles.axisLabel}
                x={x}
                y={height - padB + 18}
                textAnchor={anchor}
              >
                {d.label}
              </text>
            );
          });
        })()}
      </svg>

      {hovered && hoverIndex !== null && hovered.hasData && animProgress === 1 && (
        <div
          className={styles.tooltip}
          style={{
            left: labelsCenterFor(hoverIndex),
            top:  yFor(hovered.runs),
          }}
        >
          <div className={styles.tooltipLabel}>{hovered.label}</div>
          <div className={styles.tooltipRow}>
            {fmtRuns(hovered.runs)} {hovered.runs === 1 ? 'run' : 'runs'}
          </div>
          {hovered.runs > 0 && (
            <div className={styles.tooltipRow}>
              {fmtRuns(hovered.success)} successful
            </div>
          )}
        </div>
      )}
    </div>
  );
}
