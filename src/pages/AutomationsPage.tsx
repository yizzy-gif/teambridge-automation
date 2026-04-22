import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Tabs } from '@alloy/components/Tabs';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import { Tag } from '@alloy/components/Tag';
import type { TagColor } from '@alloy/components/Tag';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { Switch } from '@alloy/components/Switch';
import { Button } from '@alloy/components/Button';
import { FilterPill, FilterPillGroup } from '@alloy/components/FilterPill';
import { PlusIcon } from '@alloy/components/icons/PlusIcon';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  CellStack, CellStatusTag, CellTag, CellText,
} from '@alloy/components/Table';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '@alloy/components/icons/ChevronRightIcon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { Bell01Icon } from '@alloy/components/icons/Bell01Icon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { MessageNotificationCircleIcon } from '@alloy/components/icons/MessageNotificationCircleIcon';
import { RefreshCw04Icon } from '@alloy/components/icons/RefreshCw04Icon';
import { BankIcon } from '@alloy/components/icons/BankIcon';
import { PackageIcon } from '@alloy/components/icons/PackageIcon';
import { TeambridgeAIIcon } from '@alloy/components/icons/TeambridgeAIIcon';
import { WorkflowPreview } from '@/components/WorkflowPreview';
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
 * Workflow-level lifecycle status — tracks whether the workflow accepts new
 * triggers. Drives the Active/Paused toggle on the card and the preview's
 * Resume/Pause button. Independent of run-level status below.
 */
type AutomationStatus = 'active' | 'paused' | 'draft';

/**
 * Run-level status — the outcome of the most recent execution. Four terminal
 * / ongoing states per product spec:
 *   - ongoing:   currently executing
 *   - completed: finished successfully (workflow turned off after purpose)
 *   - failed:    errored out or system-stopped due to error
 *   - exited:    soft stop — user stopped mid-run, or flow hit a dead end
 */
type RunStatus = 'ongoing' | 'completed' | 'failed' | 'exited';
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

interface Automation {
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

const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: 'wf_01HGXZ7K3QN4A2MB',
    name: 'New hire onboarding',
    description: 'Sends welcome email and sets up first-week schedule when a new employee is added.',
    status: 'active',
    lastRunStatus: 'ongoing',
    trigger: 'Employee created',
    lastRun: '2 hours ago',
    runsTotal: 48,
    runsSuccessful: 44,
    category: 'HR',
    stats: { reached: 38, pending: 5, skipped: 5 },
    actionIcons: ['mail', 'people', 'task'],
    tags: ['HR', 'Onboarding', 'Welcome'],
    owner: { name: 'Alex Rivera', avatarUrl: 'https://i.pravatar.cc/80?u=alex-rivera' },
    createdAt: '2025-11-03T10:12:00Z',
    updatedAt: '2026-03-28T14:02:00Z',
  },
  {
    id: 'wf_01HGY2F9PW4VRJ8N',
    name: 'Timesheet approval reminder',
    description: 'Notifies managers to approve pending timesheets every Friday at 3pm.',
    status: 'active',
    lastRunStatus: 'failed',
    trigger: 'Schedule — weekly',
    lastRun: '3 days ago',
    runsTotal: 120,
    runsSuccessful: 115,
    category: 'Finance',
    stats: { reached: 98, pending: 12, skipped: 10 },
    actionIcons: ['bell', 'mail', 'finance', 'ai'],
    tags: ['Finance', 'Reminder', 'Weekly'],
    hasErrors: true,
    owner: { name: 'Priya Shah', avatarUrl: 'https://i.pravatar.cc/80?u=priya-shah' },
    createdAt: '2025-08-17T09:00:00Z',
    updatedAt: '2026-04-10T16:30:00Z',
  },
  {
    id: 'wf_01HGYH6CXD3TZ5QK',
    name: 'Shift swap notification',
    description: 'Alerts team members when an open shift becomes available in their role.',
    status: 'paused',
    lastRunStatus: 'completed',
    trigger: 'Shift updated',
    lastRun: '1 week ago',
    runsTotal: 31,
    runsSuccessful: 27,
    category: 'Scheduling',
    stats: { reached: 24, pending: 3, skipped: 4 },
    actionIcons: ['bell', 'message'],
    tags: ['Scheduling', 'Notification'],
    owner: { name: 'Jordan Lee', avatarUrl: 'https://i.pravatar.cc/80?u=jordan-lee' },
    createdAt: '2026-01-22T11:45:00Z',
    updatedAt: '2026-04-02T08:15:00Z',
  },
  {
    id: 'wf_01HGZM4P8BKFYTR7',
    name: 'Overtime alert',
    description: 'Flags employees who are approaching their weekly overtime threshold.',
    status: 'draft',
    // lastRunStatus omitted — draft workflows have never run.
    trigger: 'Hours logged',
    lastRun: null,
    runsTotal: 0,
    runsSuccessful: 0,
    category: 'HR',
    stats: { reached: 0, pending: 0, skipped: 0 },
    actionIcons: ['bell'],
    tags: ['HR', 'Alert', 'Payroll'],
    owner: { name: 'Sam Chen', avatarUrl: 'https://i.pravatar.cc/80?u=sam-chen' },
    createdAt: '2026-04-11T17:20:00Z',
    updatedAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'wf_01HH01VQY7JN4E5M',
    name: 'Contractor offboarding',
    description: 'Cleans up access and notifies finance when a contractor contract ends.',
    status: 'active',
    lastRunStatus: 'exited',
    trigger: 'Contract end date',
    lastRun: '5 hours ago',
    runsTotal: 18,
    runsSuccessful: 14,
    category: 'HR',
    stats: { reached: 12, pending: 2, skipped: 4 },
    actionIcons: ['mail', 'task', 'people'],
    tags: ['HR', 'Offboarding'],
    owner: { name: 'Morgan Patel', avatarUrl: 'https://i.pravatar.cc/80?u=morgan-patel' },
    createdAt: '2025-09-09T09:30:00Z',
    updatedAt: '2026-04-16T11:00:00Z',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AutomationStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
};

const CATEGORY_COLOR: Record<string, TagColor> = {
  HR: 'blue',
  Finance: 'matcha',
  Scheduling: 'orange',
};

const STATUS_TAG_STATUS: Record<AutomationStatus, StatusTagStatus> = {
  active: 'success', // green
  paused: 'neutral', // gray
  draft:  'neutral', // gray (distinct from Ongoing's info blue)
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  /** 'draft' filters by workflow lifecycle status; every other value filters
   *  by the workflow's most-recent run status. */
  const [filter, setFilter] = useState<RunStatus | 'draft' | 'all'>('all');

  /** Currently-active tag filters. Matching workflows must include every
   *  applied tag (AND semantics). Starts empty; tags are added one at a time
   *  via the "+ Filter" → editable-pill → Enter flow. */
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const removeTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  }, []);

  /** Value inside the pending/editable pill. `null` when no pill is being
   *  composed; empty string when the user just clicked "+ Filter" and the
   *  input has focus but is empty. */
  const [draftTag, setDraftTag] = useState<string | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  // Focus the input whenever a new draft pill appears.
  useEffect(() => {
    if (draftTag !== null) draftInputRef.current?.focus();
  }, [draftTag]);

  const startNewTagFilter = useCallback(() => setDraftTag(''), []);
  const cancelDraftTag = useCallback(() => setDraftTag(null), []);
  const commitDraftTag = useCallback(() => {
    setDraftTag(prev => {
      const value = (prev ?? '').trim();
      if (!value) return null; // empty → cancel rather than commit
      setActiveTags(tags => {
        if (tags.has(value)) return tags;
        const next = new Set(tags);
        next.add(value);
        return next;
      });
      return null;
    });
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

  // ── Expanded-row state (single-expand) ───────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const previewRegionBaseId = useId();

  const setStatus = useCallback((id: string, status: AutomationStatus) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(curr => (curr === id ? null : id));
  }, []);

  // Escape collapses the open preview
  useEffect(() => {
    if (expandedId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expandedId]);

  // Pause/Resume toggle invoked from the preview
  const toggleStatus = useCallback((id: string) => {
    setAutomations(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, status: a.status === 'paused' ? 'active' : 'paused' }
          : a,
      ),
    );
  }, []);

  const q = search.toLowerCase();
  const filtered = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags ?? []).some(t => t.toLowerCase().includes(q));
    const matchesFilter =
      filter === 'all' ? true
        : filter === 'draft' ? a.status === 'draft'
        : a.lastRunStatus === filter;
    // Tag pills use AND semantics: a workflow must include every selected tag.
    const tags = new Set(a.tags ?? []);
    const matchesTags = activeTags.size === 0 ||
      [...activeTags].every(t => tags.has(t));
    return matchesSearch && matchesFilter && matchesTags;
  });

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
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

          {/* View toggle */}
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

        {/* Tag filter row — starts empty. Clicking "+ Filter" spawns an
            editable pill with an input; Enter commits the typed value as a
            new applied filter, Escape (or blur while empty) cancels. Each
            applied tag renders as a removable pill. AND-combined with the
            search box and the status tabs below. */}
        <FilterPillGroup aria-label="Tag filters">
          {[...activeTags].map(tag => (
            <FilterPill
              key={tag}
              active
              onClick={() => removeTag(tag)}
              onRemove={() => removeTag(tag)}
            >
              {tag}
            </FilterPill>
          ))}
          {draftTag !== null && (
            <span className={styles.draftPill}>
              <input
                ref={draftInputRef}
                className={styles.draftPillInput}
                value={draftTag}
                onChange={e => setDraftTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitDraftTag();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelDraftTag();
                  }
                }}
                onBlur={commitDraftTag}
                placeholder="Type and press Enter"
                aria-label="New filter value"
              />
            </span>
          )}
          {draftTag === null && (
            <Button
              className={styles.filterAddBtn}
              variant="ghost"
              size="sm"
              leadingArtwork={<PlusIcon size={14} />}
              onClick={startNewTagFilter}
              aria-label="Add filter"
            >
              Filter
            </Button>
          )}
        </FilterPillGroup>

        <Tabs value={filter} onChange={(v) => setFilter(v as RunStatus | 'draft' | 'all')}>
          <Tabs.Tab value="all">All</Tabs.Tab>
          <Tabs.Tab value="ongoing">Ongoing</Tabs.Tab>
          <Tabs.Tab value="completed">Completed</Tabs.Tab>
          <Tabs.Tab value="failed">Failed</Tabs.Tab>
          <Tabs.Tab value="exited">Exited</Tabs.Tab>
          <Tabs.Tab value="draft">Draft</Tabs.Tab>
        </Tabs>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState onNew={() => navigate('/automations/new')} />
      ) : view === 'card' ? (
        <div className={styles.list}>
          {filtered.map((automation) => {
            const isDraft    = automation.status === 'draft';
            const isOpen     = expandedId === automation.id;
            const regionId   = `${previewRegionBaseId}-card-${automation.id}`;
            // Clicking anywhere on the card toggles the inline expanded
            // preview. Navigation to the builder is reserved for the
            // "Edit workflow" button inside the expanded panel.
            const toggleThis = () => toggleExpanded(automation.id);
            const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
              // Let nested interactive elements (switch, chevron) handle their
              // own clicks without re-toggling.
              if ((e.target as HTMLElement).closest('[data-card-action]')) return;
              toggleThis();
            };
            const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleThis();
              }
            };
            return (
              <Fragment key={automation.id}>
              <div
                className={clsx(styles.card, isOpen && styles.cardActive)}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={handleCardClick}
                onKeyDown={handleKey}
              >
                {automation.hasErrors && (
                  <span className={styles.cardWarningDot} aria-label="Has recent errors" />
                )}

                {/* ── Top row: status pill · spacer · last run · expand ──
                    Draft workflows haven't run yet, so instead of a run-level
                    badge we surface the workflow's lifecycle state as "Draft". */}
                <div className={styles.cardTop}>
                  {automation.status === 'draft' ? (
                    <StatusBadge status="draft" />
                  ) : automation.lastRunStatus ? (
                    <RunStatusBadge status={automation.lastRunStatus} />
                  ) : null}
                  <span className={styles.cardTopSpacer} />
                  <span className={styles.cardLastRun}>
                    <ClockIcon size={12} />
                    {automation.lastRun ?? 'Never'}
                  </span>
                  <button
                    type="button"
                    data-card-action
                    className={clsx(styles.cardChevronBtn, isOpen && styles.cardChevronBtnOpen)}
                    onClick={e => {
                      e.stopPropagation();
                      toggleExpanded(automation.id);
                    }}
                    aria-label={isOpen ? 'Collapse preview' : 'Expand preview'}
                    aria-expanded={isOpen}
                    aria-controls={regionId}
                  >
                    <ChevronDownIcon size={14} />
                  </button>
                </div>

                {/* ── Body: workflow name (up to 3 lines, ellipsis) ── */}
                <span className={styles.cardName}>{automation.name}</span>

                {/* ── Bottom row: action icon cluster · run count · success count · toggle ── */}
                <div className={styles.cardFooter}>
                  <div className={styles.cardStats}>
                    <ActionIconCluster icons={automation.actionIcons} />
                    <span className={styles.cardStat} title="Total runs">
                      <ListBulletIcon size={12} />
                      {automation.runsTotal}
                    </span>
                    <span className={styles.cardStat} title="Successful runs">
                      <CheckCircleIcon size={12} />
                      {automation.runsSuccessful}
                    </span>
                  </div>
                  <span data-card-action onClick={e => e.stopPropagation()}>
                    <Switch
                      size="sm"
                      checked={automation.status === 'active'}
                      disabled={isDraft}
                      onChange={(on) => setStatus(automation.id, on ? 'active' : 'paused')}
                      aria-label={`${automation.status === 'active' ? 'Pause' : 'Activate'} ${automation.name}`}
                    />
                  </span>
                </div>
              </div>
              {isOpen && (
                <div className={styles.cardExpanded}>
                  <WorkflowPreview
                    layout="card"
                    regionId={regionId}
                    workflow={{
                      id: automation.id,
                      status: automation.status,
                      description: automation.description,
                      owner: automation.owner,
                      createdAt: automation.createdAt,
                      updatedAt: automation.updatedAt,
                      reached: automation.stats.reached,
                    }}
                    onEdit={() => navigate(`/automations/${automation.id}`)}
                    onViewRuns={() => navigate(`/automations/${automation.id}/runs`)}
                    onToggleStatus={() => toggleStatus(automation.id)}
                  />
                </div>
              )}
              </Fragment>
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
                const isOpen = expandedId === automation.id;
                const regionId = `${previewRegionBaseId}-${automation.id}`;
                const goToEditor = () => navigate(`/automations/${automation.id}`);

                return (
                  <Fragment key={automation.id}>
                    <TableRow
                      aria-expanded={isOpen}
                      aria-controls={regionId}
                      onClick={() => toggleExpanded(automation.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <div className={styles.nameCell}>
                          <button
                            type="button"
                            className={styles.expandToggle}
                            aria-label={isOpen ? 'Collapse preview' : 'Expand preview'}
                            aria-expanded={isOpen}
                            aria-controls={regionId}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(automation.id);
                            }}
                          >
                            {isOpen ? (
                              <ChevronDownIcon size={14} />
                            ) : (
                              <ChevronRightIcon size={14} />
                            )}
                          </button>
                          <CellStack
                            primary={
                              <button
                                type="button"
                                className={styles.nameBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToEditor();
                                }}
                              >
                                {automation.name}
                              </button>
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {automation.status === 'draft' ? (
                          <CellStatusTag status={STATUS_TAG_STATUS.draft}>
                            {STATUS_LABEL.draft}
                          </CellStatusTag>
                        ) : automation.lastRunStatus ? (
                          <CellStatusTag status={RUN_STATUS_TAG_STATUS[automation.lastRunStatus]}>
                            {RUN_STATUS_LABEL[automation.lastRunStatus]}
                          </CellStatusTag>
                        ) : (
                          <CellText variant="secondary">—</CellText>
                        )}
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

                    {isOpen && (
                      <WorkflowPreview
                        regionId={regionId}
                        totalColumns={6}
                        workflow={{
                          id: automation.id,
                          status: automation.status,
                          description: automation.description,
                          owner: automation.owner,
                          createdAt: automation.createdAt,
                          updatedAt: automation.updatedAt,
                          reached: automation.stats.reached,
                        }}
                        onEdit={goToEditor}
                        onViewRuns={() => navigate(`/automations/${automation.id}/runs`)}
                        onToggleStatus={() => toggleStatus(automation.id)}
                      />
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
