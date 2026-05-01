import { useMemo, useState } from 'react';
import { DataCard } from '@alloy/components/DataCard';
import { SegmentedControl } from '@alloy/components/SegmentedControl';
import { SelectField } from '@alloy/components/Input';
import { ValueChangeLabel } from '@alloy/components/ValueChangeLabel';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { ZapIcon } from '@alloy/components/icons/ZapIcon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { MessageDotsSquareIcon } from '@alloy/components/icons/MessageDotsSquareIcon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
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

/** Compact relative timestamp ("2m ago", "3h ago", "Apr 12") used inside
 *  the runs list trailing slot. Falls back to absolute date once a row is
 *  older than ~6 days so it never reads as "168h ago". */
function fmtRunRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const min = Math.floor(diffMs / 60_000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)   return `${day}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Sentence-case status string suitable for the ListItem description line. */
const RUN_STATUS_DESCRIPTION: Record<RunStatus, string> = {
  completed: 'Completed',
  failed:    'Failed',
  ongoing:   'Ongoing',
  exited:    'Exited early',
};

/** Synthesised event detail surfaced in the expanded body of a run card.
 *  Maps each mock workflow to a plausible action + recipient + payload
 *  so the expanded view reads like a real audit-log entry. */
type RunEventKind = 'email' | 'sms' | 'edit' | 'in_app';
interface RunEventTemplate {
  kind:        RunEventKind;
  /** Suffix appended after the workflow name in the title row, e.g.
   *  `New hire onboarding` + ` sent email(s)` */
  titleSuffix: string;
  /** Recipient — email address, name, or audience. */
  recipient:   string;
  /** Body / payload — email body, SMS message, or edit description. */
  body:        string;
}
const RUN_EVENT_TEMPLATES: Record<string, RunEventTemplate> = {
  wf_01HGXZ7K3QN4A2MB: {
    kind:        'email',
    titleSuffix: 'sent email(s)',
    recipient:   'jordan.lee@company.com',
    body:        'Email: Welcome to the team! Here are the steps to complete your onboarding before your first day.',
  },
  wf_01HGY2F9PW4VRJ8N: {
    kind:        'sms',
    titleSuffix: 'sent SMS message(s)',
    recipient:   'Maya Lin',
    body:        'Reminder: Your weekly timesheet is due today. Please log in to review and approve your hours.',
  },
  wf_01HGYH6CXD3TZ5QK: {
    kind:        'in_app',
    titleSuffix: 'sent in-app message(s)',
    recipient:   'Matched coverage pool',
    body:        'A shift you may be eligible to claim has just been released. Tap to view the details.',
  },
  wf_01HGZM4P8BKFYTR7: {
    kind:        'edit',
    titleSuffix: 'made 1 edits in Shifts',
    recipient:   'Overtime threshold',
    body:        'Hours updated from 38 to 42.5',
  },
  wf_01HH01VQY7JN4E5M: {
    kind:        'email',
    titleSuffix: 'sent email(s)',
    recipient:   'priya.shah@company.com',
    body:        'Email: Your contract end date is approaching. Review the offboarding checklist and confirm next steps.',
  },
};

const RUN_EVENT_ICON: Record<RunEventKind, typeof Mail01Icon> = {
  email:  Mail01Icon,
  sms:    MessageDotsSquareIcon,
  in_app: MessageDotsSquareIcon,
  edit:   Edit03Icon,
};

const RUN_EVENT_RECIPIENT_LABEL: Record<RunEventKind, string> = {
  email:  'Sent an email to',
  sms:    'Sent an SMS to',
  in_app: 'Sent an in-app message to',
  edit:   'Edited',
};

interface RunFeedItemProps {
  run:          UsageRun;
  workflowName: string;
  template:     RunEventTemplate | undefined;
}

/** Single expandable row in the Recent runs feed. Collapsed state shows
 *  the workflow label + action suffix (e.g. `… sent email(s)`) with a
 *  chevron toggle on the right; expanded state surfaces the recipient
 *  and payload for the underlying event so the feed reads like an audit
 *  log. */
function RunFeedItem({ run, workflowName, template }: RunFeedItemProps) {
  const [open, setOpen] = useState(false);
  const Icon = template ? RUN_EVENT_ICON[template.kind] : ZapIcon;
  const titleSuffix = template?.titleSuffix ?? RUN_STATUS_DESCRIPTION[run.status];
  return (
    <div className={styles.runFeedItem} data-open={open || undefined}>
      <button
        type="button"
        className={styles.runFeedItemRow}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.runsFeedAvatar} aria-hidden>
          <Icon size={14} />
        </span>
        <span className={styles.runFeedItemContent}>
          <span className={styles.runFeedItemTitle}>
            <span className={styles.runFeedItemWorkflow}>{workflowName}</span>{' '}
            <span className={styles.runFeedItemSuffix}>{titleSuffix}</span>
          </span>
          <span className={styles.runFeedItemTimestamp}>{fmtRunRelative(run.timestamp)}</span>
        </span>
        <span
          className={styles.runFeedItemChevron}
          data-open={open || undefined}
          aria-hidden
        >
          <ChevronDownIcon size={14} />
        </span>
      </button>
      {open && template && (
        <div className={styles.runFeedItemBody}>
          <div className={styles.runFeedItemDetail}>
            <span className={styles.runFeedItemDetailMarker} aria-hidden />
            <div className={styles.runFeedItemDetailContent}>
              <p className={styles.runFeedItemDetailRecipient}>
                {RUN_EVENT_RECIPIENT_LABEL[template.kind]}{' '}
                <strong>{template.recipient}</strong>
              </p>
              <p className={styles.runFeedItemDetailBody}>{template.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

  // Recent runs feed for the right sidebar — newest first, capped at 50
  // so the column stays readable. Honours the same filter row as the
  // stats / chart above so flipping a filter rescopes the feed too.
  const recentRuns = useMemo<UsageRun[]>(
    () => [...currentRuns]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50),
    [currentRuns],
  );

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

      {/* ── 2-column body — stats + chart on the left, runs feed on the
            right. The right column is sticky-scrolling on wide screens
            so the feed stays in view while the user scans the chart;
            on narrow viewports the layout collapses to a single
            column with the feed below the chart. ─────────────────── */}
      <div className={styles.body}>
        <div className={styles.bodyMain}>
          {/* ── Stat cards ────────────────────────────────────────────── */}
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

          {/* ── Runs over time ────────────────────────────────────────── */}
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

        {/* ── Recent runs feed (right column) ────────────────────────────
              Alloy ListItem rows — workflow name as primary label,
              status as the description line, and a relative timestamp
              in the trailing slot. Honours the page's filter / time-
              range scope so the feed stays in sync with the metrics on
              the left. */}
        <aside className={styles.runsFeed} aria-label="Recent automation runs">
          <header className={styles.runsFeedHeader}>
            <p className={styles.runsFeedTitle}>Recent runs</p>
            <p className={styles.runsFeedSubtitle}>
              {recentRuns.length === 0
                ? 'No runs in this window'
                : `Showing ${recentRuns.length} of ${currentRuns.length}`}
            </p>
          </header>
          <div className={styles.runsFeedList}>
            {recentRuns.length === 0 ? (
              <p className={styles.runsFeedEmpty}>
                Adjust filters or pick a wider time range to see runs.
              </p>
            ) : recentRuns.map(run => {
              const wf = workflowById(run.workflowId);
              return (
                <RunFeedItem
                  key={run.id}
                  run={run}
                  workflowName={wf?.name ?? 'Unknown workflow'}
                  template={RUN_EVENT_TEMPLATES[run.workflowId]}
                />
              );
            })}
          </div>
        </aside>
      </div>

    </div>
  );
}
