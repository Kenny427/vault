'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type Opportunity = {
  item_id: number;
  item_name: string;
  last_price: number;
  margin: number;
  spread_pct: number;
  buy_at: number;
  sell_at: number;
  buy_limit: number | null;
  suggested_qty: number;
  est_profit: number;
  score: number;
  volume_5m: number | null;
  volume_1h: number | null;
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
  const [inboxFilter, setInboxFilter] = useState<'pending' | 'all'>('pending');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [inboxBootstrapped, setInboxBootstrapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newThesis, setNewThesis] = useState({ item_id: '', item_name: '', target_buy: '', target_sell: '', priority: 'medium' as ActionPriority });
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<Array<{ item_id: number; name: string }>>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string } | null>(null);
  const [sparklineStep, setSparklineStep] = useState<'5m' | '1h' | '6h' | '24h'>('5m');
  const [sparklineValues, setSparklineValues] = useState<number[]>([]);
  const [sparklineVolumes, setSparklineVolumes] = useState<number[]>([]);
  const [sparklineLoading, setSparklineLoading] = useState(false);
  const [sparklineError, setSparklineError] = useState<string | null>(null);
  const [scanLastUpdated, setScanLastUpdated] = useState<Date | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

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
    
    // Calculate average volume
    const avgVolume = sparklineVolumes.length > 0
      ? sparklineVolumes.reduce((a, b) => a + b, 0) / sparklineVolumes.length
      : null;
    
    return { min, max, first, last, delta, pct, avgVolume };
  }, [sparklineValues, sparklineVolumes]);

  // Portfolio calculations
  const portfolioStats = useMemo(() => {
    if (positions.length === 0) return null;
    let totalInvested = 0;
    let currentValue = 0;
    let topPerformer: { name: string; roi: number } | null = null;
    let worstPerformer: { name: string; roi: number } | null = null;
    let totalPositionRoi = 0;
    const positionAllocations: Array<{ name: string; value: number; pct: number }> = [];
    
    for (const p of positions) {
      const invested = p.avg_buy_price * p.quantity;
      const value = (p.last_price ?? p.avg_buy_price) * p.quantity;
      totalInvested += invested;
      currentValue += value;
      // Calculate individual position ROI
      const positionRoi = invested > 0 ? ((value - invested) / invested) * 100 : 0;
      totalPositionRoi += positionRoi;
      if (!topPerformer || positionRoi > topPerformer.roi) {
        topPerformer = { name: p.item_name, roi: positionRoi };
      }
      if (!worstPerformer || positionRoi < worstPerformer.roi) {
        worstPerformer = { name: p.item_name, roi: positionRoi };
      }
      positionAllocations.push({ name: p.item_name, value, pct: 0 }); // pct will be calc'd after
    }
    
    // Calculate percentages
    for (const alloc of positionAllocations) {
      alloc.pct = totalInvested > 0 ? (alloc.value / currentValue) * 100 : 0;
    }
    
    // Sort by value descending and take top 5
    positionAllocations.sort((a, b) => b.value - a.value);
    const topAllocations = positionAllocations.slice(0, 5);
    
    const profit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const avgPositionRoi = positions.length > 0 ? totalPositionRoi / positions.length : 0;
    return { totalInvested, currentValue, profit, roi, avgPositionRoi, topPerformer, worstPerformer, topAllocations };
  }, [positions]);

  useEffect(() => {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    let mounted = true;

    async function loadSparkline() {
      setSparklineLoading(true);
      setSparklineError(null);
      try {
        const res = await fetch(`/api/market/timeseries?timestep=${encodeURIComponent(sparklineStep)}&id=${encodeURIComponent(String(itemId))}`);
        const payload = (await res.json().catch(() => null)) as { data?: Array<{ avgHighPrice?: number | null; avgLowPrice?: number | null; highPriceVolume?: number | null; lowPriceVolume?: number | null }> ; error?: string } | null;
        if (!res.ok) throw new Error(payload?.error ? payload.error : `Failed to load chart (${res.status})`);

        const values = (payload?.data ?? [])
          .map((point) => (typeof point.avgHighPrice === 'number' ? point.avgHighPrice : point.avgLowPrice ?? null))
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

        const volumes = (payload?.data ?? [])
          .map((point) => (typeof point.highPriceVolume === 'number' ? point.highPriceVolume : point.lowPriceVolume ?? null))
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

        if (!mounted) return;
        setSparklineValues(values);
        setSparklineVolumes(volumes);
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
  const pendingInboxCount = useMemo(
    () => reconciliationTasks.filter((task) => task.status === 'pending').length,
    [reconciliationTasks]
  );

  useEffect(() => {
    if (activeTab !== 'More') return;
    if (!isAuthed) {
      setReconciliationTasks([]);
      setInboxBootstrapped(false);
      return;
    }

    void (async () => {
      const qs = new URLSearchParams({ status: inboxFilter });
      const res = await fetch(`/api/reconciliation/tasks?${qs.toString()}`, { method: 'GET' });
      if (!res.ok) {
        const details = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 401) {
          setIsAuthed(false);
          setReconciliationTasks([]);
          setInboxBootstrapped(false);
          return;
        }
        setError(`Failed to load inbox (${res.status})${details?.error ? `: ${details.error}` : ''}`);
        return;
      }

      const payload = (await res.json()) as { tasks: ReconciliationTask[] };
      setReconciliationTasks(payload.tasks ?? []);
      setInboxBootstrapped(true);
    })();
  }, [activeTab, isAuthed, inboxFilter]);

  // Auto-load opportunities when switching to Scan tab
  useEffect(() => {
    if (activeTab !== 'Scan') return;
    if (!isAuthed) {
      setOpportunities([]);
      return;
    }

    // Only fetch if we don't have data yet (lazy load on first visit)
    if (opportunities.length === 0) {
      void (async () => {
        try {
          const res = await fetch('/api/opportunities', { method: 'GET' });
          if (!res.ok) return;
          const payload = (await res.json()) as { opportunities: Opportunity[] };
          setOpportunities(payload.opportunities ?? []);
          setOpportunitiesLastUpdated(new Date());
        } catch {
          // Silently fail - user can manually refresh
        }
      })();
    }
  }, [activeTab, isAuthed, opportunities.length]);

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

  async function copyFlipPlan(action: NextBestAction) {
    try {
      const parts: string[] = [action.item_name];
      if (typeof action.suggested_buy === 'number') parts.push(`buy ~${Math.round(action.suggested_buy).toLocaleString()} gp`);
      if (typeof action.suggested_sell === 'number') parts.push(`sell ~${Math.round(action.suggested_sell).toLocaleString()} gp`);
      if (typeof action.suggested_qty === 'number') parts.push(`qty ${Math.round(action.suggested_qty).toLocaleString()}`);
      if (typeof action.est_profit === 'number') parts.push(`est ~${Math.round(action.est_profit).toLocaleString()} gp`);
      if (typeof action.spread_pct === 'number') parts.push(`spread ~${action.spread_pct.toFixed(1)}%`);

      const text = parts.join(' | ');
      await navigator.clipboard.writeText(text);

      const key = `${action.type}:${action.item_id ?? action.item_name}`;
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      setError('Copy failed (browser blocked clipboard).');
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
      setScanLastUpdated(new Date());
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

  const loadReconciliationTasks = useCallback(async (filter: 'pending' | 'all') => {
    const qs = new URLSearchParams({ status: filter });
    const res = await fetch(`/api/reconciliation/tasks?${qs.toString()}`, { method: 'GET' });
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
  }, []);

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

      await loadReconciliationTasks(inboxFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOpportunities() {
    const res = await fetch('/api/opportunities', { method: 'GET' });
    if (!res.ok) {
      const details = await res.json().catch(() => null) as { error?: string } | null;
      if (res.status === 401) {
        setIsAuthed(false);
        throw new Error('Not signed in. Go to More → Sign in.');
      }
      throw new Error(`Failed to load opportunities (${res.status})${details?.error ? `: ${details.error}` : ''}`);
    }
    const payload = (await res.json()) as { opportunities: Opportunity[] };
    setOpportunities(payload.opportunities ?? []);
  }

  // Item search effect
  useEffect(() => {
    if (!isAuthed || itemSearchQuery.length < 2) {
      setItemSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setItemSearchLoading(true);
      try {
        const res = await fetch(`/api/items/search?q=${encodeURIComponent(itemSearchQuery)}&limit=8`);
        const payload = (await res.json()) as { items?: Array<{ item_id: number; name: string }> };
        setItemSearchResults(payload.items ?? []);
      } catch {
        setItemSearchResults([]);
      } finally {
        setItemSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [itemSearchQuery, isAuthed]);

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
      setItemSearchQuery('');
      setItemSearchResults([]);
      await loadTheses();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add thesis.');
    } finally {
      setLoading(false);
    }
  }

  function selectSearchResult(item: { item_id: number; name: string }) {
    setNewThesis((prev) => ({ ...prev, item_id: String(item.item_id), item_name: item.name }));
    setItemSearchQuery('');
    setItemSearchResults([]);
  }

  return (
    <main>
      <div className="row-between" style={{ marginBottom: '0.85rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Vault</h1>
          <p className="muted">OSRS invest/hold engine (1–8 weeks).
Good buys now 2192 accumulate via 4h buy limits 2192 sell into rebound.</p>
        </div>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => {
            void loadDashboard();
            void loadTheses();
            void loadOpportunities();
            void loadReconciliationTasks(inboxFilter);
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

          {portfolioStats && portfolioStats.totalInvested > 0 ? (
            <div>
              <h3 className="section-header">Portfolio Overview</h3>
              <div className="grid grid-2">
              <article className="card">
                <p className="muted">Total Invested</p>
                <p className="kpi">{Math.round(portfolioStats.totalInvested).toLocaleString()} gp</p>
              </article>
              <article className="card">
                <p className="muted">Current Value</p>
                <p className="kpi">{Math.round(portfolioStats.currentValue).toLocaleString()} gp</p>
              </article>
              <article className="card">
                <p className="muted">Portfolio ROI</p>
                <p className="kpi" style={{ color: portfolioStats.roi >= 0 ? 'var(--accent-2)' : 'var(--danger)' }}>
                  {portfolioStats.roi >= 0 ? '+' : ''}{portfolioStats.roi.toFixed(2)}%
                </p>
              </article>
              <article className="card">
                <p className="muted">Positions</p>
                <p className="kpi">{positions.length}</p>
              </article>
              <article className="card">
                <p className="muted">Avg Position ROI</p>
                <p className="kpi" style={{ color: portfolioStats.avgPositionRoi >= 0 ? 'var(--accent-2)' : 'var(--danger)' }}>
                  {portfolioStats.avgPositionRoi >= 0 ? '+' : ''}{portfolioStats.avgPositionRoi.toFixed(1)}%
                </p>
              </article>
              {portfolioStats.topPerformer ? (
                <article className="card" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, var(--surface) 0%, rgba(39, 194, 103, 0.08) 100%)' }}>
                  <p className="muted">🏆 Top Performer</p>
                  <p className="kpi" style={{ fontSize: '1.1rem' }}>{portfolioStats.topPerformer.name}</p>
                  <p style={{ color: portfolioStats.topPerformer.roi >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700, fontSize: '0.95rem' }}>
                    {portfolioStats.topPerformer.roi >= 0 ? '+' : ''}{portfolioStats.topPerformer.roi.toFixed(1)}% ROI
                  </p>
                </article>
              ) : null}
              {portfolioStats.worstPerformer ? (
                <article
                  className="card"
                  style={{
                    gridColumn: 'span 2',
                    background: 'linear-gradient(135deg, var(--surface) 0%, rgba(251, 113, 133, 0.08) 100%)',
                  }}
                >
                  <p className="muted">Worst Performer</p>
                  <p className="kpi" style={{ fontSize: '1.1rem' }}>
                    {portfolioStats.worstPerformer.name}
                  </p>
                  <p
                    style={{
                      color: portfolioStats.worstPerformer.roi >= 0 ? 'var(--accent)' : 'var(--danger)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    {portfolioStats.worstPerformer.roi >= 0 ? '+' : ''}
                    {portfolioStats.worstPerformer.roi.toFixed(1)}% ROI
                  </p>
                </article>
              ) : null}
              {portfolioStats.topAllocations && portfolioStats.topAllocations.length > 0 ? (
                <article className="card" style={{ gridColumn: 'span 2' }}>
                  <p className="muted" style={{ marginBottom: '0.5rem' }}>📊 Allocation (Top 5)</p>
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {portfolioStats.topAllocations.map((alloc, idx) => (
                      <div key={alloc.name} style={{ display: 'grid', gap: '0.35rem' }}>
                        <div className="row-between" style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{alloc.name}</span>
                          <span className="muted">{alloc.pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(alloc.pct, 100)}%`,
                              background: idx === 0 ? 'var(--accent)' : idx === 1 ? 'var(--accent-2)' : 'var(--muted)',
                              borderRadius: '3px',
                              transition: 'width 300ms ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
            </div>
          ) : null}

          <article className="card">
            <div className="row-between" style={{ marginBottom: '0.65rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Next Best Actions</h2>
              <button className="btn" onClick={() => void loadDashboard()} disabled={loading}>Refresh</button>
            </div>
            <ul className="list">
              {actions.length === 0 ? (
                <li className="muted">No actions yet. Tap Scan and refresh watchlists.</li>
              ) : (
                actions.map((action, index) => {
                  const actionKey = `${action.type}:${action.item_id ?? action.item_name}`;
                  const hasFlipPlan = action.type === 'consider_entry' && (action.suggested_buy || action.suggested_sell || action.spread_pct || action.suggested_qty || action.est_profit);

                  return (
                  <li key={`${action.type}-${action.item_id ?? index}`} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      {typeof action.item_id === 'number' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSparklineStep('5m');
                            setSelectedItem({ id: action.item_id as number, name: action.item_name });
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
                          aria-label={`Open ${action.item_name} chart`}
                        >
                          {action.item_name}
                        </button>
                      ) : (
                        <strong>{action.item_name}</strong>
                      )}
                      <PriorityBadge priority={action.priority} />
                    </div>

                    {typeof action.item_id === 'number' ? (
                      <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => window.open(`https://prices.runescape.wiki/osrs/item/${action.item_id}`, '_blank', 'noopener,noreferrer')}
                        >
                          Wiki Prices
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => window.open(`https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${action.item_id}`, '_blank', 'noopener,noreferrer')}
                        >
                          OSRS Wiki
                        </button>
                        {hasFlipPlan ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => void copyFlipPlan(action)}
                          >
                            {copiedKey === actionKey ? 'Copied!' : 'Copy flip'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {hasFlipPlan ? (
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
                  );
                })
              )}
            </ul>
          </article>

          <article className="card">
            <div className="row-between" style={{ marginBottom: '0.65rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Opportunities</h2>
              <button className="btn" onClick={() => void loadOpportunities()} disabled={loading}>Refresh</button>
            </div>
            {opportunities.length > 0 ? (
              <p className="muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Top {opportunities.slice(0, 8).length} opps: ≈{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {opportunities.slice(0, 8).reduce((sum, o) => sum + o.est_profit, 0).toLocaleString()} gp
                </span>{' '}
                potential profit
              </p>
            ) : null}
            <ul className="list">
              {opportunities.length === 0 ? (
                <li className="muted">No opportunities yet. Run Scan → Refresh Watchlists, then Sync.</li>
              ) : (
                opportunities.slice(0, 8).map((opp) => (
                  <li key={opp.item_id} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSparklineStep('5m');
                          setSelectedItem({ id: opp.item_id, name: opp.item_name });
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
                        aria-label={`View ${opp.item_name} chart`}
                      >
                        {opp.item_name}
                      </button>
                      <div className="row-between" style={{ gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Buy ${opp.item_name} @ ${opp.buy_at.toLocaleString()} | Sell @ ${opp.sell_at.toLocaleString()} | Qty ${opp.suggested_qty.toLocaleString()} | Est ${opp.est_profit.toLocaleString()}gp`;
                            void navigator.clipboard.writeText(text);
                            setCopiedKey(`opp-${opp.item_id}`);
                            setTimeout(() => setCopiedKey(null), 1500);
                          }}
                          className="btn-small"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}
                        >
                          {copiedKey === `opp-${opp.item_id}` ? 'Copied!' : 'Copy'}
                        </button>
                        <span className="muted">Score {opp.score}</span>
                      </div>
                    </div>
                    <p className="muted" style={{ marginTop: '0.25rem' }}>
                      Buy ~{opp.buy_at.toLocaleString()} | Sell ~{opp.sell_at.toLocaleString()} | Margin ~{opp.margin.toLocaleString()} gp ({opp.spread_pct.toFixed(1)}%) | Qty {opp.suggested_qty.toLocaleString()} | Est profit ~{opp.est_profit.toLocaleString()} gp
                    </p>
                    {(opp.volume_5m || opp.volume_1h) ? (
                      <div className="row-between" style={{ marginTop: '0.15rem', fontSize: '0.8rem' }}>
                        <span className="muted">
                          Vol: {opp.volume_5m ? `${(opp.volume_5m/1000).toFixed(1)}k (5m)` : ''}{opp.volume_5m && opp.volume_1h ? ' · ' : ''}{opp.volume_1h ? `${(opp.volume_1h/1000).toFixed(1)}k (1h)` : ''}
                        </span>
                        <span style={{ 
                          fontWeight: 600, 
                          fontSize: '0.7rem',
                          color: (opp.volume_5m ?? 0) > 100_000 ? 'var(--accent)' : (opp.volume_5m ?? 0) > 50_000 ? 'var(--accent-2)' : 'var(--muted)',
                          textTransform: 'uppercase'
                        }}>
                          {(opp.volume_5m ?? 0) > 100_000 ? '🔥 HOT' : (opp.volume_5m ?? 0) > 50_000 ? '⚡ Warm' : '💧 Cold'}
                        </span>
                      </div>
                    ) : null}
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
            {scanLastUpdated && (
              <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Last updated: {scanLastUpdated.toLocaleTimeString()}
              </p>
            )}
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
                      {typeof action.item_id === 'number' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSparklineStep('5m');
                            setSelectedItem({ id: action.item_id as number, name: action.item_name });
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
                          aria-label={`Open ${action.item_name} chart`}
                        >
                          {action.item_name}
                        </button>
                      ) : (
                        <strong>{action.item_name}</strong>
                      )}
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
                positions.map((position) => {
                  const invested = position.avg_buy_price * position.quantity;
                  const current = (position.last_price ?? position.avg_buy_price) * position.quantity;
                  const roi = invested > 0 ? ((current - invested) / invested) * 100 : 0;

                  return (
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
                        <span className="muted">{position.quantity.toLocaleString()} qty</span>
                      </div>
                      <p className="muted" style={{ marginTop: '0.2rem' }}>
                        Avg: {position.avg_buy_price.toLocaleString()} gp | Last: {Math.round(position.last_price ?? 0).toLocaleString()} gp
                      </p>
                      <div className="row-between" style={{ marginTop: '0.2rem' }}>
                        <span style={{ color: (position.unrealized_profit ?? 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                          {(position.unrealized_profit ?? 0) >= 0 ? '+' : ''}
                          {Math.round(position.unrealized_profit ?? 0).toLocaleString()} gp
                        </span>
                        <span
                          style={{
                            color: roi >= 0 ? 'var(--accent)' : 'var(--danger)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {roi >= 0 ? '+' : ''}
                          {roi.toFixed(1)}%
                        </span>
                      </div>
                    </li>
                  );
                })
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
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Reconciliation Inbox</h2>
              <button className="btn btn-secondary" disabled={loading} onClick={() => void loadReconciliationTasks(inboxFilter)}>
                Refresh
              </button>
            </div>

            {isAuthed ? (
              <div className="row" style={{ gap: '0.5rem', marginBottom: '0.65rem' }}>
                <button
                  className={`btn btn-secondary ${inboxFilter === 'pending' ? 'active' : ''}`}
                  disabled={loading}
                  onClick={() => {
                    setInboxFilter('pending');
                    void loadReconciliationTasks('pending');
                  }}
                >
                  Pending
                </button>
                <button
                  className={`btn btn-secondary ${inboxFilter === 'all' ? 'active' : ''}`}
                  disabled={loading}
                  onClick={() => {
                    setInboxFilter('all');
                    void loadReconciliationTasks('all');
                  }}
                >
                  All
                </button>
                <span className="muted" style={{ marginLeft: 'auto' }}>
                  Pending: <strong>{pendingInboxCount}</strong>
                </span>
              </div>
            ) : null}

            {!isAuthed ? (
              <p className="muted">Sign in to view reconciliation tasks.</p>
            ) : reconciliationTasks.length === 0 ? (
              <p className="muted">No tasks.</p>
            ) : (
              <ul className="list">
                {reconciliationTasks.map((task) => (
                  <li key={task.id} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row-between">
                      <strong>{task.item_name ?? `Item ${task.item_id ?? ''}`}</strong>
                      <span className="muted">
                        {task.side.toUpperCase()}
                        {inboxFilter === 'all' ? ` · ${String(task.status).toUpperCase()}` : ''}
                      </span>
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
                    {task.status === 'pending' ? (
                      <div className="row" style={{ marginTop: '0.5rem' }}>
                        <button className="btn btn-secondary" disabled={loading} onClick={() => void resolveReconciliationTask(task.id, 'approved')}>
                          Approve
                        </button>
                        <button className="btn btn-secondary" disabled={loading} onClick={() => void resolveReconciliationTask(task.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
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
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search item..."
                  value={itemSearchQuery}
                  onChange={(event) => setItemSearchQuery(event.target.value)}
                  autoComplete="off"
                />
                {itemSearchResults.length > 0 && (
                  <ul
                    className="list"
                    style={{
                      position: 'absolute',
                      zIndex: 10,
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '0 0 var(--radius) var(--radius)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      margin: 0,
                      padding: '0.25rem',
                    }}
                  >
                    {itemSearchResults.map((item) => (
                      <li key={item.item_id}>
                        <button
                          type="button"
                          onClick={() => selectSearchResult(item)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span className="muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                            #{item.item_id}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {itemSearchLoading && itemSearchQuery.length >= 2 && (
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Searching...
                  </p>
                )}
              </div>
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
                <p className="muted" style={{ fontSize: '0.8rem' }}>{sparklineStep} price history (OSRS Wiki)</p>
                {sparkStats ? (
                  <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--accent)' }}>↑</span> High: {Math.round(sparkStats.max).toLocaleString()}
                    </span>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--danger)' }}>↓</span> Low: {Math.round(sparkStats.min).toLocaleString()}
                    </span>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      Last: <strong style={{ color: sparkStats.last >= sparkStats.first ? 'var(--accent)' : 'var(--danger)' }}>{Math.round(sparkStats.last).toLocaleString()}</strong>
                      {typeof sparkStats.pct === 'number' ? (
                        <span style={{ 
                          color: sparkStats.pct >= 0 ? 'var(--accent)' : 'var(--danger)',
                          fontWeight: 700,
                          marginLeft: '0.35rem'
                        }}>
                          ({sparkStats.pct >= 0 ? '+' : ''}{sparkStats.pct.toFixed(1)}%)
                        </span>
                      ) : null}
                    </span>
                    {sparkStats.max > 0 && sparkStats.min > 0 ? (
                      <span 
                        className="muted" 
                        style={{ 
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          background: 'var(--surface-2)',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                        title={`Spread: high-low range as % of current price`}
                      >
                        ⟐ {(((sparkStats.max - sparkStats.min) / sparkStats.last) * 100).toFixed(1)}% volatility
                      </span>
                    ) : null}
                    {typeof sparkStats.avgVolume === 'number' && sparkStats.avgVolume > 0 ? (
                      <span 
                        className="muted" 
                        style={{ 
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.4rem',
                          background: 'var(--surface-2)',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                        title={`Average volume over selected timeframe`}
                      >
                        📊 {(sparkStats.avgVolume / 1000).toFixed(1)}k avg vol
                      </span>
                    ) : null}
                  </div>
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
                <button className="btn-close" type="button" onClick={() => setSelectedItem(null)} aria-label="Close">
                  ✕
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
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {tab}
            {tab === 'More' && pendingInboxCount > 0 ? (
              <span className="badge badge-high" style={{ marginLeft: '0.35rem' }}>{pendingInboxCount}</span>
            ) : null}
          </button>
        ))}
      </nav>
    </main>
  );
}
