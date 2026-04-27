import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ToastProvider } from '@alloy/components/Toast';
import { AppShell } from './layouts/AppShell';
import { AutomationsPage } from './pages/AutomationsPage';
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

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
      <Routes>
        {/* ── Full-screen builder — no app shell ── */}
        <Route path="/automations/new" element={<BuilderRoute />} />
        <Route path="/automations/:id" element={<BuilderRoute />} />

        {/* ── Shell-wrapped pages ── */}
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/automations" replace />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
