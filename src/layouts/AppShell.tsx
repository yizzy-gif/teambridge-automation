import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { ScrollArea } from '@alloy/components/ScrollArea';
import { Divider } from '@alloy/components/Divider';
import { PrimaryNav } from '@/components/PrimaryNav';
import styles from './AppShell.module.css';

// ─── Secondary nav items ──────────────────────────────────────────────────────

const primaryNav = [
  {
    to: '/automations',
    label: 'Manage',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 4h3v3H2V4ZM6.5 4h7.5M6.5 7.5h7.5M2 9h3v3H2V9ZM6.5 9h7.5M6.5 12.5h7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/templates',
    label: 'Templates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
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

  const pageTitle = (() => {
    if (location.pathname.startsWith('/automations/new')) return 'New Automation';
    if (location.pathname.match(/^\/automations\/.+/)) return 'Edit Automation';
    if (location.pathname.startsWith('/automations')) return 'Manage';
    if (location.pathname.startsWith('/templates')) return 'Templates';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    return 'Automation';
  })();

  return (
    <div className={styles.shell}>
      {/* ── Primary nav (absolute, hover-expand) ── */}
      <PrimaryNav />

      {/* ── Body (offset by collapsed primary nav width) ── */}
      <div className={styles.body}>

        {/* ── Secondary nav sidebar ── */}
        <aside className={styles.sidebar}>
          {/* Heading row */}
          <div className={styles.navHeadingRow}>
            <h2 className={styles.navHeading}>Automation</h2>
          </div>

          <Divider />

          {/* Middle — menu items */}
          <nav className={styles.navMiddle} aria-label="Main">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(styles.navItem, isActive && styles.navItemActive)
                }
              >
                <span className={styles.navItemIcon}>{item.icon}</span>
                <span className={styles.navItemLabel}>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom — page entries */}
          <div className={styles.navBottom}>
            <hr className={styles.navDivider}/>
            {bottomNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(styles.navItem, styles.navItemBottom, isActive && styles.navItemActive)
                }
              >
                <span className={styles.navItemIcon}>{item.icon}</span>
                <span className={styles.navItemLabel}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className={styles.main}>
          <header className={styles.topBar}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </header>

          <main className={styles.content}>
            <ScrollArea className={styles.contentScroll}>
              <div className={styles.contentInner}>
                <Outlet />
              </div>
            </ScrollArea>
          </main>
        </div>

      </div>
    </div>
  );
}
