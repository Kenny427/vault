import React from 'react';

interface PortfolioAIReview {
  itemId: number;
  itemName: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  recommendation: 'HOLD' | 'SELL_NOW' | 'SELL_SOON' | 'WATCH_CLOSELY' | 'GOOD_POSITION';
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction?: string;
  exitPrice?: number;
  priceGuidance?: {
    primaryExit: number;
    stretchTarget: number;
    stopLoss: number;
    rationale: string;
  };
}

interface PortfolioSummaryAI {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diversificationScore: number;
  recommendations?: string[];
  warnings?: string[];
  items?: PortfolioAIReview[];
}

interface PortfolioReviewModalProps {
  review: PortfolioSummaryAI | null;
  onClose: () => void;
}

export default function PortfolioReviewModal({ review, onClose }: PortfolioReviewModalProps) {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-purple-700/50 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-700/50 p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-purple-300">📊 AI Portfolio Review</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">×</button>
        </div>

        <div className="p-8">
          <div className="metric mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-slate-400">Overall Risk:</span>{' '}
                <span className={`font-semibold ${
                  review.overallRisk === 'CRITICAL' ? 'text-red-400' :
                  review.overallRisk === 'HIGH' ? 'text-orange-400' :
                  review.overallRisk === 'MEDIUM' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>{review.overallRisk}</span>
              </div>
              <div>
                <span className="text-slate-400">Diversification:</span>{' '}
                <span className="font-semibold text-purple-300">{review.diversificationScore}/100</span>
              </div>
            </div>
            
            {review.recommendations && review.recommendations.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-300 mb-2">💡 Recommendations</h3>
                <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                  {review.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {review.warnings && review.warnings.length > 0 && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-300 mb-2 warning">⚠️ Warnings</h3>
                <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                  {review.warnings.map((warn, i) => (
                    <li key={i} className="warning">{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h3 className="text-xl font-semibold text-purple-300 mb-4">Individual Positions</h3>
          <div className="space-y-4">
            {review.items?.map((item: PortfolioAIReview) => (
              <div key={item.itemId} className="item bg-slate-800/70 rounded-lg p-4 border border-slate-700">
                <div className="item-title flex items-center justify-between mb-3">
                  <span className="text-lg text-purple-200">{item.itemName}</span>
                  <span className="text-xs text-slate-400">Qty: {item.quantity.toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-slate-300">
                    <span className="text-slate-400">Entry:</span> {item.buyPrice.toLocaleString()}gp
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Current:</span> {item.currentPrice.toLocaleString()}gp
                  </div>
                  <div className={`font-semibold ${item.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="text-slate-400 font-normal">P/L:</span> {item.unrealizedPL >= 0 ? '+' : ''}{Math.round(item.unrealizedPL).toLocaleString()}gp
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Risk:</span>{' '}
                    <span className={`font-semibold ${
                      item.riskLevel === 'CRITICAL' ? 'text-red-400' :
                      item.riskLevel === 'HIGH' ? 'text-orange-400' :
                      item.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{item.riskLevel}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-slate-400 text-xs">Recommendation:</span>{' '}
                  <span className={`font-semibold text-sm ${
                    item.recommendation === 'SELL_NOW' ? 'text-red-400' :
                    item.recommendation === 'SELL_SOON' ? 'text-orange-400' :
                    item.recommendation === 'WATCH_CLOSELY' ? 'text-yellow-400' :
                    item.recommendation === 'GOOD_POSITION' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>{item.recommendation.replace(/_/g, ' ')}</span>
                </div>

                {item.priceGuidance && (
                  <div className="price-guidance bg-slate-700/50 rounded p-3 mb-3 border border-slate-600">
                    <h3 className="text-sm font-semibold text-purple-300 mb-2">🎯 Price Targets</h3>
                    <div className="space-y-1 text-xs">
                      <div className="price-row flex justify-between">
                        <span className="text-slate-400">Primary Exit (Conservative):</span>
                        <span className="font-semibold text-green-300">{item.priceGuidance.primaryExit.toLocaleString()}gp</span>
                      </div>
                      <div className="price-row flex justify-between">
                        <span className="text-slate-400">Stretch Target (Optimistic):</span>
                        <span className="font-semibold text-blue-300">{item.priceGuidance.stretchTarget.toLocaleString()}gp</span>
                      </div>
                      <div className="price-row flex justify-between border-t border-slate-600 pt-1 mt-1">
                        <span className="text-slate-400">Stop-Loss (Protective):</span>
                        <span className="font-semibold text-red-400 stop-loss">{item.priceGuidance.stopLoss.toLocaleString()}gp</span>
                      </div>
                      {item.priceGuidance.rationale && (
                        <div className="mt-2 pt-2 border-t border-slate-600 text-slate-300">
                          {item.priceGuidance.rationale}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-slate-400 text-xs mb-2 bg-slate-900/50 rounded p-2">
                  <span className="font-semibold text-slate-300">Analysis:</span> {item.reasoning}
                </div>

                {item.suggestedAction && (
                  <div className="text-blue-300 text-xs bg-blue-900/20 rounded p-2">
                    <span className="font-semibold">Action Plan:</span> {item.suggestedAction}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-slate-500 text-center border-t border-slate-700 pt-4">
            ⚠️ <span className="font-semibold">Disclaimer:</span> AI analysis is not guaranteed to be accurate. Always do your own research before making trading decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
