import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { AutomationsPage } from './pages/AutomationsPage';
import { BuilderPage } from './pages/BuilderPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesPage } from './pages/TemplatesPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Full-screen builder — no app shell ── */}
        <Route path="/automations/new" element={<BuilderPage />} />
        <Route path="/automations/:id" element={<BuilderPage />} />

        {/* ── Shell-wrapped pages ── */}
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/automations" replace />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
