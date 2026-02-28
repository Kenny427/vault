'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import OpportunitiesFeed from './OpportunitiesFeed';
import OpportunitiesCard from './OpportunitiesCard';
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

export default function VaultDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('Opportunities');
  const [oppViewMode, setOppViewMode] = useState<'feed' | 'card'>('feed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-fill proposal from opportunity
  const [prefillProposal, setPrefillProposal] = useState<{
    item_name: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  } | null>(null);
  
  // Auth state
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Data states
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLastUpdated, setOpportunitiesLastUpdated] = useState<string | null>(null);
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reconciliationTasks, setReconciliationTasks] = useState<ReconciliationTask[]>([]);

  // Initialize supabase client
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupabase(createBrowserSupabaseClient());
  }, []);

  // Auth check
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

  // Load data based on active tab
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Always load opportunities
      const oppRes = await fetch('/api/opportunities');
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setOpportunities(oppData.opportunities || []);
        setOpportunitiesLastUpdated(oppData.lastUpdated || null);
      }

      // Load portfolio if authed
      if (isAuthed) {
        const portRes = await fetch('/api/portfolio');
        if (portRes.ok) {
          const portData = await portRes.json();
          setPortfolioPositions(portData.positions || []);
          setPortfolioSummary(portData.summary || null);
        }

        const propRes = await fetch('/api/proposals');
        if (propRes.ok) {
          const propData = await propRes.json();
          setProposals(propData.proposals || []);
        }

        const reconRes = await fetch('/api/reconciliation/tasks?status=pending');
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

  // Initial load and tab changes
  useEffect(() => {
    if (authChecked) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isAuthed]);

  // Sign out handler
  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setIsAuthed(false);
      setPortfolioPositions([]);
      setPortfolioSummary(null);
      setProposals([]);
      setReconciliationTasks([]);
    }
  };

  // Auth - send magic link
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check price freshness
  const getPriceFreshness = (lastUpdated: string | null | undefined): { status: 'fresh' | 'stale' | 'unknown'; text: string; color: string } => {
    if (!lastUpdated) return { status: 'unknown', text: 'No data', color: '#6b7280' };
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 15) return { status: 'fresh', text: 'Fresh', color: '#22c55e' };
    if (diffMins < 60) return { status: 'stale', text: `${diffMins}m old`, color: '#f59e0b' };
    return { status: 'stale', text: `${Math.floor(diffMins / 60)}h old`, color: '#ef4444' };
  };

  const priceFreshness = getPriceFreshness(opportunitiesLastUpdated);

  // Refresh prices handler
  const handleRefreshPrices = async () => {
    const res = await fetch('/api/market/refresh-watchlists', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return { refreshed: data.refreshed ?? 0 };
    }
    // Surface server error for easier QA
    try {
      const data = await res.json();
      return { error: data?.error ?? `Failed to refresh prices (HTTP ${res.status})` };
    } catch {
      return { error: `Failed to refresh prices (HTTP ${res.status})` };
    }
  };

  const handleSendMagicLink = async () => {
    if (!supabase || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {/* Header */}
      <div className="row-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="text-2xl font-extrabold text-accent tracking-tight">Vault</h1>
          <p className="text-sm text-text-muted mt-1">OSRS Investment Dashboard</p>
        </div>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {/* Price freshness indicator */}
          <div 
            className="row" 
            style={{ 
              gap: 'var(--space-2)', 
              padding: 'var(--space-1) var(--space-2)', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${priceFreshness.color}40`,
              cursor: 'pointer',
            }}
            onClick={() => void loadData()}
            title="Click to refresh prices"
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: priceFreshness.color }} />
            <span className="text-xs font-semibold" style={{ color: priceFreshness.color }}>
              {priceFreshness.text}
            </span>
          </div>
          {isAuthed && (
            <button className="btn btn-secondary" onClick={handleSignOut}>
              Sign Out
            </button>
          )}
          <button className="btn" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Loading...' : 'Sync'}
          </button>
          {activeTab === 'Opportunities' && (
            <button
              className="btn btn-secondary"
              onClick={() => setOppViewMode(v => v === 'feed' ? 'card' : 'feed')}
              title={oppViewMode === 'feed' ? 'Switch to card view' : 'Switch to feed view'}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
            >
              {oppViewMode === 'feed' ? '▦' : '☰'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</p>
      )}

      {/* Auth check */}
      {!authChecked ? (
        <p className="muted">Checking authentication...</p>
      ) : !isAuthed ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Sign In Required</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Sign in to view portfolio, proposals, and approvals.
          </p>
          {magicLinkSent ? (
            <p style={{ color: '#22c55e' }}>Magic link sent! Check your email.</p>
          ) : (
            <div className="grid" style={{ gap: '0.5rem', maxWidth: '300px', margin: '0 auto' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn" onClick={handleSendMagicLink} disabled={loading || !email}>
                Send Magic Link
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: '1rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'Proposals' && proposals.filter(p => p.status === 'pending').length > 0 && (
                  <span className="badge badge-high" style={{ marginLeft: '0.35rem' }}>
                    {proposals.filter(p => p.status === 'pending').length}
                  </span>
                )}
                {tab === 'Approvals' && reconciliationTasks.filter(t => t.status === 'pending').length > 0 && (
                  <span className="badge badge-high" style={{ marginLeft: '0.35rem' }}>
                    {reconciliationTasks.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'Opportunities' && oppViewMode === 'feed' && (
            <OpportunitiesFeed
              opportunities={opportunities}
              loading={loading}
              onRefresh={() => void loadData()}
              lastUpdated={opportunitiesLastUpdated}
              onRefreshPrices={handleRefreshPrices}
              onCreateProposal={(opp) => {
                setPrefillProposal({
                  item_name: opp.item_name,
                  side: 'buy',
                  quantity: opp.suggested_qty,
                  price: opp.buy_at,
                });
                setActiveTab('Proposals');
              }}
            />
          )}

          {activeTab === 'Opportunities' && oppViewMode === 'card' && (
            <OpportunitiesCard
              opportunities={opportunities}
              loading={loading}
              onRefresh={() => void loadData()}
              lastUpdated={opportunitiesLastUpdated}
              onRefreshPrices={handleRefreshPrices}
              onCreateProposal={(opp) => {
                setPrefillProposal({
                  item_name: opp.item_name,
                  side: 'buy',
                  quantity: opp.suggested_qty,
                  price: opp.buy_at,
                });
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
            <ProposalsInbox
              proposals={proposals}
              onRefresh={() => void loadData()}
              prefill={prefillProposal}
              onPrefillConsumed={() => setPrefillProposal(null)}
            />
          )}

          {activeTab === 'Approvals' && (
            <ApprovalsInbox tasks={reconciliationTasks} loading={loading} onRefresh={() => void loadData()} />
          )}
        </>
      )}
    </main>
  );
}
