'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import PriceSparkline from '@/components/market/PriceSparkline';

type ActionPriority = 'high' | 'medium' | 'low';

type NextBestAction = {
  type: string;
  item_id?: number;
  item_name: string;
  reason: string;
  priority: ActionPriority;
  score: number;
  suggested_buy?: number;
  suggested_sell?: number;
  spread_pct?: number;
  suggested_qty?: number;
  est_profit?: number;
};

type Position = {
  id: string;
  item_id: number;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number | null;
  unrealized_profit: number | null;
};

type DashboardPayload = {
  actions: NextBestAction[];
  queue: NextBestAction[];
  positions: Position[];
  summary: {
    open_positions: number;
    queued_actions: number;
    high_priority_actions: number;
    estimated_unrealized_profit: number;
  };
};

type Thesis = {
  id: string;
  item_id: number;
  item_name: string;
  target_buy: number | null;
  target_sell: number | null;
  priority: ActionPriority;
  active: boolean;
};

type ReconciliationTask = {
  id: string;
  task_type: string;
  item_id: number | null;
  item_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  details: any;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

const tabs = ['Home', 'Scan', 'Queue', 'Positions', 'More'] as const;
type Tab = (typeof tabs)[number];

function PriorityBadge({ priority }: { priority: ActionPriority }) {
  const className = priority === 'high' ? 'badge-high' : priority === 'medium' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${className}`}>{priority.toUpperCase()}</span>;
}

export default function PassiveApp() {
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [reconciliationTasks, setReconciliationTasks] = useState<ReconciliationTask[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [inboxBootstrapped, setInboxBootstrapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newThesis, setNewThesis] = useState({ item_id: '', item_name: '', target_buy: '', target_sell: '', priority: 'medium' as ActionPriority });
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string } | null>(null);
  const [sparklineStep, setSparklineStep] = useState<'5m' | '1h' | '6h' | '24h'>('5m');
  const [sparklineValues, setSparklineValues] = useState<number[]>([]);
  const [sparklineLoading, setSparklineLoading] = useState(false);
  const [sparklineError, setSparklineError] = useState<string | null>(null);

  const actions = useMemo(() => dashboard?.actions ?? [], [dashboard]);
  const queue = useMemo(() => dashboard?.queue ?? [], [dashboard]);
  const positions = useMemo(() => dashboard?.positions ?? [], [dashboard]);
  const summary = dashboard?.summary;

  const sparkStats = useMemo(() => {
    if (sparklineValues.length < 2) return null;
    const min = Math.min(...sparklineValues);
    const max = Math.max(...sparklineValues);
    const first = sparklineValues[0] ?? null;
    const last = sparklineValues[sparklineValues.length - 1] ?? null;
    if (typeof first !== 'number' || typeof last !== 'number') return null;
    const delta = last - first;
    const pct = first !== 0 ? (delta / first) * 100 : null;
    return { min, max, first, last, delta, pct };
  }, [sparklineValues]);

  useEffect(() => {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    let mounted = true;

    async function loadSparkline() {
      setSparklineLoading(true);
      setSparklineError(null);
      try {
        const res = await fetch(`/api/market/timeseries?timestep=${encodeURIComponent(sparklineStep)}&id=${encodeURIComponent(String(itemId))}`);
        const payload = (await res.json().catch(() => null)) as { data?: Array<{ avgHighPrice?: number | null; avgLowPrice?: number | null }> ; error?: string } | null;
        if (!res.ok) throw new Error(payload?.error ? payload.error : `Failed to load chart (${res.status})`);

        const values = (payload?.data ?? [])
          .map((point) => (typeof point.avgHighPrice === 'number' ? point.avgHighPrice : point.avgLowPrice ?? null))
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

        if (!mounted) return;
        setSparklineValues(values);
      } catch (err) {
        if (!mounted) return;
        setSparklineError(err instanceof Error ? err.message : 'Failed to load chart.');
        setSparklineValues([]);
      } finally {
        if (mounted) setSparklineLoading(false);
      }
    }

    void loadSparkline();

    return () => {
      mounted = false;
    };
  }, [selectedItem, sparklineStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupabase(createBrowserSupabaseClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const { data } = await sb.auth.getUser();
        if (!mounted) return;
        setIsAuthed(Boolean(data.user));
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(Boolean(session?.user));
    });

    void bootstrapAuth();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const highPriorityCount = useMemo(() => actions.filter((a) => a.priority === 'high').length, [actions]);
  const pendingReconCount = useMemo(
    () => reconciliationTasks.filter((task) => task.status === 'pending').length,
    [reconciliationTasks]
  );

  useEffect(() => {
    if (activeTab !== 'More') return;
    if (!isAuthed) return;
    if (inboxBootstrapped) return;
    void loadReconciliationTasks();
    setInboxBootstrapped(true);
  }, [activeTab, inboxBootstrapped, isAuthed]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nba', { method: 'GET' });
      if (!res.ok) {
        const details = await res.json().catch(() => null) as { error?: string } | null;
        if (res.status === 401) {
          setIsAuthed(false);
          throw new Error('Not signed in. Go to More → Sign in.');
        }
        throw new Error(`Failed to load actions (${res.status})${details?.error ? `: ${details.error}` : ''}`);
      }
      const payload = (await res.json()) as DashboardPayload;
      setDashboard(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshScan() {
    setLoading(true);
    setError(null);
    try {
      const refreshRes = await fetch('/api/market/refresh-watchlists', { method: 'POST' });
      if (!refreshRes.ok) {
        const details = await refreshRes.json().catch(() => null) as { error?: string } | null;
        throw new Error(`Refresh failed (${refreshRes.status})${details?.error ? `: ${details.error}` : ''}`);
      }
      await loadDashboard();
      await loadTheses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed.');
      setLoading(false);
    }
  }

  async function loadTheses() {
    const res = await fetch('/api/theses', { method: 'GET' });
    if (!res.ok) {
      const details = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(`Failed to load theses (${res.status})${details?.error ? `: ${details.error}` : ''}`);
    }
    const payload = (await res.json()) as { theses: Thesis[] };
    setTheses(payload.theses);
  }

  async function loadReconciliationTasks() {
    const res = await fetch('/api/reconciliation-tasks', { method: 'GET' });
    if (!res.ok) {
      const details = await res.json().catch(() => null) as { error?: string } | null;
      if (res.status === 401) {
        setIsAuthed(false);
        throw new Error('Not signed in. Go to More → Sign in.');
      }
      throw new Error(`Failed to load inbox (${res.status})${details?.error ? `: ${details.error}` : ''}`);
    }
    const payload = (await res.json()) as { tasks: ReconciliationTask[] };
    setReconciliationTasks(payload.tasks);
  }

  async function addThesis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: Number(newThesis.item_id),
          item_name: newThesis.item_name,
          target_buy: newThesis.target_buy ? Number(newThesis.target_buy) : null,
          target_sell: newThesis.target_sell ? Number(newThesis.target_sell) : null,
          priority: newThesis.priority,
          active: true,
        }),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => null) as { error?: string } | null;
        if (res.status === 401) {
          setIsAuthed(false);
          throw new Error('Not signed in. Go to More → Sign in.');
        }
        throw new Error(`Failed to save thesis (${res.status})${details?.error ? `: ${details.error}` : ''}`);
      }

      setNewThesis({ item_id: '', item_name: '', target_buy: '', target_sell: '', priority: 'medium' });
      await loadTheses();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add thesis.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="row-between" style={{ marginBottom: '0.85rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Passive Copilot</h1>
          <p className="muted">OSRS decision support for 1-2 hour sessions.</p>
        </div>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => {
            void loadDashboard();
            void loadTheses();
            void loadReconciliationTasks();
          }}
        >
          {loading ? 'Loading...' : 'Sync'}
        </button>
      </div>

      {error ? <p style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</p> : null}

      {activeTab === 'Home' ? (
        <section className="grid" style={{ gap: '0.8rem' }}>
          <div className="grid grid-2">
            <article className="card">
              <p className="muted">Open Positions</p>
              <p className="kpi">{summary?.open_positions ?? positions.length}</p>
            </article>
            <article className="card">
              <p className="muted">Queued Actions</p>
              <p className="kpi">{summary?.queued_actions ?? queue.length}</p>
            </article>
            <article className="card">
              <p className="muted">High Priority</p>
              <p className="kpi">{summary?.high_priority_actions ?? highPriorityCount}</p>
            </article>
            <article className="card">
              <p className="muted">Unrealized (est.)</p>
              <p className="kpi">{Math.round(summary?.estimated_unrealized_profit ?? 0).toLocaleString()} gp</p>
            </article>
          </div>

          <article className="card">
            <div className="row-between" style={{ marginBottom: '0.65rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Next Best Actions</h2>
              <button className="btn" onClick={() => void loadDashboard()} disabled={loading}>Refresh</button>
            </div>
            <ul className="list">
              {actions.length === 0 ? (
                <li className="muted">No actions yet. Tap Scan and refresh watchlists.</li>
              ) : (
                actions.map((action, index) => (
                  <li key={`${action.type}-${action.item_id ?? index}`} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <strong>{action.item_name}</strong>
                      <PriorityBadge priority={action.priority} />
                    </div>
                    {action.type === 'consider_entry' && (action.suggested_buy || action.suggested_sell || action.spread_pct || action.suggested_qty || action.est_profit) ? (
                      <div style={{ marginTop: '0.35rem' }}>
                        <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
                          {typeof action.suggested_buy === 'number' ? <span className="muted">Buy ~{Math.round(action.suggested_buy).toLocaleString()} gp</span> : null}
                          {typeof action.suggested_sell === 'number' ? <span className="muted">Sell ~{Math.round(action.suggested_sell).toLocaleString()} gp</span> : null}
                          {typeof action.spread_pct === 'number' ? <span className="muted">Spread ~{action.spread_pct.toFixed(1)}%</span> : null}
                          {typeof action.suggested_qty === 'number' ? <span className="muted">Qty {action.suggested_qty.toLocaleString()}</span> : null}
                          {typeof action.est_profit === 'number' ? <span className="muted">Est ~{Math.round(action.est_profit).toLocaleString()} gp</span> : null}
                        </div>
                        <p className="muted" style={{ marginTop: '0.25rem' }}>{action.reason}</p>
                      </div>
                    ) : (
                      <p className="muted" style={{ marginTop: '0.25rem' }}>{action.reason}</p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === 'Scan' ? (
        <section className="grid" style={{ gap: '0.75rem' }}>
          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Market Scan</h2>
            <p className="muted" style={{ marginBottom: '0.65rem' }}>
              Pull latest snapshots for items in active theses and current positions.
            </p>
            <button className="btn" onClick={() => void refreshScan()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Watchlists'}
            </button>
          </article>
        </section>
      ) : null}

      {activeTab === 'Queue' ? (
        <section className="grid">
          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Priority Queue (Top 5)</h2>
            <ul className="list">
              {queue.length === 0 ? (
                <li className="muted">Queue is clear.</li>
              ) : (
                queue.map((action, index) => (
                  <li key={`${action.type}-${action.item_id ?? index}`} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <strong>{action.item_name}</strong>
                      <PriorityBadge priority={action.priority} />
                    </div>
                    <p className="muted" style={{ marginTop: '0.25rem' }}>{action.reason}</p>
                    {action.suggested_buy || action.suggested_sell || action.spread_pct || action.suggested_qty || action.est_profit ? (
                      <div className="muted" style={{ marginTop: '0.35rem', display: 'grid', gap: '0.15rem' }}>
                        <div className="row-between">
                          <span>Buy</span>
                          <strong>{action.suggested_buy ? action.suggested_buy.toLocaleString() : '?'}</strong>
                        </div>
                        <div className="row-between">
                          <span>Sell</span>
                          <strong>{action.suggested_sell ? action.suggested_sell.toLocaleString() : '?'}</strong>
                        </div>
                        <div className="row-between">
                          <span>Spread</span>
                          <strong>{typeof action.spread_pct === 'number' ? `${action.spread_pct.toFixed(1)}%` : '?'}</strong>
                        </div>
                        <div className="row-between">
                          <span>Qty</span>
                          <strong>{typeof action.suggested_qty === 'number' ? action.suggested_qty.toLocaleString() : '?'}</strong>
                        </div>
                        <div className="row-between">
                          <span>Est profit</span>
                          <strong>{typeof action.est_profit === 'number' ? `${action.est_profit.toLocaleString()} gp` : '?'}</strong>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === 'Positions' ? (
        <section className="grid">
          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Positions (Derived from DINK Ledger)</h2>
            <ul className="list">
              {positions.length === 0 ? (
                <li className="muted">No active positions yet.</li>
              ) : (
                positions.map((position) => (
                  <li key={position.id} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSparklineStep('5m');
                          setSelectedItem({ id: position.item_id, name: position.item_name });
                        }}
                        style={{
                          border: 0,
                          padding: 0,
                          background: 'transparent',
                          color: 'inherit',
                          fontWeight: 800,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        aria-label={`Open ${position.item_name} details`}
                      >
                        {position.item_name}
                      </button>
                      <span>{position.quantity.toLocaleString()} qty</span>
                    </div>
                    <p className="muted" style={{ marginTop: '0.2rem' }}>
                      Avg buy: {position.avg_buy_price.toLocaleString()} gp | Last: {Math.round(position.last_price ?? 0).toLocaleString()} gp
                    </p>
                    <p style={{ marginTop: '0.2rem', color: (position.unrealized_profit ?? 0) >= 0 ? 'var(--accent-2)' : 'var(--danger)' }}>
                      Unrealized: {Math.round(position.unrealized_profit ?? 0).toLocaleString()} gp
                    </p>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === 'More' ? (
        <section className="grid" style={{ gap: '0.75rem' }}>
          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Account</h2>
            {!authChecked ? (
              <p className="muted">Checking session...</p>
            ) : isAuthed ? (
              <div className="row-between">
                <p className="muted">Signed in</p>
                <button
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() => (supabase ? void supabase.auth.signOut() : undefined)}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid" style={{ gap: '0.5rem' }}>
                <p className="muted">Sign in to enable Sync/Scan and save theses.</p>
                <input
                  placeholder="Email"
                  value={userEmail}
                  onChange={(event) => setUserEmail(event.target.value)}
                />
                <button
                  className="btn"
                  disabled={loading || !userEmail}
                  onClick={async () => {
                    if (!supabase) return;
                    setLoading(true);
                    setError(null);
                    try {
                      const { error: signInError } = await supabase.auth.signInWithOtp({
                        email: userEmail,
                        options: { emailRedirectTo: window.location.origin },
                      });
                      if (signInError) throw signInError;
                      setError('Magic link sent. Check your email and open the link.');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to send magic link.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Send magic link
                </button>
              </div>
            )}
          </article>

          <article className="card">
            <div className="row-between" style={{ marginBottom: '0.65rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Inbox (Approvals)</h2>
              <button className="btn btn-secondary" disabled={loading} onClick={() => void loadReconciliationTasks()}>
                Refresh
              </button>
            </div>
            <p className="muted" style={{ marginBottom: '0.65rem' }}>
              Pending: <strong>{pendingReconCount}</strong>
            </p>
            <ul className="list">
              {reconciliationTasks.filter((task) => task.status === 'pending').length === 0 ? (
                <li className="muted">Nothing pending.</li>
              ) : (
                reconciliationTasks
                  .filter((task) => task.status === 'pending')
                  .slice(0, 10)
                  .map((task) => (
                    <li key={task.id} className="card" style={{ padding: '0.7rem' }}>
                      <div className="row-between" style={{ gap: '0.75rem' }}>
                        <div>
                          <strong>{task.item_name ?? `Item ${task.item_id ?? ''}`}</strong>
                          <p className="muted" style={{ marginTop: '0.2rem' }}>
                            {task.task_type.split('_').join(' ')} · {new Date(task.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="row" style={{ gap: '0.4rem' }}>
                          <button
                            className="btn"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true);
                              setError(null);
                              try {
                                const res = await fetch('/api/reconciliation-tasks', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: task.id, status: 'approved', decision_note: decisionNotes[task.id] || undefined }),
                                });
                                const payload = (await res.json().catch(() => null)) as { error?: string } | null;
                                if (!res.ok) throw new Error(payload?.error ? payload.error : `Approve failed (${res.status})`);
                                await loadReconciliationTasks();
                                setDecisionNotes((prev) => {
                                  const next = { ...prev };
                                  delete next[task.id];
                                  return next;
                                });
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Approve failed.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true);
                              setError(null);
                              try {
                                const res = await fetch('/api/reconciliation-tasks', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: task.id, status: 'rejected', decision_note: decisionNotes[task.id] || undefined }),
                                });
                                const payload = (await res.json().catch(() => null)) as { error?: string } | null;
                                if (!res.ok) throw new Error(payload?.error ? payload.error : `Reject failed (${res.status})`);
                                await loadReconciliationTasks();
                                setDecisionNotes((prev) => {
                                  const next = { ...prev };
                                  delete next[task.id];
                                  return next;
                                });
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Reject failed.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      {task.details?.reason ? (
                        <p className="muted" style={{ marginTop: '0.35rem' }}>{String(task.details.reason)}</p>
                      ) : null}

                      <div style={{ marginTop: '0.45rem' }}>
                        <input
                          placeholder="Decision note (optional)"
                          value={decisionNotes[task.id] ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDecisionNotes((prev) => ({ ...prev, [task.id]: value }));
                          }}
                        />
                      </div>

                      <details style={{ marginTop: '0.35rem' }}>
                        <summary className="muted" style={{ cursor: 'pointer' }}>Details</summary>
                        <pre style={{ marginTop: '0.35rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
{JSON.stringify(task.details ?? {}, null, 2)}
                        </pre>
                      </details>
                    </li>
                  ))
              )}
            </ul>
          </article>

          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Quick setup</h2>
            <p className="muted" style={{ marginBottom: '0.65rem' }}>
              Seed your watchlist from the curated pool (recommended for MVP).
            </p>
            <button
              className="btn"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch('/api/theses/seed', { method: 'POST' });
                  const payload = (await res.json().catch(() => null)) as { inserted?: number; error?: string } | null;
                  if (!res.ok) {
                    throw new Error(payload?.error ? payload.error : `Seed failed (${res.status})`);
                  }
                  setError(`Seeded ${payload?.inserted ?? 0} items into Theses.`);
                  await loadTheses();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to seed theses.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Seed watchlist (113)
            </button>
          </article>

          <article className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Theses</h2>
            <div className="grid" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                placeholder="Item ID"
                value={newThesis.item_id}
                onChange={(event) => setNewThesis((prev) => ({ ...prev, item_id: event.target.value }))}
              />
              <input
                placeholder="Item Name"
                value={newThesis.item_name}
                onChange={(event) => setNewThesis((prev) => ({ ...prev, item_name: event.target.value }))}
              />
              <div className="row" style={{ alignItems: 'stretch' }}>
                <input
                  placeholder="Target Buy"
                  value={newThesis.target_buy}
                  onChange={(event) => setNewThesis((prev) => ({ ...prev, target_buy: event.target.value }))}
                />
                <input
                  placeholder="Target Sell"
                  value={newThesis.target_sell}
                  onChange={(event) => setNewThesis((prev) => ({ ...prev, target_sell: event.target.value }))}
                />
              </div>
              <select
                value={newThesis.priority}
                onChange={(event) => setNewThesis((prev) => ({ ...prev, priority: event.target.value as ActionPriority }))}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button className="btn" onClick={() => void addThesis()} disabled={loading || !newThesis.item_id || !newThesis.item_name}>
                Add Thesis
              </button>
            </div>

            <ul className="list">
              {theses.map((thesis) => (
                <li key={thesis.id} className="card" style={{ padding: '0.7rem' }}>
                  <div className="row-between">
                    <strong>{thesis.item_name}</strong>
                    <PriorityBadge priority={thesis.priority} />
                  </div>
                  <p className="muted" style={{ marginTop: '0.25rem' }}>
                    Buy: {thesis.target_buy?.toLocaleString() ?? '-'} | Sell: {thesis.target_sell?.toLocaleString() ?? '-'}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {selectedItem ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedItem.name} details`}
          onClick={() => setSelectedItem(null)}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 900 }}>{selectedItem.name}</h2>
                <p className="muted" style={{ fontSize: '0.85rem' }}>Recent {sparklineStep} highs/lows (OSRS Wiki)</p>
                {sparkStats ? (
                  <p className="muted" style={{ fontSize: '0.8rem' }}>
                    Range: {Math.round(sparkStats.min).toLocaleString()} → {Math.round(sparkStats.max).toLocaleString()} gp · Last: {Math.round(sparkStats.last).toLocaleString()} gp
                    {typeof sparkStats.pct === 'number' ? (
                      <>
                        {' '}· Δ {sparkStats.pct >= 0 ? '+' : ''}
                        {sparkStats.pct.toFixed(1)}%
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
              <div className="row" style={{ gap: '0.5rem' }}>
                <select
                  value={sparklineStep}
                  onChange={(event) => setSparklineStep(event.target.value as '5m' | '1h' | '6h' | '24h')}
                  aria-label="Chart timeframe"
                  style={{ width: 'auto' }}
                >
                  <option value="5m">5m</option>
                  <option value="1h">1h</option>
                  <option value="6h">6h</option>
                  <option value="24h">24h</option>
                </select>
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedItem(null)}>
                  Close
                </button>
              </div>
            </div>

            {sparklineLoading ? (
              <p className="muted">Loading chart…</p>
            ) : sparklineError ? (
              <p className="muted">{sparklineError}</p>
            ) : (
              <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
                <PriceSparkline values={sparklineValues} width={560} height={140} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      <nav className="tabbar" aria-label="Primary">
        {tabs.map((tab) => {
          const label = tab === 'More' && pendingReconCount > 0 ? `More (${pendingReconCount})` : tab;
          return (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
