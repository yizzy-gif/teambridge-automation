import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Tabs } from '@alloy/components/Tabs';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import { Tag } from '@alloy/components/Tag';
import type { TagColor } from '@alloy/components/Tag';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { DataCard } from '@alloy/components/DataCard';
import { Divider } from '@alloy/components/Divider';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  CellStack, CellStatusTag, CellTag, CellText,
} from '@alloy/components/Table';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
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

type AutomationStatus = 'active' | 'paused' | 'draft';
type ViewMode = 'card' | 'table';

interface AutomationStats {
  reached: number;  // successfully acted on (green)
  pending: number;  // queued / awaiting step (blue)
  skipped: number;  // condition unmet / filtered out (yellow)
}

interface Automation {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  trigger: string;
  lastRun: string | null;
  runsTotal: number;
  category: string;
  stats: AutomationStats;
  tags?: string[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: '1',
    name: 'New hire onboarding',
    description: 'Sends welcome email and sets up first-week schedule when a new employee is added.',
    status: 'active',
    trigger: 'Employee created',
    lastRun: '2 hours ago',
    runsTotal: 48,
    category: 'HR',
    stats: { reached: 38, pending: 5, skipped: 5 },
  },
  {
    id: '2',
    name: 'Timesheet approval reminder',
    description: 'Notifies managers to approve pending timesheets every Friday at 3pm.',
    status: 'active',
    trigger: 'Schedule — weekly',
    lastRun: '3 days ago',
    runsTotal: 120,
    category: 'Finance',
    stats: { reached: 98, pending: 12, skipped: 10 },
  },
  {
    id: '3',
    name: 'Shift swap notification',
    description: 'Alerts team members when an open shift becomes available in their role.',
    status: 'paused',
    trigger: 'Shift updated',
    lastRun: '1 week ago',
    runsTotal: 31,
    category: 'Scheduling',
    stats: { reached: 24, pending: 3, skipped: 4 },
  },
  {
    id: '4',
    name: 'Overtime alert',
    description: 'Flags employees who are approaching their weekly overtime threshold.',
    status: 'draft',
    trigger: 'Hours logged',
    lastRun: null,
    runsTotal: 0,
    category: 'HR',
    stats: { reached: 0, pending: 0, skipped: 0 },
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
  active: 'success',
  paused: 'warning',
  draft: 'neutral',
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <StatusTag status={STATUS_TAG_STATUS[status]} size="sm">
      {STATUS_LABEL[status]}
    </StatusTag>
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
  const [filter, setFilter] = useState<AutomationStatus | 'all'>('all');
  const [view, setView] = useState<ViewMode>('card');

  // Merge localStorage-saved settings over mock data (name, description, tags)
  const [automations] = useState<Automation[]>(() => {
    const stored = loadWorkflowSettings();
    return MOCK_AUTOMATIONS.map(a => {
      const entry = stored[a.id];
      return entry ? { ...a, name: entry.name, description: entry.description, tags: entry.tags } : a;
    });
  });

  const totalRuns   = automations.reduce((s, a) => s + a.runsTotal, 0);
  const totalReached = automations.reduce((s, a) => s + a.stats.reached, 0);
  const totalStats   = automations.reduce((s, a) => s + a.stats.reached + a.stats.pending + a.stats.skipped, 0);
  const completionRate = totalStats > 0 ? Math.round((totalReached / totalStats) * 100) : 0;
  const activeCount  = automations.filter((a) => a.status === 'active').length;

  const q = search.toLowerCase();
  const filtered = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags ?? []).some(t => t.toLowerCase().includes(q));
    const matchesFilter = filter === 'all' || a.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.page}>
      {/* Metric cards */}
      <div className={styles.metrics}>
        <DataCard
          color="slate"
          icon={<Grid01Icon size={24} />}
          label="Automations"
          value={automations.length}
          tag={`${activeCount} active`}
          tagColor="green"
        />
        <DataCard
          color="blue"
          icon={<BarChart02Icon size={24} />}
          label="Total runs"
          value={totalRuns}
          tag="all time"
          tagColor="neutral"
        />
        <DataCard
          color="green"
          icon={<Users03Icon size={24} />}
          label="People reached"
          value={totalReached}
          tag={`${automations.reduce((s, a) => s + a.stats.pending, 0)} pending`}
          tagColor="blue"
        />
        <DataCard
          color="matcha"
          icon={<CheckCircleIcon size={24} />}
          label="Completion rate"
          value={`${completionRate}%`}
          tag={`${automations.reduce((s, a) => s + a.stats.skipped, 0)} skipped`}
          tagColor="yellow"
        />
      </div>

      <Divider />

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

        <Tabs value={filter} onChange={(v) => setFilter(v as AutomationStatus | 'all')}>
          <Tabs.Tab value="all">All</Tabs.Tab>
          <Tabs.Tab value="active">Active</Tabs.Tab>
          <Tabs.Tab value="paused">Paused</Tabs.Tab>
          <Tabs.Tab value="draft">Draft</Tabs.Tab>
        </Tabs>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState onNew={() => navigate('/automations/new')} />
      ) : view === 'card' ? (
        <div className={styles.list}>
          {filtered.map((automation) => (
            <button
              key={automation.id}
              className={styles.card}
              onClick={() => navigate(`/automations/${automation.id}`)}
            >
              <div className={styles.cardTop}>
                <StatusBadge status={automation.status} />
                <Tag color={CATEGORY_COLOR[automation.category]} size="sm" variant="subtle">
                  {automation.category}
                </Tag>
              </div>
              <span className={styles.cardName}>{automation.name}</span>
              <p className={styles.cardDesc}>{automation.description}</p>
              {(automation.tags ?? []).length > 0 && (
                <div className={styles.cardTags}>
                  {(automation.tags ?? []).map(tag => (
                    <Tag key={tag} color="slate" size="sm" variant="subtle">{tag}</Tag>
                  ))}
                </div>
              )}
              <AutomationBar stats={automation.stats} />
              <div className={styles.cardMeta}>
                {automation.lastRun && (
                  <span className={styles.metaItem}>
                    Last run {automation.lastRun}
                  </span>
                )}
                <span className={styles.metaItem}>
                  {automation.runsTotal} runs
                </span>
              </div>
            </button>
          ))}
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
                <TableHead>Stats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((automation) => (
                <TableRow
                  key={automation.id}
                  onClick={() => navigate(`/automations/${automation.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <CellStack
                      primary={automation.name}
                      secondary={automation.description}
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
                  <TableCell>
                    <AutomationBar stats={automation.stats} compact />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
