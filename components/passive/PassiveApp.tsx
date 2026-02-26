'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

type ActionPriority = 'high' | 'medium' | 'low';

type NextBestAction = {
  type: string;
  item_id?: number;
  item_name: string;
  reason: string;
  priority: ActionPriority;
  score: number;
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
  item_id: number | null;
  item_name: string | null;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  occurred_at: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'resolved' | string;
  created_at: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newThesis, setNewThesis] = useState({ item_id: '', item_name: '', target_buy: '', target_sell: '', priority: 'medium' as ActionPriority });
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const actions = useMemo(() => dashboard?.actions ?? [], [dashboard]);
  const queue = useMemo(() => dashboard?.queue ?? [], [dashboard]);
  const positions = useMemo(() => dashboard?.positions ?? [], [dashboard]);
  const summary = dashboard?.summary;

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

  useEffect(() => {
    if (activeTab !== 'More') return;
    if (!isAuthed) {
      setReconciliationTasks([]);
      return;
    }

    void loadReconciliationTasks();
  }, [activeTab, isAuthed]);

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
    const res = await fetch('/api/reconciliation/tasks', { method: 'GET' });
    if (!res.ok) {
      const details = await res.json().catch(() => null) as { error?: string } | null;
      if (res.status === 401) {
        setIsAuthed(false);
        setReconciliationTasks([]);
        return;
      }
      throw new Error(`Failed to load inbox (${res.status})${details?.error ? `: ${details.error}` : ''}`);
    }

    const payload = (await res.json()) as { tasks: ReconciliationTask[] };
    setReconciliationTasks(payload.tasks ?? []);
  }

  async function resolveReconciliationTask(id: string, status: 'approved' | 'rejected') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reconciliation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => null) as { error?: string } | null;
        if (res.status === 401) {
          setIsAuthed(false);
          throw new Error('Not signed in.');
        }
        throw new Error(`Failed to update task (${res.status})${details?.error ? `: ${details.error}` : ''}`);
      }

      await loadReconciliationTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setLoading(false);
    }
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
        <button className="btn btn-secondary" disabled={loading} onClick={() => { void loadDashboard(); void loadTheses(); void loadReconciliationTasks(); }}>
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
                    <p className="muted" style={{ marginTop: '0.25rem' }}>{action.reason}</p>
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
                      <strong>{position.item_name}</strong>
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
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.65rem' }}>Inbox</h2>
            {!isAuthed ? (
              <p className="muted">Sign in to view reconciliation tasks.</p>
            ) : reconciliationTasks.length === 0 ? (
              <p className="muted">No pending tasks.</p>
            ) : (
              <ul className="list">
                {reconciliationTasks.map((task) => (
                  <li key={task.id} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <strong>{task.item_name ?? `Item ${task.item_id ?? ''}`}</strong>
                      <span className="muted">{task.side.toUpperCase()}</span>
                    </div>
                    <p className="muted" style={{ marginTop: '0.25rem' }}>
                      Qty: {Number(task.quantity ?? 0).toLocaleString()} | Price: {Math.round(Number(task.price ?? 0)).toLocaleString()} gp
                    </p>
                    <p className="muted" style={{ marginTop: '0.25rem' }}>
                      When: {task.occurred_at ? new Date(task.occurred_at).toLocaleString() : '-'}
                    </p>
                    {task.reason ? (
                      <p className="muted" style={{ marginTop: '0.25rem' }}>
                        Reason: {task.reason}
                      </p>
                    ) : null}
                    <div className="row" style={{ marginTop: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        disabled={loading}
                        onClick={() => void resolveReconciliationTask(task.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-secondary"
                        disabled={loading}
                        onClick={() => void resolveReconciliationTask(task.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

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

      <nav className="tabbar" aria-label="Primary">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>
    </main>
  );
}
