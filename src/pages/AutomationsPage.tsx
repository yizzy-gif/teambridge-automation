import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import type { TagColor } from '@alloy/components/Tag';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { Switch } from '@alloy/components/Switch';
import { Button } from '@alloy/components/Button';
import { Badge } from '@alloy/components/Badge';
import { Accordion, AccordionItem } from '@alloy/components/Accordion';
import { DropdownMenu } from '@alloy/components/DropdownMenu';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@alloy/components/Dialog';
import { useToast } from '@alloy/components/Toast';
import { TextField, NumberField, SelectField } from '@alloy/components/Input';
import { FilterPill, FilterPillGroup } from '@alloy/components/FilterPill';
import { PlusIcon } from '@alloy/components/icons/PlusIcon';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  CellStack, CellStatusTag, CellTag, CellText,
} from '@alloy/components/Table';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { DotsHorizontalIcon } from '@alloy/components/icons/DotsHorizontalIcon';
import {
  useWorkflowFolders,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useMoveWorkflowToFolder,
  getWorkflowFolderId,
  UNCATEGORIZED_FOLDER_ID,
} from '@/features/workflows/folders';
import type { WorkflowFolder } from '@/features/workflows/folders';
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

// ─── Per-folder expand/collapse persistence ──────────────────────────────────
// Folders default to expanded; the user's choice for each folder persists in
// localStorage under `teambridge:manage:folder:{folderId}:expanded`.

const FOLDER_EXPANDED_KEY = (id: string) => `teambridge:manage:folder:${id}:expanded`;

function loadInitialExpandedSet(folders: WorkflowFolder[]): Set<string> {
  const out = new Set<string>();
  for (const f of folders) {
    let stored: string | null = null;
    try { stored = localStorage.getItem(FOLDER_EXPANDED_KEY(f.id)); } catch { /* noop */ }
    // No persisted preference → default to expanded.
    if (stored === null || stored === '1') out.add(f.id);
  }
  return out;
}

function persistExpanded(id: string, expanded: boolean) {
  try { localStorage.setItem(FOLDER_EXPANDED_KEY(id), expanded ? '1' : '0'); } catch { /* noop */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationStatus = 'draft' | 'live' | 'archived';
export type RunStatus = 'ongoing' | 'completed' | 'failed' | 'exited';
type ViewMode = 'card' | 'table';

interface AutomationStats {
  reached: number;
  pending: number;
  skipped: number;
}

/** Keys for the action-node icons shown in the card cluster. Each maps to an
 * Alloy icon in ACTION_ICON_MAP below. Derive this list from the workflow's
 * action nodes once the graph is wired to the backend. */
export type ActionIconKey =
  | 'mail' | 'bell' | 'task' | 'message' | 'sync' | 'people'
  | 'finance' | 'package' | 'ai';

export interface Automation {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  lastRunStatus?: RunStatus;
  trigger: string;
  lastRun: string | null;
  runsTotal: number;
  runsSuccessful: number;
  category: string;
  stats: AutomationStats;
  tags?: string[];
  actionIcons?: ActionIconKey[];
  hasErrors?: boolean;
  /** Folder assignment. null === Uncategorized. Mock data ships everything as
   *  null; the user moves cards into folders via drag and drop. */
  folderId?: string | null;
  owner: { name: string; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
}

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
  draft:    'neutral',
  live:     'success',
  archived: 'warning',
};

// ─── Status badges ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <StatusTag status={STATUS_TAG_STATUS[status]} size="sm">
      {STATUS_LABEL[status]}
    </StatusTag>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

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
// Condition-based filter builder. Status filtering — previously a tab strip —
// is now one of the filter facets here, so the toolbar carries a single
// composer instead of two parallel filter mechanisms.

type FilterFieldId =
  | 'name'
  | 'status'
  | 'category'
  | 'last_updated'
  | 'last_run'
  | 'runs_total'
  | 'tags';

type FilterOperator =
  | 'contains'
  | 'does_not_contain'
  | 'is_empty'
  | 'is_not_empty'
  | 'is'
  | 'is_not'
  | 'before'
  | 'after'
  | 'gt'
  | 'lt'
  | 'eq';

interface FilterCondition {
  id: string;
  field: FilterFieldId;
  operator: FilterOperator;
  value: string;
}

interface FilterFieldDef {
  id: FilterFieldId;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  operators: FilterOperator[];
}

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

const FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    operators: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  },
  {
    // The Status facet now subsumes the removed tab strip. Options match the
    // previously-visible tabs (Ongoing / Completed / Failed / Exited / Draft);
    // adding multiple Status pills in succession yields an OR-ish workflow
    // because each row ANDs against a distinct lifecycle state — but the
    // shared expectation here is the user wants one status at a time, which
    // mirrors the legacy tab behaviour.
    id: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ongoing',   label: 'Ongoing' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed',    label: 'Failed' },
      { value: 'exited',    label: 'Exited' },
      { value: 'draft',     label: 'Draft' },
    ],
    operators: ['is', 'is_not'],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'HR',         label: 'HR' },
      { value: 'Finance',    label: 'Finance' },
      { value: 'Scheduling', label: 'Scheduling' },
    ],
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

function getFilterFieldDef(id: FilterFieldId): FilterFieldDef {
  return FILTER_FIELDS.find(f => f.id === id) ?? FILTER_FIELDS[0];
}

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

function applyFilterCondition(a: Automation, c: FilterCondition): boolean {
  const def    = getFilterFieldDef(c.field);
  const raw    = getAutomationFieldValue(a, c.field);
  const valStr = c.value.trim().toLowerCase();

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

function makeBlankFilter(): FilterCondition {
  const first = FILTER_FIELDS[0];
  return {
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    field: first.id,
    operator: first.operators[0],
    value: '',
  };
}

/** Pretty-print a filter pill summary, mapping a select-field's raw value
 *  back to its visible option label. */
function formatFilterValue(c: FilterCondition): string {
  const def = getFilterFieldDef(c.field);
  if (def.type === 'select' && def.options) {
    return def.options.find(o => o.value === c.value)?.label ?? c.value;
  }
  return c.value;
}

// ─── FilterPopover ───────────────────────────────────────────────────────────

interface FilterPopoverProps {
  draft: FilterCondition;
  onChange: (next: FilterCondition) => void;
  onCommit: () => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

function FilterPopover({ draft, onChange, onCommit, onClose, anchorRect }: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const def = getFilterFieldDef(draft.field);
  const op = def.operators.includes(draft.operator) ? draft.operator : def.operators[0];
  const showValue = op !== 'is_empty' && op !== 'is_not_empty';

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
                  if (v.trim() !== '') onCommit();
                }}
                placeholder="Select value…"
                options={def.options}
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

// ─── Workflow card ───────────────────────────────────────────────────────────
// Extracted from the page body so the dnd-kit draggable wrapper can sit
// outside the <Link> navigation target. Click → navigate (handled by Link),
// drag → move (handled by the outer draggable wrapper). The PointerSensor
// activation distance below ensures click and drag don't fight.

interface WorkflowCardProps {
  automation: Automation;
  onToggleStatus: (id: string, status: AutomationStatus) => void;
  /** When the parent renders this inside the DragOverlay — strip pointer
   *  affordances so the floating ghost doesn't try to navigate. */
  asOverlay?: boolean;
}

function WorkflowCardInner({ automation, onToggleStatus, asOverlay }: WorkflowCardProps) {
  const isDraft = automation.status === 'draft';

  // The Switch is a non-navigating, non-dragging affordance. We intercept
  // pointerdown so dnd-kit's PointerSensor never receives it (drag never
  // starts), and click + keydown so the surrounding <Link> never navigates.
  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e) (e as React.MouseEvent).preventDefault?.();
  };

  const cardBody = (
    <>
      {automation.hasErrors && (
        <span className={styles.cardWarningDot} aria-label="Has recent errors" />
      )}

      <div className={styles.cardTop}>
        <StatusBadge status={automation.status} />
        <span className={styles.cardTopSpacer} />
        <span className={styles.cardLastRun}>
          <ClockIcon size={12} />
          {automation.lastRun ?? 'Never'}
        </span>
      </div>

      <span className={styles.cardName}>{automation.name}</span>

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
        {!asOverlay && (
          <span
            data-card-action
            onPointerDown={stopAll}
            onMouseDown={stopAll}
            onClick={stopAll}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              size="sm"
              checked={automation.status === 'live'}
              disabled={isDraft}
              onChange={(on) => onToggleStatus(automation.id, on ? 'live' : 'archived')}
              aria-label={`${automation.status === 'live' ? 'Archive' : 'Activate'} ${automation.name}`}
            />
          </span>
        )}
      </div>
    </>
  );

  if (asOverlay) {
    return <div className={clsx(styles.card, styles.cardOverlay)}>{cardBody}</div>;
  }
  return (
    <Link
      to={`/automations/${automation.id}`}
      className={styles.card}
      aria-label={`Open ${automation.name}`}
    >
      {cardBody}
    </Link>
  );
}

/** Drag-source wrapper around WorkflowCardInner. Sits outside the <Link>
 *  so dnd-kit's listeners attach to a parent <div> while the inner <Link>
 *  remains a real anchor — keyboard nav, right-click, copy-link all keep
 *  working natively. PointerSensor distance:6 in the DndContext below
 *  keeps short clicks from initiating a drag. */
function DraggableWorkflowCard(props: WorkflowCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `wf:${props.automation.id}`,
    data: { type: 'workflow', workflowId: props.automation.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={clsx(styles.cardDragWrap, isDragging && styles.cardDragging)}
      {...attributes}
      {...listeners}
    >
      <WorkflowCardInner {...props} />
    </div>
  );
}

// ─── EditableFolderName ──────────────────────────────────────────────────────
// Inline-editable folder name — same affordance as the workflow-name field
// in the builder TopBar. Click the text to edit; Enter blurs (commits);
// Escape reverts; an empty trimmed value reverts. The visible chrome is a
// dotted hover underline that solidifies on focus.
//
// The system folder ("Uncategorized") opts out by passing readOnly=true,
// which renders a plain non-editable span.

interface EditableFolderNameProps {
  name: string;
  readOnly?: boolean;
  /** Focus the contenteditable on mount. Used by the "draft" row in the
   *  add-folder flow so the user can start typing immediately. */
  autoFocus?: boolean;
  /** Visible hint text when the field is empty. The contenteditable can't
   *  use a real `placeholder` attribute, so we render it via CSS
   *  `:empty::before { content: attr(data-placeholder) }`. */
  placeholder?: string;
  /** Imperative focus hook so external triggers (DropdownMenu's "Rename"
   *  item) can put the field into edit mode. */
  editHandle?: { focus: () => void };
  onCommit: (next: string) => void;
  /** Called on Escape, or on blur when the trimmed value is empty. The
   *  draft row uses this to dismiss itself when the user backs out. */
  onCancel?: () => void;
}

function EditableFolderName({
  name,
  readOnly,
  autoFocus,
  placeholder,
  editHandle,
  onCommit,
  onCancel,
}: EditableFolderNameProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);

  // Sync external `name` changes into the DOM only when the user is not
  // actively typing — same pattern the BuilderPage TopBar uses to avoid
  // clobbering the caret on every parent re-render.
  useEffect(() => {
    const el = ref.current;
    if (el && !focused.current && el.textContent !== name) {
      el.textContent = name;
    }
  }, [name]);

  // Initial mount — seed the contenteditable with the current name and
  // (for the draft row) auto-focus so the user can start typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = name;
    if (autoFocus) {
      el.focus();
      // Caret-at-end for empty draft, select-all for non-empty initial.
      if (name) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose a focus() to the parent. Selecting all text on entry mirrors the
  // builder's behaviour and is friendlier than dropping a caret somewhere
  // in the middle of the existing name.
  useEffect(() => {
    if (!editHandle) return;
    editHandle.focus = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
  }, [editHandle]);

  if (readOnly) {
    return <span className={styles.folderName}>{name}</span>;
  }

  return (
    <span
      ref={ref}
      className={styles.folderNameEditable}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Folder name"
      spellCheck={false}
      data-placeholder={placeholder}
      // Stop the click + pointerdown from bubbling to the accordion's
      // hit-target button (which would toggle expand/collapse). Editing
      // the name should never collapse the folder.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={() => { focused.current = true; }}
      onBlur={(e) => {
        focused.current = false;
        const text = (e.currentTarget.textContent ?? '').replace(/\n/g, '').trim();
        if (text === '') {
          // Empty → revert (rename) or dismiss (draft).
          if (onCancel) {
            onCancel();
          } else {
            e.currentTarget.textContent = name;
          }
          return;
        }
        if (text === name && !onCancel) {
          // Rename mode (no `onCancel`) — name unchanged, leave DOM as-is.
          // Draft mode (has `onCancel`) still falls through to onCommit so
          // accepting the default "Folder N" without edits creates the
          // folder; otherwise the draft never commits.
          return;
        }
        onCommit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (ref.current) ref.current.textContent = name;
          if (onCancel) onCancel();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

// ─── Folder section ──────────────────────────────────────────────────────────

interface FolderSectionProps {
  folder: WorkflowFolder;
  workflows: Automation[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onToggleStatus: (id: string, status: AutomationStatus) => void;
  onRename: (next: string) => void;
  onDelete: () => void;
  /** True while a card is being dragged anywhere on the page. Drives the
   *  drop-target tinting on this folder's body. */
  dragActive: boolean;
}

function FolderSection({
  folder,
  workflows,
  expanded,
  onExpandedChange,
  onToggleStatus,
  onRename,
  onDelete,
  dragActive,
}: FolderSectionProps) {
  // Single droppable wrapping the entire AccordionItem (header + body) so
  // a card hovering over a collapsed folder still registers as "over" —
  // the body alone has 0 height when collapsed and would never appear
  // under the pointer.
  const { setNodeRef: setSectionRef, isOver } = useDroppable({
    id: `folder:${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });

  const isUncategorized = folder.id === UNCATEGORIZED_FOLDER_ID;

  // Imperative handle so the DropdownMenu's "Rename" item can put the
  // contenteditable into edit mode (focus + select all). Plain object
  // mutated by the editor on mount; no state needed.
  const editHandle = useMemo(() => ({ focus: () => undefined }), []);

  const label = (
    <EditableFolderName
      name={folder.name}
      readOnly={isUncategorized}
      editHandle={editHandle}
      onCommit={onRename}
    />
  );

  // Trailing slot — count badge + (for user folders) a DropdownMenu of
  // folder actions. Wrapped in a stop-prop span so clicks on the menu
  // trigger don't bubble to the accordion's expand/collapse hit target.
  const trailing = (
    <span
      className={styles.folderTrailing}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <Badge variant="neutral">{workflows.length}</Badge>
      {!isUncategorized && (
        <DropdownMenu
          placement="bottom-end"
          width={180}
          trigger={
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              aria-label={`Folder options for ${folder.name}`}
            >
              <DotsHorizontalIcon size={14} />
            </Button>
          }
          groups={[
            {
              id: 'folder-actions',
              options: [
                { id: 'rename', label: 'Rename',         onClick: () => editHandle.focus() },
                { id: 'delete', label: 'Delete folder',  onClick: onDelete, destructive: true },
              ],
            },
          ]}
        />
      )}
    </span>
  );

  return (
    <div
      ref={setSectionRef}
      className={clsx(
        styles.folderSection,
        dragActive && styles.folderSectionDropZone,
        isOver && styles.folderSectionDropActive,
      )}
    >
      <AccordionItem
        value={folder.id}
        label={label}
        trailingSlot={trailing}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        <div className={styles.folderBody}>
          {workflows.length === 0 ? (
            <div className={styles.folderEmpty}>Drag workflows here</div>
          ) : (
            <div className={styles.list}>
              {workflows.map((automation) => (
                <DraggableWorkflowCard
                  key={automation.id}
                  automation={automation}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>
          )}
        </div>
      </AccordionItem>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('card');

  // ── Folder data ──────────────────────────────────────────────────────────
  const { folders, assignments } = useWorkflowFolders();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const moveWorkflow = useMoveWorkflowToFolder();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [conditionFilters, setConditionFilters] = useState<FilterCondition[]>([]);
  const [filterDraft, setFilterDraft] = useState<FilterCondition | null>(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterOpen = filterDraft !== null;

  const openFilterPopover = useCallback(() => {
    if (filterTriggerRef.current) {
      setFilterAnchorRect(filterTriggerRef.current.getBoundingClientRect());
    }
    setFilterDraft(makeBlankFilter());
  }, []);

  const closeFilterPopover = useCallback(() => {
    setFilterDraft(null);
  }, []);

  const filterDraftRef = useRef<FilterCondition | null>(null);
  filterDraftRef.current = filterDraft;

  const commitFilterDraft = useCallback(() => {
    const curr = filterDraftRef.current;
    if (!curr) return;
    const isComplete =
      curr.operator === 'is_empty' ||
      curr.operator === 'is_not_empty' ||
      curr.value.trim() !== '';
    if (!isComplete) return;
    setConditionFilters(prev => [...prev, curr]);
    setFilterDraft(null);
  }, []);

  // ── Workflows ────────────────────────────────────────────────────────────
  const [automations, setAutomations] = useState<Automation[]>(() => {
    const stored = loadWorkflowSettings();
    return MOCK_AUTOMATIONS.map(a => {
      const entry = stored[a.id];
      return entry ? { ...a, name: entry.name, description: entry.description, tags: entry.tags } : a;
    });
  });

  const setStatus = useCallback((id: string, status: AutomationStatus) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const q = search.toLowerCase();
  const filtered = useMemo(() => automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags ?? []).some(t => t.toLowerCase().includes(q));
    const matchesConditions = conditionFilters.every(c => applyFilterCondition(a, c));
    return matchesSearch && matchesConditions;
  }), [automations, q, conditionFilters]);

  // Bucket the filtered workflows by folder. Anything without an explicit
  // assignment falls into Uncategorized.
  const workflowsByFolder = useMemo(() => {
    const map = new Map<string, Automation[]>();
    for (const f of folders) map.set(f.id, []);
    for (const a of filtered) {
      const fid = getWorkflowFolderId(assignments, a.id) ?? UNCATEGORIZED_FOLDER_ID;
      const bucket = map.get(fid) ?? map.get(UNCATEGORIZED_FOLDER_ID)!;
      bucket.push(a);
    }
    return map;
  }, [filtered, folders, assignments]);

  // ── Folder expand/collapse state ─────────────────────────────────────────
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => loadInitialExpandedSet(folders),
  );
  // Whenever a new folder appears (e.g. user just created one), default it
  // to expanded if we haven't seen it before.
  useEffect(() => {
    setExpandedFolders(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const f of folders) {
        let stored: string | null = null;
        try { stored = localStorage.getItem(FOLDER_EXPANDED_KEY(f.id)); } catch { /* noop */ }
        if (stored === null && !next.has(f.id)) {
          next.add(f.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [folders]);

  const toggleFolderExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (expanded) next.add(id); else next.delete(id);
      return next;
    });
    persistExpanded(id, expanded);
  }, []);

  // ── Inline add ───────────────────────────────────────────────────────────
  // The add affordance is a draft AccordionItem rendered at the top of the
  // folder list while `adding` is true. The draft's label is the same
  // EditableFolderName component used for inline rename, so the layout +
  // behaviour match exactly: dotted-underline-on-hover, solid-on-focus,
  // Enter commits, Escape / empty blur cancels.
  const [adding, setAdding] = useState(false);

  const startAdd = () => { setAdding(true); };
  const commitAddName = (v: string) => {
    setAdding(false);
    if (v === '') return;
    const id = createFolder(v);
    persistExpanded(id, true);
    toast.success('Folder created');
  };
  const cancelAdd = () => { setAdding(false); };

  // Default name for a new folder — first integer N that isn't already
  // used by an existing "Folder N" so consecutive adds (without renaming)
  // don't collide. System folder is ignored. Recomputed every render so
  // the draft input always reflects the current state.
  const nextDefaultFolderName = useMemo(() => {
    const used = new Set<number>();
    folders.forEach(f => {
      if (f.isSystem) return;
      const match = /^Folder\s+(\d+)$/.exec(f.name.trim());
      if (match) used.add(parseInt(match[1], 10));
    });
    let n = 1;
    while (used.has(n)) n += 1;
    return `Folder ${n}`;
  }, [folders]);

  // ── Delete confirmation dialog ───────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<WorkflowFolder | null>(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const folder = deleteTarget;
    deleteFolder(folder.id);
    setDeleteTarget(null);
    toast.success(`Deleted "${folder.name}"`, {
      description: 'Workflows moved to Uncategorized.',
      size: 'lg',
    });
  };

  // ── Drag and drop ────────────────────────────────────────────────────────
  // PointerSensor distance: 6 — short clicks (under ~6px movement) never
  // start a drag, so the inner <Link> still navigates. The Switch on the
  // card stops pointerdown earlier so it never even reaches dnd-kit.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [dragWorkflow, setDragWorkflow] = useState<Automation | null>(null);

  // Auto-expand a collapsed folder after ~600ms hover so the user can drop
  // a card into it without manually expanding first.
  const hoverTimerRef = useRef<{ folderId: string; t: number } | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('wf:')) {
      const wfId = id.slice(3);
      const wf = automations.find(a => a.id === wfId) ?? null;
      setDragWorkflow(wf);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    const folderId = e.over?.data?.current?.folderId as string | undefined;
    if (!overId || !folderId) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current.t);
        hoverTimerRef.current = null;
      }
      return;
    }
    // Only schedule auto-expand when entering a NEW collapsed folder; if
    // the same folder is already pending we leave the existing timer alone.
    if (hoverTimerRef.current?.folderId === folderId) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current.t);
    if (expandedFolders.has(folderId)) {
      hoverTimerRef.current = null;
      return;
    }
    const t = window.setTimeout(() => {
      toggleFolderExpanded(folderId, true);
      hoverTimerRef.current = null;
    }, 600);
    hoverTimerRef.current = { folderId, t };
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current.t);
      hoverTimerRef.current = null;
    }
    setDragWorkflow(null);
    const activeId = String(e.active.id);
    const targetFolderId = e.over?.data?.current?.folderId as string | undefined;
    if (!activeId.startsWith('wf:') || !targetFolderId) return;
    const wfId = activeId.slice(3);

    // Optimistic update — move locally first, then mutation. For the local
    // mock there is no failure path; when the API lands, wrap moveWorkflow
    // in a try/catch and revert on failure with toast.error.
    const nextFolderId = targetFolderId === UNCATEGORIZED_FOLDER_ID ? null : targetFolderId;
    moveWorkflow(wfId, nextFolderId);
  };

  const handleDragCancel = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current.t);
      hoverTimerRef.current = null;
    }
    setDragWorkflow(null);
  };

  const dragActive = dragWorkflow !== null;

  // List of folder ids currently expanded — passed as the controlled value
  // to Accordion (multiple type) so all open folders render their bodies.
  const expandedValueArr = useMemo(
    () => folders.filter(f => expandedFolders.has(f.id)).map(f => f.id),
    [folders, expandedFolders],
  );

  return (
    <div className={styles.page}>
      {/* Toolbar — search + view toggle + page-level CTAs on a single
          row, then the filter pill row underneath. The "Add folder" /
          "New workflow" buttons used to live in their own row above
          the toolbar; merging them here lets the search field stretch
          across the full row width while the trailing buttons stay
          right-aligned. */}
      <div className={styles.toolbar}>
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

          <Button
            variant="secondary"
            size="sm"
            leadingArtwork={<PlusIcon size={14} />}
            onClick={startAdd}
          >
            Add folder
          </Button>
          <Button
            variant="primary"
            size="sm"
            leadingArtwork={<PlusIcon size={14} />}
            onClick={() => navigate('/automations/new')}
          >
            New workflow
          </Button>
        </div>

        <FilterPillGroup aria-label="Filters">
          {conditionFilters.map(c => {
            const def = getFilterFieldDef(c.field);
            const opLabel = FILTER_OP_LABEL[c.operator];
            const showValue = c.operator !== 'is_empty' && c.operator !== 'is_not_empty';
            return (
              <FilterPill
                key={c.id}
                active
                onRemove={() => setConditionFilters(prev => prev.filter(f => f.id !== c.id))}
              >
                {def.label} {opLabel.toLowerCase()}{showValue && c.value ? ` ${formatFilterValue(c)}` : ''}
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

      {filterOpen && filterAnchorRect && filterDraft && (
        <FilterPopover
          draft={filterDraft}
          onChange={setFilterDraft}
          onCommit={commitFilterDraft}
          onClose={closeFilterPopover}
          anchorRect={filterAnchorRect}
        />
      )}

      {/* Content */}
      {filtered.length === 0 && conditionFilters.length === 0 && search === '' ? (
        <EmptyState onNew={() => navigate('/automations/new')} />
      ) : view === 'card' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Accordion
            type="multiple"
            value={expandedValueArr}
            onValueChange={(v) => {
              // Reconcile the new expanded array against persistence so a
              // single click on a folder header writes the right localStorage
              // entry. Anything not in the new array becomes collapsed.
              const next = new Set(Array.isArray(v) ? v : [v]);
              for (const f of folders) {
                const wasExpanded = expandedFolders.has(f.id);
                const isExpanded = next.has(f.id);
                if (wasExpanded !== isExpanded) persistExpanded(f.id, isExpanded);
              }
              setExpandedFolders(next);
            }}
          >
            {/* Draft folder row — sits at the top of the list while the
                user is naming a new folder. Reuses AccordionItem so the
                chrome (chevron, header rhythm) matches the real folders;
                the label is the same EditableFolderName used for inline
                rename, so layout + behaviour match exactly. */}
            {adding && (
              <div className={styles.folderSection}>
                <AccordionItem
                  value="__draft__"
                  label={
                    <EditableFolderName
                      name={nextDefaultFolderName}
                      autoFocus
                      placeholder="Folder name"
                      onCommit={commitAddName}
                      onCancel={cancelAdd}
                    />
                  }
                />
              </div>
            )}
            {folders.map(folder => (
              <FolderSection
                key={folder.id}
                folder={folder}
                workflows={workflowsByFolder.get(folder.id) ?? []}
                expanded={expandedFolders.has(folder.id)}
                onExpandedChange={(exp) => toggleFolderExpanded(folder.id, exp)}
                onToggleStatus={setStatus}
                onRename={(next) => renameFolder(folder.id, next)}
                onDelete={() => setDeleteTarget(folder)}
                dragActive={dragActive}
              />
            ))}
          </Accordion>

          <DragOverlay>
            {dragWorkflow ? (
              <WorkflowCardInner
                automation={dragWorkflow}
                onToggleStatus={() => undefined}
                asOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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
                        primary={<span className={styles.nameLink}>{automation.name}</span>}
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

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        aria-labelledby="delete-folder-title"
      >
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <span id="delete-folder-title">Delete folder?</span>
        </DialogHeader>
        <DialogContent>
          Workflows in this folder will be moved to Uncategorized. This cannot
          be undone.
        </DialogContent>
        <DialogFooter>
          <Button variant="tertiary" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={confirmDelete}>
            Delete folder
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
