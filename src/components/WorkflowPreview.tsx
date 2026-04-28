// Expanded preview panel shown inline within the workflow list.
//
// The host controls layout:
//   - 'table' — emits a fragment of <tr>s for insertion into <tbody>. Row A
//     is a meta cell (aligns with Name) + a main cell spanning the remaining
//     columns; Row B is a footer spanning all columns.
//   - 'card'  — emits a single <div> sized to span a card-grid row. The meta
//     and main stacks sit side-by-side, with the footer below.

import { Fragment, useEffect, useRef, useState } from 'react';
import { Eyebrow } from '@alloy/components/Eyebrow';
import { Button } from '@alloy/components/Button';
import { SegmentedControl } from '@alloy/components/SegmentedControl';
import { BarChart } from '@alloy/components/Charts/BarChart';
import { StepLineChart } from './StepLineChart';
// Keep `BarChart` imported above for non-card layouts that still use it;
// the card layout below switches to the slate step-line treatment.
void BarChart;
import { ValueChangeLabel } from '@alloy/components/ValueChangeLabel';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { useToast } from '@alloy/components/Toast';
import {
  dailyRunsClient,
  type DailyRunsResponse,
  type Timeframe,
} from '@/features/workflows/api';
import styles from './WorkflowPreview.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreviewStatus = 'active' | 'paused' | 'draft';

export interface WorkflowPreviewMeta {
  id: string;
  status: PreviewStatus;
  /** Long-form description rendered as the "Summary" section. */
  description: string;
  owner: { name: string; avatarUrl?: string };
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** Cumulative "people reached". */
  reached: number;
}

export interface WorkflowPreviewProps {
  /** Labelled-region id, mirrored by the row's aria-controls. */
  regionId: string;
  workflow: WorkflowPreviewMeta;
  /** 'table' (default) emits <tr>s; 'card' emits a full-width <div>. */
  layout?: 'table' | 'card';
  /**
   * Total number of `<th>` columns in the parent table. Only consulted when
   * layout === 'table'. Footer cell uses colSpan={totalColumns}; main cell
   * uses colSpan={totalColumns - 1} so its left edge aligns with column 2.
   */
  totalColumns?: number;
  onEdit: () => void;
  onViewRuns: () => void;
  /** Flip status (active ↔ paused). Host owns the state. */
  onToggleStatus: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('');
}

/**
 * Bars + axis labels for the chart:
 *  - 24h → one bar per hour, label every 4 hours + the last (e.g. "3 PM").
 *  - 7d  → one bar per day, label every day.
 *  - 30d → one bar per day, label every 5 days + the last.
 *  - all → bucket into ~weekly totals (~26 bars) so bars don't visually merge.
 * Empty-string labels still render; spacing stays consistent.
 */
function toChartSeries(
  points: Array<{ date: string; runs: number }>,
  timeframe: Timeframe,
): { values: number[]; labels: string[] } {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fmtHour = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric' }); // e.g. "3 PM"

  if (timeframe === '24h') {
    const step = 4;
    const last = points.length - 1;
    return {
      values: points.map(p => p.runs),
      labels: points.map((p, i) =>
        i % step !== 0 && i !== last ? '' : fmtHour(p.date),
      ),
    };
  }

  if (timeframe === '7d' || timeframe === '30d') {
    const step = timeframe === '7d' ? 1 : 5;
    const last = points.length - 1;
    return {
      values: points.map((p) => p.runs),
      labels: points.map((p, i) =>
        i % step !== 0 && i !== last ? '' : fmtDate(p.date),
      ),
    };
  }

  // 'all' — weekly buckets
  const WEEK = 7;
  const buckets: { runs: number; endDate: string }[] = [];
  for (let i = 0; i < points.length; i += WEEK) {
    const slice = points.slice(i, i + WEEK);
    buckets.push({
      runs: slice.reduce((s, p) => s + p.runs, 0),
      endDate: slice[slice.length - 1].date,
    });
  }
  const last = buckets.length - 1;
  // Label roughly every fourth bucket (~monthly) so the axis stays readable.
  const labelEvery = Math.max(1, Math.round(buckets.length / 6));
  return {
    values: buckets.map((b) => b.runs),
    labels: buckets.map((b, i) => (i % labelEvery !== 0 && i !== last ? '' : fmtDate(b.endDate))),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkflowPreview({
  regionId,
  workflow,
  layout = 'table',
  totalColumns = 1,
  onEdit,
  onViewRuns,
  onToggleStatus,
}: WorkflowPreviewProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [data, setData] = useState<DailyRunsResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    dailyRunsClient.getDailyRuns(workflow.id, timeframe).then((r) => {
      if (alive) setData(r);
    });
    return () => {
      alive = false;
    };
  }, [workflow.id, timeframe]);

  // Chart container grows to fill the empty vertical space under the buttons.
  // Measure its height via ResizeObserver and pass the measured value to
  // BarChart (which only understands a fixed `height` number). An initial
  // synchronous measurement seeds the state so the first paint already
  // reflects the real container size.
  const CHART_MIN_H = 160;
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(CHART_MIN_H);

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        setChartHeight(prev => {
          const next = Math.max(CHART_MIN_H, Math.floor(h));
          return Math.abs(next - prev) < 1 ? prev : next;
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-run when data arrives since that's when the container usually
    // settles at its final height.
  }, [data]);

  const total = data?.summary.totalRuns ?? 0;
  const prev = data?.summary.previousTotalRuns ?? 0;
  const prior = data?.summary.priorSampleSize ?? 0;
  const deltaPct = prev > 0 ? Math.round(((total - prev) / prev) * 100) : 0;
  const showDelta = data != null && prev > 0 &&
    !((timeframe === '7d' || timeframe === '24h') && prior < 20);

  const granularity =
    timeframe === 'all' ? 'Weekly' :
    timeframe === '24h' ? 'Hourly' : 'Daily';
  const chartLabel = data
    ? `${granularity} runs, last ${timeframe}. Total ${total}${
        showDelta
          ? `, ${deltaPct >= 0 ? 'up' : 'down'} ${Math.abs(deltaPct)} percent vs previous period`
          : ''
      }.`
    : `${granularity} runs`;

  const isPaused = workflow.status === 'paused';
  const isDraft = workflow.status === 'draft';

  const handleToggleStatus = () => {
    onToggleStatus();
    toast.success(isPaused ? 'Workflow resumed' : 'Workflow paused');
  };

  // Shared content blocks — identical markup regardless of layout so the two
  // branches below differ only in their wrappers.
  const metaContent = (
    <div className={styles.metaStack}>
      <div className={styles.metaSection}>
        <Eyebrow>Identifier</Eyebrow>
        <code className={styles.metaId}>{workflow.id}</code>
      </div>

      <div className={styles.metaSection}>
        <Eyebrow>Created</Eyebrow>
        <span className={styles.metaValue}>{formatDate(workflow.createdAt)}</span>
      </div>

      <div className={styles.metaSection}>
        <Eyebrow>People reached</Eyebrow>
        <span className={styles.metaValue}>{workflow.reached.toLocaleString()}</span>
      </div>

      <div className={styles.metaSection}>
        <Eyebrow>Owner</Eyebrow>
        <div className={styles.ownerRow}>
          <span className={styles.avatar} aria-hidden>
            {workflow.owner.avatarUrl ? (
              <img
                src={workflow.owner.avatarUrl}
                alt=""
                className={styles.avatarImg}
                loading="lazy"
              />
            ) : (
              initialsOf(workflow.owner.name)
            )}
          </span>
          <span className={styles.metaValue}>{workflow.owner.name}</span>
        </div>
      </div>

      <div className={styles.metaSection}>
        <Eyebrow>Summary</Eyebrow>
        <p className={styles.summary}>{workflow.description}</p>
      </div>
    </div>
  );

  const mainContent = (
    <>
      <div className={styles.mainHeader}>
        <div className={styles.totalBlock}>
          <Eyebrow>Total runs</Eyebrow>
          <div className={styles.totalRow}>
            <span className={styles.totalNum}>{total.toLocaleString()}</span>
            {showDelta && (
              <ValueChangeLabel
                mode="trend"
                trend={deltaPct >= 0 ? 'up' : 'down'}
                value={`${Math.abs(deltaPct)}% vs prev ${timeframe}`}
              />
            )}
          </div>
        </div>

        <SegmentedControl
          size="sm"
          value={timeframe}
          onChange={(v) => setTimeframe(v as Timeframe)}
          aria-label="Timeframe"
        >
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="24h">24h</SegmentedControl.Item>
          <SegmentedControl.Item value="7d">7d</SegmentedControl.Item>
          <SegmentedControl.Item value="30d">30d</SegmentedControl.Item>
        </SegmentedControl>
      </div>

      <div ref={chartWrapRef} className={styles.chartWrap}>
        {data ? (() => {
          const { values, labels } = toChartSeries(data.current, timeframe);
          return (
            <StepLineChart
              values={values}
              labels={labels}
              height={chartHeight}
              ariaLabel={chartLabel}
            />
          );
        })() : (
          <div className={styles.chartPlaceholder} aria-hidden />
        )}
      </div>
    </>
  );

  const footerContent = (
    <div className={styles.actions}>
      <span className={styles.lastEditedInline} aria-label="Last edited">
        Last edited {formatDate(workflow.updatedAt)}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        leadingArtwork={<BarChart02Icon size={14} />}
        onClick={onViewRuns}
      >
        View runs
      </Button>
      {/* Pause / Resume removed — toggling lives on the card-level Switch in
          the workflow list, which keeps the action chrome in one place
          rather than duplicating it inside the expanded preview. */}
      <Button
        variant="primary"
        size="sm"
        className={styles.editWorkflowButton}
        leadingArtwork={<Edit03Icon size={14} />}
        onClick={onEdit}
      >
        Edit workflow
      </Button>
    </div>
  );

  if (layout === 'card') {
    return (
      <div
        className={styles.cardLayout}
        id={regionId}
        role="region"
        aria-label="Workflow preview"
      >
        <div className={styles.cardLayoutBody}>
          <div className={styles.cardLayoutMeta}>{metaContent}</div>
          <div className={styles.cardLayoutMain}>
            {/* Buttons pinned to the top-right of the main column */}
            <div className={styles.cardLayoutActions}>{footerContent}</div>
            {/* Chart group pushed to the bottom via margin-top: auto */}
            <div className={styles.cardLayoutChartGroup}>{mainContent}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      {/* ── Single row spanning all columns — 40/60 split enforced internally
          via a grid so colSpan'd <td> width-percentages aren't needed. ── */}
      <tr className={styles.expandedRow}>
        <td
          className={styles.fullCell}
          colSpan={totalColumns}
          id={regionId}
          role="region"
          aria-label="Workflow preview"
        >
          <div className={styles.tableLayoutBody}>
            <div className={styles.tableLayoutMeta}>{metaContent}</div>
            <div className={styles.tableLayoutMain}>
              <div className={styles.cardLayoutActions}>{footerContent}</div>
              <div className={styles.cardLayoutChartGroup}>{mainContent}</div>
            </div>
          </div>
        </td>
      </tr>
    </Fragment>
  );
}
