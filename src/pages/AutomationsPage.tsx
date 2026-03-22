import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import styles from './AutomationsPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type AutomationStatus = 'active' | 'paused' | 'draft';

interface Automation {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  trigger: string;
  lastRun: string | null;
  runsTotal: number;
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
  },
  {
    id: '2',
    name: 'Timesheet approval reminder',
    description: 'Notifies managers to approve pending timesheets every Friday at 3pm.',
    status: 'active',
    trigger: 'Schedule — weekly',
    lastRun: '3 days ago',
    runsTotal: 120,
  },
  {
    id: '3',
    name: 'Shift swap notification',
    description: 'Alerts team members when an open shift becomes available in their role.',
    status: 'paused',
    trigger: 'Shift updated',
    lastRun: '1 week ago',
    runsTotal: 31,
  },
  {
    id: '4',
    name: 'Overtime alert',
    description: 'Flags employees who are approaching their weekly overtime threshold.',
    status: 'draft',
    trigger: 'Hours logged',
    lastRun: null,
    runsTotal: 0,
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AutomationStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
};

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <span className={clsx(styles.badge, styles[`badge_${status}`])}>
      <span className={styles.badgeDot} />
      {STATUS_LABEL[status]}
    </span>
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

  const filtered = MOCK_AUTOMATIONS.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || a.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
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

        <div className={styles.filterGroup} role="group" aria-label="Filter by status">
          {(['all', 'active', 'paused', 'draft'] as const).map((f) => (
            <button
              key={f}
              className={clsx(styles.filterBtn, filter === f && styles.filterBtnActive)}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </button>
          ))}
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

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState onNew={() => navigate('/automations/new')} />
      ) : (
        <div className={styles.list}>
          {filtered.map((automation) => (
            <button
              key={automation.id}
              className={styles.card}
              onClick={() => navigate(`/automations/${automation.id}`)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{automation.name}</span>
                <StatusBadge status={automation.status} />
              </div>
              <p className={styles.cardDesc}>{automation.description}</p>
              <div className={styles.cardMeta}>
                <span className={styles.metaItem}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M1.5 6c0-2.485 2.015-4.5 4.5-4.5S10.5 3.515 10.5 6 8.485 10.5 6 10.5 1.5 8.485 1.5 6Z" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {automation.trigger}
                </span>
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
      )}
    </div>
  );
}
