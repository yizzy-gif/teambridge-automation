// Read-only workflow detail page. Mirrors the Manage card's data shape +
// adds usage metrics, an activity feed (Runs / Edits), and a settings
// summary. The right column hosts a workflow preview placeholder that
// will be replaced once the read-only FlowCanvas extraction lands —
// see `extract-readonly-flow-canvas` follow-up task. The Edit-workflow
// CTA navigates into the builder at `/automations/:id/edit`.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@alloy/components/Button';
import { Dialog, DialogHeader, DialogContent } from '@alloy/components/Dialog';
import { DropdownMenu } from '@alloy/components/DropdownMenu';
import type { DropdownMenuGroup } from '@alloy/components/DropdownMenu';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import { Eyebrow } from '@alloy/components/Eyebrow';
import { Divider } from '@alloy/components/Divider';
import { ValueChangeLabel } from '@alloy/components/ValueChangeLabel';
import { SegmentedControl } from '@alloy/components/SegmentedControl';
import { ChartCard } from '@alloy/components/Charts/ChartCard';
import { RatioBar } from '@alloy/components/Charts/RatioBar';
import { BarChart } from '@alloy/components/Charts/BarChart';
import { ActivityHeatMap } from '@alloy/components/Charts/ActivityHeatMap';
import type { ActivityHeatMapDay } from '@alloy/components/Charts/ActivityHeatMap';
import { Tabs } from '@alloy/components/Tabs';
import { ListItem } from '@alloy/components/ListItem';
import { Pagination } from '@alloy/components/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  CellText,
  CellStatusTag,
} from '@alloy/components/Table';
import { DotsHorizontalIcon } from '@alloy/components/icons/DotsHorizontalIcon';
import { Copy01Icon } from '@alloy/components/icons/Copy01Icon';
import { ArchiveIcon } from '@alloy/components/icons/ArchiveIcon';
import { Trash03Icon } from '@alloy/components/icons/Trash03Icon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { PlayIcon } from '@alloy/components/icons/PlayIcon';
import { PuzzlePiece01Icon } from '@alloy/components/icons/PuzzlePiece01Icon';
import { SettingsGearIcon } from '@alloy/components/icons/SettingsGearIcon';
import { LogIn01Icon } from '@alloy/components/icons/LogIn01Icon';
import {
  MOCK_AUTOMATIONS,
  type Automation,
  type AutomationStatus,
} from './AutomationsPage';
import styles from './AutomationDetailPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageRange = 'all' | '24h' | '7d' | '30d';

interface UsageMetrics {
  totalRuns:      { current: number; prior: number };
  successRatePct: { current: number; prior: number };
  avgDurationSec: { current: number; prior: number };
  activeUsers:    { current: number; prior: number };
  peopleReached:  { current: number; prior: number };
  /** Per-bucket time series — every metric tile in the top row pulls
   *  a parallel array from here so its sparkline reflects the same
   *  bucket cadence as the period totals. `succeeded` / `failed`
   *  remain available for the Success rate ratio bar.
   *  `runsHeatmap` is a separate 90-day daily series powering the
   *  Total runs ActivityHeatMap so the heatmap always fills its
   *  container regardless of which period is currently selected. */
  series: {
    labels:        string[];
    succeeded:     number[];
    failed:        number[];
    totalRuns:     number[];
    avgDuration:   number[];
    activeUsers:   number[];
    peopleReached: number[];
    runsHeatmap:   ActivityHeatMapDay[];
  };
}

interface RecentRun {
  id:           string;
  status:       'success' | 'failed' | 'running';
  trigger:      string;        // e.g. "Manual run by Alex" / "Scheduled trigger"
  startedAt:    string;        // ISO
  durationSec:  number;
}

interface RecentEdit {
  id:        string;
  authorName:string;
  /** Action sentence: "Alex renamed the workflow", "Sam added step …" */
  summary:   string;
  at:        string;           // ISO
}

interface WorkflowPermissions {
  editors: { name: string }[];
  runners: { name: string }[];
}

interface WorkflowSchedule {
  triggerLabel: string;
  frequency:    string;
}

interface WorkflowIntegration {
  id:   string;
  name: string;
}

/** Aggregate detail shape consumed by this page. Wraps the existing
 *  Automation row from the Manage page mock + the synthesised metric
 *  / activity / permission stuff that doesn't have a real backend yet. */
export interface WorkflowDetail {
  workflow:     Automation;
  schedule:     WorkflowSchedule;
  integrations: WorkflowIntegration[];
  permissions:  WorkflowPermissions;
  metrics:      Record<UsageRange, UsageMetrics>;
  recentRuns:   RecentRun[];
  recentEdits:  RecentEdit[];
}

// ─── Mock detail layer ────────────────────────────────────────────────────────
// TODO(api): replace this whole hook with the real /api/workflows/:id detail
// fetcher. The mock keeps things plausible — usage metrics derive from the
// existing Manage page mock + a deterministic PRNG, activity feeds are
// synthesised per workflow id.

function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Map a numeric per-bucket series to ActivityHeatMap day rows.
 *  Dates are synthesised back-walking from today so the heatmap reads
 *  as "recent activity"; the labels carry through to the cell tooltip. */
function seriesToHeatmapDays(values: number[], labels: string[]): ActivityHeatMapDay[] {
  const today = new Date();
  return values.map((count, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (values.length - 1 - i));
    return {
      date:  d.toISOString().slice(0, 10),
      label: labels[i] ?? d.toISOString().slice(0, 10),
      count,
    };
  });
}

function bucketsForRange(range: UsageRange): { count: number; labelFor: (i: number) => string } {
  switch (range) {
    case '24h': return { count: 24, labelFor: i => `${i}:00` };
    case '7d':  return { count: 7,  labelFor: i => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] };
    case '30d': return { count: 30, labelFor: i => `Day ${i + 1}` };
    case 'all': return { count: 12, labelFor: i => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i] };
  }
}

function synthMetrics(workflow: Automation, range: UsageRange): UsageMetrics {
  const { count, labelFor } = bucketsForRange(range);
  const rnd = seeded(`${workflow.id}|${range}`);
  // Intrinsic per-workflow success rate, derived deterministically from
  // the id so it varies workflow-to-workflow but stays stable across
  // re-renders. Sits in 78–96% so the ratio bar always reads as a real
  // mix instead of all-green.
  const baseRate = 0.78 + (seeded(`${workflow.id}|rate`)() * 0.18);
  // Daily run baseline scales with the workflow's lifetime total.
  const dailyBaseline = Math.max(2, workflow.runsTotal / 30);
  const rangeFactor = range === '24h' ? 0.04
                    : range === '7d'  ? 0.25
                    : range === '30d' ? 1.0
                                      : 1.5;
  const baseline = Math.max(2, Math.round(dailyBaseline * rangeFactor));
  const labels: string[] = [];
  const succeeded: number[] = [];
  const failed: number[] = [];
  let totalSucc = 0;
  let totalFail = 0;
  for (let i = 0; i < count; i++) {
    labels.push(labelFor(i));
    // Per-bucket total runs around the baseline, then split by the
    // intrinsic rate ± a small day-to-day jitter so the bar segments
    // ripple naturally instead of repeating identical proportions.
    const total = Math.max(1, Math.round(baseline * (0.7 + rnd() * 0.6)));
    const dayRate = Math.max(0.5, Math.min(1, baseRate + (rnd() - 0.5) * 0.12));
    const succ = Math.round(total * dayRate);
    const fail = Math.max(0, total - succ);
    succeeded.push(succ);
    failed.push(fail);
    totalSucc += succ;
    totalFail += fail;
  }
  const totalRuns = totalSucc + totalFail;
  const priorTotal = Math.max(1, Math.round(totalRuns * (0.85 + rnd() * 0.3)));
  // Prior period sits a little below the current rate so the trend
  // delta has a non-zero direction more often than not.
  const priorRate = Math.max(0.6, Math.min(0.99, baseRate - 0.04 + rnd() * 0.06));
  const priorSucc  = Math.max(0, Math.round(priorTotal * priorRate));
  const successPct = totalRuns ? (totalSucc / totalRuns) * 100 : 0;
  const priorSuccessPct = priorTotal ? (priorSucc / priorTotal) * 100 : 0;
  const avgDur = 24 + Math.floor(rnd() * 90);
  const priorAvg = avgDur + Math.floor(rnd() * 20 - 10);
  const activeUsers = Math.max(1, Math.round(workflow.stats.reached * (range === '24h' ? 0.05 : range === '7d' ? 0.3 : range === '30d' ? 0.8 : 1)));
  const priorUsers = Math.max(1, Math.round(activeUsers * (0.9 + rnd() * 0.2)));
  // Per-bucket sparkline series — each metric tile pulls a parallel
  // array. Total runs is just succeeded + failed by bucket; avg
  // duration orbits the period average; active users orbit a
  // per-bucket baseline so the curve has natural peaks and dips.
  const totalRunsSeries  = succeeded.map((s, i) => s + (failed[i] ?? 0));
  const avgDurationSeries: number[] = [];
  for (let i = 0; i < count; i++) {
    avgDurationSeries.push(Math.max(1, Math.round(avgDur * (0.7 + rnd() * 0.6))));
  }
  const usersBaseline = Math.max(1, activeUsers / Math.max(1, count));
  const activeUsersSeries: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.round(usersBaseline * (0.55 + rnd() * 0.9));
    activeUsersSeries.push(Math.max(0, v));
  }

  // People reached — distinct people the workflow successfully acted
  // on in the period. Scales off the workflow's lifetime `reached`
  // count using the same range factor as runs, then walks bucket-by-
  // bucket so the BarChart reads as a real cadence.
  const reachedPeriodTotal = Math.max(
    0,
    Math.round(workflow.stats.reached * rangeFactor),
  );
  const reachedBaseline = Math.max(1, reachedPeriodTotal / Math.max(1, count));
  const peopleReachedSeries: number[] = [];
  let peopleReachedCurrent = 0;
  for (let i = 0; i < count; i++) {
    const v = Math.max(0, Math.round(reachedBaseline * (0.55 + rnd() * 0.9)));
    peopleReachedSeries.push(v);
    peopleReachedCurrent += v;
  }
  const peopleReachedPrior = Math.max(
    0,
    Math.round(peopleReachedCurrent * (0.85 + rnd() * 0.3)),
  );

  // Heatmap series — full year of daily buckets (≈53 weekly columns
  // of standard 14px squares). Alloy's `.gridWrap` is right-anchored
  // with `overflow: hidden`, so generating more columns than the card
  // can display guarantees the grid spans edge-to-edge at any width;
  // the surplus simply clips off the left. Decoupled from `range` so
  // the heatmap reads as a stable backdrop regardless of period.
  const HEATMAP_DAYS = 371;
  const hmRnd = seeded(`${workflow.id}|heatmap`);
  const hmBaseline = Math.max(2, Math.round(workflow.runsTotal / 30));
  const today = new Date();
  const runsHeatmap: ActivityHeatMapDay[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Spread counts across 0–~2× baseline so the heatmap surfaces all
    // five intensity steps. ~8% of days drop to zero (level 0), the
    // rest scale from a sliver of activity up to peak load — otherwise
    // a tight band collapses every cell to one or two shades.
    const r = hmRnd();
    const dayCount = r < 0.08
      ? 0
      : Math.max(0, Math.round(hmBaseline * (0.15 + r * 2.0)));
    runsHeatmap.push({
      date:  d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: dayCount,
    });
  }
  return {
    totalRuns:      { current: totalRuns, prior: priorTotal },
    successRatePct: { current: successPct, prior: priorSuccessPct },
    avgDurationSec: { current: avgDur, prior: priorAvg },
    activeUsers:    { current: activeUsers, prior: priorUsers },
    peopleReached:  { current: peopleReachedCurrent, prior: peopleReachedPrior },
    series:         {
      labels,
      succeeded,
      failed,
      totalRuns:     totalRunsSeries,
      avgDuration:   avgDurationSeries,
      activeUsers:   activeUsersSeries,
      peopleReached: peopleReachedSeries,
      runsHeatmap,
    },
  };
}

function synthRecentRuns(workflow: Automation): RecentRun[] {
  const rnd = seeded(`${workflow.id}|runs`);
  const now = Date.now();
  const triggers = ['Scheduled trigger', `Manual run by ${workflow.owner.name}`, 'Webhook trigger', 'Manual run by Yizzy'];
  const out: RecentRun[] = [];
  for (let i = 0; i < 24; i++) {
    const hoursAgo = i * (1 + rnd() * 4);
    const r = rnd();
    const status: RecentRun['status'] =
      i === 0 && workflow.lastRunStatus === 'ongoing' ? 'running'
      : r < 0.08 ? 'failed'
      : 'success';
    out.push({
      id:           `${workflow.id}-run-${i}`,
      status,
      trigger:      triggers[Math.floor(rnd() * triggers.length)],
      startedAt:    new Date(now - hoursAgo * 3600_000).toISOString(),
      durationSec:  Math.round(20 + rnd() * 180),
    });
  }
  return out;
}

function synthRecentEdits(workflow: Automation): RecentEdit[] {
  const rnd = seeded(`${workflow.id}|edits`);
  const now = Date.now();
  const sentences = [
    `${workflow.owner.name} renamed the workflow`,
    `${workflow.owner.name} added step "Send notification"`,
    `${workflow.owner.name} updated the trigger schedule`,
    `${workflow.owner.name} adjusted condition thresholds`,
    `${workflow.owner.name} removed step "Tag user"`,
    `${workflow.owner.name} updated the welcome message`,
  ];
  const out: RecentEdit[] = [];
  for (let i = 0; i < 16; i++) {
    const daysAgo = i * (0.4 + rnd() * 1.2);
    out.push({
      id:         `${workflow.id}-edit-${i}`,
      authorName: workflow.owner.name,
      summary:    sentences[Math.floor(rnd() * sentences.length)],
      at:         new Date(now - daysAgo * 86_400_000).toISOString(),
    });
  }
  return out;
}

/** Replace this with the real workflow detail fetcher. Today returns a
 *  synthesised detail blob from the Manage page mock so the page can be
 *  developed end-to-end without backend wiring. */
function useWorkflowDetail(id: string | undefined): WorkflowDetail | null {
  return useMemo(() => {
    if (!id) return null;
    const workflow = MOCK_AUTOMATIONS.find(a => a.id === id);
    if (!workflow) return null;
    return {
      workflow,
      schedule: {
        triggerLabel: workflow.trigger,
        frequency:    workflow.lastRunStatus === 'ongoing' ? 'Continuous' : 'On trigger',
      },
      integrations: [
        { id: 'tb-core', name: 'Teambridge Core' },
        { id: 'slack',   name: 'Slack' },
        { id: 'sendgrid',name: 'SendGrid' },
      ].slice(0, 1 + Math.abs(id.length % 3)),
      permissions: {
        editors: [
          { name: workflow.owner.name },
          { name: 'Yizzy' },
        ],
        runners: [
          { name: workflow.owner.name },
          { name: 'Yizzy' },
          { name: 'Operations team' },
        ],
      },
      metrics: {
        '24h': synthMetrics(workflow, '24h'),
        '7d':  synthMetrics(workflow, '7d'),
        '30d': synthMetrics(workflow, '30d'),
        'all': synthMetrics(workflow, 'all'),
      },
      recentRuns:  synthRecentRuns(workflow),
      recentEdits: synthRecentEdits(workflow),
    };
  }, [id]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]!.toUpperCase())
    .join('');
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const WORKFLOW_STATUS_TAG: Record<AutomationStatus, { status: StatusTagStatus; label: string }> = {
  active: { status: 'success', label: 'Active' },
  paused: { status: 'warning', label: 'Paused' },
  draft:  { status: 'neutral', label: 'Draft'  },
};

/** ActivityHeatMap level ramps — five-stop colour stacks built from
 *  semantic Alloy hue tokens. Index 0 is the empty-cell track; 1–4
 *  step from a soft tertiary tint up to the hue's strong border, so
 *  the heat reads consistently across light / dark mode without any
 *  raw palette refs. */
const HEATMAP_LEVELS_BLUE: [string, string, string, string, string] = [
  'var(--color-bg-tertiary)',
  'var(--color-blue-bg-tertiary)',
  'var(--color-blue-bg-secondary)',
  'var(--color-blue-content-tertiary)',
  'var(--color-blue-content-secondary)',
];

const RUN_STATUS_TAG: Record<RecentRun['status'], { status: StatusTagStatus; label: string }> = {
  success: { status: 'success', label: 'Succeeded' },
  failed:  { status: 'error',   label: 'Failed'    },
  running: { status: 'info',    label: 'Running'   },
};

/** Number formatter — same compact treatment as the Usage page. */
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

interface ChangeProps {
  current:          number;
  prior:            number;
  /** When true, an increase reads as negative (e.g. average duration). */
  invertDirection?: boolean;
}

/** Inline change badge using ValueChangeLabel — mirrors the Usage page treatment. */
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

// ─── Component ────────────────────────────────────────────────────────────────

/** Truncate the summary at this word count when collapsed. Past the
 *  threshold, the rendered text caps at this many words and ends with
 *  an inline `…More` toggle. */
const SUMMARY_WORD_THRESHOLD = 25;

function splitWords(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

export function AutomationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useWorkflowDetail(id);

  const [usageRange, setUsageRange]     = useState<UsageRange>('30d');
  const [activityTab, setActivityTab]   = useState<'runs' | 'edits'>('runs');
  const [summaryOpen, setSummaryOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 8;

  if (!detail) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>
          Workflow not found.{' '}
          <button
            type="button"
            className={styles.notFoundLink}
            onClick={() => navigate('/automations')}
          >
            Back to workflows
          </button>
        </p>
      </div>
    );
  }

  const { workflow, schedule, integrations, permissions, metrics, recentRuns, recentEdits } = detail;
  const usage = metrics[usageRange];
  const statusTag = WORKFLOW_STATUS_TAG[workflow.status];

  const dotsMenuGroups: DropdownMenuGroup[] = [
    {
      id: 'workflow-meta',
      options: [
        {
          id: 'settings',
          label: 'Settings',
          leadingSlot: <SettingsGearIcon size={14} />,
          onClick: () => setSettingsOpen(true),
        },
      ],
    },
    {
      id: 'workflow-actions',
      options: [
        { id: 'duplicate', label: 'Duplicate', leadingSlot: <Copy01Icon size={14} /> },
        { id: 'archive',   label: 'Archive',   leadingSlot: <ArchiveIcon size={14} /> },
        { id: 'delete',    label: 'Delete',    leadingSlot: <Trash03Icon size={14} />, destructive: true },
      ],
    },
  ];

  // Activity feed pagination — drives whichever tab is active.
  const activeList: (RecentRun | RecentEdit)[] = activityTab === 'runs' ? recentRuns : recentEdits;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageStart  = (page - 1) * PAGE_SIZE;
  const pageItems  = activeList.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className={styles.page}>
      {/* ── Page header ──────────────────────────────────────────────────
            The Workflows > {name} breadcrumb is rendered by the AppShell
            top bar, so the page header skips straight to the title row. */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleStack}>
            <h1 className={styles.title}>{workflow.name}</h1>
            <div className={styles.metaRow}>
              <StatusTag size="sm" status={statusTag.status}>{statusTag.label}</StatusTag>
              <span className={styles.metaSep} aria-hidden>·</span>
              <span className={styles.ownerWrap}>
                <span className={styles.avatar} aria-hidden>{initialsOf(workflow.owner.name)}</span>
                <span className={styles.ownerName}>{workflow.owner.name}</span>
              </span>
              <span className={styles.metaSep} aria-hidden>·</span>
              <span className={styles.lastEdited}>
                Last edited {fmtRelative(workflow.updatedAt)}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="sm" aria-label="More actions">
                  <DotsHorizontalIcon size={16} />
                </Button>
              }
              groups={dotsMenuGroups}
              placement="bottom-end"
            />
            <Button variant="primary" size="sm" leadingArtwork={<Edit03Icon size={14} />} onClick={() => navigate(`/automations/${workflow.id}/edit`)}>
              Edit workflow
            </Button>
          </div>
        </div>

        {/* Summary paragraph — truncated at SUMMARY_WORD_THRESHOLD with an
              inline `…More` / `…Less` toggle when the description exceeds
              the threshold. The toggle text is underlined and renders in
              the link colour so it reads as an inline action. */}
        {workflow.description && (() => {
          const words = splitWords(workflow.description);
          const isLong = words.length > SUMMARY_WORD_THRESHOLD;
          const visible = !isLong || summaryOpen
            ? workflow.description
            : `${words.slice(0, SUMMARY_WORD_THRESHOLD).join(' ')}…`;
          return (
            <p className={styles.summary}>
              {visible}
              {isLong && (
                <>
                  {' '}
                  <button
                    type="button"
                    className={styles.summaryInlineToggle}
                    onClick={() => setSummaryOpen(v => !v)}
                    aria-expanded={summaryOpen}
                  >
                    {summaryOpen ? 'Less' : 'More'}
                  </button>
                </>
              )}
            </p>
          );
        })()}

        {/* Identifier strip */}
        <div className={styles.identifierStrip}>
          <div className={styles.identifierItem}>
            <Eyebrow>Identifier</Eyebrow>
            <span className={styles.identifierValueMono}>{workflow.id}</span>
          </div>
          <div className={styles.identifierItem}>
            <Eyebrow>Created</Eyebrow>
            <span className={styles.identifierValue}>{fmtDate(workflow.createdAt)}</span>
          </div>
        </div>

        <Divider />
      </header>

      {/* ── Body — 2-column grid (desktop) ────────────────────────────── */}
      <div className={styles.body}>
        <div className={styles.bodyMain}>
          {/* ── Usage ─────────────────────────────────────────────── */}
          <section className={styles.section} aria-label="Usage">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Usage</h2>
              <SegmentedControl
                size="sm"
                value={usageRange}
                onChange={v => setUsageRange(v as UsageRange)}
              >
                <SegmentedControl.Item value="all">All</SegmentedControl.Item>
                <SegmentedControl.Item value="24h">24h</SegmentedControl.Item>
                <SegmentedControl.Item value="7d">7d</SegmentedControl.Item>
                <SegmentedControl.Item value="30d">30d</SegmentedControl.Item>
              </SegmentedControl>
            </div>

            {/* Top metric row — sparkline tiles. Total runs (heatmap)
                  moved to the chart row below, paired with Success rate. */}
            <div className={styles.metricRow}>
              <MetricCard
                title="Avg duration"
                subtitle={`Per run — ${
                  usageRange === '24h' ? 'past 24 hours' :
                  usageRange === '7d'  ? 'past 7 days'   :
                  usageRange === '30d' ? 'past 30 days'  :
                                         'all time'
                }`}
                value={fmtDuration(usage.avgDurationSec.current)}
                change={<Change current={usage.avgDurationSec.current} prior={usage.avgDurationSec.prior} invertDirection />}
                chart={
                  <Sparkline
                    values={usage.series.avgDuration}
                    color="var(--color-content-secondary)"
                  />
                }
              />
              <MetricCard
                title="Active users"
                subtitle={`Distinct users — ${
                  usageRange === '24h' ? 'past 24 hours' :
                  usageRange === '7d'  ? 'past 7 days'   :
                  usageRange === '30d' ? 'past 30 days'  :
                                         'all time'
                }`}
                value={fmtNum(usage.activeUsers.current)}
                change={<Change current={usage.activeUsers.current} prior={usage.activeUsers.prior} />}
                chart={
                  <Sparkline
                    values={usage.series.activeUsers}
                    color="var(--color-purple-content-secondary)"
                  />
                }
              />
            </div>

            {/* Chart row — Success rate ratio bar paired with the
                  Total runs heatmap (which moved out of the top
                  sparkline row to live alongside the ratio chart). */}
            <div className={styles.chartRow}>
            {(() => {
              const succTotal = usage.series.succeeded.reduce((s, v) => s + v, 0);
              const failTotal = usage.series.failed.reduce((s, v) => s + v, 0);
              const total     = succTotal + failTotal;
              const succPct   = total > 0 ? (succTotal / total) * 100 : 0;
              const failPct   = 100 - succPct;
              return (
                <ChartCard
                  title="Success rate"
                  subtitle={`Succeeded vs. failed — ${
                    usageRange === '24h' ? 'past 24 hours' :
                    usageRange === '7d'  ? 'past 7 days'   :
                    usageRange === '30d' ? 'past 30 days'  :
                                           'all time'
                  }`}
                >
                  <div className={styles.successRateChartBody}>
                    <div className={styles.successRateHero}>
                      <span className={styles.successRateValue}>
                        {Math.round(usage.successRatePct.current)}%
                      </span>
                      <Change
                        current={usage.successRatePct.current}
                        prior={usage.successRatePct.prior}
                      />
                    </div>

                    {/* Alloy's official RatioBar — gives us the gap +
                          2px-radius segment treatment for free. `flat`
                          drops the dim/emphasized opacity dance so both
                          segments render at full saturation. */}
                    <RatioBar
                      flat
                      segments={[
                        { label: 'Succeeded', value: succTotal, color: 'var(--color-success-fill)' },
                        // Failed segment renders in slate so the bar reads
                        // as a calm proportion view rather than alarming
                        // the user with a red wash whenever any failures
                        // exist. The success/failure split is still
                        // unambiguous via the green Succeeded segment +
                        // legend labels below.
                        { label: 'Failed',    value: failTotal, color: 'var(--Alloy-slate-400)' },
                      ]}
                      ariaLabel={`${succTotal.toLocaleString()} succeeded, ${failTotal.toLocaleString()} failed`}
                    />

                  </div>
                </ChartCard>
              );
            })()}

            {/* Total runs — uses the Success rate card's top-bottom
                layout (title + hero value over the chart) so the
                heatmap reads as a true backdrop instead of a
                squeezed inline panel. Mirrors `successRateChartBody`. */}
            <ChartCard
              title="Total runs"
              subtitle={`Runs — ${
                usageRange === '24h' ? 'past 24 hours' :
                usageRange === '7d'  ? 'past 7 days'   :
                usageRange === '30d' ? 'past 30 days'  :
                                       'all time'
              }`}
            >
              <div className={styles.successRateChartBody}>
                <div className={styles.successRateHero}>
                  <span className={styles.successRateValue}>
                    {fmtNum(usage.totalRuns.current)}
                  </span>
                  <Change
                    current={usage.totalRuns.current}
                    prior={usage.totalRuns.prior}
                  />
                </div>
                <ActivityHeatMap
                  days={usage.series.runsHeatmap}
                  levelColors={HEATMAP_LEVELS_BLUE}
                />
              </div>
            </ChartCard>
            </div>

            {/* People reached — full-width BarChart card. Bars carry
                the Alloy purple hue so the row visually pairs with the
                Active users sparkline above (same series concept,
                rolled up across the period). */}
            <ChartCard
              title="People reached"
              subtitle={`Distinct people acted on — ${
                usageRange === '24h' ? 'past 24 hours' :
                usageRange === '7d'  ? 'past 7 days'   :
                usageRange === '30d' ? 'past 30 days'  :
                                       'all time'
              }`}
            >
              <div className={styles.peopleReachedBody}>
                <div className={styles.successRateHero}>
                  <span className={styles.successRateValue}>
                    {fmtNum(usage.peopleReached.current)}
                  </span>
                  <Change
                    current={usage.peopleReached.current}
                    prior={usage.peopleReached.prior}
                  />
                </div>
                <BarChart
                  variant="gradient"
                  height={160}
                  showLegend={false}
                  labels={usage.series.labels}
                  series={[
                    {
                      label: 'People reached',
                      data:  usage.series.peopleReached,
                      // Alloy doesn't ship a semantic mid-blue between
                      // bg-secondary (#1969FE / 500) and content-tertiary
                      // (#1969FE / 500), so we drop down to the raw
                      // palette here — `--Alloy-blue-400` for the cap
                      // line and `--Alloy-blue-300` for the gradient
                      // floor land in the saturation range the design
                      // wants. Matches Alloy's own DEFAULT_PALETTE which
                      // also references --Alloy-* directly.
                      color: 'var(--Alloy-blue-400)',
                    },
                  ]}
                  gradientFrom="var(--Alloy-blue-400)"
                  gradientTo="var(--Alloy-blue-300)"
                  formatTooltipValue={(v) => fmtNum(v)}
                />
              </div>
            </ChartCard>

          </section>

          {/* ── Activity ──────────────────────────────────────────── */}
          <section className={styles.section} aria-label="Activities">
            <h2 className={styles.sectionHeading}>Activities</h2>
            <Tabs
              variant="underline"
              value={activityTab}
              onChange={v => { setActivityTab(v as 'runs' | 'edits'); setPage(1); }}
            >
              <Tabs.Tab value="runs">Runs</Tabs.Tab>
              <Tabs.Tab value="edits">Edits</Tabs.Tab>
            </Tabs>

            {/* Activity table — same column shape as the AI Specialist
                page in TeambridgeCode (Time → context → action → outcome).
                For Runs: Time → Trigger → Duration → Status. For Edits:
                Time → Editor → Activity. We pre-format absolute
                timestamps for the row title-tooltip so hovering surfaces
                the exact time without taking extra column space. */}
            <div className={styles.activityTableWrap}>
              <Table size="sm">
                <TableHeader>
                  {activityTab === 'runs' ? (
                    <TableRow hoverable={false}>
                      <TableHead>Time</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead align="right">Status</TableHead>
                    </TableRow>
                  ) : (
                    <TableRow hoverable={false}>
                      <TableHead>Time</TableHead>
                      <TableHead>Editor</TableHead>
                      <TableHead>Activity</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {activityTab === 'runs' ? (
                    pageItems.map(item => {
                      const r = item as RecentRun;
                      const tag = RUN_STATUS_TAG[r.status];
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <CellText
                              variant="secondary"
                              title={new Date(r.startedAt).toLocaleString()}
                            >
                              {fmtRelative(r.startedAt)}
                            </CellText>
                          </TableCell>
                          <TableCell>
                            <CellText>{r.trigger}</CellText>
                          </TableCell>
                          <TableCell>
                            <CellText variant="secondary">
                              {fmtDuration(r.durationSec)}
                            </CellText>
                          </TableCell>
                          <TableCell align="right">
                            <CellStatusTag status={tag.status}>
                              {tag.label}
                            </CellStatusTag>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    pageItems.map(item => {
                      const e = item as RecentEdit;
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <CellText
                              variant="secondary"
                              title={new Date(e.at).toLocaleString()}
                            >
                              {fmtRelative(e.at)}
                            </CellText>
                          </TableCell>
                          <TableCell>
                            <div className={styles.editorCell}>
                              <span className={styles.avatarSm} aria-hidden>
                                {initialsOf(e.authorName)}
                              </span>
                              <CellText>{e.authorName}</CellText>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CellText wrap>{e.summary}</CellText>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalCount={activeList.length}
                rowsPerPage={PAGE_SIZE}
              />
            )}
          </section>

        </div>

        {/* Settings dialog — opened from the dots menu in the page header.
             Hosts the Trigger / Integrations / Permissions / Advanced
             groups that previously sat inline in the left column. */}
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          size="md"
          aria-label="Workflow settings"
        >
          <DialogHeader onClose={() => setSettingsOpen(false)}>Settings</DialogHeader>
          <DialogContent>
            <div className={styles.settingsDialogBody}>
              <div className={styles.settingsGroup}>
                <Eyebrow>Trigger</Eyebrow>
                <ListItem
                  size="md"
                  label="Schedule"
                  description={`${schedule.triggerLabel} · ${schedule.frequency}`}
                  leadingSlot={<span className={styles.settingIconBox} aria-hidden><PlayIcon size={14} /></span>}
                  trailingAction="chevron"
                />
              </div>

              <Divider />

              <div className={styles.settingsGroup}>
                <Eyebrow>Integrations</Eyebrow>
                <ListItem
                  size="md"
                  label="Connected services"
                  description={
                    integrations.length === 0 ? 'No services connected'
                      : `${integrations.length} connected · ${integrations.slice(0, 3).map(i => i.name).join(', ')}`
                  }
                  leadingSlot={<span className={styles.settingIconBox} aria-hidden><PuzzlePiece01Icon size={14} /></span>}
                  trailingAction="chevron"
                />
              </div>

              <Divider />

              <div className={styles.settingsGroup}>
                <Eyebrow>Permissions</Eyebrow>
                <ListItem
                  size="md"
                  label="Editor access"
                  description={
                    <span className={styles.permissionRow}>
                      {`${permissions.editors.length} editors`}
                      <span className={styles.avatarStack} aria-hidden>
                        {permissions.editors.slice(0, 4).map((u, i) => (
                          <span key={i} className={styles.avatarSm}>{initialsOf(u.name)}</span>
                        ))}
                      </span>
                    </span>
                  }
                  leadingSlot={<span className={styles.settingIconBox} aria-hidden><Edit03Icon size={14} /></span>}
                  trailingAction="chevron"
                />
                <ListItem
                  size="md"
                  label="Runner access"
                  description={
                    <span className={styles.permissionRow}>
                      {`${permissions.runners.length} runners`}
                      <span className={styles.avatarStack} aria-hidden>
                        {permissions.runners.slice(0, 4).map((u, i) => (
                          <span key={i} className={styles.avatarSm}>{initialsOf(u.name)}</span>
                        ))}
                      </span>
                    </span>
                  }
                  leadingSlot={<span className={styles.settingIconBox} aria-hidden><LogIn01Icon size={14} /></span>}
                  trailingAction="chevron"
                />
              </div>

              <Divider />

              <div className={styles.settingsGroup}>
                <Eyebrow>Advanced</Eyebrow>
                <ListItem
                  size="md"
                  label="Workflow settings"
                  description="Notifications, error handling, retry policy"
                  leadingSlot={<span className={styles.settingIconBox} aria-hidden><SettingsGearIcon size={14} /></span>}
                  trailingAction="chevron"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricCardProps {
  title:    string;
  subtitle: string;
  value:    string;
  change?:  React.ReactNode;
  /** Chart slot — caller decides between Sparkline, ActivityHeatMap,
   *  or any other Alloy chart primitive that fits the card body. */
  chart:    React.ReactNode;
}

/** Top-row metric tile — wraps an Alloy ChartCard with a 2-column body
 *  so the title/subtitle and hero value stack on the left and the
 *  sparkline (or any other chart slot) fills the right side. Bypasses
 *  ChartCard's automatic header so the heading sits on the left of
 *  the row alongside the hero value, instead of running across the
 *  top of the card and forcing the chart below. Title / subtitle
 *  typography mirrors Alloy's ChartCard tokens (text-sm medium /
 *  text-xs tertiary). */
function MetricCard({ title, subtitle, value, change, chart }: MetricCardProps) {
  return (
    // Pass an empty title so ChartCard's required prop is satisfied;
    // the empty header is hidden by CSS (`.metricCardEmptyHeader`)
    // since rendering it would leave a blank H3 above our custom
    // 2-column body.
    <ChartCard title="" className={styles.metricCardEmptyHeader}>
      <div className={styles.metricCardBody}>
        <div className={styles.metricCardLeft}>
          <h3 className={styles.metricCardTitle}>{title}</h3>
          <p className={styles.metricCardSubtitle}>{subtitle}</p>
          <div className={styles.successRateHero}>
            <span className={styles.successRateValue}>{value}</span>
            {change}
          </div>
        </div>
        <div className={styles.metricCardRight}>{chart}</div>
      </div>
    </ChartCard>
  );
}

interface SparklineProps {
  values: number[];
  /** Stroke colour — semantic token via inline style on the wrapper. */
  color:  string;
}

/** Minimal SVG sparkline — single smooth path, no axes, no tooltip,
 *  no fill. Stretches to fill its container via
 *  `preserveAspectRatio="none"` plus `vectorEffect="non-scaling-stroke"`
 *  so the stroke stays a constant 1.5px regardless of width. */
function Sparkline({ values, color }: SparklineProps) {
  const VW = 100;
  const VH = 32;
  const PAD = 2;
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points: [number, number][] = values.map((v, i) => {
    const x = values.length === 1 ? VW / 2 : (i / (values.length - 1)) * VW;
    const y = VH - PAD - ((v - min) / range) * (VH - PAD * 2);
    return [x, y];
  });
  // Higher tension → fatter Bezier control handles → smoother (more
  // rounded) curve through each datapoint. 0.55 reads as a soft
  // sweep without compromising the position of the underlying
  // values; 0.35 was visibly bumpy at the source vertices.
  const tension = 0.55;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const dx = (x1 - x0) * tension;
    d += ` C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
  }
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend"
      style={{ color }}
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}


