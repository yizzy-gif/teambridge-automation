/* ─────────────────────────────────────────────────────────────────────────────
   Workflows · daily runs API
   -----------------------------------------------------------------------------
   Proposed route (not yet implemented on the backend):

     GET /api/workflows/:id/runs/daily?timeframe=all|24h|7d|30d
       → DailyRunsResponse

   Returns the current window and the immediately-preceding window (same length)
   so the client can compute a vs-previous delta without a second round-trip.
   Days are always full, zero-filled, oldest → newest.

   TODO(backend): replace `mockDailyRunsClient` with an HTTP client once the
   route lands. Callers should keep importing `dailyRunsClient` — the mock is
   the default export for now.
   ───────────────────────────────────────────────────────────────────────────── */

export type Timeframe = 'all' | '24h' | '7d' | '30d';

export interface DailyRunPoint {
  /**
   * When the granularity is daily (7d, 30d, all), this is an ISO-8601 date
   * (YYYY-MM-DD). For the 24h window this is a full ISO timestamp marking
   * the start of the hour bucket.
   */
  date: string;
  /** Total runs triggered in this bucket (hour or day). */
  runs: number;
  /** Subset of `runs` that completed successfully — used for success-rate. */
  successes: number;
}

export interface DailyRunsSummary {
  /** Sum of `current[].runs`. */
  totalRuns: number;
  /** Sum of `previous[].runs` — component derives deltaPct. */
  previousTotalRuns: number;
  /**
   * Explicit prior-period sample size so the 7d delta-hiding rule does not
   * require the client to re-sum.
   */
  priorSampleSize: number;
  /** Overall success rate across the current window, 0..1. */
  successRate: number;
}

export interface DailyRunsResponse {
  timeframe: Timeframe;
  current: DailyRunPoint[];
  previous: DailyRunPoint[];
  summary: DailyRunsSummary;
}

export interface DailyRunsClient {
  getDailyRuns(workflowId: string, timeframe: Timeframe): Promise<DailyRunsResponse>;
}

/* ── Mock implementation ──────────────────────────────────────────────────── */

/** Number of data points per window. */
const POINTS_IN: Record<Timeframe, number> = {
  '24h': 24,
  '7d':   7,
  '30d':  30,
  'all':  180,
};

/** Granularity of each bucket — drives hourly vs daily step in makeWindow. */
type Granularity = 'hour' | 'day';
const GRANULARITY_OF: Record<Timeframe, Granularity> = {
  '24h': 'hour',
  '7d':  'day',
  '30d': 'day',
  'all': 'day',
};

/** Deterministic PRNG so the mock is stable across renders for a given key. */
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

function makeWindow(
  workflowId: string,
  points: number,
  offsetPoints: number,
  granularity: Granularity,
): DailyRunPoint[] {
  const out: DailyRunPoint[] = [];
  const anchor = new Date();
  if (granularity === 'hour') {
    anchor.setMinutes(0, 0, 0);
  } else {
    anchor.setHours(0, 0, 0, 0);
  }
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(anchor);
    const step = i + offsetPoints;
    if (granularity === 'hour') {
      d.setHours(anchor.getHours() - step);
    } else {
      d.setDate(anchor.getDate() - step);
    }
    const iso = granularity === 'hour' ? d.toISOString() : d.toISOString().slice(0, 10);
    const rnd = seeded(`${workflowId}|${iso}`);
    // Hourly buckets are lower-volume than daily, so scale the random runs down.
    const maxRuns = granularity === 'hour' ? 5 : 14;
    const runs = Math.floor(rnd() * maxRuns);
    const successes = Math.round(runs * (0.7 + rnd() * 0.25));
    out.push({ date: iso, runs, successes });
  }
  return out;
}

export const mockDailyRunsClient: DailyRunsClient = {
  async getDailyRuns(workflowId, timeframe) {
    const points = POINTS_IN[timeframe];
    const granularity = GRANULARITY_OF[timeframe];
    const current = makeWindow(workflowId, points, 0, granularity);
    const previous = makeWindow(workflowId, points, points, granularity);
    const totalRuns = current.reduce((s, p) => s + p.runs, 0);
    const previousTotalRuns = previous.reduce((s, p) => s + p.runs, 0);
    const successes = current.reduce((s, p) => s + p.successes, 0);
    return {
      timeframe,
      current,
      previous,
      summary: {
        totalRuns,
        previousTotalRuns,
        priorSampleSize: previousTotalRuns,
        successRate: totalRuns > 0 ? successes / totalRuns : 0,
      },
    };
  },
};

/** Default export — swap implementation here when the real route lands. */
export const dailyRunsClient: DailyRunsClient = mockDailyRunsClient;
