import { useMemo, useState } from 'react';
import { DataCard } from '@alloy/components/DataCard';
import { SegmentedControl } from '@alloy/components/SegmentedControl';
import { SelectField } from '@alloy/components/Input';
import { ValueChangeLabel } from '@alloy/components/ValueChangeLabel';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { RunsRangeChart } from '@/components/RunsRangeChart';
import type { RunsRangePoint } from '@/components/RunsRangeChart';
import {
  USAGE_WORKFLOWS,
  MOCK_RUNS,
  getWindow,
  getPriorWindow,
  filterByWindow,
  pctChange,
  bucketFor,
  bucketKey,
  bucketLabel,
  eachBucketInRange,
  workflowById,
} from '@/features/usage/data';
import type { TimeRange, RunStatus, UsageRun } from '@/features/usage/data';
import styles from './UsagePage.module.css';

// ── Formatting helpers ───────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

// ── Change badge ─────────────────────────────────────────────────────────────

interface ChangeProps {
  current:          number;
  prior:            number;
  invertDirection?: boolean;
}

function Change({ current, prior, invertDirection = false }: ChangeProps) {
  const delta = pctChange(current, prior);
  if (delta === null) return null;
  const isUp = delta > 0;
  const trend = isUp ? 'up' : 'down';
  const isPositive = invertDirection ? !isUp : isUp;
  const severity = Math.abs(delta) < 0.5
    ? undefined
    : isPositive ? 'positive' : 'negative';
  const label = `${delta > 0 ? '+' : ''}${Math.abs(delta).toFixed(1)}%`;
  return <ValueChangeLabel mode="trend" value={label} trend={trend} severity={severity} />;
}

// ── Filter option builders ───────────────────────────────────────────────────

const WORKFLOW_OPTIONS = [
  { value: 'all', label: 'All workflows' },
  ...USAGE_WORKFLOWS.map(w => ({ value: w.id, label: w.name })),
];

const CATEGORY_OPTIONS = (() => {
  const cats = Array.from(new Set(USAGE_WORKFLOWS.map(w => w.category))).sort();
  return [
    { value: 'all', label: 'All categories' },
    ...cats.map(c => ({ value: c, label: c })),
  ];
})();

const STATUS_OPTIONS: { value: RunStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All statuses' },
  { value: 'completed', label: 'Completed'    },
  { value: 'failed',    label: 'Failed'       },
  { value: 'ongoing',   label: 'Ongoing'      },
  { value: 'exited',    label: 'Exited'       },
];

/** Hidden SVG defs providing the matcha gradient for `stroke: url(#...)` refs. */
function UsageGradientDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="usage-matcha-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#B0DC35" /> {/* matcha-400 */}
          <stop offset="100%" stopColor="#4FBD5A" /> {/* green-400 */}
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function UsagePage() {
  const [timeRange, setTimeRange]             = useState<TimeRange>('7d');
  const [workflowFilter, setWorkflowFilter]   = useState<string>('all');
  const [categoryFilter, setCategoryFilter]   = useState<string>('all');
  const [statusFilter, setStatusFilter]       = useState<string>('all');

  // Central filtered stream — drives every downstream calc.
  const filteredRuns = useMemo<UsageRun[]>(() => {
    return MOCK_RUNS.filter(r => {
      if (workflowFilter !== 'all' && r.workflowId !== workflowFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all') {
        const wf = workflowById(r.workflowId);
        if (!wf || wf.category !== categoryFilter) return false;
      }
      return true;
    });
  }, [workflowFilter, categoryFilter, statusFilter]);

  const currentWindow = useMemo(() => getWindow(timeRange), [timeRange]);
  const priorWindow   = useMemo(() => getPriorWindow(timeRange), [timeRange]);
  const currentRuns   = useMemo(() => filterByWindow(filteredRuns, currentWindow), [filteredRuns, currentWindow]);
  const priorRuns     = useMemo(() => filterByWindow(filteredRuns, priorWindow), [filteredRuns, priorWindow]);

  // ── Aggregate metrics ──────────────────────────────────────────────────────
  const totalRuns        = currentRuns.length;
  const priorTotalRuns   = priorRuns.length;

  const successfulRuns   = currentRuns.filter(r => r.status === 'completed').length;
  const priorSuccessful  = priorRuns.filter(r => r.status === 'completed').length;

  const successRate      = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
  const priorSuccessRate = priorTotalRuns > 0 ? (priorSuccessful / priorTotalRuns) * 100 : 0;

  const peopleReached      = currentRuns.reduce((s, r) => s + r.reached, 0);
  const priorPeopleReached = priorRuns.reduce((s, r) => s + r.reached, 0);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const { chartData, activeBuckets } = useMemo(() => {
    const bucket = bucketFor(timeRange);
    const byBucket: Record<string, { runs: number; success: number }> = {};
    for (const r of currentRuns) {
      const k = bucketKey(new Date(r.timestamp), bucket);
      if (!byBucket[k]) byBucket[k] = { runs: 0, success: 0 };
      byBucket[k].runs++;
      if (r.status === 'completed') byBucket[k].success++;
    }
    const buckets = eachBucketInRange(currentWindow.from, currentWindow.to, bucket);
    const data: RunsRangePoint[] = buckets.map(d => {
      const k = bucketKey(d, bucket);
      const cell = byBucket[k];
      if (!cell) return { label: bucketLabel(d, bucket), runs: 0, success: 0, hasData: false };
      return {
        label:   bucketLabel(d, bucket),
        runs:    cell.runs,
        success: cell.success,
        hasData: true,
      };
    });
    return { chartData: data, activeBuckets: data.filter(d => d.hasData).length };
  }, [currentRuns, timeRange, currentWindow]);

  const chartSubtitle = timeRange === '24h'
    ? 'Runs triggered per hour'
    : timeRange === 'all'
      ? 'Runs triggered per month'
      : 'Runs triggered per day';

  return (
    <div className={styles.page}>
      <UsageGradientDefs />
      {/* ── Filters + time range ──────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <div className={styles.filterBar}>
          <div className={styles.filterField} style={{ width: 180 }}>
            <SelectField
              size="sm"
              options={WORKFLOW_OPTIONS}
              value={workflowFilter}
              onChange={setWorkflowFilter}
            />
          </div>
          <div className={styles.filterField} style={{ width: 160 }}>
            <SelectField
              size="sm"
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          <div className={styles.filterField} style={{ width: 160 }}>
            <SelectField
              size="sm"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>
        <SegmentedControl
          value={timeRange}
          onChange={v => setTimeRange(v as TimeRange)}
          size="sm"
        >
          <SegmentedControl.Item value="24h">24h</SegmentedControl.Item>
          <SegmentedControl.Item value="7d">7d</SegmentedControl.Item>
          <SegmentedControl.Item value="30d">30d</SegmentedControl.Item>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
        </SegmentedControl>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className={styles.stats}>
        <DataCard
          className={styles.gradientBadge}
          color="matcha"
          icon={<BarChart02Icon size={24} />}
          label="Total runs"
          value={fmtNum(totalRuns)}
          tag={<Change current={totalRuns} prior={priorTotalRuns} />}
        />
        <DataCard
          className={styles.gradientBadge}
          color="matcha"
          icon={<CheckCircleIcon size={24} />}
          label="Success rate"
          value={`${Math.round(successRate)}%`}
          tag={<Change current={successRate} prior={priorSuccessRate} />}
        />
        <DataCard
          className={styles.gradientBadge}
          color="matcha"
          icon={<Users03Icon size={24} />}
          label="People reached"
          value={fmtNum(peopleReached)}
          tag={<Change current={peopleReached} prior={priorPeopleReached} />}
        />
      </div>

      {/* ── Runs over time ────────────────────────────────────────────────── */}
      <section className={styles.chartCard}>
        <div>
          <p className={styles.chartTitle}>Runs over time</p>
          <p className={styles.chartSubtitle}>{chartSubtitle}</p>
        </div>
        {activeBuckets < (timeRange === 'all' ? 1 : 3) ? (
          <div className={styles.empty}>Not enough activity yet to show trends</div>
        ) : (
          <RunsRangeChart data={chartData} />
        )}
      </section>

    </div>
  );
}
