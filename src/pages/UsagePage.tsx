import { useMemo, useState } from 'react';
import { SegmentedControl } from '@alloy/components/SegmentedControl';
import { SelectField } from '@alloy/components/Input';
import { ValueChangeLabel } from '@alloy/components/ValueChangeLabel';
import { ChartCard } from '@alloy/components/Charts/ChartCard';
import { ZapIcon } from '@alloy/components/icons/ZapIcon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { MessageDotsSquareIcon } from '@alloy/components/icons/MessageDotsSquareIcon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import {
  USAGE_WORKFLOWS,
  MOCK_RUNS,
  getWindow,
  filterByWindow,
  pctChange,
  workflowById,
} from '@/features/usage/data';
import type { TimeRange, RunStatus, UsageRun } from '@/features/usage/data';
import { MOCK_AUTOMATIONS } from './AutomationsPage';
import type { Automation } from './AutomationsPage';
import {
  ACTION_TYPE_KEYS,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_COLORS,
  synthMetrics,
  MetricCard,
  SpecialistsActivatedHeatmap,
} from './AutomationDetailPage';
import type {
  ActionTypeKey,
  UsageMetrics,
  UsageRange,
} from './AutomationDetailPage';
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

// ── Metric aggregation ───────────────────────────────────────────────────────

/** Empty UsageMetrics surface used as the seed for element-wise
 *  aggregation across workflows (and as a safe zeroed fallback when the
 *  filtered workflow set is empty). */
function emptyMetrics(): UsageMetrics {
  const actionsByType = Object.fromEntries(
    ACTION_TYPE_KEYS.map(k => [k, [] as number[]]),
  ) as Record<ActionTypeKey, number[]>;
  return {
    totalTriggered:       { current: 0, prior: 0 },
    totalActive:          { current: 0, prior: 0 },
    totalCompleted:       { current: 0, prior: 0 },
    actionsTaken:         { current: 0, prior: 0 },
    specialistsActivated: { current: 0, prior: 0 },
    series: {
      labels:               [],
      triggered:            [],
      active:               [],
      completed:            [],
      actionsByType,
      activationsByPersona: {},
      activationsHeatmap:   [],
    },
  };
}

/** Element-wise sum across a list of per-workflow UsageMetrics. The
 *  series arrays from `synthMetrics` are parallel within a range (same
 *  bucket count + same heatmap day count), so adding by index is
 *  well-defined; per-persona / per-action-type maps merge by key. */
function aggregateMetrics(list: UsageMetrics[]): UsageMetrics {
  if (list.length === 0) return emptyMetrics();
  const first = list[0];
  const out: UsageMetrics = {
    totalTriggered:       { current: 0, prior: 0 },
    totalActive:          { current: 0, prior: 0 },
    totalCompleted:       { current: 0, prior: 0 },
    actionsTaken:         { current: 0, prior: 0 },
    specialistsActivated: { current: 0, prior: 0 },
    series: {
      labels:               first.series.labels.slice(),
      triggered:            new Array(first.series.triggered.length).fill(0),
      active:               new Array(first.series.active.length).fill(0),
      completed:            new Array(first.series.completed.length).fill(0),
      actionsByType:        Object.fromEntries(
        ACTION_TYPE_KEYS.map(k => [k, new Array(first.series.labels.length).fill(0)]),
      ) as Record<ActionTypeKey, number[]>,
      activationsByPersona: {},
      activationsHeatmap:   first.series.activationsHeatmap.map(d => ({
        date:      d.date,
        total:     0,
        byPersona: {},
      })),
    },
  };

  for (const m of list) {
    out.totalTriggered.current       += m.totalTriggered.current;
    out.totalTriggered.prior         += m.totalTriggered.prior;
    out.totalActive.current          += m.totalActive.current;
    out.totalActive.prior            += m.totalActive.prior;
    out.totalCompleted.current       += m.totalCompleted.current;
    out.totalCompleted.prior         += m.totalCompleted.prior;
    out.actionsTaken.current         += m.actionsTaken.current;
    out.actionsTaken.prior           += m.actionsTaken.prior;
    out.specialistsActivated.current += m.specialistsActivated.current;
    out.specialistsActivated.prior   += m.specialistsActivated.prior;

    for (let i = 0; i < out.series.triggered.length; i++) {
      out.series.triggered[i] += m.series.triggered[i] ?? 0;
      out.series.active[i]    += m.series.active[i]    ?? 0;
      out.series.completed[i] += m.series.completed[i] ?? 0;
      for (const k of ACTION_TYPE_KEYS) {
        out.series.actionsByType[k][i] += m.series.actionsByType[k][i] ?? 0;
      }
    }

    for (const [pid, count] of Object.entries(m.series.activationsByPersona)) {
      out.series.activationsByPersona[pid] =
        (out.series.activationsByPersona[pid] ?? 0) + count;
    }

    for (let i = 0; i < out.series.activationsHeatmap.length; i++) {
      const src = m.series.activationsHeatmap[i];
      if (!src) continue;
      const dst = out.series.activationsHeatmap[i];
      dst.total += src.total;
      for (const [pid, count] of Object.entries(src.byPersona)) {
        dst.byPersona[pid] = (dst.byPersona[pid] ?? 0) + count;
      }
    }
  }

  return out;
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
  const currentRuns   = useMemo(() => filterByWindow(filteredRuns, currentWindow), [filteredRuns, currentWindow]);

  // ── Aggregated UsageMetrics across filtered workflows ─────────────────────
  // The single-workflow detail page renders its tiles + charts from a
  // per-workflow `UsageMetrics`. To reuse the same surface here we
  // synth-per-workflow then element-wise aggregate across whichever
  // workflows survive the current filter row.
  const filteredAutomations = useMemo<Automation[]>(() => {
    const allowedIds = new Set(USAGE_WORKFLOWS.map(w => w.id));
    return MOCK_AUTOMATIONS.filter(a => {
      if (!allowedIds.has(a.id)) return false;
      if (workflowFilter !== 'all' && a.id !== workflowFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      return true;
    });
  }, [workflowFilter, categoryFilter]);

  // Status filter doesn't have a direct match on the synth metrics
  // (which expose aggregate triggered/active/completed totals, not
  // per-run rows). It still scopes the runs feed below; the metric
  // tiles + charts are scoped by workflow + category only.
  const [actionTypeFilter, setActionTypeFilter] = useState<Set<ActionTypeKey>>(
    () => new Set(ACTION_TYPE_KEYS),
  );

  const usage = useMemo<UsageMetrics>(() => {
    const range = timeRange as UsageRange;
    const perWorkflow = filteredAutomations.map(wf => synthMetrics(wf, range));
    return aggregateMetrics(perWorkflow);
  }, [filteredAutomations, timeRange]);

  const rangeLabel =
    timeRange === '24h' ? 'past 24 hours' :
    timeRange === '7d'  ? 'past 7 days'   :
    timeRange === '30d' ? 'past 30 days'  :
                          'all time';

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
          {/* ── Triggered / Active / Completed tiles ──────────────────── */}
          <div className={styles.metricRow}>
            <MetricCard
              title="Total triggered"
              subtitle={`Trigger fires — ${rangeLabel}`}
              value={fmtNum(usage.totalTriggered.current)}
              change={<Change current={usage.totalTriggered.current} prior={usage.totalTriggered.prior} />}
            />
            <MetricCard
              title="Total active"
              subtitle={`In-progress runs — ${rangeLabel}`}
              value={fmtNum(usage.totalActive.current)}
              change={<Change current={usage.totalActive.current} prior={usage.totalActive.prior} />}
            />
            <MetricCard
              title="Total completed"
              subtitle={`Successfully finished — ${rangeLabel}`}
              value={fmtNum(usage.totalCompleted.current)}
              change={<Change current={usage.totalCompleted.current} prior={usage.totalCompleted.prior} />}
            />
          </div>

          {/* ── Actions taken + Specialists activated — side-by-side ──── */}
          <div className={styles.chartRow}>
          {/* ── Actions taken — horizontal gradient ranking bars ──────── */}
          <ChartCard
            title="Actions taken"
            subtitle={`Actions executed by type — ${rangeLabel}`}
          >
            {(() => {
              const actionTotals = ACTION_TYPE_KEYS
                .filter(k => actionTypeFilter.has(k))
                .map(k => ({
                  key:   k,
                  label: ACTION_TYPE_LABELS[k],
                  color: ACTION_TYPE_COLORS[k],
                  count: usage.series.actionsByType[k].reduce((a, b) => a + b, 0),
                }))
                .sort((a, b) => b.count - a.count);

              const maxCount     = Math.max(...actionTotals.map(r => r.count), 1);
              const filteredTotal = actionTotals.reduce((s, r) => s + r.count, 0);
              const allTotal     = usage.actionsTaken.current || 1;
              const filteredPrior = Math.round(
                usage.actionsTaken.prior * (filteredTotal / allTotal),
              );

              return (
                <div className={styles.peopleReachedBody}>
                  <div className={styles.successRateHero}>
                    <span className={styles.successRateValue}>
                      {fmtNum(filteredTotal)}
                    </span>
                    <Change current={filteredTotal} prior={filteredPrior} />
                  </div>

                  <div className={styles.hbarList}>
                    {actionTotals.map(row => (
                      <div key={row.key} className={styles.hbarRow}>
                        <span className={styles.hbarLabel}>{row.label}</span>
                        <div className={styles.hbarTrack} role="presentation">
                          <div
                            className={styles.hbarFill}
                            style={{
                              width: `${(row.count / maxCount) * 100}%`,
                              background: `linear-gradient(to right, color-mix(in srgb, ${row.color} 10%, transparent), color-mix(in srgb, ${row.color} 30%, transparent))`,
                              boxShadow: `inset -2px 0 0 0 ${row.color}`,
                            }}
                          />
                        </div>
                        <span className={styles.hbarCount}>
                          {fmtNum(row.count)}{' '}
                          <span className={styles.hbarPct}>
                            · {Math.round((row.count / (filteredTotal || 1)) * 100)}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </ChartCard>

          {/* ── Specialists activated — dot-heatmap calendar ──────────── */}
          <ChartCard
            title="Specialists activated"
            subtitle={`AI persona invocations — last ${usage.series.activationsHeatmap.length} days`}
          >
            <div className={styles.peopleReachedBody}>
              <div className={styles.successRateHero}>
                <span className={styles.successRateValue}>
                  {fmtNum(usage.specialistsActivated.current)}
                </span>
                <Change
                  current={usage.specialistsActivated.current}
                  prior={usage.specialistsActivated.prior}
                />
              </div>
              <SpecialistsActivatedHeatmap days={usage.series.activationsHeatmap} />
            </div>
          </ChartCard>
          </div>
        </div>

      </div>

    </div>
  );
}
