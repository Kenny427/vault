'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { FlipOpportunity } from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { getItemDetails, resolveIconUrl, fetchItemMapping } from '@/lib/api/osrs';
import SetAlertModal from './SetAlertModal';
import ItemNotesModal from './ItemNotesModal';

interface FlipCardProps {
  opportunity: FlipOpportunity;
  onViewDetails: () => void;
}

export default function FlipCard({ opportunity, onViewDetails }: FlipCardProps) {
  const { favorites, addToFavorites, removeFromFavorites } = useDashboardStore();
  const isInFavorites = favorites.some(item => item.id === opportunity.itemId);

  const [showSetAlertModal, setShowSetAlertModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Fetch item details for icon
  const { data: itemDetails } = useQuery({
    queryKey: ['item-details', opportunity.itemId],
    queryFn: () => getItemDetails(opportunity.itemId),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Fetch buy limit from mapping API
  const { data: buyLimitData } = useQuery({
    queryKey: ['buy-limit', opportunity.itemId],
    queryFn: async () => {
      const mapping = await fetchItemMapping();
      return mapping.find(item => item.id === opportunity.itemId)?.limit || null;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (buy limits don't change often)
  });

  const iconUrl = resolveIconUrl(itemDetails?.icon);

  const formatNumber = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 100_000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (abs < 1_000_000) {
      return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')}M`;
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInFavorites) {
      removeFromFavorites(opportunity.itemId);
    } else {
      addToFavorites({
        id: opportunity.itemId,
        name: opportunity.itemName,
        addedAt: Date.now(),
      });
    }
  };

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'from-green-400 to-emerald-500';
    if (score >= 50) return 'from-yellow-400 to-orange-500';
    if (score >= 30) return 'from-orange-400 to-red-500';
    return 'from-red-400 to-rose-600';
  };

  const getScoreBorder = (score: number) => {
    if (score >= 70) return 'border-green-500/30';
    if (score >= 50) return 'border-yellow-500/30';
    if (score >= 30) return 'border-orange-500/30';
    return 'border-red-500/30';
  };

  return (
    <div
      onClick={onViewDetails}
      className={`bg-gradient-to-br from-slate-800 to-slate-900 border ${getScoreBorder(opportunity.opportunityScore)} rounded-lg overflow-hidden hover:border-osrs-accent transition-all cursor-pointer hover:shadow-lg hover:shadow-osrs-accent/20 hover:-translate-y-1`}
    >
      {/* Header - Item Name & Favorite */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Item Icon */}
            <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded flex items-center justify-center flex-shrink-0">
              {iconUrl ? (
                <img src={iconUrl} alt={opportunity.itemName} className="w-8 h-8" />
              ) : (
                <span className="text-lg">🪙</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-100 text-lg line-clamp-2">
                {opportunity.itemName}
              </h3>
              <p className="text-xs text-slate-500 mt-1">ID: {opportunity.itemId}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(e);
            }}
            className={`ml-2 px-3 py-1 rounded text-sm font-bold transition-all ${isInFavorites
              ? 'bg-osrs-accent text-slate-900'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
          >
            {isInFavorites ? '★' : '☆'}
          </button>
        </div>

        {/* Score Badge, Hold Time & Buy Limit - Primary Metrics */}
        <div className="flex items-center gap-3 text-xs font-semibold tracking-wide flex-wrap">
          <div className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-slate-800/40 border border-slate-700/50 shadow-sm">
            <span className="text-slate-400">SCORE</span>
            <span className={`text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${getScoreGradient(opportunity.opportunityScore)}`}>
              {opportunity.opportunityScore.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-slate-800/40 border border-slate-700/50 shadow-sm">
            <span className="text-slate-400 uppercase">Horizon</span>
            <span className="text-sm font-bold text-slate-100 italic">
              {opportunity.estimatedHoldTime || (opportunity.aiHoldWeeks ? `${opportunity.aiHoldWeeks}w` : '7-14d')}
            </span>
          </div>
          {buyLimitData && (
            <div className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-emerald-900/30 border border-emerald-700/50 shadow-sm">
              <span className="text-emerald-400">📦 BUY LIMIT</span>
              <span className="text-sm font-bold text-emerald-300">
                {buyLimitData.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Core Stats - Clean 3-column layout */}
      <div className="p-4 space-y-4 border-b border-slate-700/50">
        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">CURRENT</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.currentPrice ?? 0)}
            </p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">30D AVG</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.averagePrice30 ?? opportunity.averagePrice ?? 0)}
            </p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">180D AVG</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.averagePrice180 ?? opportunity.averagePrice ?? 0)}
            </p>
          </div>
        </div>

        {/* Key Metrics - Deviation, ROI, Volume */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">UNDERVALUED</p>
            <p className={`font-bold ${opportunity.deviation < 0 ? 'text-green-400' : 'text-slate-400'}`}>
              {Math.abs(opportunity.deviation ?? 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">TARGET ROI</p>
            <p className="font-bold text-blue-400">
              {opportunity.roi?.toFixed(1) ?? '0'}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">DAILY VOLUME</p>
            <p className="font-bold text-slate-300">
              {opportunity.dailyVolume && opportunity.dailyVolume > 0 ? Math.round(opportunity.dailyVolume > 1000 ? opportunity.dailyVolume / 1000 : opportunity.dailyVolume).toString() + (opportunity.dailyVolume > 1000 ? 'K' : '') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      {opportunity.aiReasoning && (
        <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-300 leading-relaxed">{opportunity.aiReasoning}</p>
          </div>
        </div>
      )}

      {/* Price Guidance */}
      {(opportunity.aiEntryLow || opportunity.aiEntryHigh || opportunity.aiExitBase || opportunity.aiExitStretch || opportunity.aiStopLoss) && (
        <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700">
          <p className="text-xs font-bold text-slate-400 mb-2">PRICE GUIDANCE</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {opportunity.aiEntryLow && opportunity.aiEntryHigh && (
              <div className="col-span-2">
                <p className="text-slate-500">Buy now range</p>
                <p className="text-green-400 font-bold">
                  {opportunity.aiEntryLow.toLocaleString()}gp – {opportunity.aiEntryHigh.toLocaleString()}gp
                </p>
              </div>
            )}
            {opportunity.aiExitBase && (
              <div>
                <p className="text-slate-500">Primary exit</p>
                <p className="text-blue-400 font-bold">{opportunity.aiExitBase.toLocaleString()}gp</p>
              </div>
            )}
            {opportunity.aiExitStretch && opportunity.aiExitStretch !== opportunity.aiExitBase && (
              <div>
                <p className="text-slate-500">Stretch exit</p>
                <p className="text-yellow-400 font-bold">{opportunity.aiExitStretch.toLocaleString()}gp</p>
              </div>
            )}
            {opportunity.aiStopLoss && (
              <div>
                <p className="text-slate-500">Protect capital</p>
                <p className="text-red-400 font-bold">{opportunity.aiStopLoss.toLocaleString()}gp</p>
              </div>
            )}
            {opportunity.aiHoldWeeks && (
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Horizon</p>
                <p className="text-slate-100 font-bold italic">{opportunity.aiHoldWeeks} weeks</p>
              </div>
            )}
            {opportunity.sellAtMin && !opportunity.aiExitBase && (

              <div>
                <p className="text-slate-500">Sell min (safe)</p>
                <p className="text-blue-400 font-bold">{opportunity.sellAtMin.toLocaleString()}gp</p>
              </div>
            )}
            {opportunity.sellAtMax && !opportunity.aiExitStretch && (
              <div>
                <p className="text-slate-500">Sell max (greed)</p>
                <p className="text-yellow-400 font-bold">{opportunity.sellAtMax.toLocaleString()}gp</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Quick Actions */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/30 grid grid-cols-3 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="py-2 px-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 text-xs font-bold rounded transition-colors"
        >
          📊 Chart
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSetAlertModal(true);
          }}
          className="py-2 px-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded transition-colors"
        >
          🔔 Alert
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNotesModal(true);
          }}
          className="py-2 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded transition-colors"
        >
          📝 Notes
        </button>
      </div>

      {/* Modals - rendered outside card using portal */}
      {showSetAlertModal && typeof document !== 'undefined' && createPortal(
        <SetAlertModal
          itemId={opportunity.itemId}
          itemName={opportunity.itemName}
          currentPrice={opportunity.currentPrice}
          onClose={() => setShowSetAlertModal(false)}
        />,
        document.body
      )}
      {showNotesModal && typeof document !== 'undefined' && createPortal(
        <ItemNotesModal
          itemId={opportunity.itemId}
          itemName={opportunity.itemName}
          onClose={() => setShowNotesModal(false)}
        />,
        document.body
      )}
    </div>
  );
}
