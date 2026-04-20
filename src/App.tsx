import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@alloy/components/Toast';
import { AppShell } from './layouts/AppShell';
import { AutomationsPage } from './pages/AutomationsPage';
import { BuilderPage } from './pages/BuilderPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { UsagePage } from './pages/UsagePage';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
      <Routes>
        {/* ── Full-screen builder — no app shell ── */}
        <Route path="/automations/new" element={<BuilderPage />} />
        <Route path="/automations/:id" element={<BuilderPage />} />

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
