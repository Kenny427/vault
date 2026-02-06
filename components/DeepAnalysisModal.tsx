'use client';

import { useState, useEffect } from 'react';
import type { MeanReversionSignal } from '@/lib/meanReversionAnalysis';

interface DeepAnalysisModalProps {
  itemId: number;
  itemName: string;
  onClose: () => void;
}

export default function DeepAnalysisModal({ itemId, itemName, onClose }: DeepAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signal, setSignal] = useState<MeanReversionSignal | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [analysisType, setAnalysisType] = useState<'mean-reversion' | 'general'>('mean-reversion');
  const [generalData, setGeneralData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [itemId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analyze-single-item?itemId=${itemId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Analysis failed');
      }

      // Check if this is general analysis or mean-reversion
      if (data.analysisType === 'general') {
        setAnalysisType('general');
        setGeneralData(data.data);
        setMetrics(data.metrics);
      } else {
        setAnalysisType('mean-reversion');
        setSignal(data.signal);
        setAiEnhanced(data.aiEnhanced || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  };

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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-blue-400';
    if (confidence >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getDecisionBadge = (decision?: 'approve' | 'caution' | 'reject') => {
    if (!decision) return null;
    
    const badges = {
      approve: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
      caution: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
      reject: 'bg-red-900/40 text-red-300 border-red-500/30',
    };

    const labels = {
      approve: '✓ Approved',
      caution: '⚠ Caution',
      reject: '✗ Rejected',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${badges[decision]}`}>
        {labels[decision]}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-slate-900 border-2 border-osrs-accent/30 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Deep AI Analysis</h2>
              <p className="text-slate-400 text-sm">{itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-12 w-12 border-4 border-osrs-accent border-t-transparent rounded-full mb-4" />
              <p className="text-slate-400">Running deep analysis...</p>
              <p className="text-slate-500 text-sm mt-2">
                Analyzing 365 days of price history with AI strategist & auditor
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-400 font-semibold mb-2">Analysis Failed</p>
              <p className="text-slate-300 text-sm">{error}</p>
              <button
                onClick={fetchAnalysis}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* General Analysis Results */}
          {analysisType === 'general' && generalData && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Confidence</div>
                  <div className={`text-lg font-bold ${getConfidenceColor(generalData.confidence || 0)}`}>
                    {generalData.confidence || 0}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Strategy</div>
                  <div className="text-lg font-bold text-purple-400 capitalize">
                    {generalData.tradingStrategy?.replace('_', ' ') || 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Expected Profit</div>
                  <div className="text-lg font-bold text-osrs-accent">
                    {generalData.expectedProfit || 'Unknown'}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Time Horizon</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {generalData.timeHorizon || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Recommendation Badge */}
              <div className={`rounded-lg p-4 border ${
                generalData.recommendation === 'BUY' ? 'bg-emerald-900/20 border-emerald-500/30' :
                generalData.recommendation === 'SELL' ? 'bg-red-900/20 border-red-500/30' :
                generalData.recommendation === 'HOLD' ? 'bg-blue-900/20 border-blue-500/30' :
                'bg-slate-800 border-slate-700'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {generalData.recommendation === 'BUY' ? '📈' : 
                     generalData.recommendation === 'SELL' ? '📉' :
                     generalData.recommendation === 'HOLD' ? '⏸️' : '🚫'}
                  </span>
                  <div className="flex-1">
                    <div className={`text-xl font-bold mb-1 ${
                      generalData.recommendation === 'BUY' ? 'text-emerald-300' :
                      generalData.recommendation === 'SELL' ? 'text-red-300' :
                      generalData.recommendation === 'HOLD' ? 'text-blue-300' :
                      'text-slate-300'
                    }`}>
                      {generalData.recommendation || 'NO RECOMMENDATION'}
                    </div>
                    <p className="text-slate-300 text-sm">
                      {generalData.summary || 'Insufficient data for analysis'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Market Context */}
              {metrics && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Market Context</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Current Price</div>
                      <div className="text-slate-100 font-semibold">
                        {formatNumber(metrics.currentPrice)}gp
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">7d Change</div>
                      <div className={`font-semibold ${metrics.priceChange7d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.priceChange7d > 0 ? '+' : ''}{metrics.priceChange7d?.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">30d Change</div>
                      <div className={`font-semibold ${metrics.priceChange30d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.priceChange30d > 0 ? '+' : ''}{metrics.priceChange30d?.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Volume (Recent)</div>
                      <div className="text-slate-100 font-semibold">
                        {formatNumber(metrics.volumeRecent)}/day
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Volatility (90d)</div>
                      <div className="text-slate-100 font-semibold">
                        {metrics.volatility?.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Category</div>
                      <div className="text-purple-400 font-semibold text-xs">
                        {metrics.category}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Investment Thesis */}
              {generalData.thesis && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Investment Thesis</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {generalData.thesis}
                  </p>
                </div>
              )}

              {/* Price Targets */}
              {generalData.priceTargets && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Price Targets</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {generalData.priceTargets.buyBelow > 0 && (
                      <div>
                        <div className="text-slate-400 mb-1">Buy Below</div>
                        <div className="text-cyan-400 font-semibold">
                          {formatNumber(generalData.priceTargets.buyBelow)}gp
                        </div>
                      </div>
                    )}
                    {generalData.priceTargets.sellAbove > 0 && (
                      <div>
                        <div className="text-slate-400 mb-1">Sell Above</div>
                        <div className="text-emerald-400 font-semibold">
                          {formatNumber(generalData.priceTargets.sellAbove)}gp
                        </div>
                      </div>
                    )}
                    {generalData.priceTargets.stopLoss > 0 && (
                      <div>
                        <div className="text-slate-400 mb-1">Stop Loss</div>
                        <div className="text-red-400 font-semibold">
                          {formatNumber(generalData.priceTargets.stopLoss)}gp
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Analysis */}
              {generalData.risks && (
                <div className="bg-orange-900/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-orange-400 font-bold">⚠️ Risk Factors</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {generalData.risks}
                  </p>
                </div>
              )}

              {/* Reasoning */}
              {generalData.reasoning && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Analysis Reasoning</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {generalData.reasoning}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Mean-Reversion Analysis Results */}
          {analysisType === 'mean-reversion' && signal && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Confidence</div>
                  <div className={`text-lg font-bold ${getConfidenceColor(signal.confidenceScore)}`}>
                    {signal.confidenceScore}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Potential</div>
                  <div className="text-lg font-bold text-osrs-accent">
                    +{signal.reversionPotential.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Grade</div>
                  <div className="text-lg font-bold text-purple-400">
                    {signal.investmentGrade}
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Volume Velocity</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {signal.volumeVelocity?.toFixed(2)}x
                  </div>
                </div>
              </div>

              {/* AI Enhanced Badge */}
              {aiEnhanced && (
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-2xl">🧠</span>
                  <div className="flex-1">
                    <p className="text-purple-300 font-semibold text-sm">AI-Enhanced Analysis</p>
                    <p className="text-slate-400 text-xs">
                      Dual-pass evaluation (Strategist + Auditor)
                    </p>
                  </div>
                  {signal.auditorDecision && getDecisionBadge(signal.auditorDecision)}
                </div>
              )}

              {/* Structured Logic */}
              {signal.logic && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Investment Logic</h3>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-emerald-400 font-bold">💡 THESIS</span>
                      <span className="text-xs text-slate-500">(The "Why")</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed pl-6">
                      {signal.logic.thesis}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400 font-bold">⚠️ VULNERABILITY</span>
                      <span className="text-xs text-slate-500">(The Bear Case)</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed pl-6">
                      {signal.logic.vulnerability}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-400 font-bold">🚨 TRIGGER</span>
                      <span className="text-xs text-slate-500">(Invalidation Point)</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed pl-6">
                      {signal.logic.trigger}
                    </p>
                  </div>
                </div>
              )}

              {/* Strategic Narrative */}
              {signal.strategicNarrative && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Strategic Narrative</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {signal.strategicNarrative}
                  </p>
                </div>
              )}

              {/* Auditor Feedback */}
              {signal.auditorNotes && (
                <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400 font-bold">🔍 Auditor's Critique</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {signal.auditorNotes}
                  </p>
                </div>
              )}

              {/* Price Targets */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Price Targets</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400 mb-1">Entry Now</div>
                    <div className="text-slate-100 font-semibold">
                      {formatNumber(signal.entryPriceNow)}gp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Entry Range</div>
                    <div className="text-slate-100 font-semibold">
                      {formatNumber(signal.entryRangeLow)}-{formatNumber(signal.entryRangeHigh)}gp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Exit Target</div>
                    <div className="text-emerald-400 font-semibold">
                      {formatNumber(signal.exitPriceBase)}-{formatNumber(signal.exitPriceStretch)}gp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Stop Loss</div>
                    <div className="text-red-400 font-semibold">
                      {formatNumber(signal.stopLoss)}gp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Suggested Investment</div>
                    <div className="text-purple-400 font-semibold">
                      {formatNumber(signal.suggestedInvestment)}gp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Holding Period</div>
                    <div className="text-slate-100 font-semibold">
                      {signal.estimatedHoldingPeriod}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Price Guidance (if available) */}
              {(signal.buyIfDropsTo || signal.sellAtMin || signal.sellAtMax) && (
                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    AI Price Guidance
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {signal.buyIfDropsTo && (
                      <div>
                        <div className="text-slate-400 mb-1">Optimal Entry</div>
                        <div className="text-cyan-400 font-semibold">
                          {formatNumber(signal.buyIfDropsTo)}gp
                        </div>
                      </div>
                    )}
                    {signal.sellAtMin && (
                      <div>
                        <div className="text-slate-400 mb-1">Conservative Exit</div>
                        <div className="text-emerald-400 font-semibold">
                          {formatNumber(signal.sellAtMin)}gp
                        </div>
                      </div>
                    )}
                    {signal.sellAtMax && (
                      <div>
                        <div className="text-slate-400 mb-1">Aggressive Exit</div>
                        <div className="text-yellow-400 font-semibold">
                          {formatNumber(signal.sellAtMax)}gp
                        </div>
                      </div>
                    )}
                    {signal.abortIfRisesAbove && (
                      <div>
                        <div className="text-slate-400 mb-1">Hard Stop</div>
                        <div className="text-red-400 font-semibold">
                          {formatNumber(signal.abortIfRisesAbove)}gp
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Timeframe Data */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Multi-Timeframe Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: 'Short-Term (7d)', data: signal.shortTerm },
                    { label: 'Medium-Term (90d)', data: signal.mediumTerm },
                    { label: 'Long-Term (365d)', data: signal.longTerm },
                  ].map(({ label, data }) => (
                    <div key={label} className="bg-slate-900/50 rounded p-3">
                      <div className="text-slate-400 font-semibold mb-2">{label}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Average:</span>
                          <span className="text-slate-300">{formatNumber(data.avgPrice)}gp</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deviation:</span>
                          <span className={data.currentDeviation > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {data.currentDeviation.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Volatility:</span>
                          <span className="text-slate-300">{data.volatility.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Risk Assessment</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400 mb-1">Volatility Risk</div>
                    <div className={`font-semibold ${
                      signal.volatilityRisk === 'low' ? 'text-emerald-400' :
                      signal.volatilityRisk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {signal.volatilityRisk.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Liquidity Score</div>
                    <div className="text-slate-100 font-semibold">
                      {signal.liquidityScore}/100
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Bot Likelihood</div>
                    <div className="text-slate-100 font-semibold">
                      {signal.botLikelihood}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Supply Stability</div>
                    <div className="text-slate-100 font-semibold">
                      {signal.supplyStability}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
