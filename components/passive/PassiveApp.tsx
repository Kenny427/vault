'use client';

import { useMemo, useState } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newThesis, setNewThesis] = useState({ item_id: '', item_name: '', target_buy: '', target_sell: '', priority: 'medium' as ActionPriority });

  const actions = dashboard?.actions ?? [];
  const queue = dashboard?.queue ?? [];
  const positions = dashboard?.positions ?? [];
  const summary = dashboard?.summary;

  const highPriorityCount = useMemo(() => actions.filter((a) => a.priority === 'high').length, [actions]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nba', { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Failed to load actions (${res.status})`);
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
        throw new Error(`Refresh failed (${refreshRes.status})`);
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
      throw new Error('Failed to load theses.');
    }
    const payload = (await res.json()) as { theses: Thesis[] };
    setTheses(payload.theses);
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
        throw new Error('Failed to save thesis.');
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
        <button className="btn btn-secondary" disabled={loading} onClick={() => { void loadDashboard(); void loadTheses(); }}>
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
