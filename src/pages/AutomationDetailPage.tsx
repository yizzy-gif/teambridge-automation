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
import { BarChart } from '@alloy/components/Charts/BarChart';
import { RatioBar } from '@alloy/components/Charts/RatioBar';
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
import { AI_PERSONAS } from '@/features/ai/personas';
import styles from './AutomationDetailPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageRange = 'all' | '24h' | '7d' | '30d';

/** Action-type taxonomy surfaced in the "Actions Taken" filterable
 *  chart. Mirrors the action-node library on the canvas. Swap to a
 *  real classification once runs emit per-action telemetry. */
export type ActionTypeKey =
  | 'email'
  | 'assign_group'
  | 'create_record'
  | 'report'
  | 'chat_message';

export const ACTION_TYPE_KEYS: ActionTypeKey[] = [
  'email',
  'assign_group',
  'create_record',
  'report',
  'chat_message',
];

export const ACTION_TYPE_LABELS: Record<ActionTypeKey, string> = {
  email:         'Email',
  assign_group:  'Assign group',
  create_record: 'Create record',
  report:        'Report',
  chat_message:  'Chat message',
};

/** Stack colours per action type — semantic Alloy hue tokens so each
 *  segment reads as a distinct, named action category. */
export const ACTION_TYPE_COLORS: Record<ActionTypeKey, string> = {
  email:         'var(--Alloy-blue-500)',
  assign_group:  'var(--Alloy-green-500)',
  create_record: 'var(--Alloy-purple-500)',
  report:        'var(--Alloy-orange-500)',
  chat_message:  'var(--Alloy-pink-500)',
};

interface UsageMetrics {
  totalTriggered:       { current: number; prior: number };
  totalActive:          { current: number; prior: number };
  totalCompleted:       { current: number; prior: number };
  actionsTaken:         { current: number; prior: number };
  specialistsActivated: { current: number; prior: number };
  /** Per-bucket time series — every metric tile + chart pulls a
   *  parallel array from here so the visualisations track the same
   *  bucket cadence as the period totals. */
  series: {
    labels:        string[];
    triggered:     number[];
    active:        number[];
    completed:     number[];
    /** Stacked-bar inputs — one parallel array per action type. */
    actionsByType: Record<ActionTypeKey, number[]>;
    /** Total activations per persona id (used by the horizontal
     *  Specialists Activated chart). Personas with zero activations
     *  in the period are still keyed (count = 0) so the chart can
     *  optionally surface idle specialists. */
    activationsByPersona: Record<string, number>;
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
  // Daily trigger baseline scales off the workflow's lifetime total.
  const dailyBaseline = Math.max(2, workflow.runsTotal / 30);
  const rangeFactor = range === '24h' ? 0.04
                    : range === '7d'  ? 0.25
                    : range === '30d' ? 1.0
                                      : 1.5;
  const baseline = Math.max(2, Math.round(dailyBaseline * rangeFactor));

  // Active-rate (currently in-progress) and completion-rate are stable
  // per workflow id so the trend reads consistently across re-renders.
  // Active sits ~5–18% of triggered (workflows with long-running steps
  // skew higher); completed claims the rest after a small fail/abandon
  // slice (1–4%).
  const activeRate    = 0.05 + seeded(`${workflow.id}|active`)()    * 0.13;
  const failRate      = 0.01 + seeded(`${workflow.id}|fail`)()      * 0.03;

  const labels: string[] = [];
  const triggered: number[] = [];
  const active:    number[] = [];
  const completed: number[] = [];
  let totalTriggered = 0;
  let totalActive    = 0;
  let totalCompleted = 0;

  // Per-action-type per-bucket weights — different workflows lean on
  // different action mixes, so each type's weight is keyed off the
  // workflow id so the stacked chart varies between rows. Weights are
  // normalised below into a unit distribution per bucket.
  const actionWeights: Record<ActionTypeKey, number> = {
    email:         0.5 + seeded(`${workflow.id}|w-email`)()    * 0.8,
    assign_group:  0.3 + seeded(`${workflow.id}|w-assign`)()   * 0.7,
    create_record: 0.4 + seeded(`${workflow.id}|w-create`)()   * 0.7,
    report:        0.2 + seeded(`${workflow.id}|w-report`)()   * 0.5,
    chat_message:  0.3 + seeded(`${workflow.id}|w-chat`)()     * 0.7,
  };
  const weightSum = ACTION_TYPE_KEYS.reduce((s, k) => s + actionWeights[k], 0);

  // Each triggered run averages 2.5 actions (range 1–4 across types).
  const actionsPerRun = 2.5;

  const actionsByType: Record<ActionTypeKey, number[]> = {
    email:         [],
    assign_group:  [],
    create_record: [],
    report:        [],
    chat_message:  [],
  };
  let totalActionsTaken = 0;

  for (let i = 0; i < count; i++) {
    labels.push(labelFor(i));
    // Triggered count for this bucket, with some natural jitter.
    const t = Math.max(1, Math.round(baseline * (0.7 + rnd() * 0.6)));
    triggered.push(t);
    totalTriggered += t;

    // Active = currently in-progress at bucket close. Some buckets
    // have zero active when nothing's mid-flight.
    const a = Math.max(0, Math.round(t * activeRate * (0.5 + rnd() * 1.5)));
    active.push(a);
    totalActive += a;

    // Completed = finished successfully (triggered − active − failed).
    const f = Math.max(0, Math.round(t * failRate));
    const c = Math.max(0, t - a - f);
    completed.push(c);
    totalCompleted += c;

    // Actions for this bucket — distribute the bucket-total across
    // action types using the workflow's weight distribution + small
    // jitter so the stacked bar segments don't sit at identical
    // proportions every period.
    const bucketActions = Math.max(0, Math.round(t * actionsPerRun));
    for (const k of ACTION_TYPE_KEYS) {
      const weight = actionWeights[k] / weightSum;
      const v = Math.max(0, Math.round(bucketActions * weight * (0.7 + rnd() * 0.6)));
      actionsByType[k].push(v);
      totalActionsTaken += v;
    }
  }

  // Specialists activated — total persona invocations across the
  // period. Weighted so each persona shows distinct usage; total
  // sits in the 30–110% range of triggered runs (some triggers
  // activate multiple specialists, others none).
  const activationsByPersona: Record<string, number> = {};
  let totalSpecialistsActivated = 0;
  for (const p of AI_PERSONAS) {
    const personaWeight = 0.05 + seeded(`${workflow.id}|p-${p.id}`)() * 0.35;
    const c = Math.max(0, Math.round(totalTriggered * personaWeight));
    activationsByPersona[p.id] = c;
    totalSpecialistsActivated += c;
  }

  // Prior-period totals — sit a little below current so the trend
  // delta has a non-zero direction more often than not.
  const triggeredPrior   = Math.max(1, Math.round(totalTriggered    * (0.85 + rnd() * 0.3)));
  const activePrior      = Math.max(0, Math.round(totalActive       * (0.7  + rnd() * 0.6)));
  const completedPrior   = Math.max(1, Math.round(totalCompleted    * (0.85 + rnd() * 0.3)));
  const actionsPrior     = Math.max(1, Math.round(totalActionsTaken * (0.85 + rnd() * 0.3)));
  const specialistsPrior = Math.max(0, Math.round(totalSpecialistsActivated * (0.8 + rnd() * 0.4)));

  return {
    totalTriggered:       { current: totalTriggered,           prior: triggeredPrior   },
    totalActive:          { current: totalActive,              prior: activePrior      },
    totalCompleted:       { current: totalCompleted,           prior: completedPrior   },
    actionsTaken:         { current: totalActionsTaken,        prior: actionsPrior     },
    specialistsActivated: { current: totalSpecialistsActivated, prior: specialistsPrior },
    series:               {
      labels,
      triggered,
      active,
      completed,
      actionsByType,
      activationsByPersona,
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
  draft:    { status: 'neutral', label: 'Draft'    },
  live:     { status: 'success', label: 'Live'     },
  archived: { status: 'warning', label: 'Archived' },
};

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
  const [actionTypeFilter, setActionTypeFilter] = useState<Set<ActionTypeKey>>(
    () => new Set(ACTION_TYPE_KEYS),
  );
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

            {(() => {
              const rangeLabel =
                usageRange === '24h' ? 'past 24 hours' :
                usageRange === '7d'  ? 'past 7 days'   :
                usageRange === '30d' ? 'past 30 days'  :
                                       'all time';
              return (
                <>
                  {/* Top metric row — Triggered / Active / Completed.
                      Compact tiles with title + hero value, no inline
                      chart so the row reads as a clean KPI strip. */}
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

                  {/* Actions Taken — stacked BarChart with a filter pill
                      row that toggles which action types are visible.
                      Each segment carries the action type's semantic
                      colour so the stack reads as a named breakdown. */}
                  <ChartCard
                    title="Actions taken"
                    subtitle={`Actions executed by type — ${rangeLabel}`}
                  >
                    <div className={styles.peopleReachedBody}>
                      <div className={styles.successRateHero}>
                        <span className={styles.successRateValue}>
                          {fmtNum(usage.actionsTaken.current)}
                        </span>
                        <Change
                          current={usage.actionsTaken.current}
                          prior={usage.actionsTaken.prior}
                        />
                      </div>

                      {/* Filter pills — toggle each action type in/out
                          of the stacked bar. At least one type stays
                          on so the chart never empties out. */}
                      <div className={styles.actionFilterRow} role="group" aria-label="Filter actions by type">
                        {ACTION_TYPE_KEYS.map(key => {
                          const active = actionTypeFilter.has(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={styles.actionFilterPill}
                              data-active={active ? 'true' : 'false'}
                              onClick={() => {
                                setActionTypeFilter(prev => {
                                  const next = new Set(prev);
                                  if (next.has(key)) {
                                    if (next.size > 1) next.delete(key);
                                  } else {
                                    next.add(key);
                                  }
                                  return next;
                                });
                              }}
                              aria-pressed={active}
                            >
                              <span
                                className={styles.actionFilterDot}
                                style={{ background: ACTION_TYPE_COLORS[key] }}
                                aria-hidden
                              />
                              {ACTION_TYPE_LABELS[key]}
                            </button>
                          );
                        })}
                      </div>

                      <BarChart
                        variant="stacked"
                        height={200}
                        showLegend={false}
                        labels={usage.series.labels}
                        series={ACTION_TYPE_KEYS
                          .filter(k => actionTypeFilter.has(k))
                          .map(k => ({
                            label: ACTION_TYPE_LABELS[k],
                            data:  usage.series.actionsByType[k],
                            color: ACTION_TYPE_COLORS[k],
                          }))}
                        formatTooltipValue={(v) => fmtNum(v)}
                      />
                    </div>
                  </ChartCard>

                  {/* Specialists Activated — RatioBar with one segment
                      per persona. `aiGradient` paints each segment as a
                      slice of the purple→blue AI gradient so the bar
                      reads as one continuous brand ramp; `showLegend`
                      surfaces the persona / count breakdown beneath. */}
                  <ChartCard
                    title="Specialists activated"
                    subtitle={`AI persona invocations — ${rangeLabel}`}
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
                      <RatioBar
                        aiGradient
                        height={32}
                        segments={AI_PERSONAS.map(p => ({
                          label: p.name,
                          value: usage.series.activationsByPersona[p.id] ?? 0,
                        }))}
                        ariaLabel={`Specialist activations: ${
                          AI_PERSONAS
                            .map(p => `${p.name} ${usage.series.activationsByPersona[p.id] ?? 0}`)
                            .join(', ')
                        }`}
                      />
                    </div>
                  </ChartCard>
                </>
              );
            })()}

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
  /** Optional chart slot — when omitted, the card renders just the
   *  title / subtitle / hero-value column without a right-side chart. */
  chart?:   React.ReactNode;
}

/** Top-row metric tile — wraps an Alloy ChartCard with the title /
 *  subtitle / hero-value column on the left. When a `chart` prop is
 *  passed, a second column hosts the chart slot. Bypasses ChartCard's
 *  automatic header so the heading sits inside the body. Title /
 *  subtitle typography mirrors Alloy's ChartCard tokens (text-sm
 *  medium / text-xs tertiary). */
function MetricCard({ title, subtitle, value, change, chart }: MetricCardProps) {
  return (
    // Pass an empty title so ChartCard's required prop is satisfied;
    // the empty header is hidden by CSS (`.metricCardEmptyHeader`)
    // since rendering it would leave a blank H3 above our custom body.
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
        {chart && <div className={styles.metricCardRight}>{chart}</div>}
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


