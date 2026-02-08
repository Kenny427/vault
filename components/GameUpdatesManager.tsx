'use client';

import { useState, useEffect } from 'react';
import type { GameUpdateWithImpacts } from '@/lib/types/gameUpdates';

export default function GameUpdatesManager() {
  const [updates, setUpdates] = useState<GameUpdateWithImpacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('unreviewed');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUpdates();
  }, [filter]);

  async function loadUpdates() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'unreviewed') params.set('unreviewed', 'true');
      
      const response = await fetch(`/api/admin/game-updates?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setUpdates(data.updates || []);
      } else {
        setError(data.error || 'Failed to load updates');
      }
    } catch (err) {
      setError('Failed to load updates');
    } finally {
      setLoading(false);
    }
  }

  async function triggerScrape(daysBack: number = 7) {
    try {
      setScraping(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/game-updates/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Scraped ${data.processed} updates, extracted ${data.items_extracted} item impacts`);
        loadUpdates();
      } else {
        setError(data.error || 'Failed to scrape updates');
      }
    } catch (err) {
      setError('Failed to trigger scrape');
    } finally {
      setScraping(false);
    }
  }

  async function markReviewed(updateId: string) {
    try {
      const response = await fetch('/api/admin/game-updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: updateId, is_reviewed: true }),
      });

      if (response.ok) {
        setUpdates(prev => prev.filter(u => u.id !== updateId));
        setSuccess('Update marked as reviewed');
      } else {
        setError('Failed to mark as reviewed');
      }
    } catch (err) {
      setError('Failed to update');
    }
  }

  async function toggleActive(updateId: string, isActive: boolean) {
    try {
      const response = await fetch('/api/admin/game-updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: updateId, is_active: !isActive }),
      });

      if (response.ok) {
        loadUpdates();
        setSuccess(isActive ? 'Update deactivated' : 'Update activated');
      } else {
        setError('Failed to toggle status');
      }
    } catch (err) {
      setError('Failed to update');
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      case 'mixed': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-900/30 text-red-300';
      case 'medium': return 'bg-yellow-900/30 text-yellow-300';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">🎮 Game Updates Manager</h2>
            <p className="text-sm text-slate-400 mt-1">
              Track OSRS updates and their market impacts
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unreviewed' : 'all')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
            >
              {filter === 'all' ? 'Show Unreviewed' : 'Show All'}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => triggerScrape(7)}
            disabled={scraping}
            className="px-6 py-2 bg-osrs-accent hover:bg-osrs-accent/90 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold rounded transition-colors"
          >
            {scraping ? '🔄 Scraping...' : '🔍 Scrape Updates (7 days)'}
          </button>
          <button
            onClick={() => triggerScrape(14)}
            disabled={scraping}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-semibold rounded transition-colors"
          >
            Scrape 14 days
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-700 rounded p-3 text-red-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-900/20 border border-green-700 rounded p-3 text-green-200 text-sm">
            ✅ {success}
          </div>
        )}
      </div>

      {/* Updates List */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          {filter === 'unreviewed' ? 'Unreviewed Updates' : 'All Updates'} ({updates.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : updates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">No {filter === 'unreviewed' ? 'unreviewed' : ''} updates found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className="bg-slate-800 rounded-lg border border-slate-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium">
                        {update.source_type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(update.impact_level)}`}>
                        {update.impact_level.toUpperCase()} IMPACT
                      </span>
                      <span className={`text-sm font-medium ${getSentimentColor(update.overall_sentiment)}`}>
                        {update.overall_sentiment === 'bullish' && '📈'}
                        {update.overall_sentiment === 'bearish' && '📉'}
                        {update.overall_sentiment === 'mixed' && '↔️'}
                        {update.overall_sentiment === 'neutral' && '➡️'}
                        {' '}{update.overall_sentiment.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-100 mb-1">
                      {update.title}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {new Date(update.update_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {update.release_date && (
                        <span className="ml-2">
                          • Release: {new Date(update.release_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!update.is_reviewed && (
                      <button
                        onClick={() => markReviewed(update.id)}
                        className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-300 rounded text-sm transition-colors"
                      >
                        ✓ Mark Reviewed
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(update.id, update.is_active)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        update.is_active
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
                      }`}
                    >
                      {update.is_active ? '🔇 Deactivate' : '🔔 Activate'}
                    </button>
                  </div>
                </div>

                {/* Affected Items */}
                {update.impacts && update.impacts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-sm font-semibold text-slate-300 mb-2">
                      Affected Items ({update.impacts.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {update.impacts.slice(0, 10).map((impact) => (
                        <span
                          key={impact.id}
                          className="px-2 py-1 bg-slate-700 text-slate-300 rounded-full text-xs"
                        >
                          {impact.item_name}
                          {impact.sentiment === 'bullish' && ' 📈'}
                          {impact.sentiment === 'bearish' && ' 📉'}
                          {impact.confidence && ` (${impact.confidence}%)`}
                        </span>
                      ))}
                      {update.impacts.length > 10 && (
                        <span className="px-2 py-1 text-slate-400 text-xs">
                          +{update.impacts.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {update.source_url && (
                  <div className="mt-3">
                    <a
                      href={update.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-osrs-accent hover:underline"
                    >
                      View Source →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
