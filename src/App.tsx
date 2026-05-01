import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ToastProvider } from '@alloy/components/Toast';
import { AppShell } from './layouts/AppShell';
import { AutomationsPage } from './pages/AutomationsPage';
import { AutomationDetailPage } from './pages/AutomationDetailPage';
import { BuilderPage } from './pages/BuilderPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { UsagePage } from './pages/UsagePage';

/** Remount the BuilderPage whenever the workflow id in the URL changes so
 *  the per-workflow template loads fresh (otherwise useState initializers
 *  don't re-run on param changes). */
function BuilderRoute() {
  const { id } = useParams();
  return <BuilderPage key={id ?? 'new'} />;
}

/** Detail page mirrors the same remount-on-id pattern so per-id data hooks
 *  re-initialise cleanly when navigating between workflows. */
function AutomationDetailRoute() {
  const { id } = useParams();
  return <AutomationDetailPage key={id ?? 'unknown'} />;
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
      <Routes>
        {/* ── Full-screen builder — no app shell ──
            New canonical route: `/automations/:id/edit`. Triggered from
            the read-only detail page's Edit-workflow CTA. The `/new`
            route stays at its old shape so empty-state CTAs don't
            need updates. */}
        <Route path="/automations/new"      element={<BuilderRoute />} />
        <Route path="/automations/:id/edit" element={<BuilderRoute />} />

        {/* ── Shell-wrapped pages ── */}
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/automations" replace />} />
          <Route path="/automations"     element={<AutomationsPage />} />
          <Route path="/automations/:id" element={<AutomationDetailRoute />} />
          <Route path="/templates"       element={<TemplatesPage />} />
          <Route path="/usage"           element={<UsagePage />} />
          <Route path="/settings"        element={<SettingsPage />} />
        </Route>
      </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
