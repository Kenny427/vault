'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortfolioStore } from '@/lib/portfolioStore';
import PortfolioSummary from './PortfolioSummary';
import AddPortfolioItemModal from './AddPortfolioItemModal';
import AddPortfolioSaleModal from './AddPortfolioSaleModal';
import RecordTradeModal from './RecordTradeModal';
import SetAlertModal from './SetAlertModal';
import TradeHistory from './TradeHistory';
import PendingTransactionsModal from './PendingTransactionsModal';
import { getBatchPrices } from '@/lib/api/osrs';
import { useChat } from '@/lib/chatContext';
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
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiReview, setAIReview] = useState<PortfolioSummaryAI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const items = usePortfolioStore((state) => state.items);
  const removeItem = usePortfolioStore((state) => state.removeItem);
  const pendingTransactions = usePendingTransactionsStore((state) => state.transactions);
  const [prices, setPrices] = useState<Record<number, { high: number; low: number }>>({});
  const { openChat } = useChat();

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
      });

      if (!response.ok) {
        throw new Error('Failed to analyze portfolio');
      }

      const review = await response.json();
      setAIReview(review);
    } catch (error) {
      console.error('AI portfolio review failed:', error);
      alert('Failed to analyze portfolio. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Portfolio</h2>
          <p className="text-slate-400 text-sm">Track buys, sales, and performance</p>
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
              onClick={handleAIReview}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              title="AI analyzes all your holdings in one batch"
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🤖 AI Review Portfolio'}
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
      {/* AI Review Results */}
      {aiReview && (
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-purple-300 mb-1">🤖 AI Portfolio Analysis</h3>
              <p className="text-sm text-slate-400">Batch analyzed {aiReview.items.length} holdings</p>
            </div>
            <button
              onClick={() => setAIReview(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Overall Risk</div>
              <div className={`text-2xl font-bold ${
                aiReview.overallRisk === 'LOW' ? 'text-green-400' :
                aiReview.overallRisk === 'MEDIUM' ? 'text-yellow-400' :
                aiReview.overallRisk === 'HIGH' ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {aiReview.overallRisk}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Diversification</div>
              <div className="text-2xl font-bold text-blue-400">{aiReview.diversificationScore}/100</div>
            </div>
          </div>

          {/* Recommendations */}
          {aiReview.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">📋 Top Recommendations</h4>
              <ul className="space-y-2">
                {aiReview.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {aiReview.warnings.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Warnings</h4>
              <ul className="space-y-2">
                {aiReview.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 p-3 rounded-lg">
                    <span className="mt-0.5">⚠️</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Item-by-Item Analysis */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Item Analysis</h4>
            <div className="space-y-3">
              {aiReview.items.map((item) => {
                const recommendationColors = {
                  'HOLD': 'text-blue-400 bg-blue-900/20',
                  'SELL_NOW': 'text-red-400 bg-red-900/20',
                  'SELL_SOON': 'text-orange-400 bg-orange-900/20',
                  'WATCH_CLOSELY': 'text-yellow-400 bg-yellow-900/20',
                  'GOOD_POSITION': 'text-green-400 bg-green-900/20',
                };
                
                const riskColors = {
                  'LOW': 'text-green-400',
                  'MEDIUM': 'text-yellow-400',
                  'HIGH': 'text-orange-400',
                  'CRITICAL': 'text-red-400',
                };

                return (
                  <div key={item.itemId} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-200">{item.itemName}</div>
                        <div className="text-xs text-slate-500">
                          {item.quantity.toLocaleString()} @ {item.buyPrice.toLocaleString()}gp → {item.currentPrice.toLocaleString()}gp
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold px-2 py-1 rounded ${recommendationColors[item.recommendation]}`}>
                          {item.recommendation.replace(/_/g, ' ')}
                        </div>
                        <div className={`text-xs mt-1 ${riskColors[item.riskLevel]}`}>
                          {item.riskLevel} RISK
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{item.reasoning}</p>
                    <div className="text-sm text-purple-300 bg-purple-900/20 p-2 rounded">
                      💡 {item.suggestedAction}
                      {item.exitPrice && ` (Target: ${item.exitPrice.toLocaleString()}gp)`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Remaining</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Buy</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Current</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">Value</th>
                  <th className="text-right px-6 py-4 text-slate-300 font-semibold">P/L</th>
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
                      <td className="text-right px-6 py-4 text-slate-200">{item.quantity.toLocaleString()}</td>
                      <td className="text-right px-6 py-4 text-slate-200">{remainingQty.toLocaleString()}</td>
                      <td className="text-right px-6 py-4 text-slate-200">
                        {item.buyPrice.toLocaleString()}gp
                      </td>
                      <td className="text-right px-6 py-4">
                        {hasPriceData ? (
                          <span className="text-slate-200">{Math.round(current!).toLocaleString()}gp</span>
                        ) : (
                          <span className="text-slate-500 text-sm">No data</span>
                        )}
                      </td>
                      <td className="text-right px-6 py-4 font-semibold">
                        {value !== null ? (
                          <span className="text-slate-200">{value.toLocaleString()}gp</span>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className={`text-right px-6 py-4 font-semibold`}>
                        {unrealized !== null ? (
                          <span className={unrealized >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {unrealized >= 0 ? '+' : ''}{Math.round(unrealized).toLocaleString()}gp
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openChat(`I'm holding ${remainingQty} ${item.itemName} that I bought at ${item.buyPrice}gp. Current price is ${current ? Math.round(current) : 'unknown'}gp. What should my exit strategy be? When should I sell for optimal profit?`)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors p-2 rounded"
                            title="Ask AI"
                          >
                            💬
                          </button>
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
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20 transition-colors p-2 rounded"
                                title="Record Flip"
                              >
                                💰
                              </button>
                              <button
                                onClick={() => setShowSetAlertModal({ itemId: item.itemId, itemName: item.itemName, currentPrice: Math.round(current) })}
                                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 transition-colors p-2 rounded"
                                title="Set Alert"
                              >
                                🔔
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors p-2 rounded"
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
