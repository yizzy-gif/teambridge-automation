/* ─────────────────────────────────────────────────────────────────────────────
   Usage · aggregated run data
   -----------------------------------------------------------------------------
   Normalizes a year of deterministic run history across every workflow so the
   Usage page can show totals, deltas, and a time-series chart. Seeded PRNG
   keeps the numbers stable across re-renders.
   TODO(backend): replace MOCK_RUNS with the real /api/usage/runs stream once
   it lands.
   ───────────────────────────────────────────────────────────────────────────── */

export type TimeRange = '24h' | '7d' | '30d' | 'all';

export type RunStatus = 'completed' | 'failed' | 'ongoing' | 'exited';

export interface UsageWorkflow {
  id:        string;
  name:      string;
  category:  string;
  trigger:   string;
  /** Mean daily run rate — drives the distribution over the year. */
  baseline:  number;
  /** Success rate 0..1 — success vs. failed/exited. */
  successRate: number;
}

/* Mirrors the summary metadata of MOCK_AUTOMATIONS on AutomationsPage, plus
   the per-workflow baseline needed to synthesize a plausible run stream. */
export const USAGE_WORKFLOWS: UsageWorkflow[] = [
  { id: 'wf_01HGXZ7K3QN4A2MB', name: 'New hire onboarding',          category: 'HR',         trigger: 'Employee created',    baseline: 0.8, successRate: 0.92 },
  { id: 'wf_01HGY2F9PW4VRJ8N', name: 'Timesheet approval reminder',  category: 'Finance',    trigger: 'Schedule — weekly',   baseline: 2.4, successRate: 0.88 },
  { id: 'wf_01HGYH6CXD3TZ5QK', name: 'Shift swap notification',      category: 'Scheduling', trigger: 'Shift updated',       baseline: 0.5, successRate: 0.90 },
  { id: 'wf_01HGZM4P8BKFYTR7', name: 'Overtime alert',               category: 'HR',         trigger: 'Hours logged',        baseline: 0.1, successRate: 0.85 },
  { id: 'wf_01HH01VQY7JN4E5M', name: 'Contractor offboarding',       category: 'HR',         trigger: 'Contract end date',   baseline: 0.4, successRate: 0.80 },
];

export interface UsageRun {
  id:          string;
  workflowId:  string;
  /** ISO timestamp when the run was triggered. */
  timestamp:   string;
  status:      RunStatus;
  /** People successfully acted on. */
  reached:     number;
  /** People queued / awaiting a follow-up step. */
  pending:     number;
  /** People who matched the trigger but were filtered out by conditions. */
  skipped:     number;
}

// ── PRNG ─────────────────────────────────────────────────────────────────────
// FNV-1a hash + xorshift — stable across machines and runs.
function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Mock data generation ─────────────────────────────────────────────────────
// Anchored to a fixed "now" (2026-04-20) so filters like "last 7d" produce a
// stable window regardless of real-world clock drift during dev.
export const MOCK_NOW = new Date('2026-04-20T12:00:00Z');

/** Generate `days` × baseline runs per workflow, sprinkled across each day. */
function generateRuns(): UsageRun[] {
  const runs: UsageRun[] = [];
  const totalDays = 365;
  const anchor = new Date(MOCK_NOW);
  anchor.setUTCHours(0, 0, 0, 0);

  for (const wf of USAGE_WORKFLOWS) {
    const rnd = seeded(`runs|${wf.id}`);
    for (let d = 0; d < totalDays; d++) {
      const dayStart = new Date(anchor);
      dayStart.setUTCDate(dayStart.getUTCDate() - d);

      // Poisson-ish count around baseline (2× floor for some variance).
      const jitter = rnd();
      const count = Math.max(0, Math.round(wf.baseline + (jitter - 0.5) * wf.baseline * 2.5));

      for (let r = 0; r < count; r++) {
        // Distribute within the day — favor weekday business hours.
        const hourRnd = rnd();
        const hour = Math.floor(8 + hourRnd * 11); // 8am–7pm local-ish
        const minute = Math.floor(rnd() * 60);
        const ts = new Date(dayStart);
        ts.setUTCHours(hour, minute, Math.floor(rnd() * 60), 0);
        if (ts.getTime() > MOCK_NOW.getTime()) continue;

        // Status distribution — weighted around successRate.
        const sRnd = rnd();
        let status: RunStatus;
        if (d === 0 && sRnd < 0.12) status = 'ongoing';
        else if (sRnd < wf.successRate) status = 'completed';
        else if (sRnd < wf.successRate + 0.07) status = 'exited';
        else status = 'failed';

        const reached = status === 'completed' ? 1 + Math.floor(rnd() * 4) : 0;
        const pending = status === 'ongoing' ? 1 + Math.floor(rnd() * 2) : 0;
        const skipped = status === 'exited' ? 1 + Math.floor(rnd() * 3) : 0;

        runs.push({
          id: `${wf.id}_${d}_${r}`,
          workflowId: wf.id,
          timestamp: ts.toISOString(),
          status,
          reached,
          pending,
          skipped,
        });
      }
    }
  }

  return runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const MOCK_RUNS: UsageRun[] = generateRuns();

// ── Window helpers ───────────────────────────────────────────────────────────

export interface TimeWindow {
  from: Date;
  to:   Date;
}

/** Inclusive-from, exclusive-to window for the current period. */
export function getWindow(range: TimeRange): TimeWindow {
  const to = new Date(MOCK_NOW);
  const from = new Date(MOCK_NOW);
  if (range === '24h') from.setUTCHours(from.getUTCHours() - 24);
  else if (range === '7d') from.setUTCDate(from.getUTCDate() - 7);
  else if (range === '30d') from.setUTCDate(from.getUTCDate() - 30);
  else from.setUTCFullYear(from.getUTCFullYear() - 1);
  return { from, to };
}

/** Same-length window immediately before the current one — used for deltas. */
export function getPriorWindow(range: TimeRange): TimeWindow {
  const { from, to } = getWindow(range);
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: new Date(from.getTime()) };
}

export function filterByWindow<T extends { timestamp: string }>(items: T[], window: TimeWindow): T[] {
  const fromMs = window.from.getTime();
  const toMs   = window.to.getTime();
  return items.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return t >= fromMs && t < toMs;
  });
}

export function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? null : 100;
  return ((current - prior) / prior) * 100;
}

// ── Bucketing helpers (for chart) ────────────────────────────────────────────

export type Bucket = 'hour' | 'day' | 'month';

export function bucketFor(range: TimeRange): Bucket {
  if (range === '24h') return 'hour';
  if (range === 'all') return 'month';
  return 'day';
}

export function bucketKey(date: Date, bucket: Bucket): string {
  if (bucket === 'month') return date.toISOString().slice(0, 7);
  if (bucket === 'day')   return date.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 13);
}

export function bucketLabel(date: Date, bucket: Bucket): string {
  if (bucket === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  if (bucket === 'day')   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

export function eachBucketInRange(from: Date, to: Date, bucket: Bucket): Date[] {
  const out: Date[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  if (bucket === 'month') {
    cur.setUTCDate(1); cur.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(1); end.setUTCHours(0, 0, 0, 0);
    while (cur <= end) { out.push(new Date(cur)); cur.setUTCMonth(cur.getUTCMonth() + 1); }
  } else if (bucket === 'day') {
    cur.setUTCHours(0, 0, 0, 0); end.setUTCHours(0, 0, 0, 0);
    while (cur <= end) { out.push(new Date(cur)); cur.setUTCDate(cur.getUTCDate() + 1); }
  } else {
    cur.setUTCMinutes(0, 0, 0); end.setUTCMinutes(0, 0, 0);
    while (cur <= end) { out.push(new Date(cur)); cur.setUTCHours(cur.getUTCHours() + 1); }
  }
  return out;
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export function workflowById(id: string): UsageWorkflow | undefined {
  return USAGE_WORKFLOWS.find(w => w.id === id);
}
