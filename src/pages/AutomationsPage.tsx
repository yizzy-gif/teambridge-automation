import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Tabs } from '@alloy/components/Tabs';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import { Tag } from '@alloy/components/Tag';
import type { TagColor } from '@alloy/components/Tag';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { Switch } from '@alloy/components/Switch';
import { Button } from '@alloy/components/Button';
import { TextField, NumberField, SelectField } from '@alloy/components/Input';
import { FilterPill, FilterPillGroup } from '@alloy/components/FilterPill';
import { ListItem } from '@alloy/components/ListItem';
import { PlusIcon } from '@alloy/components/icons/PlusIcon';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  CellStack, CellStatusTag, CellTag, CellText,
} from '@alloy/components/Table';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { Bell01Icon } from '@alloy/components/icons/Bell01Icon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { MessageNotificationCircleIcon } from '@alloy/components/icons/MessageNotificationCircleIcon';
import { RefreshCw04Icon } from '@alloy/components/icons/RefreshCw04Icon';
import { BankIcon } from '@alloy/components/icons/BankIcon';
import { PackageIcon } from '@alloy/components/icons/PackageIcon';
import { TeambridgeAIIcon } from '@alloy/components/icons/TeambridgeAIIcon';
import styles from './AutomationsPage.module.css';

// ─── Workflow settings persistence ────────────────────────────────────────────

const LS_KEY = 'workflow_settings';

type WorkflowSettingsEntry = { name: string; description: string; tags: string[] };
type WorkflowSettingsStore = Record<string, WorkflowSettingsEntry>;

function loadWorkflowSettings(): WorkflowSettingsStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as WorkflowSettingsStore) : {};
  } catch { return {}; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Workflow-level lifecycle status — tracks where the workflow sits in its
 * authoring lifecycle. Three states:
 *   - draft:    in progress, not yet published
 *   - live:     published and accepting triggers
 *   - archived: previously live, now retired (no triggers, kept for history)
 */
export type AutomationStatus = 'draft' | 'live' | 'archived';

/**
 * Run-level status — the outcome of the most recent execution. Four terminal
 * / ongoing states per product spec:
 *   - ongoing:   currently executing
 *   - completed: finished successfully (workflow turned off after purpose)
 *   - failed:    errored out or system-stopped due to error
 *   - exited:    soft stop — user stopped mid-run, or flow hit a dead end
 */
export type RunStatus = 'ongoing' | 'completed' | 'failed' | 'exited';
type ViewMode = 'card' | 'table';

interface AutomationStats {
  reached: number;  // successfully acted on (green)
  pending: number;  // queued / awaiting step (blue)
  skipped: number;  // condition unmet / filtered out (yellow)
}

/** Keys for the action-node icons shown in the card cluster. Each maps to an
 * Alloy icon in ACTION_ICON_MAP below. Derive this list from the workflow's
 * action nodes once the graph is wired to the backend. */
type ActionIconKey =
  | 'mail' | 'bell' | 'task' | 'message' | 'sync' | 'people'
  | 'finance' | 'package' | 'ai';

export interface Automation {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  /** Status of the most recent run (separate from workflow-level `status`).
   *  Undefined when the workflow has never run (draft). */
  lastRunStatus?: RunStatus;
  trigger: string;
  lastRun: string | null;
  runsTotal: number;
  runsSuccessful: number;
  category: string;
  stats: AutomationStats;
  tags?: string[];
  /** Icons for action nodes used in the workflow, in graph order. */
  actionIcons?: ActionIconKey[];
  /** When true, the card shows a subtle warning indicator. */
  hasErrors?: boolean;
  // Preview-only metadata. TODO(api): populate from the workflow endpoint once wired.
  owner: { name: string; avatarUrl?: string };
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}

const ACTION_ICON_MAP: Record<ActionIconKey, ComponentType<{ size?: number }>> = {
  mail:    Mail01Icon,
  bell:    Bell01Icon,
  task:    ClipboardCheckIcon,
  message: MessageNotificationCircleIcon,
  sync:    RefreshCw04Icon,
  people:  Users03Icon,
  finance: BankIcon,
  package: PackageIcon,
  ai:      TeambridgeAIIcon,
};

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: 'wf_01HGXZ7K3QN4A2MB',
    name: 'New hire onboarding',
    description:
      'Onboarding compliance flow: employment-type gate, Onbi specialist handoff, and parallel branches for welcome comms (delayed task assignment) + HR record creation with packet delivery.',
    status: 'live',
    lastRunStatus: 'ongoing',
    trigger: 'Employee created',
    lastRun: '2 hours ago',
    runsTotal: 65,
    runsSuccessful: 62,
    category: 'HR',
    stats: { reached: 48, pending: 7, skipped: 5 },
    actionIcons: ['ai', 'mail', 'people', 'task'],
    tags: ['HR', 'Onboarding', 'Welcome', 'AI Specialist', 'Branching'],
    owner: { name: 'Alex Rivera', avatarUrl: 'https://i.pravatar.cc/80?u=alex-rivera' },
    createdAt: '2025-11-03T10:12:00Z',
    updatedAt: '2026-03-28T14:02:00Z',
  },
  {
    id: 'wf_01HGY2F9PW4VRJ8N',
    name: 'Timesheet approval reminder',
    description:
      'Weekly payroll prep with a multi-group condition (pending OR overtime), DataOps audit, and parallel branches: manager email with 24 hr SMS escalation + payroll webhook with audit report to finance.',
    status: 'live',
    lastRunStatus: 'failed',
    trigger: 'Schedule — weekly',
    lastRun: '3 days ago',
    runsTotal: 120,
    runsSuccessful: 115,
    category: 'Finance',
    stats: { reached: 98, pending: 12, skipped: 10 },
    actionIcons: ['ai', 'mail', 'message', 'finance'],
    tags: ['Finance', 'Reminder', 'Weekly', 'AI Specialist', 'Branching'],
    hasErrors: true,
    owner: { name: 'Priya Shah', avatarUrl: 'https://i.pravatar.cc/80?u=priya-shah' },
    createdAt: '2025-08-17T09:00:00Z',
    updatedAt: '2026-04-10T16:30:00Z',
  },
  {
    id: 'wf_01HGYH6CXD3TZ5QK',
    name: 'Shift swap notification',
    description:
      'Open-shift dispatch with policy guard, urgency multi-group condition, and Sched specialist routing: feed message → 15 min escalation SMS branch + manager status modify branch.',
    status: 'archived',
    lastRunStatus: 'completed',
    trigger: 'Shift updated',
    lastRun: '1 week ago',
    runsTotal: 31,
    runsSuccessful: 27,
    category: 'Scheduling',
    stats: { reached: 24, pending: 3, skipped: 4 },
    actionIcons: ['ai', 'message', 'bell', 'sync'],
    tags: ['Scheduling', 'Notification', 'AI Specialist', 'Policy'],
    owner: { name: 'Jordan Lee', avatarUrl: 'https://i.pravatar.cc/80?u=jordan-lee' },
    createdAt: '2026-01-22T11:45:00Z',
    updatedAt: '2026-04-02T08:15:00Z',
  },
  {
    id: 'wf_01HGZM4P8BKFYTR7',
    name: 'Overtime alert',
    description:
      'Multi-tier overtime check (regular > 35 OR single OT > 0 OR double OT > 0) with DataOps audit. Branch A warns the employee with delayed payroll webhook; Branch B notifies the manager and flags the record for review.',
    status: 'draft',
    // lastRunStatus omitted — draft workflows have never run.
    trigger: 'Hours logged',
    lastRun: null,
    runsTotal: 0,
    runsSuccessful: 0,
    category: 'HR',
    stats: { reached: 0, pending: 0, skipped: 0 },
    actionIcons: ['ai', 'mail', 'message', 'sync'],
    tags: ['HR', 'Alert', 'Payroll', 'AI Specialist', 'Branching'],
    owner: { name: 'Sam Chen', avatarUrl: 'https://i.pravatar.cc/80?u=sam-chen' },
    createdAt: '2026-04-11T17:20:00Z',
    updatedAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'wf_01HH01VQY7JN4E5M',
    name: 'Contractor offboarding',
    description:
      'Offboarding compliance flow: policy gate, contractor-only condition, 1 hr grace delay, Onbi specialist checklist, then parallel access-revocation branch (modify + finance email + record lock) and equipment-recovery branch (assign task + audit report + people-ops chat).',
    status: 'live',
    lastRunStatus: 'exited',
    trigger: 'Contract end date',
    lastRun: '5 hours ago',
    runsTotal: 18,
    runsSuccessful: 14,
    category: 'HR',
    stats: { reached: 12, pending: 2, skipped: 4 },
    actionIcons: ['ai', 'sync', 'mail', 'task'],
    tags: ['HR', 'Offboarding', 'AI Specialist', 'Policy', 'Branching'],
    owner: { name: 'Morgan Patel', avatarUrl: 'https://i.pravatar.cc/80?u=morgan-patel' },
    createdAt: '2025-09-09T09:30:00Z',
    updatedAt: '2026-04-16T11:00:00Z',
  },
  // Showcase / demo workflow — exercises every node type (trigger, policy,
  // multi-group condition, AI specialist, fan-out branches with delay +
  // follow-up condition) end-to-end. Wired to the matching builder
  // template `wf_01HK_PREMIUM_DISPATCH` in BuilderPage.tsx.
  {
    id: 'wf_01HK_PREMIUM_DISPATCH',
    name: 'Premium shift dispatch & compliance',
    description:
      'Routes premium-rate clinical shifts: applies compliance policy, evaluates eligibility (credential, state, signature), then uses an AI specialist to fan out to a worker-outreach branch (with 30 min escalation delay) and an operations branch in parallel.',
    status: 'live',
    lastRunStatus: 'completed',
    trigger: 'Shift requested',
    lastRun: '11 minutes ago',
    runsTotal: 64,
    runsSuccessful: 59,
    category: 'Scheduling',
    stats: { reached: 47, pending: 7, skipped: 5 },
    actionIcons: ['ai', 'message', 'mail', 'task'],
    tags: ['Scheduling', 'Premium', 'AI Specialist', 'Policy', 'Branching'],
    owner: { name: 'Tessa Moreno', avatarUrl: 'https://i.pravatar.cc/80?u=tessa-moreno' },
    createdAt: '2026-02-04T13:42:00Z',
    updatedAt: '2026-04-26T22:18:00Z',
  },
  {
    id: 'wf_01HK_CREDENTIAL_EXPIRY',
    name: 'Credential expiry monitor',
    description:
      'Daily compliance sweep that flags users whose credentials expire within 30 days. DataOps audits the queue, fans out into a renewal-reminder cascade and an operations branch that blocks new shift assignments.',
    status: 'live',
    lastRunStatus: 'completed',
    trigger: 'Recurring — daily 8am',
    lastRun: 'Today at 08:00',
    runsTotal: 145,
    runsSuccessful: 142,
    category: 'HR',
    stats: { reached: 121, pending: 14, skipped: 10 },
    actionIcons: ['ai', 'mail', 'message', 'task'],
    tags: ['HR', 'Compliance', 'AI Specialist', 'Reminder'],
    owner: { name: 'Priya Shah', avatarUrl: 'https://i.pravatar.cc/80?u=priya-shah' },
    createdAt: '2025-10-12T09:00:00Z',
    updatedAt: '2026-04-27T08:00:00Z',
  },
  {
    id: 'wf_01HK_PAY_PERIOD_CLOSE',
    name: 'Pay period close & payroll prep',
    description:
      'Bi-weekly close-out flow with a 3-way fan-out: audit branch (report + record lock), comms branch (manager chat with delayed email escalation), and payroll branch (webhook + status modify).',
    status: 'live',
    lastRunStatus: 'ongoing',
    trigger: 'Recurring — bi-weekly Fri 5pm',
    lastRun: '23 minutes ago',
    runsTotal: 26,
    runsSuccessful: 24,
    category: 'Finance',
    stats: { reached: 18, pending: 5, skipped: 3 },
    actionIcons: ['ai', 'finance', 'mail', 'sync'],
    tags: ['Finance', 'Payroll', 'Branching', 'AI Specialist'],
    owner: { name: 'Sam Chen', avatarUrl: 'https://i.pravatar.cc/80?u=sam-chen' },
    createdAt: '2025-12-01T17:00:00Z',
    updatedAt: '2026-04-28T05:00:00Z',
  },
  {
    id: 'wf_01HK_BRANCH_DEMO',
    name: 'Eligibility branch demo',
    description:
      'Tiny showcase flow built to exercise the binary Yes/No branch on a condition node — auto-approve on the Yes path, manager email + 30 min escalation on the No path.',
    status: 'live',
    lastRunStatus: 'completed',
    trigger: 'User claims a shift',
    lastRun: '12 minutes ago',
    runsTotal: 9,
    runsSuccessful: 9,
    category: 'Scheduling',
    stats: { reached: 7, pending: 1, skipped: 1 },
    actionIcons: ['message', 'mail', 'bell'],
    tags: ['Scheduling', 'Branching', 'Demo'],
    owner: { name: 'Tessa Moreno', avatarUrl: 'https://i.pravatar.cc/80?u=tessa-moreno' },
    createdAt: '2026-04-28T08:00:00Z',
    updatedAt: '2026-04-28T11:48:00Z',
  },
  {
    id: 'wf_01HK_DOC_ESIGN',
    name: 'Document e-sign reminder',
    description:
      'Compliance e-signing flow: when a Document is completed, Cassie shepherds the signer with a 48 hr delay then SMS reminder, while a parallel branch posts to records and chats the archive team.',
    status: 'live',
    lastRunStatus: 'completed',
    trigger: 'Document completed',
    lastRun: '6 hours ago',
    runsTotal: 73,
    runsSuccessful: 69,
    category: 'HR',
    stats: { reached: 55, pending: 9, skipped: 5 },
    actionIcons: ['ai', 'mail', 'message', 'sync'],
    tags: ['HR', 'Documents', 'AI Specialist'],
    owner: { name: 'Jordan Lee', avatarUrl: 'https://i.pravatar.cc/80?u=jordan-lee' },
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-04-26T16:00:00Z',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AutomationStatus, string> = {
  draft:    'Draft',
  live:     'Live',
  archived: 'Archived',
};

const CATEGORY_COLOR: Record<string, TagColor> = {
  HR: 'blue',
  Finance: 'matcha',
  Scheduling: 'orange',
};

const STATUS_TAG_STATUS: Record<AutomationStatus, StatusTagStatus> = {
  draft:    'neutral', // gray — unfinished authoring state
  live:     'success', // green — published & running
  archived: 'warning', // amber — retired but kept for history
};

/** Run-level status → Alloy StatusTag mapping. */
const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  ongoing:   'Ongoing',
  completed: 'Completed',
  failed:    'Failed',
  exited:    'Exited',
};

const RUN_STATUS_TAG_STATUS: Record<RunStatus, StatusTagStatus> = {
  ongoing:   'info',    // primary/info blue
  completed: 'success', // success green
  failed:    'error',   // error / danger red
  exited:    'warning', // warning orange / amber
};

// ─── Status badges ────────────────────────────────────────────────────────────

/** Workflow-level status badge (Active / Paused / Draft). Currently unused on
 *  the card surface — kept available for workflow-lifecycle affordances. */
function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <StatusTag status={STATUS_TAG_STATUS[status]} size="sm">
      {STATUS_LABEL[status]}
    </StatusTag>
  );
}

/** Run-level status badge — Ongoing / Completed / Failed / Exited. Drives the
 *  card's status pill and the table's Status column (most-recent run). */
function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <StatusTag status={RUN_STATUS_TAG_STATUS[status]} size="sm">
      {RUN_STATUS_LABEL[status]}
    </StatusTag>
  );
}

// ─── Action icon cluster ─────────────────────────────────────────────────────
// Up to 3 icons stacked/overlapped; a +N pip appears when more exist. A
// placeholder is rendered when the workflow has no action nodes at all.

const MAX_CLUSTER_ICONS = 3;

function ActionIconCluster({ icons }: { icons: ActionIconKey[] | undefined }) {
  const list = icons ?? [];
  if (list.length === 0) {
    return (
      <div className={clsx(styles.iconCluster, styles.iconClusterEmpty)} aria-hidden>
        <span className={styles.iconDot}>
          <PackageIcon size={14} />
        </span>
      </div>
    );
  }
  const visible = list.slice(0, MAX_CLUSTER_ICONS);
  const overflow = list.length - visible.length;
  return (
    <div className={styles.iconCluster} aria-hidden>
      {visible.map((key, i) => {
        const Icon = ACTION_ICON_MAP[key];
        return (
          <span key={`${key}-${i}`} className={styles.iconDot}>
            <Icon size={14} />
          </span>
        );
      })}
      {overflow > 0 && (
        <span className={clsx(styles.iconDot, styles.iconOverflow)}>+{overflow}</span>
      )}
    </div>
  );
}

// ─── Segmented stats bar ──────────────────────────────────────────────────────

function AutomationBar({ stats, compact }: { stats: AutomationStats; compact?: boolean }) {
  const total = stats.reached + stats.pending + stats.skipped;
  if (total === 0) return null;
  const pReached = (stats.reached / total) * 100;
  const pPending = (stats.pending / total) * 100;
  const pSkipped = (stats.skipped / total) * 100;
  return (
    <div className={clsx(styles.statsWrap, compact && styles.statsWrapCompact)}>
      <div className={styles.statsBar}>
        {pReached > 0 && <div className={styles.barReached} style={{ width: `${pReached}%` }} />}
        {pPending > 0 && <div className={styles.barPending} style={{ width: `${pPending}%` }} />}
        {pSkipped > 0 && <div className={styles.barSkipped} style={{ width: `${pSkipped}%` }} />}
      </div>
      {!compact && (
        <div className={styles.statsLegend}>
          <span className={styles.legendItem}>
            <span className={clsx(styles.legendDot, styles.dotReached)} />
            {stats.reached} reached
          </span>
          <span className={styles.legendItem}>
            <span className={clsx(styles.legendDot, styles.dotPending)} />
            {stats.pending} pending
          </span>
          <span className={styles.legendItem}>
            <span className={clsx(styles.legendDot, styles.dotSkipped)} />
            {stats.skipped} skipped
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h6v6H3V6ZM10 6h11M10 10.5h11M3 14h6v6H3v-6ZM10 14h11M10 18.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className={styles.emptyTitle}>No automations yet</p>
      <p className={styles.emptyDesc}>Create your first automation to start saving time.</p>
      <button className={styles.emptyBtn} onClick={onNew}>
        New workflow
      </button>
    </div>
  );
}

// ─── Filter framework ────────────────────────────────────────────────────────
// Condition-based filter builder. Each row is a `{ field, operator, value }`
// triple — e.g. `{ field: 'status', operator: 'is', value: 'completed' }` —
// and the workflow list is filtered by the AND of every active condition.
// Per-field operator sets keep the editor honest: a date field can't pick
// "Contains", a text field can't pick "Before", etc.

type FilterFieldId =
  | 'name'
  | 'status'
  | 'category'
  | 'last_updated'
  | 'last_run'
  | 'runs_total'
  | 'tags';

type FilterOperator =
  // Text
  | 'contains'
  | 'does_not_contain'
  | 'is_empty'
  | 'is_not_empty'
  // Enum / select
  | 'is'
  | 'is_not'
  // Date
  | 'before'
  | 'after'
  // Number
  | 'gt'
  | 'lt'
  | 'eq';

interface FilterCondition {
  /** Stable id so React can key rows + callers can patch a single row. */
  id: string;
  field: FilterFieldId;
  operator: FilterOperator;
  /** String-coerced value. The renderer interprets it per field type
   *  (number / date / select) at apply time. */
  value: string;
}

interface FilterFieldDef {
  id: FilterFieldId;
  label: string;
  /** Drives the value-input control type. */
  type: 'text' | 'select' | 'date' | 'number';
  /** When `type === 'select'`, the canonical option list. */
  options?: string[];
  /** Per-field operator allowlist — surfaces only the operators that make
   *  semantic sense for the field's value type. */
  operators: FilterOperator[];
}

/** Operator label registry — short, sentence-case copy used in the
 *  operator dropdown. Keep these consistent with the design's pill copy. */
const FILTER_OP_LABEL: Record<FilterOperator, string> = {
  contains:        'Contains',
  does_not_contain: 'Does Not Contain',
  is_empty:        'Is Empty',
  is_not_empty:    'Is Not Empty',
  is:              'Is',
  is_not:          'Is Not',
  before:          'Before',
  after:           'After',
  gt:              'Greater Than',
  lt:              'Less Than',
  eq:              'Equals',
};

/** Surface-level field definitions — every field the filter editor knows
 *  how to compose a condition for. Order here determines the order in
 *  the field picker. */
const FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    operators: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    options: ['ongoing', 'completed', 'failed', 'exited', 'draft'],
    operators: ['is', 'is_not'],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'select',
    options: ['HR', 'Finance', 'Scheduling'],
    operators: ['is', 'is_not'],
  },
  {
    id: 'last_updated',
    label: 'Last Updated',
    type: 'date',
    operators: ['before', 'after', 'is'],
  },
  {
    id: 'last_run',
    label: 'Last Run',
    type: 'date',
    operators: ['before', 'after', 'is_empty', 'is_not_empty'],
  },
  {
    id: 'runs_total',
    label: 'Total Runs',
    type: 'number',
    operators: ['gt', 'lt', 'eq'],
  },
  {
    id: 'tags',
    label: 'Tags',
    type: 'text',
    operators: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  },
];

/** Resolve a field id back to its definition. */
function getFilterFieldDef(id: FilterFieldId): FilterFieldDef {
  return FILTER_FIELDS.find(f => f.id === id) ?? FILTER_FIELDS[0];
}

/** Pull the value an automation has for the given field, normalized to the
 *  comparable shape the operator switch expects. */
function getAutomationFieldValue(
  a: Automation,
  field: FilterFieldId,
): string | number | string[] | null {
  switch (field) {
    case 'name':         return a.name;
    case 'status':       return a.status === 'draft' ? 'draft' : (a.lastRunStatus ?? '');
    case 'category':     return a.category;
    case 'last_updated': return a.updatedAt;
    case 'last_run':     return a.lastRun ?? '';
    case 'runs_total':   return a.runsTotal;
    case 'tags':         return a.tags ?? [];
    default:             return null;
  }
}

/** Apply a single FilterCondition to an Automation — returns true if the
 *  workflow passes the rule. Handles per-field/operator semantics so the
 *  caller can keep `evaluateConditionFilters` as a one-liner. */
function applyFilterCondition(a: Automation, c: FilterCondition): boolean {
  const def    = getFilterFieldDef(c.field);
  const raw    = getAutomationFieldValue(a, c.field);
  const valStr = c.value.trim().toLowerCase();

  // For text/array fields, normalize to a lowercase string for substring
  // checks. Arrays (tags) join with " " so a "contains" match can hit any
  // tag in the list.
  const haystack = (() => {
    if (Array.isArray(raw)) return raw.join(' ').toLowerCase();
    if (typeof raw === 'string') return raw.toLowerCase();
    if (typeof raw === 'number') return String(raw);
    return '';
  })();

  switch (c.operator) {
    case 'contains':
      return valStr === '' ? true : haystack.includes(valStr);
    case 'does_not_contain':
      return valStr === '' ? true : !haystack.includes(valStr);
    case 'is_empty':
      if (Array.isArray(raw)) return raw.length === 0;
      return haystack === '';
    case 'is_not_empty':
      if (Array.isArray(raw)) return raw.length > 0;
      return haystack !== '';
    case 'is':
      if (def.type === 'select') return haystack === valStr;
      return haystack === valStr;
    case 'is_not':
      if (def.type === 'select') return haystack !== valStr;
      return haystack !== valStr;
    case 'before':
    case 'after': {
      const ts  = typeof raw === 'string' ? Date.parse(raw) : NaN;
      const cmp = Date.parse(c.value);
      if (isNaN(ts) || isNaN(cmp)) return true;
      return c.operator === 'before' ? ts < cmp : ts > cmp;
    }
    case 'gt':
    case 'lt':
    case 'eq': {
      const n   = typeof raw === 'number' ? raw : Number(raw);
      const cmp = Number(c.value);
      if (isNaN(n) || isNaN(cmp)) return true;
      if (c.operator === 'gt') return n > cmp;
      if (c.operator === 'lt') return n < cmp;
      return n === cmp;
    }
    default:
      return true;
  }
}

/** Default condition seed — used when "+ Add Filter" creates a fresh row. */
function makeBlankFilter(): FilterCondition {
  const first = FILTER_FIELDS[0];
  return {
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    field: first.id,
    operator: first.operators[0],
    value: '',
  };
}

// ─── FilterPopover ───────────────────────────────────────────────────────────
// Single-row composer for ONE new filter at a time. Per-product spec the
// popover never stacks multiple drafts: the user opens it via "+ Filter",
// edits one `{ field, operator, value }` triple, and the row auto-commits
// the moment it becomes valid (a value is picked / typed for value-needing
// operators, or an empty-state operator is selected). Clicking outside
// dismisses without committing if the row is still incomplete.
//
// Existing committed filters are not edited here — they live as chips in
// the FilterPillGroup outside the popover. Removing a chip removes that
// committed row.

interface FilterPopoverProps {
  /** The single in-progress draft row being edited. */
  draft: FilterCondition;
  /** Patch the draft as the user edits a control. */
  onChange: (next: FilterCondition) => void;
  /** Commit the draft to the active filters list and close. */
  onCommit: () => void;
  /** Close without committing — used by outside-click + Esc. */
  onClose: () => void;
  /** Bounding rect of the trigger so the popover anchors below it. */
  anchorRect: DOMRect;
}

function FilterPopover({ draft, onChange, onCommit, onClose, anchorRect }: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Outside click — close the popover when the user mousedowns anywhere
  // outside the panel itself.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  // Escape closes too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const def = getFilterFieldDef(draft.field);
  // If the operator no longer fits the (possibly just-changed) field, snap
  // it to the field's first valid op so the row never carries an invalid
  // pair.
  const op = def.operators.includes(draft.operator) ? draft.operator : def.operators[0];
  const showValue = op !== 'is_empty' && op !== 'is_not_empty';

  /** Auto-commit on Enter for free-text + number values. Selects (single-
   *  click pick) and dates (single-click pick) call `onCommit` directly
   *  from their own onChange handlers. */
  const onValueKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draft.value.trim() !== '') {
      e.preventDefault();
      onCommit();
    }
  };

  return (
    <div
      ref={ref}
      className={styles.filterPopover}
      role="dialog"
      aria-label="Add filter"
      style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className={styles.filterRow}>
        <div className={styles.filterRowControls}>
          <SelectField
            className={styles.filterSelect}
            size="sm"
            value={draft.field}
            onChange={(nextField) => {
              const nextDef = getFilterFieldDef(nextField as FilterFieldId);
              onChange({
                ...draft,
                field: nextField as FilterFieldId,
                operator: nextDef.operators[0],
                value: '',
              });
            }}
            options={FILTER_FIELDS.map(f => ({ value: f.id, label: f.label }))}
            aria-label="Filter field"
          />
          <SelectField
            className={styles.filterSelect}
            size="sm"
            value={op}
            onChange={(nextOp) => {
              const nextOperator = nextOp as FilterOperator;
              const next = { ...draft, operator: nextOperator };
              onChange(next);
              // Empty-state operators don't need a value — the row is
              // complete the moment one is selected, so commit straight
              // away to match the "auto-add when fully filled" rule.
              if (nextOperator === 'is_empty' || nextOperator === 'is_not_empty') {
                onCommit();
              }
            }}
            options={def.operators.map(o => ({ value: o, label: FILTER_OP_LABEL[o] }))}
            aria-label="Filter operator"
          />
        </div>
        {showValue && (() => {
          if (def.type === 'select' && def.options) {
            return (
              <SelectField
                className={styles.filterValueInput}
                size="sm"
                value={draft.value}
                onChange={(v) => {
                  onChange({ ...draft, value: v });
                  // Single-click select: as soon as the user picks a
                  // value the row is complete, so commit.
                  if (v.trim() !== '') onCommit();
                }}
                placeholder="Select value…"
                options={def.options.map(v => ({ value: v, label: v }))}
                aria-label="Filter value"
              />
            );
          }
          if (def.type === 'number') {
            return (
              <NumberField
                className={styles.filterValueInput}
                size="sm"
                placeholder="Value"
                value={draft.value}
                onChange={(e) => onChange({ ...draft, value: e.target.value })}
                onKeyDown={onValueKey}
                onBlur={() => { if (draft.value.trim() !== '') onCommit(); }}
                aria-label="Filter value"
              />
            );
          }
          if (def.type === 'date') {
            // Alloy doesn't expose a DateField yet; the raw native
            // input keeps the date picker behaviour while the
            // wrapping `.filterValueInput` styles match the other
            // Alloy field shells (32px, outlined, focus ring).
            return (
              <input
                className={styles.filterValueInput}
                type="date"
                value={draft.value}
                onChange={e => {
                  onChange({ ...draft, value: e.target.value });
                  if (e.target.value !== '') onCommit();
                }}
                aria-label="Filter value"
              />
            );
          }
          return (
            <TextField
              className={styles.filterValueInput}
              size="sm"
              placeholder="Value"
              value={draft.value}
              onChange={(e) => onChange({ ...draft, value: e.target.value })}
              onKeyDown={onValueKey}
              onBlur={() => { if (draft.value.trim() !== '') onCommit(); }}
              aria-label="Filter value"
              autoFocus
            />
          );
        })()}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  /**
   * Active tab id. Built-in values map to the workflow lifecycle:
   *   - 'all'      → no status filter
   *   - 'draft'    → workflow-lifecycle status === 'draft'
   *   - 'live'     → workflow-lifecycle status === 'live'
   *   - 'archived' → workflow-lifecycle status === 'archived'
   * Any other string is a custom-tab id (created via the "+" tab below).
   * Custom tabs run with no status filter — equivalent to 'all' — and start
   * with the condition-filter list empty so the user gets a fresh blank
   * working surface.
   */
  const [filter, setFilter] = useState<string>('all');

  /** User-created tabs that sit between the built-in status tabs and the
   *  trailing "+" tab. Each entry just carries an id + label; per-tab
   *  filter state lives in `conditionFilters` and is reset whenever a new
   *  tab is added (matching the "no filter applied" intent). */
  const [customTabs, setCustomTabs] = useState<Array<{ id: string; label: string }>>([]);
  /** Hidden built-in tab ids. The user can hide built-in status tabs via
   *  the per-tab "⋯ → Remove" menu (the first "All" tab is always
   *  protected and never shows the menu). The set persists for the
   *  session so a hidden tab stays hidden until it's re-added. */
  const [hiddenBuiltInTabs, setHiddenBuiltInTabs] = useState<Set<string>>(new Set());
  /** Per-tab context-menu open state: which tab's "⋯" was clicked, plus
   *  the screen coordinates the menu should anchor to. `null` when the
   *  menu is closed. */
  const [tabMenu, setTabMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  /** Built-in workflow-status tab ids. Used to distinguish "real" status
   *  tabs from user-created custom tabs in the filter chain below. */
  const BUILT_IN_TAB_IDS = ['all', 'draft', 'live', 'archived'] as const;
  const isBuiltInTab = (id: string): id is typeof BUILT_IN_TAB_IDS[number] =>
    (BUILT_IN_TAB_IDS as readonly string[]).includes(id);

  /** Outside-click + Escape close for the tab context menu. */
  useEffect(() => {
    if (!tabMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-tab-menu]')) setTabMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTabMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tabMenu]);

  /** Remove the menu's tab — drops a custom tab from `customTabs` or adds
   *  a built-in one to the hidden set, switching back to "All" if the
   *  removed tab was active. Also drops the tab's committed filter
   *  bucket so a re-added tab (or a new tab that recycles the id) starts
   *  fresh instead of inheriting stale filters. */
  const removeTab = useCallback((tabId: string) => {
    if (tabId === 'all') return;
    if (isBuiltInTab(tabId)) {
      setHiddenBuiltInTabs(curr => new Set([...curr, tabId]));
    } else {
      setCustomTabs(curr => curr.filter(t => t.id !== tabId));
    }
    setConditionFiltersByTab(curr => {
      if (!(tabId in curr)) return curr;
      const next = { ...curr };
      delete next[tabId];
      return next;
    });
    setFilter(curr => (curr === tabId ? 'all' : curr));
    setTabMenu(null);
  }, []);

  /** Currently-active (committed) condition filters, keyed by the tab
   *  they belong to. Each row is a `{ field, operator, value }` triple
   *  — see `applyFilterCondition` for the per-field semantics. The
   *  active tab's list ANDs together to filter the workflow grid;
   *  switching tabs swaps in that tab's own list, so filters under
   *  "Ongoing" don't bleed into "Completed" or any custom tab.
   *
   *  Filters land here only after the user commits a fully-filled
   *  draft from the popover; in-progress edits live in `filterDraft`
   *  instead so half-typed rows don't already hide workflows. */
  const [conditionFiltersByTab, setConditionFiltersByTab] =
    useState<Record<string, FilterCondition[]>>({});
  /** Convenience accessor — the current tab's committed filter list. */
  const conditionFilters = conditionFiltersByTab[filter] ?? [];

  /** In-progress draft — the single row currently rendered in the popover
   *  (when open). Held outside `conditionFilters` so it doesn't filter the
   *  list until the user commits it. */
  const [filterDraft, setFilterDraft] = useState<FilterCondition | null>(null);

  /** Anchor rect for positioning. The popover is portal-style positioned
   *  at `anchorRect.bottom + 8`, so we keep the trigger ref to re-resolve
   *  the rect on each open. */
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterOpen = filterDraft !== null;

  const openFilterPopover = useCallback(() => {
    if (filterTriggerRef.current) {
      setFilterAnchorRect(filterTriggerRef.current.getBoundingClientRect());
    }
    // Always seed a fresh blank draft — every open of the popover lets
    // the user compose ONE new filter; previously-committed filters are
    // untouched and continue to render as chips next to the trigger.
    setFilterDraft(makeBlankFilter());
  }, []);

  const closeFilterPopover = useCallback(() => {
    // Drop the in-progress draft on close. A draft is committed via the
    // explicit `commitFilterDraft` path — anything still in `filterDraft`
    // when we close is by definition incomplete and shouldn't sneak into
    // the active filter set.
    setFilterDraft(null);
  }, []);

  /** Latest draft snapshot — read inside `commitFilterDraft` so the
   *  commit path doesn't have to live inside a `setFilterDraft` updater
   *  function (which would be a side-effect-in-pure-updater pattern,
   *  and React 18 StrictMode double-invokes updater functions in dev,
   *  producing a duplicate filter pill on every commit). */
  const filterDraftRef = useRef<FilterCondition | null>(null);
  filterDraftRef.current = filterDraft;
  /** Active-tab snapshot for the same reason — the commit path needs
   *  to know which tab's bucket to push the new filter into without
   *  reading `filter` from a stale closure. */
  const activeTabRef = useRef<string>(filter);
  activeTabRef.current = filter;

  const commitFilterDraft = useCallback(() => {
    const curr = filterDraftRef.current;
    if (!curr) return;
    // Defensive guard — only commit when the row is actually complete:
    // empty-state operators don't need a value, everything else does.
    const isComplete =
      curr.operator === 'is_empty' ||
      curr.operator === 'is_not_empty' ||
      curr.value.trim() !== '';
    if (!isComplete) return;
    const tabId = activeTabRef.current;
    setConditionFiltersByTab(prev => ({
      ...prev,
      [tabId]: [...(prev[tabId] ?? []), curr],
    }));
    setFilterDraft(null);
  }, []);
  const [view, setView] = useState<ViewMode>('card');

  // Merge localStorage-saved settings over mock data (name, description, tags)
  const [automations, setAutomations] = useState<Automation[]>(() => {
    const stored = loadWorkflowSettings();
    return MOCK_AUTOMATIONS.map(a => {
      const entry = stored[a.id];
      return entry ? { ...a, name: entry.name, description: entry.description, tags: entry.tags } : a;
    });
  });

  // ── Status toggle ────────────────────────────────────────────────────────
  // Cards used to inline-expand a preview panel; that's been replaced with
  // a navigation to the detail page (`/automations/:id`). All that remains
  // here is the per-row Active/Paused toggle.
  const setStatus = useCallback((id: string, status: AutomationStatus) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const q = search.toLowerCase();
  // `conditionFilters` only contains rows the user has explicitly committed
  // (the draft popover holds in-flight edits), so the AND-able active set
  // is just the array itself — no need to re-filter for completeness here.
  const activeConditions = conditionFilters;
  const filtered = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags ?? []).some(t => t.toLowerCase().includes(q));
    // Custom tabs run with no status filter (treat like 'all'); built-in
    // ids map directly to the workflow's lifecycle status.
    const matchesFilter =
      !isBuiltInTab(filter) ? true
        : filter === 'all' ? true
        : a.status === filter;
    // Condition filters AND together: a workflow must satisfy every active
    // row to pass.
    const matchesConditions = activeConditions.every(c => applyFilterCondition(a, c));
    return matchesSearch && matchesFilter && matchesConditions;
  });

  return (
    <div className={styles.page}>
      {/* Toolbar — page-level actions on top (view toggle, new workflow);
          status tabs in the middle; search + tag-filter bar below the tabs.
          The search box and tag pills live UNDER the tabs so they read as
          per-tab filters: switching tabs (e.g. Failed) preserves whatever
          query / tag pills are applied and the list re-runs the same
          filter against the new tab's workflow subset. */}
      <div className={styles.toolbar}>
        {/* Tabs row — status tabs on the left, "+ New workflow" anchored
            to the trailing edge. The wrapping row carries its own
            bottom border so the underline continues all the way under
            the button (Tabs' own border-bottom only spans its own
            width, which stops where the button starts). */}
        <div className={styles.toolbarTabsRow}>
          <Tabs
            className={styles.toolbarTabs}
            value={filter}
            onChange={(v) => {
              // The trailing "+" tab uses a sentinel value. Intercept it
              // here: spawn a fresh custom tab, switch to it, and reset
              // the condition filters so the new view starts unfiltered.
              if (v === '__add_tab__') {
                const idx = customTabs.length + 1;
                const id  = `view-${Date.now()}`;
                setCustomTabs(curr => [...curr, { id, label: `View ${idx}` }]);
                setFilter(id);
                // New tabs start with no filters — but other tabs keep
                // theirs. We don't need to seed anything; the bucket
                // simply doesn't exist yet and `?? []` handles the read.
                return;
              }
              setFilter(v);
            }}
          >
            <Tabs.Tab value="all">All</Tabs.Tab>
            {/* Built-in status tabs render only when not hidden. Each
                non-All tab opens the Remove popup when the user clicks
                it while it's already active — first click switches,
                second click on the same tab surfaces the menu. The
                first click never trips the popup because at onClick
                fire time React still has the OLD `filter` value. */}
            {(['draft', 'live', 'archived'] as const)
              .filter(id => !hiddenBuiltInTabs.has(id))
              .map(id => (
                <Tabs.Tab
                  key={id}
                  value={id}
                  onClick={(e) => {
                    if (filter !== id) return;
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTabMenu({ tabId: id, x: r.left, y: r.bottom + 4 });
                  }}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </Tabs.Tab>
              ))}
            {customTabs.map(t => (
              <Tabs.Tab
                key={t.id}
                value={t.id}
                onClick={(e) => {
                  if (filter !== t.id) return;
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTabMenu({ tabId: t.id, x: r.left, y: r.bottom + 4 });
                }}
              >
                {t.label}
              </Tabs.Tab>
            ))}
            {/* Trailing "+" tab — sentinel value intercepted in onChange
                above to create a new custom tab instead of switching. */}
            <Tabs.Tab value="__add_tab__" aria-label="Add new view">+</Tabs.Tab>
          </Tabs>
          <button
            className={styles.newBtn}
            onClick={() => navigate('/automations/new')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New workflow
          </button>
        </div>

        {/* Per-tab filter row — search input + view toggle on the first
            line, removable tag pills on the second. Both narrow the
            workflow list within the currently-active status tab; Enter
            commits a typed pill, Escape (or blur while empty) cancels.
            The view toggle sits at the search input's trailing position
            so card/table switching is right next to the query input. */}
        <div className={styles.toolbarFilterRow}>
          <div className={styles.toolbarSearchRow}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="m9.5 9.5 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search automations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search automations"
              />
            </div>

            <div className={styles.viewToggle}>
              <ToggleButton
                size="sm"
                iconOnly
                selectionStyle="border"
                selected={view === 'card'}
                onSelectedChange={() => setView('card')}
                aria-label="Card view"
              >
                <Grid01Icon size={14} />
              </ToggleButton>
              <ToggleButton
                size="sm"
                iconOnly
                selectionStyle="border"
                selected={view === 'table'}
                onSelectedChange={() => setView('table')}
                aria-label="Table view"
              >
                <ListBulletIcon size={14} />
              </ToggleButton>
            </div>
          </div>

          {/* Condition filter trigger — opens the FilterPopover anchored
              below this button. The popover lets the user compose
              `{ field, operator, value }` rows that filter the workflow
              list (e.g. "Status Is Completed", "Name Contains onboard"). */}
          <FilterPillGroup aria-label="Filters">
            {activeConditions.map(c => {
              const def = getFilterFieldDef(c.field);
              const opLabel = FILTER_OP_LABEL[c.operator];
              // Compact rendered summary for an applied filter pill.
              // Empty-state operators don't show a value; everything
              // else trails with the user's typed/picked value.
              const showValue = c.operator !== 'is_empty' && c.operator !== 'is_not_empty';
              return (
                <FilterPill
                  key={c.id}
                  active
                  // Click on a chip just removes it — single-row popover
                  // composes new filters only; existing rows are managed
                  // through the chip cluster (remove via the X). This
                  // keeps the popover surface as a one-shot composer.
                  onRemove={() => setConditionFiltersByTab(prev => ({
                    ...prev,
                    [filter]: (prev[filter] ?? []).filter(f => f.id !== c.id),
                  }))}
                >
                  {def.label} {opLabel.toLowerCase()}{showValue && c.value ? ` ${c.value}` : ''}
                </FilterPill>
              );
            })}
            <Button
              ref={filterTriggerRef}
              className={styles.filterAddBtn}
              variant="ghost"
              size="sm"
              leadingArtwork={<PlusIcon size={14} />}
              onClick={openFilterPopover}
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              aria-label="Add filter"
            >
              Filter
            </Button>
          </FilterPillGroup>
        </div>
      </div>

      {/* FilterPopover — portalled positionally under the trigger button.
          Only rendered while a draft is in flight so outside-click
          handling stays simple. */}
      {filterOpen && filterAnchorRect && filterDraft && (
        <FilterPopover
          draft={filterDraft}
          onChange={setFilterDraft}
          onCommit={commitFilterDraft}
          onClose={closeFilterPopover}
          anchorRect={filterAnchorRect}
        />
      )}

      {/* Tab context menu — fixed-positioned popup anchored at the dots
          icon's bounding rect. One-row Alloy ListItem with a destructive
          "Remove" action. The page-level outside-click handler in
          `useEffect([tabMenu])` closes it when the user clicks anywhere
          outside the menu or its trigger. */}
      {tabMenu && (
        <div
          data-tab-menu
          className={styles.tabMenu}
          style={{ top: tabMenu.y, left: tabMenu.x }}
          role="menu"
          aria-label="Tab actions"
        >
          <ListItem
            role="menuitem"
            size="sm"
            label="Remove"
            destructive
            divider={false}
            onClick={() => removeTab(tabMenu.tabId)}
          />
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState onNew={() => navigate('/automations/new')} />
      ) : view === 'card' ? (
        <div className={styles.list}>
          {filtered.map((automation) => {
            const isDraft = automation.status === 'draft';
            // The whole card is now a navigation link to the read-only
            // detail page. Interactive children (status toggle) keep
            // their own click handlers and stop propagation so toggling
            // doesn't navigate. The legacy expand chevron is gone.
            return (
              <Link
                key={automation.id}
                to={`/automations/${automation.id}`}
                className={styles.card}
                aria-label={`Open ${automation.name}`}
              >
                {automation.hasErrors && (
                  <span className={styles.cardWarningDot} aria-label="Has recent errors" />
                )}

                {/* ── Top row: status pill · spacer · last run ── */}
                <div className={styles.cardTop}>
                  <StatusBadge status={automation.status} />
                  <span className={styles.cardTopSpacer} />
                  <span className={styles.cardLastRun}>
                    <ClockIcon size={12} />
                    {automation.lastRun ?? 'Never'}
                  </span>
                </div>

                {/* ── Body: workflow name (up to 3 lines, ellipsis) ── */}
                <span className={styles.cardName}>{automation.name}</span>

                {/* ── Bottom row: run count · success count · toggle ── */}
                <div className={styles.cardFooter}>
                  <div className={styles.cardStats}>
                    <span className={styles.cardStat} title="Total runs">
                      <ListBulletIcon size={12} />
                      {automation.runsTotal}
                    </span>
                    <span className={styles.cardStat} title="Successful runs">
                      <CheckCircleIcon size={12} />
                      {automation.runsSuccessful}
                    </span>
                  </div>
                  <span
                    data-card-action
                    onClick={e => { e.stopPropagation(); e.preventDefault(); }}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <Switch
                      size="sm"
                      checked={automation.status === 'live'}
                      disabled={isDraft}
                      onChange={(on) => setStatus(automation.id, on ? 'live' : 'archived')}
                      aria-label={`${automation.status === 'live' ? 'Archive' : 'Activate'} ${automation.name}`}
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <Table size="md">
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Last run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((automation) => {
                // Whole row navigates to the read-only detail page.
                // The name cell remains a link wrapper (no inner button) so
                // keyboard / right-click both work natively. The legacy
                // chevron toggle is gone.
                const goToDetail = () => navigate(`/automations/${automation.id}`);
                return (
                  <TableRow
                    key={automation.id}
                    onClick={goToDetail}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${automation.name}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <CellStack
                        primary={
                          <span className={styles.nameLink}>{automation.name}</span>
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <CellStatusTag status={STATUS_TAG_STATUS[automation.status]}>
                        {STATUS_LABEL[automation.status]}
                      </CellStatusTag>
                    </TableCell>
                    <TableCell>
                      <CellTag color={CATEGORY_COLOR[automation.category]} variant="subtle">
                        {automation.category}
                      </CellTag>
                    </TableCell>
                    <TableCell>
                      <CellText variant="secondary">{automation.trigger}</CellText>
                    </TableCell>
                    <TableCell>
                      <CellText>{automation.runsTotal}</CellText>
                    </TableCell>
                    <TableCell>
                      <CellText variant="secondary">
                        {automation.lastRun ?? '—'}
                      </CellText>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
