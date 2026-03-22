import { useState } from 'react';
import { clsx } from 'clsx';
import styles from './IntegrationsPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationCategory = 'all' | 'messaging' | 'payroll' | 'scheduling' | 'hr';
type ConnectionStatus = 'connected' | 'disconnected';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: Exclude<IntegrationCategory, 'all'>;
  status: ConnectionStatus;
  initials: string;
  color: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  { id: '1', name: 'Slack', description: 'Send messages and notifications to channels or DMs.', category: 'messaging', status: 'connected', initials: 'Sl', color: '#4A154B' },
  { id: '2', name: 'Gmail', description: 'Send emails to employees or external contacts.', category: 'messaging', status: 'disconnected', initials: 'Gm', color: '#EA4335' },
  { id: '3', name: 'Gusto', description: 'Sync payroll runs and employee compensation data.', category: 'payroll', status: 'disconnected', initials: 'Gu', color: '#F45D48' },
  { id: '4', name: 'ADP', description: 'Push approved timesheets directly to payroll.', category: 'payroll', status: 'disconnected', initials: 'AD', color: '#D50000' },
  { id: '5', name: 'When I Work', description: 'Pull shift schedules and coverage data.', category: 'scheduling', status: 'connected', initials: 'WW', color: '#00A99D' },
  { id: '6', name: 'BambooHR', description: 'Sync employee profiles and org chart changes.', category: 'hr', status: 'disconnected', initials: 'Ba', color: '#7BC67E' },
];

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  all: 'All',
  messaging: 'Messaging',
  payroll: 'Payroll',
  scheduling: 'Scheduling',
  hr: 'HR',
};

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration }: { integration: Integration }) {
  const [status, setStatus] = useState<ConnectionStatus>(integration.status);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    setLoading(true);
    setTimeout(() => {
      setStatus((s) => (s === 'connected' ? 'disconnected' : 'connected'));
      setLoading(false);
    }, 800);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardLogo} style={{ background: integration.color }}>
        {integration.initials}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.cardName}>{integration.name}</span>
          <span className={clsx(styles.statusDot, status === 'connected' && styles.statusDotConnected)} />
        </div>
        <p className={styles.cardDesc}>{integration.description}</p>
      </div>
      <button
        className={clsx(styles.connectBtn, status === 'connected' && styles.connectBtnConnected)}
        onClick={toggle}
        disabled={loading}
        data-loading={loading || undefined}
      >
        {loading ? '…' : status === 'connected' ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const [category, setCategory] = useState<IntegrationCategory>('all');
  const [search, setSearch] = useState('');

  const filtered = INTEGRATIONS.filter((i) => {
    const matchesCat = category === 'all' || i.category === category;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className={styles.page}>
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
            placeholder="Search integrations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search integrations"
          />
        </div>

        <div className={styles.filterGroup} role="group" aria-label="Filter by category">
          {(Object.keys(CATEGORY_LABELS) as IntegrationCategory[]).map((cat) => (
            <button
              key={cat}
              className={clsx(styles.filterBtn, category === cat && styles.filterBtnActive)}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
