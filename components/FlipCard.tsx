'use client';

import { useState } from 'react';
import { FlipOpportunity } from '@/lib/analysis';
import { useDashboardStore } from '@/lib/store';
import { useChat } from '@/lib/chatContext';
import SetAlertModal from './SetAlertModal';

interface AIRankedOpportunity extends FlipOpportunity {
  aiScore: number;
  aiReasoning: string;
  aiConfidence: number;
}

interface FlipCardProps {
  opportunity: FlipOpportunity | AIRankedOpportunity;
  onViewDetails: () => void;
}

export default function FlipCard({ opportunity, onViewDetails }: FlipCardProps) {
  const { favorites, addToFavorites, removeFromFavorites } = useDashboardStore();
  const { openChat } = useChat();
  const isInFavorites = favorites.some(item => item.id === opportunity.itemId);
  const isAIRanked = 'aiScore' in opportunity;
  
  const [showSetAlertModal, setShowSetAlertModal] = useState(false);

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

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-900/20 border-green-700';
    if (score >= 50) return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
    if (score >= 30) return 'text-orange-400 bg-orange-900/20 border-orange-700';
    return 'text-red-400 bg-red-900/20 border-red-700';
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'buy':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'sell':
        return 'bg-red-900/30 text-red-400 border-red-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return '📈';
      case 'bearish':
        return '📉';
      default:
        return '→';
    }
  };

  const getFlipTypeDisplay = (flipType: string) => {
    switch (flipType) {
      case 'quick-flip':
        return { emoji: '⚡', label: 'Quick Flip', color: 'text-green-400 bg-green-900/20 border-green-700' };
      case 'bot-dump':
        return { emoji: '🤖', label: 'Bot Dump', color: 'text-blue-400 bg-blue-900/20 border-blue-700' };
      case 'long-term':
        return { emoji: '📈', label: 'Long-Term', color: 'text-purple-400 bg-purple-900/20 border-purple-700' };
      case 'safe-hold':
        return { emoji: '🛡️', label: 'Safe Hold', color: 'text-emerald-400 bg-emerald-900/20 border-emerald-700' };
      case 'volatile-play':
        return { emoji: '💥', label: 'Volatile', color: 'text-red-400 bg-red-900/20 border-red-700' };
      default:
        return { emoji: '📊', label: 'Short-Term', color: 'text-slate-400 bg-slate-900/20 border-slate-700' };
    }
  };

  // Calculate price change percentage from 30d average
  const priceChange30d = opportunity.averagePrice30 
    ? ((opportunity.currentPrice - opportunity.averagePrice30) / opportunity.averagePrice30) * 100 
    : 0;
  
  const priceChange90d = opportunity.averagePrice90 
    ? ((opportunity.currentPrice - opportunity.averagePrice90) / opportunity.averagePrice90) * 100 
    : 0;

  const flipTypeInfo = getFlipTypeDisplay(opportunity.flipType);

  // Format large numbers (for investment display)
  const formatLarge = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <div
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-osrs-accent transition-all cursor-pointer hover:shadow-lg hover:shadow-osrs-accent/20 hover:-translate-y-1"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-slate-100 text-lg line-clamp-2">
              {opportunity.itemName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ID: {opportunity.itemId} • {getTrendEmoji(opportunity.trend)} {opportunity.trend}
            </p>
          </div>
          <button
            onClick={toggleFavorite}
            className={`ml-2 px-3 py-1 rounded text-sm font-bold transition-all ${
              isInFavorites
                ? 'bg-osrs-accent text-slate-900'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isInFavorites ? '★' : '☆'}
          </button>
        </div>

        {/* Key Badges */}
        <div className="flex gap-2 flex-wrap">
          {isAIRanked && (
            <div className="px-2 py-1 rounded text-xs font-bold border border-purple-600 text-purple-300 bg-purple-900/30">
              🤖 AI: {(opportunity as AIRankedOpportunity).aiScore}/100
            </div>
          )}
          <div className={`px-2 py-1 rounded text-xs font-bold border ${flipTypeInfo.color}`}>
            {flipTypeInfo.emoji} {flipTypeInfo.label}
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-bold border ${getRecommendationColor(
              opportunity.recommendation
            )}`}
          >
            {opportunity.recommendation.toUpperCase()} SIGNAL
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-bold border ${getScoreColor(
              opportunity.opportunityScore
            )}`}
          >
            Score: {opportunity.opportunityScore.toFixed(0)}/100
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold border border-slate-600 ${getRiskColor(opportunity.riskLevel)}`}>
            {opportunity.riskLevel.toUpperCase()} RISK
          </div>
        </div>
      </div>

      {/* AI Reasoning (if available) */}
      {isAIRanked && (opportunity as AIRankedOpportunity).aiReasoning && (
        <div className="p-3 bg-gradient-to-r from-purple-900/30 to-purple-800/20 border-b border-purple-700/50">
          <div className="flex items-start gap-2">
            <span className="text-purple-400 text-sm">🤖</span>
            <p className="text-sm text-purple-200 flex-1">
              {(opportunity as AIRankedOpportunity).aiReasoning}
            </p>
            <span className="text-xs text-purple-400 font-semibold">
              {(opportunity as AIRankedOpportunity).aiConfidence}%
            </span>
          </div>
        </div>
      )}

      {/* Investment Summary (NEW - For big budgets) */}
      {opportunity.totalInvestment && opportunity.totalInvestment > 0 && (
        <div className="p-4 bg-gradient-to-r from-osrs-accent/10 to-osrs-accent/5 border-b border-slate-700/50">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">INVEST</p>
              <p className="text-lg font-bold text-slate-100">
                {formatLarge(opportunity.totalInvestment)}
                <span className="text-xs text-slate-400 ml-1">gp</span>
              </p>
              <p className="text-xs text-slate-500">{opportunity.recommendedQuantity.toLocaleString()}x</p>
            </div>
            <div>
              <p className="text-xs text-green-400 mb-1">PROFIT</p>
              <p className="text-lg font-bold text-green-300">
                +{formatLarge(opportunity.totalProfit)}
                <span className="text-xs text-green-400 ml-1">gp</span>
              </p>
              <p className="text-xs text-green-500">{opportunity.roi.toFixed(1)}% ROI</p>
            </div>
            <div>
              <p className="text-xs text-blue-400 mb-1">HOLD TIME</p>
              <p className="text-sm font-bold text-blue-300 mt-2">{opportunity.estimatedHoldTime}</p>
            </div>
          </div>
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 space-y-3 border-b border-slate-700/50">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">CURRENT</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.currentPrice ?? 0)}
              <span className="text-xs text-slate-400 ml-1">gp</span>
            </p>
            {priceChange30d !== 0 && (
              <p className={`text-xs font-semibold mt-1 ${priceChange30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange30d >= 0 ? '↑' : '↓'} {Math.abs(priceChange30d).toFixed(1)}% (30d)
              </p>
            )}
          </div>
          <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">30D AVG</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.averagePrice30 ?? opportunity.averagePrice ?? 0)}
              <span className="text-xs text-slate-400 ml-1">gp</span>
            </p>
          </div>
          <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">180D AVG</p>
            <p className="text-lg font-bold text-slate-100">
              {formatNumber(opportunity.averagePrice180 ?? opportunity.averagePrice ?? 0)}
              <span className="text-xs text-slate-400 ml-1">gp</span>
            </p>
            {priceChange90d !== 0 && (
              <p className={`text-xs font-semibold mt-1 ${priceChange90d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange90d >= 0 ? '↑' : '↓'} {Math.abs(priceChange90d).toFixed(1)}% (90d)
              </p>
            )}
          </div>
        </div>

        {/* Profit Metrics - Always Visible */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-900/20 p-2 rounded border border-green-700/50">
            <p className="text-xs text-green-400 mb-1">PROFIT</p>
            <p className="text-sm font-bold text-green-300">
              {opportunity.profitPerUnit.toLocaleString()}
              <span className="text-xs text-green-400 ml-1">gp</span>
            </p>
          </div>
          <div className="bg-blue-900/20 p-2 rounded border border-blue-700/50">
            <p className="text-xs text-blue-400 mb-1">ROI</p>
            <p className="text-sm font-bold text-blue-300">
              {opportunity.roi.toFixed(1)}
              <span className="text-xs text-blue-400 ml-1">%</span>
            </p>
          </div>
          <div className="bg-purple-900/20 p-2 rounded border border-purple-700/50">
            <p className="text-xs text-purple-400 mb-1">MARGIN</p>
            <p className="text-sm font-bold text-purple-300">
              {opportunity.profitMargin.toFixed(1)}
              <span className="text-xs text-purple-400 ml-1">%</span>
            </p>
          </div>
        </div>

        {/* Buy/Sell Prices */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-900/20 border border-green-700/50 p-2 rounded">
            <p className="text-xs text-green-400 mb-1">💰 BUY AT</p>
            <p className="text-sm font-bold text-green-300">{opportunity.buyPrice.toLocaleString()} gp</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-700/50 p-2 rounded">
            <p className="text-xs text-orange-400 mb-1">🎯 SELL AT</p>
            <p className="text-sm font-bold text-orange-300">{opportunity.sellPrice.toLocaleString()} gp</p>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Price Range:</span>
            <span className="text-slate-200">
              {opportunity.historicalLow.toLocaleString()} - {opportunity.historicalHigh.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Deviation:</span>
            <span className={opportunity.deviation < 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {opportunity.deviation.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Volatility:</span>
            <span className="text-slate-200">{opportunity.volatility.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hold Time:</span>
            <span className="text-slate-200">{opportunity.estimatedHoldTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Confidence:</span>
            <span className="text-slate-200">{opportunity.confidence.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Volume Score:</span>
            <span className="text-slate-200">{opportunity.volumeScore.toFixed(0)}/100</span>
          </div>
        </div>
      </div>

      {/* Education Section */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700 space-y-2">
        <details className="cursor-pointer">
          <summary className="text-sm font-semibold text-slate-300 hover:text-osrs-accent transition-colors">
            📚 Strategy & Tips
          </summary>
          <div className="mt-3 space-y-2 text-xs text-slate-400 ml-2">
            <div>
              <p className="font-semibold text-slate-300">📥 When to Buy:</p>
              <p>{opportunity.buyWhen}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-300">📤 When to Sell:</p>
              <p>{opportunity.sellWhen}</p>
            </div>
            {opportunity.recommendation === 'buy' && (
              <div className="bg-green-900/20 border border-green-700/50 p-2 rounded">
                <p className="text-green-400 font-semibold">✅ Current Status:</p>
                <p className="text-green-300">This is a good buying opportunity! Price is {Math.abs(opportunity.deviation).toFixed(1)}% below average.</p>
              </div>
            )}
            {opportunity.recommendation === 'sell' && (
              <div className="bg-orange-900/20 border border-orange-700/50 p-2 rounded">
                <p className="text-orange-400 font-semibold">📈 Current Status:</p>
                <p className="text-orange-300">Price is elevated! Consider selling if you have stock. Price is {opportunity.deviation.toFixed(1)}% above average.</p>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* View Details Button */}
      <div className="p-3 border-t border-slate-700 bg-gradient-to-r from-osrs-accent/10 to-transparent">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => openChat(`Should I flip ${opportunity.itemName}? Current price is ${opportunity.currentPrice}gp`)}
            className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors text-sm flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ask AI
          </button>
          <button
            onClick={onViewDetails}
            className="py-2 px-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-bold rounded transition-colors text-sm"
          >
            📊 View Chart
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSetAlertModal(true);
            }}
            className="py-2 px-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded transition-colors text-xs"
          >
            🔔 Set Alert
          </button>
        </div>
      </div>

      {/* Modals */}
      {showSetAlertModal && (
        <SetAlertModal
          itemId={opportunity.itemId}
          itemName={opportunity.itemName}
          currentPrice={opportunity.currentPrice}
          onClose={() => setShowSetAlertModal(false)}
        />
      )}
    </div>
  );
}
