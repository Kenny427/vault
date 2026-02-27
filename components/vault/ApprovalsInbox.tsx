'use client';

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

interface ApprovalsInboxProps {
  tasks: ReconciliationTask[];
  loading: boolean;
  onRefresh: () => void;
}

export default function ApprovalsInbox({ tasks, loading, onRefresh }: ApprovalsInboxProps) {
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const processedTasks = tasks.filter((t) => t.status !== 'pending');

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/reconciliation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve task');
      }

      onRefresh();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/reconciliation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject task');
      }

      onRefresh();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const totalValue = pendingTasks.reduce((sum, t) => sum + t.quantity * t.price, 0);

  return (
    <section className="grid" style={{ gap: '0.75rem' }}>
      {/* Summary */}
      <div className="grid grid-2" style={{ gap: '0.5rem' }}>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Pending Approval</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>{pendingTasks.length}</p>
        </article>
        <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <p className="muted" style={{ fontSize: '0.75rem' }}>Total Value</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 900 }}>{totalValue.toLocaleString()} gp</p>
        </article>
      </div>

      {/* Quick Actions */}
      {pendingTasks.length > 0 && (
        <article className="card" style={{ background: 'linear-gradient(135deg, #422006 0%, #1f2937 100%)', border: '1px solid #f59e0b' }}>
          <div className="row-between">
            <div>
              <p style={{ fontWeight: 700, color: '#f59e0b' }}>⚠️ Action Required</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {pendingTasks.length} reconciliation task{pendingTasks.length !== 1 ? 's' : ''} need{pendingTasks.length === 1 ? 's' : ''} your attention
              </p>
            </div>
            <button className="btn" onClick={onRefresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </article>
      )}

      {/* Pending Tasks */}
      <article className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Pending Approvals ({pendingTasks.length})
        </h2>

        {pendingTasks.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
            ✓ No pending approvals. All caught up!
          </p>
        ) : (
          <ul className="list">
            {pendingTasks.map((task) => (
              <li
                key={task.id}
                className="card"
                style={{
                  padding: '0.75rem',
                  borderLeft: `3px solid ${task.side === 'buy' ? '#3b82f6' : '#8b5cf6'}`,
                }}
              >
                <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                  <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <strong>{task.item_name || `Item ${task.item_id}`}</strong>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.15rem 0.4rem',
                        background: task.side === 'buy' ? '#3b82f6' : '#8b5cf6',
                        color: '#fff',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      {task.side.toUpperCase()}
                    </span>
                  </div>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Quantity</p>
                    <p style={{ fontWeight: 600 }}>{task.quantity.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Price</p>
                    <p style={{ fontWeight: 600 }}>{task.price.toLocaleString()} gp</p>
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.65rem' }}>Total</p>
                    <p style={{ fontWeight: 700, color: '#f5c518' }}>
                      {(task.quantity * task.price).toLocaleString()} gp
                    </p>
                  </div>
                </div>

                {task.occurred_at && (
                  <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                    When: {new Date(task.occurred_at).toLocaleString()}
                  </p>
                )}

                {task.reason && (
                  <p className="muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    Reason: {task.reason}
                  </p>
                )}

                <div className="row" style={{ gap: '0.5rem' }}>
                  <button
                    className="btn"
                    onClick={() => handleApprove(task.id)}
                    style={{ background: '#22c55e', fontSize: '0.8rem' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleReject(task.id)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Processed Tasks */}
      {processedTasks.length > 0 && (
        <article className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Processed ({processedTasks.length})
          </h2>
          <ul className="list">
            {processedTasks.slice(0, 10).map((task) => (
              <li
                key={task.id}
                className="card"
                style={{
                  padding: '0.6rem',
                  borderLeft: `3px solid ${task.status === 'approved' ? '#22c55e' : '#ef4444'}`,
                  opacity: 0.7,
                }}
              >
                <div className="row-between">
                  <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{task.item_name || `Item ${task.item_id}`}</span>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        padding: '0.1rem 0.3rem',
                        background: task.side === 'buy' ? '#3b82f6' : '#8b5cf6',
                        color: '#fff',
                        borderRadius: '2px',
                      }}
                    >
                      {task.side.toUpperCase()}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      background: task.status === 'approved' ? '#22c55e' : '#ef4444',
                      color: '#fff',
                      borderRadius: '3px',
                      fontWeight: 700,
                    }}
                  >
                    {task.status.toUpperCase()}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {task.quantity.toLocaleString()} @ {task.price.toLocaleString()} gp ={' '}
                  {(task.quantity * task.price).toLocaleString()} gp
                </p>
              </li>
            ))}
          </ul>
          {processedTasks.length > 10 && (
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
              ...and {processedTasks.length - 10} more
            </p>
          )}
        </article>
      )}
    </section>
  );
}
