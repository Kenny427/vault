
'use client';
// Format numbers like 15.4m, 154k, 197.5m for compact display (no 'mgp', just 'm')
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  let suffix = '';
  let value = abs;
  if (abs >= 1_000_000_000) {
    value = abs / 1_000_000_000;
    suffix = 'b';
  } else if (abs >= 1_000_000) {
    value = abs / 1_000_000;
    suffix = 'm';
  } else if (abs >= 100_000) {
    value = abs / 1_000;
    suffix = 'k';
  } else {
    return n.toLocaleString();
  }
  const formatted = value.toFixed(value % 1 === 0 ? 0 : 1) + suffix;
  return n < 0 ? '-' + formatted : formatted;
}

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortfolioStore } from '@/lib/portfolioStore';
import PortfolioSummary from './PortfolioSummary';
import PortfolioReviewModal from './PortfolioReviewModal';
import AddPortfolioItemModal from './AddPortfolioItemModal';
import AddPortfolioSaleModal from './AddPortfolioSaleModal';
import RecordTradeModal from './RecordTradeModal';
import SetAlertModal from './SetAlertModal';
import ItemNotesModal from './ItemNotesModal';
import TradeHistory from './TradeHistory';
import PendingTransactionsModal from './PendingTransactionsModal';
import { getBatchPrices } from '@/lib/api/osrs';
import { usePendingTransactionsStore } from '@/lib/pendingTransactionsStore';


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
  suggestedAction: string;
  exitPrice?: number;
}

interface PortfolioSummaryAI {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diversificationScore: number;
  recommendations: string[];
  warnings: string[];
  items: PortfolioAIReview[];
}

export default function Portfolio() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPendingTransactions, setShowPendingTransactions] = useState(false);
  const [showRecordTradeModal, setShowRecordTradeModal] = useState<{ item: any; currentPrice: number } | null>(null);
  const [showSetAlertModal, setShowSetAlertModal] = useState<{ itemId: number; itemName: string; currentPrice: number } | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{ itemId: number; itemName: string } | null>(null);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiReview, setAIReview] = useState<PortfolioSummaryAI | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [targetPrices, setTargetPrices] = useState<Record<number, { target: number; confidence: number; timeframe: string; reasoning: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioTargetPrices');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioTargetPrices', JSON.stringify(targetPrices));
    }
  }, [targetPrices]);
  const [isCalculatingTargets, setIsCalculatingTargets] = useState(false);
  const items = usePortfolioStore((state) => state.items);
  const removeItem = usePortfolioStore((state) => state.removeItem);
    const pendingTransactions = usePendingTransactionsStore((state) => state.transactions);
  const [prices, setPrices] = useState<Record<number, { high: number; low: number }>>({});

  const itemIds = useMemo(() => [...new Set(items.map(item => item.itemId))], [items]);


  useEffect(() => {
    if (itemIds.length === 0) {
      setPrices({});
      return;
    }

    console.log('Fetching prices for items:', itemIds);
    getBatchPrices(itemIds)
      .then((data) => {
        console.log('Fetched prices:', data);
        setPrices(data);
      })
      .catch((err) => {
        console.error('Error fetching prices:', err);
        setPrices({});
      });
  }, [itemIds, refreshKey]);

  const handleRemove = (id: string) => {
    if (confirm('Remove this item from your portfolio?')) {
      removeItem(id);
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRefreshPrices = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAIReview = async () => {
    if (items.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Prepare portfolio data with current prices
      const portfolioData = items.map(item => {
        const priceData = prices[item.itemId];
        const currentPrice = priceData ? (priceData.high + priceData.low) / 2 : item.buyPrice;
        
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          buyPrice: item.buyPrice,
          currentPrice: Math.round(currentPrice),
          datePurchased: item.datePurchased,
        };
      });

      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioData),
        keepalive: true, // Prevents cancellation when tabbing away
      });

      if (!response.ok) {
        throw new Error('Failed to analyze portfolio');
      }

      const review = await response.json();
      setAIReview(review);
      setShowReviewModal(true);
    } catch (error) {
      console.error('AI portfolio review failed:', error);
      alert('Failed to analyze portfolio. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCalculateTargets = async () => {
    if (items.length === 0) return;
    
    setIsCalculatingTargets(true);
    try {
      // Prepare holdings data
      const holdings = items.map(item => {
        const priceData = prices[item.itemId];
        const currentPrice = priceData ? (priceData.high + priceData.low) / 2 : item.buyPrice;
        const soldQty = item.sales ? item.sales.reduce((sum, sale) => sum + sale.quantity, 0) : 0;
        const remaining = item.quantity - soldQty;
        
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: remaining,
          costBasisPerUnit: item.buyPrice,
          currentPrice: Math.round(currentPrice),
          datePurchased: item.datePurchased,
        };
      }).filter(h => h.quantity > 0);

      const response = await fetch('/api/portfolio-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate target prices');
      }

      const data = await response.json();
      
      // Convert actions to target prices map
      const targets: Record<number, any> = {};
      data.actions.forEach((action: any) => {
        targets[action.itemId] = {
          target: action.expectedPrice,
          confidence: action.confidence,
          timeframe: action.timeframe,
          reasoning: action.reasoning,
        };
      });
      
      setTargetPrices(targets);
      console.log(`✅ Set target prices for ${Object.keys(targets).length} items`);
      alert(`✅ AI calculated smart target prices for ${Object.keys(targets).length} items! These will persist across refreshes.`);
    } catch (error) {
      console.error('Target calculation failed:', error);
      alert('Failed to calculate targets. Please try again.');
    } finally {
      setIsCalculatingTargets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Portfolio</h2>
          <p className="text-slate-400 text-sm">Track your portfolio&apos;s performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTradeHistory(!showTradeHistory)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            {showTradeHistory ? '📋 Portfolio' : '📊 Trade History'}
          </button>
          {!showTradeHistory && items.length > 0 && (
            <button
              onClick={() => setShowAIMenu(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              title="AI tools for portfolio analysis"
            >
              🤖 AI Menu
            </button>
          )}
          <button
            onClick={handleRefreshPrices}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
            disabled={items.length === 0}
            title="Refresh current prices"
          >
            🔄 Refresh
          </button>
          <button            onClick={() => setShowPendingTransactions(true)}
            className="relative px-4 py-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Review pending webhook transactions"
          >
            📥 Pending
            {pendingTransactions.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingTransactions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 rounded-lg font-semibold transition-colors"
          >
            Add Investment
          </button>
        </div>
      </div>

      {showTradeHistory ? (
        <TradeHistory />
      ) : (
        <>
        {/* Portfolio Review Modal */}
        {showReviewModal && aiReview && (
          <PortfolioReviewModal review={aiReview} onClose={() => setShowReviewModal(false)} />
        )}

      {/* Summary */}
      <PortfolioSummary key={refreshKey} />

      {/* Items List */}
      {items.length === 0 ? (
        <div className="bg-slate-900 rounded-lg p-12 border border-slate-700 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No investments yet</h3>
          <p className="text-slate-400 mb-6">Start tracking your Grand Exchange flips and long-term investments</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 rounded-lg font-semibold transition-colors"
          >
            Add Your First Investment
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-lg border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-300 font-semibold">Item</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Qty</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Rem</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Buy</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Current</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">
                    <div>Target Sale Price</div>
                    <div className="text-xs text-slate-500 font-normal">(AI calculated)</div>
                  </th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Value</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">P/L</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">
                    <div>Est. Profit</div>
                    <div className="text-xs text-slate-500 font-normal">(If target reached)</div>
                  </th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {items.map((item) => {
                  const soldQty = (item.sales ?? []).reduce((sum, sale) => sum + sale.quantity, 0);
                  const remainingQty = Math.max(0, item.quantity - soldQty);
                  const priceData = prices[item.itemId];
                  const hasPriceData = Boolean(priceData);
                  const current = priceData ? (priceData.high + priceData.low) / 2 : null;
                  const netSell = current ? current * 0.98 : null;
                  const unrealized = (netSell && current) ? (netSell - item.buyPrice) * remainingQty : null;
                  const date = new Date(item.datePurchased);
                  const value = current ? Math.round(current * remainingQty) : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-100">
                          <Link href={`/portfolio/${item.itemId}`} className="hover:text-osrs-accent transition-colors">
                            {item.itemName}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Bought {date.toLocaleDateString()}</div>
                      </td>
                      <td className="text-right px-6 py-4 text-slate-200">{formatCompactNumber(item.quantity)}</td>
                      <td className="text-right px-6 py-4 text-slate-200">{formatCompactNumber(remainingQty)}</td>
                      <td className="text-right px-6 py-4 text-slate-200">
                        {formatCompactNumber(item.buyPrice)}
                      </td>
                      <td className="text-right px-6 py-4">
                        {hasPriceData ? (
                          <span className="text-slate-200">{formatCompactNumber(Math.round(current!))}</span>
                        ) : (
                          <span className="text-slate-500 text-sm">No data</span>
                        )}
                      </td>
                      <td className="text-right px-6 py-4">
                        {hasPriceData && targetPrices[item.itemId] ? (
                          <div>
                            <div className="text-green-400 font-semibold flex items-center justify-end gap-1">
                              <span className="text-xs">🤖</span>
                              {formatCompactNumber(Math.round(targetPrices[item.itemId].target))}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {targetPrices[item.itemId].confidence}% confident • {targetPrices[item.itemId].timeframe}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-right px-6 py-4 font-semibold">
                        {value !== null ? (
                          <span className="text-slate-200">{formatCompactNumber(value)}</span>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className={`text-right px-6 py-4 font-semibold`}>
                        {unrealized !== null ? (
                          <span className={unrealized >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {unrealized >= 0 ? '+' : ''}{formatCompactNumber(Math.round(unrealized))}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-right px-6 py-4 font-semibold">
                        {targetPrices[item.itemId] && remainingQty > 0 ? (
                          <div>
                            <span className={((targetPrices[item.itemId].target * 0.98 - item.buyPrice) * remainingQty) >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {((targetPrices[item.itemId].target * 0.98 - item.buyPrice) * remainingQty) >= 0 ? '+' : ''}
                              {formatCompactNumber(Math.round((targetPrices[item.itemId].target * 0.98 - item.buyPrice) * remainingQty))}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {Math.round(((targetPrices[item.itemId].target * 0.98 - item.buyPrice) / item.buyPrice) * 100)}% ROI
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-right px-2 py-2" style={{ minWidth: 90 }}>
                        <div className="flex items-center justify-end gap-0.5">
                          {/* Ask AI button removed for portfolio table, use Portfolio Review instead */}
                          {current && (
                            <>
                              <button
                                onClick={() => setShowRecordTradeModal({ 
                                  item: { 
                                    id: item.id,
                                    itemId: item.itemId, 
                                    itemName: item.itemName, 
                                    quantity: item.quantity,
                                    remainingQuantity: remainingQty,
                                    buyPrice: item.buyPrice,
                                    datePurchased: item.datePurchased
                                  }, 
                                  currentPrice: Math.round(current) 
                                })}
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20 transition-colors p-1.5 rounded text-base"
                                title="Record Flip"
                              >
                                💰
                              </button>
                              <button
                                onClick={() => setShowSetAlertModal({ itemId: item.itemId, itemName: item.itemName, currentPrice: Math.round(current) })}
                                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 transition-colors p-1.5 rounded text-base"
                                title="Set Alert"
                              >
                                🔔
                              </button>
                              <button
                                onClick={() => setShowNotesModal({ itemId: item.itemId, itemName: item.itemName })}
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors p-1.5 rounded text-base"
                                title="Notes"
                              >
                                📝
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors p-1.5 rounded text-base"
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* AI Menu Modal */}
      {showAIMenu && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAIMenu(false)}>
          <div className="bg-slate-900 rounded-xl border border-purple-700/50 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-sm px-6 py-4 border-b border-purple-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">🤖 AI Portfolio Tools</h2>
                <p className="text-sm text-purple-200 mt-1">Powered by GPT-4o-mini</p>
              </div>
              <button
                onClick={() => setShowAIMenu(false)}
                className="text-slate-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Portfolio Review */}
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 hover:border-purple-600/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-purple-300 mb-2">📊 Portfolio Review</h3>
                    <p className="text-sm text-slate-400">
                      AI analyzes all holdings to assess risk, diversification, and provides recommendations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAIMenu(false);
                    handleAIReview();
                  }}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {isAnalyzing ? '⏳ Analyzing Portfolio...' : '🚀 Run Portfolio Review'}
                </button>
              </div>

              {/* Portfolio Review Modal */}
              {showReviewModal && aiReview && (
                <PortfolioReviewModal review={aiReview} onClose={() => setShowReviewModal(false)} />
              )}

              {/* Target Price Calculator */}
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 hover:border-blue-600/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-300 mb-2">🎯 Calculate Target Sell Prices</h3>
                    <p className="text-sm text-slate-400">
                      AI determines optimal exit prices for each holding based on market conditions, trends, and mean-reversion signals
                    </p>
                    {Object.keys(targetPrices).length > 0 && (
                      <p className="text-xs text-green-400 mt-2">
                        ✓ Calculated targets for {Object.keys(targetPrices).length} items
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAIMenu(false);
                    handleCalculateTargets();
                  }}
                  disabled={isCalculatingTargets}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {isCalculatingTargets ? '⏳ Calculating Targets...' : '🎯 Calculate Smart Targets'}
                </button>
              </div>

              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-400 text-center">
                  ⚠️ <span className="font-semibold">Note:</span> AI is never guaranteed to be correct, do your own research aswell.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddPortfolioItemModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}
      {showSaleModal && (
        <AddPortfolioSaleModal
          onClose={() => setShowSaleModal(false)}
          onSuccess={handleSuccess}
        />
      )}
      
      {/* Record Trade Modal */}
      {showRecordTradeModal && (
        <RecordTradeModal
          item={showRecordTradeModal.item}
          currentPrice={showRecordTradeModal.currentPrice}
          onClose={() => {
            setShowRecordTradeModal(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
      
      {/* Set Alert Modal */}
      {showSetAlertModal && (
        <SetAlertModal
          itemId={showSetAlertModal.itemId}
          itemName={showSetAlertModal.itemName}
          currentPrice={showSetAlertModal.currentPrice}
          onClose={() => setShowSetAlertModal(null)}
        />
      )}

      {showNotesModal && (
        <ItemNotesModal
          itemId={showNotesModal.itemId}
          itemName={showNotesModal.itemName}
          onClose={() => setShowNotesModal(null)}
        />
      )}

      {/* Pending Transactions Modal */}
      {showPendingTransactions && (
        <PendingTransactionsModal
          onClose={() => {
            setShowPendingTransactions(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
