'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ThesisStatus = 'watching' | 'open' | 'closed' | 'archived';
type ThesisHorizon = 'hours' | 'days' | 'weeks';

type LatestSignal = {
  id: string;
  engine: string;
  item_id: number;
  horizon: string | null;
  score: number | null;
  features: Record<string, unknown> | null;
  created_at: string;
};

type Thesis = {
  id: string;
  item_id: number;
  item_name: string | null;
  horizon: string | null;
  catalyst: string | null;
  entry_plan: unknown;
  exit_plan: unknown;
  invalidation: unknown;
  confidence: number | null;
  status: string | null;
  created_at: string;
  latest_signal: LatestSignal | null;
};

function getStatusClass(status: string): string {
  if (status === 'open') return 'bg-green-900/40 text-green-200 border-green-700/40';
  if (status === 'closed') return 'bg-blue-900/40 text-blue-200 border-blue-700/40';
  if (status === 'archived') return 'bg-slate-800 text-slate-400 border-slate-700';
  return 'bg-amber-900/30 text-amber-200 border-amber-700/40';
}

function summarizePlan(value: unknown): string {
  if (value == null) return 'Not set';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'Not set';
    return trimmed.length > 160 ? `${trimmed.slice(0, 160)}...` : trimmed;
  }
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized === '{}') return 'Not set';
    return serialized.length > 160 ? `${serialized.slice(0, 160)}...` : serialized;
  } catch {
    return 'Not set';
  }
}

export default function ThesesFeed() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const [itemId, setItemId] = useState('');
  const [horizon, setHorizon] = useState<ThesisHorizon>('days');
  const [catalyst, setCatalyst] = useState('');
  const [entryPlan, setEntryPlan] = useState('');
  const [exitPlan, setExitPlan] = useState('');
  const [invalidation, setInvalidation] = useState('');
  const [confidence, setConfidence] = useState(60);

  const statusCounts = useMemo(() => {
    return theses.reduce(
      (acc, thesis) => {
        const key = (thesis.status || 'watching') as ThesisStatus;
        if (acc[key] !== undefined) {
          acc[key] += 1;
        }
        return acc;
      },
      { watching: 0, open: 0, closed: 0, archived: 0 }
    );
  }, [theses]);

  const loadTheses = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/theses');
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to load theses');
      }

      setTheses(Array.isArray(json.theses) ? json.theses : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load theses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheses();
  }, []);

  const resetNewForm = () => {
    setItemId('');
    setHorizon('days');
    setCatalyst('');
    setEntryPlan('');
    setExitPlan('');
    setInvalidation('');
    setConfidence(60);
  };

  const createThesis = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: Number(itemId),
          horizon,
          catalyst,
          entry_plan: entryPlan,
          exit_plan: exitPlan,
          invalidation,
          confidence,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to create thesis');
      }

      setShowNewForm(false);
      resetNewForm();
      await loadTheses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thesis');
    } finally {
      setSubmitting(false);
    }
  };

  const updateThesisStatus = async (id: string, status: ThesisStatus) => {
    try {
      const response = await fetch(`/api/theses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to update thesis');
      }

      setTheses((prev) =>
        prev
          .map((thesis) => (thesis.id === id ? { ...thesis, status } : thesis))
          .filter((thesis) => thesis.status !== 'archived')
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update thesis');
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading theses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Thesis Feed</h2>
          <p className="text-sm text-slate-400">Hours / days / weeks opportunities tracked from watch to close.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
        >
          New thesis
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded p-2 text-slate-300">Watching: {statusCounts.watching}</div>
        <div className="bg-slate-900/60 border border-slate-800 rounded p-2 text-slate-300">Open: {statusCounts.open}</div>
        <div className="bg-slate-900/60 border border-slate-800 rounded p-2 text-slate-300">Closed: {statusCounts.closed}</div>
        <div className="bg-slate-900/60 border border-slate-800 rounded p-2 text-slate-300">Archived: {statusCounts.archived}</div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded p-3 text-sm text-red-200">{error}</div>
      )}

      {theses.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 text-slate-400">
          No theses yet. Start with a new thesis.
        </div>
      )}

      {theses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {theses.map((thesis) => {
            const status = thesis.status || 'watching';
            const itemLabel = thesis.item_name ? `${thesis.item_name} (#${thesis.item_id})` : `Item #${thesis.item_id}`;

            return (
              <div key={thesis.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-slate-100 font-semibold">{itemLabel}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(thesis.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${getStatusClass(status)}`}>
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-950/60 border border-slate-800 rounded p-2">
                    <div className="text-[11px] text-slate-500">Horizon</div>
                    <div className="text-sm text-slate-200 capitalize">{thesis.horizon || '-'}</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded p-2">
                    <div className="text-[11px] text-slate-500">Confidence</div>
                    <div className="text-sm text-slate-200">{thesis.confidence ?? '-'}%</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">Catalyst</div>
                    <div className="text-slate-200">{thesis.catalyst || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">Entry</div>
                    <div className="text-slate-300">{summarizePlan(thesis.entry_plan)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">Exit</div>
                    <div className="text-slate-300">{summarizePlan(thesis.exit_plan)}</div>
                  </div>
                </div>

                {thesis.latest_signal && (
                  <div className="mb-3 text-xs bg-blue-900/20 border border-blue-700/30 rounded p-2 text-blue-200">
                    Latest signal: {thesis.latest_signal.engine} · score {thesis.latest_signal.score ?? '-'} · {new Date(thesis.latest_signal.created_at).toLocaleString()}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateThesisStatus(thesis.id, 'open')}
                    className="px-3 py-1.5 rounded text-xs bg-green-700/70 hover:bg-green-700 text-green-100"
                  >
                    Mark Open
                  </button>
                  <button
                    onClick={() => updateThesisStatus(thesis.id, 'closed')}
                    className="px-3 py-1.5 rounded text-xs bg-blue-700/70 hover:bg-blue-700 text-blue-100"
                  >
                    Mark Closed
                  </button>
                  <button
                    onClick={() => updateThesisStatus(thesis.id, 'archived')}
                    className="px-3 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">New thesis</h3>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  resetNewForm();
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                Close
              </button>
            </div>

            <form onSubmit={createThesis} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-300">
                  Item ID
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  />
                </label>

                <label className="text-xs text-slate-300">
                  Horizon
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value as ThesisHorizon)}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                  >
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </label>
              </div>

              <label className="text-xs text-slate-300 block">
                Confidence (0-100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </label>

              <label className="text-xs text-slate-300 block">
                Catalyst
                <input
                  type="text"
                  required
                  value={catalyst}
                  onChange={(e) => setCatalyst(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </label>

              <label className="text-xs text-slate-300 block">
                Entry plan
                <textarea
                  rows={2}
                  required
                  value={entryPlan}
                  onChange={(e) => setEntryPlan(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </label>

              <label className="text-xs text-slate-300 block">
                Exit plan
                <textarea
                  rows={2}
                  required
                  value={exitPlan}
                  onChange={(e) => setExitPlan(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </label>

              <label className="text-xs text-slate-300 block">
                Invalidation
                <textarea
                  rows={2}
                  required
                  value={invalidation}
                  onChange={(e) => setInvalidation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
                />
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false);
                    resetNewForm();
                  }}
                  className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded"
                >
                  {submitting ? 'Saving...' : 'Create thesis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
