'use client';

import { useState } from 'react';

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

interface ProposalsInboxProps {
  proposals: Proposal[];
  onRefresh: () => void;
}

export default function ProposalsInbox({ proposals, onRefresh }: ProposalsInboxProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    item_name: '',
    side: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const processedProposals = proposals.filter((p) => p.status !== 'pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          item_name: formData.item_name || undefined,
          side: formData.side || undefined,
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          price: formData.price ? parseInt(formData.price) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create proposal');
      }

      setFormData({
        description: '',
        item_name: '',
        side: 'buy',
        quantity: '',
        price: '',
      });
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update proposal');
      }

      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update proposal');
    }
  };

  return (
    <section className="grid" style={{ gap: '0.75rem' }}>
      {/* Summary */}
      <div className="grid grid-2" style={{ gap: '0.5rem' }}>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Pending</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>{pendingProposals.length}</p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Processed</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 900 }}>{processedProposals.length}</p>
        </article>
      </div>

      {/* Create New Proposal */}
      <article className="card">
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Proposals</h2>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Proposal'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="grid" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
            
            <textarea
              placeholder="Describe your proposal..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              required
              rows={3}
              style={{ resize: 'vertical' }}
            />

            <div className="grid grid-2" style={{ gap: '0.5rem' }}>
              <input
                placeholder="Item name (optional)"
                value={formData.item_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, item_name: e.target.value }))}
              />
              <select
                value={formData.side}
                onChange={(e) => setFormData((prev) => ({ ...prev, side: e.target.value as 'buy' | 'sell' }))}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            <div className="grid grid-2" style={{ gap: '0.5rem' }}>
              <input
                type="number"
                placeholder="Quantity (optional)"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Price (optional)"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn" disabled={submitting || !formData.description.trim()}>
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </form>
        )}

        {/* Pending Proposals */}
        {pendingProposals.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f59e0b' }}>
              Pending ({pendingProposals.length})
            </h3>
            <ul className="list">
              {pendingProposals.map((proposal) => (
                <li key={proposal.id} className="card" style={{ padding: '0.75rem', borderLeft: '3px solid #f59e0b' }}>
                  <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                    <strong>{proposal.item_name || 'General Proposal'}</strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        background: '#f59e0b',
                        color: '#000',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      PENDING
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>{proposal.description}</p>
                  <div className="row-between" style={{ fontSize: '0.8rem' }}>
                    <span className="muted">
                      {proposal.side?.toUpperCase()}
                      {proposal.quantity ? ` · ${proposal.quantity.toLocaleString()}` : ''}
                      {proposal.price ? ` @ ${proposal.price.toLocaleString()} gp` : ''}
                    </span>
                    <span className="muted">{new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="row" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateStatus(proposal.id, 'approved')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateStatus(proposal.id, 'rejected')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Processed Proposals */}
        {processedProposals.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
              Processed ({processedProposals.length})
            </h3>
            <ul className="list">
              {processedProposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="card"
                  style={{
                    padding: '0.75rem',
                    borderLeft: `3px solid ${proposal.status === 'approved' ? '#22c55e' : '#ef4444'}`,
                    opacity: 0.7,
                  }}
                >
                  <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                    <strong>{proposal.item_name || 'General Proposal'}</strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem',
                        background: proposal.status === 'approved' ? '#22c55e' : '#ef4444',
                        color: '#fff',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      {proposal.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>{proposal.description}</p>
                  <div className="row-between" style={{ fontSize: '0.8rem' }}>
                    <span className="muted">
                      {proposal.side?.toUpperCase()}
                      {proposal.quantity ? ` · ${proposal.quantity.toLocaleString()}` : ''}
                      {proposal.price ? ` @ ${proposal.price.toLocaleString()} gp` : ''}
                    </span>
                    <span className="muted">{new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {proposals.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
            No proposals yet. Create one to get started.
          </p>
        )}
      </article>
    </section>
  );
}
