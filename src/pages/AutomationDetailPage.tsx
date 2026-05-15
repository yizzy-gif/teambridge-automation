// Read-only workflow detail page. Mirrors the Manage card's data shape +
// adds usage metrics, an activity feed (Runs / Edits), and a settings
// summary. The right column hosts a workflow preview placeholder that
// will be replaced once the read-only FlowCanvas extraction lands —
// see `extract-readonly-flow-canvas` follow-up task. The Edit-workflow
// CTA navigates into the builder at `/automations/:id/edit`.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '@alloy/components/icons/ChevronRightIcon';
import { ZapIcon } from '@alloy/components/icons/ZapIcon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { MessageDotsSquareIcon } from '@alloy/components/icons/MessageDotsSquareIcon';
import {
  MOCK_AUTOMATIONS,
  type Automation,
  type AutomationStatus,
  type ActionIconKey,
} from './AutomationsPage';
import { Mail01Icon as MailIcon } from '@alloy/components/icons/Mail01Icon';
import { Bell01Icon } from '@alloy/components/icons/Bell01Icon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { MessageNotificationCircleIcon } from '@alloy/components/icons/MessageNotificationCircleIcon';
import { RefreshCw04Icon } from '@alloy/components/icons/RefreshCw04Icon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { BankIcon } from '@alloy/components/icons/BankIcon';
import { PackageIcon } from '@alloy/components/icons/PackageIcon';
import { TeambridgeAIIcon } from '@alloy/components/icons/TeambridgeAIIcon';
import { AI_PERSONAS } from '@/features/ai/personas';
import styles from './AutomationDetailPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UsageRange = 'all' | '24h' | '7d' | '30d';

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

export interface UsageMetrics {
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
    /** Per-day per-persona invocation counts powering the
     *  Specialists Activated dot-heatmap calendar. Each entry is
     *  one calendar day; `total` is the sum of `byPersona` and
     *  drives the dot size, while `byPersona` feeds the per-cell
     *  hover tooltip. Walks back ~35 days so the heatmap always
     *  fills its 7-column × 5-row grid regardless of which range
     *  the user has selected. */
    activationsHeatmap: HeatmapDay[];
  };
}

/** One day in the Specialists Activated heatmap. */
export interface HeatmapDay {
  /** ISO date `YYYY-MM-DD` for the cell. */
  date:      string;
  /** Sum of `byPersona` for the day — drives dot size. */
  total:     number;
  /** Per-persona invocation count, keyed by `AiPersona.id`. */
  byPersona: Record<string, number>;
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

/** Per-node activity event — mirrors the Recent runs feed on the global
 *  Usage page but scoped to a specific node within this workflow.
 *  `nodeId` lets the row link back to the canvas/builder. */
type ActivityEventKind = 'email' | 'sms' | 'in_app' | 'edit' | 'node_action';
interface WorkflowActivityEvent {
  id:         string;
  kind:       ActivityEventKind;
  /** Display label for the row (e.g. workflow name, node label, editor). */
  primary:    string;
  /** Suffix appended after `primary` (e.g. "sent SMS message(s)"). */
  suffix:     string;
  /** ISO timestamp — drives the relative-time stamp + chronological sort. */
  at:         string;
  /** Optional node id — surfaced on `node_action` rows so the user can tie
   *  the activity back to a specific step. */
  nodeId?:    string;
  /** Optional recipient label shown in the expanded body. */
  recipient?: string;
  /** Optional body / payload shown in the expanded body. */
  body?:      string;
  /** Optional pointer to the action-icon palette so the row can render
   *  the workflow-specific icon instead of the generic kind icon. */
  iconKey?:   ActionIconKey;
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
  /** Unified per-node activity feed — runs, edits, and node-level
   *  actions merged + sorted reverse-chronologically. Drives the
   *  Activities section's Recent-runs-style list. */
  recentActivities: WorkflowActivityEvent[];
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

export function synthMetrics(workflow: Automation, range: UsageRange): UsageMetrics {
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

  // Per-day heatmap series — fixed 35-day window walking back from
  // today, with the window size driven by the selected segmented
  // time control: 24h / 7d collapse to a single week row, 30d
  // expands to 5 weeks, and `all` stretches across 12 weeks (~3
  // months) so the heatmap always reflects the period the user
  // is looking at. Each persona's daily count rolls a Bernoulli-ish
  // distribution from a workflow-stable weight × per-day jitter so
  // the dots ripple naturally instead of holding a uniform fill
  // across the grid. ~15% of days are forced to zero (idle days)
  // so the chart shows real silence alongside activity.
  const HEATMAP_DAYS_BY_RANGE: Record<UsageRange, number> = {
    '24h': 7,
    '7d':  7,
    '30d': 35,
    'all': 84,
  };
  const HEATMAP_DAYS = HEATMAP_DAYS_BY_RANGE[range];
  const hmRnd = seeded(`${workflow.id}|hm-specialists|${range}`);
  const today = new Date();
  const activationsHeatmap: HeatmapDay[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const r = hmRnd();
    const idleDay = r < 0.15;
    const byPersona: Record<string, number> = {};
    let dayTotal = 0;
    for (const p of AI_PERSONAS) {
      const wRoll = hmRnd();
      const personaBaseline =
        Math.max(1, Math.round((activationsByPersona[p.id] ?? 0) / HEATMAP_DAYS));
      const c = idleDay
        ? 0
        : Math.max(0, Math.round(personaBaseline * (0.4 + wRoll * 1.8)));
      byPersona[p.id] = c;
      dayTotal += c;
    }
    activationsHeatmap.push({
      date:  d.toISOString().slice(0, 10),
      total: dayTotal,
      byPersona,
    });
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
      activationsHeatmap,
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

/** Action-icon → activity template. Each workflow's `actionIcons` array
 *  is the source of truth for what action nodes the flow runs; the
 *  detail-page activity feed picks templates by the workflow's icons so
 *  the rows match the workflow's actual action surface (a notifications
 *  flow won't show "created record" rows, etc.). `kind` drives the
 *  leading icon + recipient label; `recipients` cycle so the feed reads
 *  varied rather than repeating the same recipient over and over. */
const ACTION_ICON_TEMPLATE: Record<ActionIconKey, {
  kind:        ActivityEventKind;
  /** Display label rendered as the action-type column primary value. */
  label:       string;
  /** Past-tense suffix for the secondary descriptor (e.g. "sent message"). */
  suffix:      string;
  /** Pool of plausible recipients — picked round-robin per row. */
  recipients:  string[];
  /** Pool of plausible message bodies — picked round-robin per row. */
  bodies:      string[];
}> = {
  mail: {
    kind:       'email',
    label:      'Send email',
    suffix:     'sent email(s)',
    recipients: ['jordan.lee@company.com', 'priya.shah@company.com', 'maya.lin@company.com', 'sam.chen@company.com'],
    bodies:     [
      'Subject: Welcome to the team — first day checklist\n\nHi Jordan,\n\nWelcome aboard! Before your first day on Monday, please complete the following so we can hit the ground running:\n\n  • Review and sign the attached offer letter\n  • Set up your Teambridge account at https://app.teambridge.com\n  • Pick a workstation preference (laptop / monitor / accessories)\n  • Confirm your start-time window with your manager\n\nIf anything looks off, reply to this thread and the People-ops team will help. We\'re excited to have you join us.\n\n— Onboarding bot',
      'Subject: Reminder — your shift starts soon\n\nHi Maya,\n\nThis is a friendly reminder that your shift starts at 8:00 AM tomorrow at the Mission Bay location. Please:\n\n  • Confirm you\'ve received this email by tapping the link below\n  • Bring your badge, water bottle, and updated availability sheet\n  • Arrive 10 minutes early for the brief stand-up\n\nConfirm shift: https://app.teambridge.com/shifts/confirm/SHF-9421\n\nReply STOP to opt out of shift reminders.',
      'Subject: Your contract is ending — offboarding next steps\n\nHi Priya,\n\nYour contract with Teambridge ends on Friday. To wrap things up cleanly, please complete the offboarding checklist below by end of day Wednesday:\n\n  1. Submit final timesheet through the Shifts app\n  2. Return company equipment via the prepaid shipping label\n  3. Confirm your forwarding address for the final paystub\n  4. Schedule a 15-minute exit interview with your manager\n\nThanks for everything you\'ve contributed — it\'s been a pleasure working with you.',
    ],
  },
  message: {
    kind:       'sms',
    label:      'Send SMS',
    suffix:     'sent SMS message(s)',
    recipients: ['Maya Lin', 'Jordan Lee', 'Priya Shah', 'Sam Chen'],
    bodies:     [
      'Teambridge: Reminder — your weekly timesheet is due today by 5pm. Tap to review your hours and approve: https://tb.app/ts/9421. Reply HELP for support, STOP to opt out.',
      'Teambridge: Your shift starts in 30 min at Mission Bay. Confirm you\'re on the way: https://tb.app/sh/3318. Need to swap? Reply SWAP and we\'ll find coverage.',
      'Teambridge: Please confirm your availability for next week (Mon–Sun). Open the app or reply with your preferred days. Replies after 8pm tonight may not be honored.',
    ],
  },
  bell: {
    kind:       'in_app',
    label:      'Send notification',
    suffix:     'sent in-app message(s)',
    recipients: ['Matched coverage pool', 'Operations channel', 'Onboarding cohort', 'Manager channel'],
    bodies:     [
      'Title: Shift available — Mission Bay, 8a–4p\n\nA shift matching your saved filters has just been released. Tap to view the details, claim it, or pass to the next eligible teammate. First confirmation gets the slot. Pool size: 12.',
      'Title: New applicant matches your filters\n\nAlex Park (3 yrs · barista · open weekends) just applied to your "Front-of-house openings" board. Review their profile and decide whether to advance them to a phone screen.',
      'Title: Compliance alert — policy update\n\nThe overtime threshold for the Mission Bay location was bumped from 38 to 42.5 hrs/wk effective today. Please re-review any open schedules and acknowledge the policy on the Compliance tab.',
    ],
  },
  task: {
    kind:       'node_action',
    label:      'Assign task',
    suffix:     'assigned task',
    recipients: ['Onboarding checklist · Maya Lin', 'Welcome packet · Jordan Lee', 'Equipment return · Priya Shah'],
    bodies:     [
      'Task assigned with default due date 7 days from now.',
      'Task assigned to the onboarding queue with priority Normal.',
      'Task assigned and notification sent to the assignee.',
    ],
  },
  sync: {
    kind:       'node_action',
    label:      'Sync record',
    suffix:     'synced record',
    recipients: ['Workday · Employee #4821', 'BambooHR · Contractor #1102', 'ADP · Timesheet #5523'],
    bodies:     [
      'Record fields synced — 7 fields updated, 0 conflicts.',
      'Sync completed. New status applied to the source system.',
      'Sync queued — will retry if any downstream service is rate-limited.',
    ],
  },
  people: {
    kind:       'node_action',
    label:      'Assign group',
    suffix:     'assigned group',
    recipients: ['Onboarding team', 'Compliance reviewers', 'People-ops channel'],
    bodies:     [
      'Group assigned to record. All group members notified.',
      'Group membership updated — 3 members added, 0 removed.',
      'Group permissions applied to the record per template.',
    ],
  },
  finance: {
    kind:       'node_action',
    label:      'Update financial record',
    suffix:     'updated record',
    recipients: ['HR · Compliance', 'Finance · Payroll', 'Accounts payable'],
    bodies:     [
      'Record updated — type "Contract acceptance".',
      'Payroll record posted for the current pay period.',
      'Hours updated from 38 to 42.5 — overtime threshold crossed.',
    ],
  },
  package: {
    kind:       'node_action',
    label:      'Create record',
    suffix:     'created record',
    recipients: ['HR · Compliance', 'IT · Equipment', 'Facilities · Access cards'],
    bodies:     [
      'New record created — ready for downstream review.',
      'Record created with template "New hire packet".',
      'Record created and assigned to the default reviewer.',
    ],
  },
  ai: {
    kind:       'node_action',
    label:      'AI Specialist',
    suffix:     'invoked specialist',
    recipients: ['Onbi (Onboarding)', 'Sched (Scheduling)', 'Cassie (Compliance)'],
    bodies:     [
      'Specialist completed the requested action and returned a structured response.',
      'Specialist generated a draft for downstream review.',
      'Specialist routed the case to the correct assignee.',
    ],
  },
};

/** Pick the workflow's action-icon list, falling back to a sensible
 *  default when the upstream record doesn't supply one. Used to drive
 *  the activity-feed templates so each row matches one of the
 *  workflow's actual action surfaces. */
function workflowActionIcons(workflow: Automation): ActionIconKey[] {
  return workflow.actionIcons && workflow.actionIcons.length > 0
    ? workflow.actionIcons
    : ['mail', 'bell', 'task'];
}

/** Internal node-type slug used in synthetic node ids. Mirrors the
 *  builder's `nh-{type}-{idx}` / `co-{type}-{idx}` naming so the ids
 *  read like real graph nodes rather than placeholder counters. */
const ACTION_ICON_NODE_SLUG: Record<ActionIconKey, string> = {
  mail:    'email',
  message: 'sms',
  bell:    'notify',
  task:    'task',
  sync:    'sync',
  people:  'group',
  finance: 'record',
  package: 'create',
  ai:      'ai',
};

/** Workflow id → short prefix used for all node ids in that flow. The
 *  prefix mirrors the in-app convention (e.g. `nh-` for the New-hire
 *  onboarding flow); falls back to a deterministic two-letter slug
 *  derived from the workflow id so unmapped workflows still produce
 *  stable, plausible-looking ids. */
const WORKFLOW_NODE_PREFIX: Record<string, string> = {
  wf_01HGXZ7K3QN4A2MB: 'nh',  // New hire onboarding
  wf_01HGY2F9PW4VRJ8N: 'tr',  // Timesheet approval reminder
  wf_01HGYH6CXD3TZ5QK: 'ssn', // Shift swap notification
  wf_01HGZM4P8BKFYTR7: 'co',  // Contractor offboarding
  wf_01HH01VQY7JN4E5M: 'pa',  // Premium shift dispatch
};

function nodePrefixFor(workflow: Automation): string {
  const mapped = WORKFLOW_NODE_PREFIX[workflow.id];
  if (mapped) return mapped;
  // Fallback — pull two letters from the workflow id's tail so the
  // value still feels like a slug instead of a generic placeholder.
  const tail = workflow.id.replace(/^wf_/, '').slice(-4).toLowerCase();
  return tail.replace(/[^a-z]/g, '').slice(0, 2) || 'wf';
}

/** Synthesised per-node activity stream — each row mirrors one of the
 *  workflow's own action types (driven by `workflow.actionIcons`).
 *  Node ids follow the builder's `{prefix}-{type}-{idx}` convention so
 *  the expanded view shows a realistic graph node id (e.g.
 *  `nh-email-1`) rather than a generic counter. */
function synthNodeActivities(workflow: Automation): WorkflowActivityEvent[] {
  const rnd = seeded(`${workflow.id}|node-acts`);
  const now = Date.now();
  const icons  = workflowActionIcons(workflow);
  const prefix = nodePrefixFor(workflow);
  // Stable per-action-icon node ids — each icon slot owns one node id
  // for the workflow so repeat occurrences of the same action type
  // share the same node id (matches how the builder reuses nodes when
  // a flow runs multiple times).
  const nodeIdByIcon: Record<string, string> = {};
  icons.forEach((key, idx) => {
    nodeIdByIcon[key] = `${prefix}-${ACTION_ICON_NODE_SLUG[key]}-${idx + 1}`;
  });
  const out: WorkflowActivityEvent[] = [];
  for (let i = 0; i < 28; i++) {
    const iconKey  = icons[i % icons.length];
    const t        = ACTION_ICON_TEMPLATE[iconKey];
    const hoursAgo = i * (0.6 + rnd() * 2.5);
    const nodeId   = nodeIdByIcon[iconKey];
    out.push({
      id:          `${workflow.id}-act-${i}`,
      kind:        t.kind,
      primary:     t.label,
      suffix:      t.suffix,
      at:          new Date(now - hoursAgo * 3600_000).toISOString(),
      nodeId,
      iconKey,
      recipient:   t.recipients[Math.floor(rnd() * t.recipients.length)],
      body:        t.bodies[Math.floor(rnd() * t.bodies.length)],
    });
  }
  return out;
}

const ACTIVITY_ICON: Record<ActivityEventKind, typeof Mail01Icon> = {
  email:        Mail01Icon,
  sms:          MessageDotsSquareIcon,
  in_app:       MessageDotsSquareIcon,
  edit:         Edit03Icon,
  node_action:  ZapIcon,
};

/** Per-icon-key → Alloy icon component, mirroring the AutomationsPage
 *  card-cluster mapping. When an event carries an `iconKey` the row
 *  prefers this icon over the kind-keyed default so the activity
 *  visually matches the workflow's own action surface. */
const ACTION_ICON_COMPONENT: Record<ActionIconKey, typeof Mail01Icon> = {
  mail:    MailIcon,
  bell:    Bell01Icon,
  task:    ClipboardCheckIcon,
  message: MessageNotificationCircleIcon,
  sync:    RefreshCw04Icon,
  people:  Users03Icon,
  finance: BankIcon,
  package: PackageIcon,
  ai:      TeambridgeAIIcon,
};

const ACTIVITY_RECIPIENT_LABEL: Record<ActivityEventKind, string> = {
  email:        'Sent an email to',
  sms:          'Sent an SMS to',
  in_app:       'Sent an in-app message to',
  edit:         'Edited',
  node_action:  'Acted on',
};

function fmtActivityRelative(iso: string): string {
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

function ActivityFeedItem({ event }: { event: WorkflowActivityEvent }) {
  const [open, setOpen] = useState(false);
  const Icon = ACTIVITY_ICON[event.kind];
  const hasDetail = !!event.recipient || !!event.body;
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
            <span className={styles.runFeedItemWorkflow}>{event.primary}</span>{' '}
            <span className={styles.runFeedItemSuffix}>{event.suffix}</span>
          </span>
          <span className={styles.runFeedItemTimestamp}>{fmtActivityRelative(event.at)}</span>
        </span>
        <span
          className={styles.runFeedItemChevron}
          data-open={open || undefined}
          aria-hidden
        >
          <ChevronDownIcon size={14} />
        </span>
      </button>
      {open && hasDetail && (
        <div className={styles.runFeedItemBody}>
          <div className={styles.runFeedItemDetail}>
            <span className={styles.runFeedItemDetailMarker} aria-hidden />
            <div className={styles.runFeedItemDetailContent}>
              {event.recipient && (
                <p className={styles.runFeedItemDetailRecipient}>
                  {ACTIVITY_RECIPIENT_LABEL[event.kind]}{' '}
                  <strong>{event.recipient}</strong>
                </p>
              )}
              {event.body && (
                <p className={styles.runFeedItemDetailBody}>{event.body}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
      // Recent activities mirror the global Usage page's Recent runs
      // feed but scoped to a single workflow — every row is a per-action
      // run instance. Templates align with `workflow.actionIcons` so
      // the action types in the table match the actions the workflow
      // actually runs (no SMS rows for an email-only flow, etc.).
      recentActivities: synthNodeActivities(workflow)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
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
export function Change({ current, prior, invertDirection = false }: ChangeProps) {
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
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
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

  const { workflow, schedule, integrations, permissions, metrics, recentActivities } = detail;
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
  // Single unified activity feed — runs / edits / per-node actions all
  // sorted reverse-chronologically. Pagination drives the visible window
  // through the same Recent-runs-style row component.
  const activeList = recentActivities;
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

                  <div className={styles.chartRow}>
                  {/* Actions Taken — horizontal gradient bar chart,
                      ranked by total count, matching UsagePage style. */}
                  <ChartCard
                    title="Actions taken"
                    subtitle={`Actions executed by type — ${rangeLabel}`}
                  >
                    {(() => {
                      const actionTotals = ACTION_TYPE_KEYS
                        .map(k => ({
                          key:   k,
                          label: ACTION_TYPE_LABELS[k],
                          color: ACTION_TYPE_COLORS[k],
                          count: usage.series.actionsByType[k].reduce((a, b) => a + b, 0),
                        }))
                        .sort((a, b) => b.count - a.count);
                      const maxCount    = Math.max(...actionTotals.map(r => r.count), 1);
                      const total       = actionTotals.reduce((s, r) => s + r.count, 0);
                      const priorTotal  = Math.round(
                        usage.actionsTaken.prior * (total / (usage.actionsTaken.current || 1)),
                      );
                      return (
                        <div className={styles.peopleReachedBody}>
                          <div className={styles.successRateHero}>
                            <span className={styles.successRateValue}>{fmtNum(total)}</span>
                            <Change current={total} prior={priorTotal} />
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
                                    · {Math.round((row.count / (total || 1)) * 100)}%
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </ChartCard>

                  {/* Specialists Activated — dot-heatmap calendar */}
                  <ChartCard
                    title="Specialists activated"
                    subtitle={`AI persona invocations — last ${
                      usage.series.activationsHeatmap.length
                    } days`}
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
                      <SpecialistsActivatedHeatmap
                        days={usage.series.activationsHeatmap}
                      />
                    </div>
                  </ChartCard>
                  </div>
                </>
              );
            })()}

          </section>

          {/* ── Activities ──────────────────────────────────────────────
              Unified per-node activity feed rendered through Alloy's
              `Table` so the visual matches the rest of the page. The
              underlying data still merges runs / edits / per-node
              actions chronologically — each row shows the icon, primary
              label + suffix, recipient/payload, and a relative
              timestamp; node-action rows surface their node id inline
              with the primary label so the user can tie the entry back
              to a step on the canvas. */}
          <section className={styles.section} aria-label="Activities">
            <header className={styles.runsFeedHeader}>
              <h2 className={styles.sectionHeading}>Recent activities</h2>
              <p className={styles.runsFeedSubtitle}>
                {activeList.length === 0
                  ? 'No activity yet'
                  : `Showing ${pageItems.length} of ${activeList.length}`}
              </p>
            </header>

            <div className={styles.activityTableWrap}>
              <Table size="sm">
                <TableHeader>
                  <TableRow hoverable={false}>
                    <TableHead>Time</TableHead>
                    <TableHead>Action type</TableHead>
                    <TableHead>Recipients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map(event => {
                    const isExpanded = expandedActivityId === event.id;
                    const hasDetail  = !!event.body || !!event.nodeId;
                    const onToggle = () =>
                      setExpandedActivityId(prev => (prev === event.id ? null : event.id));
                    return (
                      <Fragment key={event.id}>
                        <TableRow
                          onClick={hasDetail ? onToggle : undefined}
                          aria-expanded={hasDetail ? isExpanded : undefined}
                          style={hasDetail ? { cursor: 'pointer' } : undefined}
                        >
                          <TableCell>
                            <div className={styles.activityTimeCell}>
                              <button
                                type="button"
                                className={styles.activityExpandToggle}
                                onClick={e => { e.stopPropagation(); onToggle(); }}
                                aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                                aria-expanded={isExpanded}
                                disabled={!hasDetail}
                              >
                                {isExpanded
                                  ? <ChevronDownIcon size={14} />
                                  : <ChevronRightIcon size={14} />}
                              </button>
                              <CellText
                                variant="secondary"
                                title={new Date(event.at).toLocaleString()}
                              >
                                {fmtActivityRelative(event.at)}
                              </CellText>
                            </div>
                          </TableCell>
                          <TableCell>
                            <CellText wrap>
                              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{event.primary}</span>
                              {event.suffix ? (
                                <>
                                  {' '}
                                  <span style={{ color: 'var(--color-content-secondary)' }}>
                                    {event.suffix}
                                  </span>
                                </>
                              ) : null}
                            </CellText>
                          </TableCell>
                          <TableCell>
                            {event.recipient ? (
                              <CellText wrap>{event.recipient}</CellText>
                            ) : (
                              <CellText variant="secondary">—</CellText>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasDetail && (
                          <tr className={styles.activityExpandedRow}>
                            <td className={styles.activityExpandedCell} colSpan={3}>
                              <div className={styles.activityExpandedGrid}>
                                {event.body && (
                                  <div className={styles.activityExpandedSection}>
                                    <Eyebrow>Message</Eyebrow>
                                    <p className={styles.activityExpandedText}>
                                      {event.body}
                                    </p>
                                  </div>
                                )}
                                {event.nodeId && (
                                  <div className={styles.activityExpandedSection}>
                                    <Eyebrow>Node</Eyebrow>
                                    <p className={styles.activityExpandedTextMono}>
                                      {event.nodeId}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
export function MetricCard({ title, subtitle, value, change, chart }: MetricCardProps) {
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

/* ── SpecialistsActivatedHeatmap ────────────────────────────────────────
   GitHub-style contributions heatmap. Renders one rounded-square cell per
   day over the last 35 days laid out as a 7-column (Mon–Sun) × 5-row
   grid. Each cell's saturation maps to that day's total specialist
   invocations bucketed into five discrete intensity levels (0 = idle,
   1–4 = quartiles up to the busiest day in window). Per-persona detail
   still surfaces via the hover tooltip. ─────────────────────────────── */

// Cell pitch — keep in sync with `.specialistsHeatmapGrid` CSS:
// 14px cell + 3px gap = 17px between column starts (matches Alloy ActivityHeatMap defaults).
export const HEATMAP_CELL_PITCH = 17;

export function SpecialistsActivatedHeatmap({ days }: { days: HeatmapDay[] }) {
  // Track the heatmap container's width so we can backfill enough prior
  // dates to fill the chart card — the heatmap reads as a continuous
  // calendar instead of a fixed-width block sitting in empty space.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (): void => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (days.length === 0) return null;

  // Max total over the window drives the intensity bucketing; floor to 1
  // so a workflow that's never activated a specialist still renders
  // cleanly without a divide-by-zero collapse.
  const maxTotal = Math.max(1, ...days.map(d => d.total));

  // Day-of-week of the first cell — Mon=0…Sun=6 — used to compute the
  // number of prior dates needed to align the data window's start with
  // its real weekday row (cells flow top-to-bottom within a column).
  const firstDate = new Date(days[0].date);
  const firstDow  = firstDate.getDay();             // 0=Sun … 6=Sat
  const firstCol  = (firstDow + 6) % 7;             // 0=Mon … 6=Sun
  const leadingForAlignment = firstCol;

  // Total columns the card can host given its measured width, then
  // derive how many cells (7 × columns) the heatmap should hold. If the
  // measurement hasn't landed yet, fall back to the natural data length
  // so the first paint isn't blank.
  const naturalCells   = days.length + leadingForAlignment;
  const cardColumns    = containerWidth > 0
    ? Math.max(1, Math.floor((containerWidth + 3) / HEATMAP_CELL_PITCH))
    : Math.ceil(naturalCells / 7);
  const targetCells    = Math.max(naturalCells, cardColumns * 7);
  const totalLeading   = targetCells - days.length;

  // Backfill leading cells with real prior dates (idle / zero activity)
  // instead of blank placeholders so the heatmap reads as a continuous
  // calendar that always fills the card.
  const leadingDays: HeatmapDay[] = [];
  for (let i = totalLeading; i > 0; i--) {
    const d = new Date(firstDate);
    d.setDate(firstDate.getDate() - i);
    leadingDays.push({
      date:      d.toISOString().slice(0, 10),
      total:     0,
      byPersona: Object.fromEntries(AI_PERSONAS.map(p => [p.id, 0])),
    });
  }
  const allDays = [...leadingDays, ...days];

  return (
    <div ref={containerRef} className={styles.specialistsHeatmap}>
      <div
        className={styles.specialistsHeatmapGrid}
        role="img"
        aria-label="Specialist activations heatmap — last 35 days"
      >
        {allDays.map(day => {
          // Bucket the day's total into 5 GitHub-style intensity levels:
          // 0 = idle, 1–4 = quartiles of the window's busiest day. Empty
          // days render as the neutral surface tone (level 0); every
          // other cell steps up through the AI accent saturation scale.
          const ratio = Math.min(1, day.total / maxTotal);
          const level = day.total === 0
            ? 0
            : Math.min(4, 1 + Math.floor(ratio * 4));
          const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
            weekday: 'short',
            month:   'short',
            day:     'numeric',
          });
          return (
            <div
              key={day.date}
              className={styles.specialistsHeatmapCell}
              data-empty={day.total === 0 ? 'true' : 'false'}
            >
              <span
                className={styles.specialistsHeatmapDot}
                data-level={level}
                aria-hidden
              />
              <div className={styles.specialistsHeatmapTooltip} role="tooltip">
                <div className={styles.specialistsHeatmapTooltipDate}>{dateLabel}</div>
                <div className={styles.specialistsHeatmapTooltipTotal}>
                  {day.total} {day.total === 1 ? 'invocation' : 'invocations'}
                </div>
                <ul className={styles.specialistsHeatmapTooltipList}>
                  {AI_PERSONAS.map(p => {
                    const c = day.byPersona[p.id] ?? 0;
                    return (
                      <li key={p.id} className={styles.specialistsHeatmapTooltipRow}>
                        <span className={styles.specialistsHeatmapTooltipName}>{p.name}</span>
                        <span className={styles.specialistsHeatmapTooltipCount}>{c}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.specialistsHeatmapLegend} aria-hidden>
        <span className={styles.specialistsHeatmapLegendLabel}>Less</span>
        {([0, 1, 2, 3, 4] as const).map(level => (
          <span
            key={level}
            className={styles.specialistsHeatmapDot}
            data-level={level}
            style={{ position: 'static', inset: 'unset', width: 12, height: 12, flexShrink: 0 }}
          />
        ))}
        <span className={styles.specialistsHeatmapLegendLabel}>More</span>
      </div>
    </div>
  );
}

