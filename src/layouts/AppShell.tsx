import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { ScrollArea } from '@alloy/components/ScrollArea';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { SettingsGearIcon } from '@alloy/components/icons/SettingsGearIcon';
import { DotsHorizontalIcon } from '@alloy/components/icons/DotsHorizontalIcon';
import { Menu02Icon } from '@alloy/components/icons/Menu02Icon';
import { PrimaryNav } from '@/components/PrimaryNav';
import styles from './AppShell.module.css';

// ─── Secondary nav items ──────────────────────────────────────────────────────
// Icons are pulled from `@alloy/components/icons/*` so the visual language
// stays in lockstep with the rest of the product (every other icon in the
// app shell, top bar, builder canvas, etc. comes from the same set).

const primaryNav = [
  {
    to: '/automations',
    label: 'Manage',
    icon: <ListBulletIcon size={16} />,
  },
  {
    to: '/templates',
    label: 'Templates',
    icon: <Grid01Icon size={16} />,
  },
];

const bottomNav = [
  {
    to: '/usage',
    label: 'Usage',
    icon: <BarChart02Icon size={16} />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <SettingsGearIcon size={16} />,
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
    if (location.pathname.startsWith('/usage')) return 'Usage';
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
            <h2 className={styles.navHeading}>Workflow</h2>
          </div>

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
            <div className={styles.topBarHeading}>
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
            </div>
            <div className={styles.topBarActions}>
              <button
                type="button"
                className={styles.topBarIconBtn}
                aria-label="More options"
                title="More options"
              >
                <DotsHorizontalIcon size={14} />
              </button>
              <button
                type="button"
                className={styles.topBarIconBtn}
                aria-label="Activity"
                title="Activity"
              >
                <Menu02Icon size={14} />
              </button>
            </div>
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
