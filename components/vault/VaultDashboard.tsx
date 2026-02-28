'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import OpportunitiesFeed from './OpportunitiesFeed';
import PortfolioView from './PortfolioView';
import ProposalsInbox from './ProposalsInbox';
import ApprovalsInbox from './ApprovalsInbox';

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
  icon_url: string | null;
};

type Proposal = {
  id: string;
  description: string;
  item_id?: number;
  item_name?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type PortfolioSummary = {
  total_value: number;
  total_invested: number;
  total_realized_profit: number;
  total_unrealized_profit: number;
  total_profit: number;
  position_count: number;
};

type PortfolioPosition = {
  item_id: number;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number | null;
  realized_profit: number | null;
  unrealized_profit: number | null;
  updated_at: string | null;
  icon_url: string | null;
};

const tabs = ['Opportunities', 'Portfolio', 'Proposals', 'Approvals'] as const;
type Tab = (typeof tabs)[number];

export default function VaultDashboard({ initialTab = 'Opportunities' }: { initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillProposal, setPrefillProposal] = useState<{ item_name: string; side: 'buy' | 'sell'; quantity: number; price: number } | null>(null);

  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLastUpdated, setOpportunitiesLastUpdated] = useState<string | null>(null);
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reconciliationTasks, setReconciliationTasks] = useState<ReconciliationTask[]>([]);

  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupabase(createBrowserSupabaseClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let mounted = true;

    async function checkAuth() {
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

    void checkAuth();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const oppRes = await fetch('/api/opportunities');
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setOpportunities(oppData.opportunities || []);
        setOpportunitiesLastUpdated(oppData.lastUpdated || null);
      }

      if (isAuthed) {
        const [portRes, propRes, reconRes] = await Promise.all([
          fetch('/api/portfolio'),
          fetch('/api/proposals'),
          fetch('/api/reconciliation/tasks?status=pending'),
        ]);

        if (portRes.ok) {
          const portData = await portRes.json();
          setPortfolioPositions(portData.positions || []);
          setPortfolioSummary(portData.summary || null);
        }

        if (propRes.ok) {
          const propData = await propRes.json();
          setProposals(propData.proposals || []);
        }

        if (reconRes.ok) {
          const reconData = await reconRes.json();
          setReconciliationTasks(reconData.tasks || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (authChecked) void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isAuthed]);

  const handleSendMagicLink = async () => {
    if (!supabase || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAuthed(false);
    setPortfolioPositions([]);
    setPortfolioSummary(null);
    setProposals([]);
    setReconciliationTasks([]);
  };

  const handleRefreshPrices = async () => {
    const res = await fetch('/api/market/refresh-watchlists', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return { refreshed: data.refreshed ?? 0 };
    }
    try {
      const data = await res.json();
      return { error: data?.error ?? `Failed to refresh prices (HTTP ${res.status})` };
    } catch {
      return { error: `Failed to refresh prices (HTTP ${res.status})` };
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === 'pending').length;
  const pendingApprovals = reconciliationTasks.filter((t) => t.status === 'pending').length;

  return (
    <main>
      <section className="command-hero">
        <div>
          <p className="hud-label">Futuristic AI Trading Terminal</p>
          <h1>Vault Quantum Desk</h1>
          <p className="muted">Built for deep research, profitable flips, and portfolio control. Scan opportunities, generate AI theses and execute cleanly.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" onClick={() => void loadData()} disabled={loading}>{loading ? 'Syncing…' : 'Sync all data'}</button>
          {isAuthed && <button className="btn" onClick={handleSignOut}>Sign out</button>}
        </div>
      </section>

      {error && <p style={{ color: '#ff5f8a', marginBottom: '0.8rem' }}>{error}</p>}

      {!authChecked ? (
        <div className="card"><p className="muted">Checking authentication…</p></div>
      ) : !isAuthed ? (
        <div className="card auth-panel">
          <h2>Secure access required</h2>
          <p className="muted">Sign in to unlock research notes, proposals, approvals and portfolio analytics.</p>
          {magicLinkSent ? (
            <p style={{ color: '#1df2a1' }}>Magic link sent. Open your email and continue.</p>
          ) : (
            <div className="auth-row">
              <input type="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn" onClick={handleSendMagicLink} disabled={loading || !email}>Send magic link</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <section className="dashboard-status-row">
            <div className="status-tile">
              <p className="hud-label">Opportunities</p>
              <strong>{opportunities.length}</strong>
            </div>
            <div className="status-tile">
              <p className="hud-label">Portfolio positions</p>
              <strong>{portfolioSummary?.position_count ?? 0}</strong>
            </div>
            <div className="status-tile">
              <p className="hud-label">Pending proposals</p>
              <strong>{pendingProposals}</strong>
            </div>
            <div className="status-tile">
              <p className="hud-label">Pending approvals</p>
              <strong>{pendingApprovals}</strong>
            </div>
          </section>

          <div className="dashboard-tabs">
            {tabs.map((tab) => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
                {tab === 'Proposals' && pendingProposals > 0 && <span className="count-pill">{pendingProposals}</span>}
                {tab === 'Approvals' && pendingApprovals > 0 && <span className="count-pill">{pendingApprovals}</span>}
              </button>
            ))}
          </div>

          {activeTab === 'Opportunities' && (
            <OpportunitiesFeed
              opportunities={opportunities}
              loading={loading}
              onRefresh={() => void loadData()}
              lastUpdated={opportunitiesLastUpdated}
              onRefreshPrices={handleRefreshPrices}
              onCreateProposal={(opp) => {
                setPrefillProposal({ item_name: opp.item_name, side: 'buy', quantity: opp.suggested_qty, price: opp.buy_at });
                setActiveTab('Proposals');
              }}
            />
          )}

          {activeTab === 'Portfolio' && (
            <PortfolioView
              positions={portfolioPositions}
              summary={portfolioSummary}
              loading={loading}
              onCreateProposal={(data) => {
                setPrefillProposal(data);
                setActiveTab('Proposals');
              }}
            />
          )}

          {activeTab === 'Proposals' && (
            <ProposalsInbox proposals={proposals} onRefresh={() => void loadData()} prefill={prefillProposal} onPrefillConsumed={() => setPrefillProposal(null)} />
          )}

          {activeTab === 'Approvals' && (
            <ApprovalsInbox tasks={reconciliationTasks} loading={loading} onRefresh={() => void loadData()} />
          )}
        </>
      )}
    </main>
  );
}
