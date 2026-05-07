import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ScrollArea } from '@alloy/components/ScrollArea';
import { Breadcrumb } from '@alloy/components/Breadcrumb';
import { Button } from '@alloy/components/Button';
import { AICoreButton } from '@alloy/components/ai/AICoreButton';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { BarChart02Icon } from '@alloy/components/icons/BarChart02Icon';
import { SettingsGearIcon } from '@alloy/components/icons/SettingsGearIcon';
import { DotsHorizontalIcon } from '@alloy/components/icons/DotsHorizontalIcon';
import { Menu02Icon } from '@alloy/components/icons/Menu02Icon';
import { PrimaryNav } from '@/components/PrimaryNav';
import { MOCK_AUTOMATIONS } from '@/pages/AutomationsPage';
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
  const navigate = useNavigate();

  // Detail page mounts inside the AppShell at `/automations/:id`; we
  // surface its breadcrumb in the top bar instead of the page body so
  // it lives at the same level as every other page-title slot. Pull the
  // workflow name from the same mock the detail page reads — when the
  // real fetcher lands the breadcrumb hook can move alongside it.
  const detailMatch = location.pathname.match(/^\/automations\/([^/]+)\/?$/);
  const detailId    = detailMatch ? detailMatch[1] : null;
  const detailName  = detailId
    ? MOCK_AUTOMATIONS.find(a => a.id === detailId)?.name ?? 'Workflow'
    : null;

  const pageTitle = (() => {
    if (location.pathname.startsWith('/automations/new'))     return 'New Automation';
    // Editor lives at `/automations/:id/edit` now — the bare
    // `/automations/:id` path renders the read-only detail page.
    if (location.pathname.match(/^\/automations\/[^/]+\/edit/)) return 'Edit Automation';
    if (location.pathname.startsWith('/automations'))         return 'Manage';
    if (location.pathname.startsWith('/templates'))           return 'Templates';
    if (location.pathname.startsWith('/usage'))               return 'Usage';
    if (location.pathname.startsWith('/settings'))            return 'Settings';
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
          <header
            className={clsx(
              styles.topBar,
              location.pathname.startsWith('/templates') && styles.topBarBorderless,
            )}
          >
            <div className={styles.topBarHeading}>
              {detailName ? (
                <Breadcrumb
                  separator="chevron"
                  items={[
                    { label: 'Workflows', onClick: () => navigate('/automations') },
                    { label: detailName },
                  ]}
                />
              ) : (
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
              )}
            </div>
            <div className={styles.topBarActions}>
              {/* Top-right cluster — mirrors the TeambridgeCode TopNav:
                   ghost icon-buttons grouped together on the left, then
                   a dedicated Activity icon button, then the Alloy
                   AICoreButton (Ponder AI). All Alloy primitives so
                   styling tracks Alloy tokens automatically. */}
              <div className={styles.topBarBtnGroup}>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="More options"
                  title="More options"
                >
                  <DotsHorizontalIcon size={14} />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Activity"
                title="Activity"
              >
                <Menu02Icon size={14} />
              </Button>
              <AICoreButton aria-label="Ponder AI" size="sm" />
            </div>
          </header>

          <main className={styles.content}>
            {/* Templates route uses a tinted bg-secondary scroll surface
                with rounded top corners pinned to the viewport's top.
                Other routes get a plain transparent scroll viewport so
                their pages render against the AppShell's bg-primary. */}
            <ScrollArea
              className={clsx(
                styles.contentScroll,
                location.pathname.startsWith('/templates') && styles.contentScrollTinted,
              )}
            >
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
