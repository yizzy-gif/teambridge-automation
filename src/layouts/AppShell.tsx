import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { ScrollArea } from '@alloy/components/ScrollArea';
import styles from './AppShell.module.css';

// ─── Nav items ────────────────────────────────────────────────────────────────

const primaryNav = [
  {
    to: '/automations',
    label: 'Automations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 4h3v3H2V4ZM6.5 4h7.5M6.5 7.5h7.5M2 9h3v3H2V9ZM6.5 9h7.5M6.5 12.5h7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/integrations',
    label: 'Integrations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M12 9.5v2M12 11.5h2M12 11.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="12" cy="13.5" r="1" fill="currentColor"/>
      </svg>
    ),
  },
];

const bottomNav = [
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppShell() {
  const location = useLocation();

  // Determine current page title for the header
  const pageTitle = (() => {
    if (location.pathname.startsWith('/automations/new')) return 'New Automation';
    if (location.pathname.match(/^\/automations\/.+/)) return 'Edit Automation';
    if (location.pathname.startsWith('/automations')) return 'Automations';
    if (location.pathname.startsWith('/integrations')) return 'Integrations';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    return 'Automation';
  })();

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Logo / wordmark */}
        <div className={styles.logoArea}>
          <div className={styles.logo} aria-label="Teambridge">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect width="20" height="20" rx="5" fill="var(--color-bg-inverse-primary)"/>
              <path d="M5 7h10M5 10h7M5 13h10" stroke="var(--color-content-inverse)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoLabel}>Teambridge</span>
        </div>

        {/* Section label */}
        <div className={styles.sectionLabel}>Automation</div>

        {/* Primary nav */}
        <nav className={styles.nav} aria-label="Main">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(styles.navItem, isActive && styles.navItemActive)
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <nav className={styles.navBottom} aria-label="Secondary">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(styles.navItem, isActive && styles.navItemActive)
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <ScrollArea className={styles.contentScroll}>
            <div className={styles.contentInner}>
              <Outlet />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
