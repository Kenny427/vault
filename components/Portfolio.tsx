'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePortfolioStore } from '@/lib/portfolioStore';
import PortfolioSummary from './PortfolioSummary';
import AddPortfolioItemModal from './AddPortfolioItemModal';
import AddPortfolioSaleModal from './AddPortfolioSaleModal';
import RecordTradeModal from './RecordTradeModal';
import SetAlertModal from './SetAlertModal';
import ItemNotesModal from './ItemNotesModal';
import TradeHistory from './TradeHistory';
import { getBatchPrices } from '@/lib/api/osrs';
import { useChat } from '@/lib/chatContext';

export default function Portfolio() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRecordTradeModal, setShowRecordTradeModal] = useState<{ item: any; currentPrice: number } | null>(null);
  const [showSetAlertModal, setShowSetAlertModal] = useState<{ itemId: number; itemName: string; currentPrice: number } | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{ itemId: number; itemName: string } | null>(null);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const items = usePortfolioStore((state) => state.items);
  const removeItem = usePortfolioStore((state) => state.removeItem);
  const [prices, setPrices] = useState<Record<number, { high: number; low: number }>>({});
  const { openChat } = useChat();

  const formatNumber = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

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
          <button
            onClick={handleRefreshPrices}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
            disabled={items.length === 0}
            title="Refresh current prices"
          >
            🔄 Refresh
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
                  const lots = (item.lots && item.lots.length > 0)
                    ? item.lots
                    : [{ id: item.id, quantity: item.quantity, buyPrice: item.buyPrice, datePurchased: item.datePurchased }];
                  const lotsPreview = lots.slice(0, 2).map((lot) =>
                    `${formatNumber(lot.quantity)} @ ${formatNumber(lot.buyPrice)}gp`
                  );

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-100">
                          <Link href={`/portfolio/${item.itemId}`} className="hover:text-osrs-accent transition-colors">
                            {item.itemName}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Bought {date.toLocaleDateString()}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Lots: {lots.length} • {lotsPreview.join(' • ')}{lots.length > 2 ? ' • …' : ''}
                        </div>
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
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => openChat(`I'm holding ${remainingQty} ${item.itemName} that I bought at ${item.buyPrice}gp. Current price is ${current ? Math.round(current) : 'unknown'}gp. What should my exit strategy be? When should I sell for optimal profit?`)}
                            className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors px-2 py-1 rounded hover:bg-blue-900/20"
                          >
                            Ask AI
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
                                className="text-green-400 hover:text-green-300 font-medium text-sm transition-colors px-2 py-1 rounded hover:bg-green-900/20"
                              >
                                Record Flip
                              </button>
                              <button
                                onClick={() => setShowSetAlertModal({ itemId: item.itemId, itemName: item.itemName, currentPrice: Math.round(current) })}
                                className="text-yellow-400 hover:text-yellow-300 font-medium text-sm transition-colors px-2 py-1 rounded hover:bg-yellow-900/20"
                              >
                                Set Alert
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowNotesModal({ itemId: item.itemId, itemName: item.itemName })}
                            className="text-purple-400 hover:text-purple-300 font-medium text-sm transition-colors px-2 py-1 rounded hover:bg-purple-900/20"
                          >
                            Notes
                          </button>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                          >
                            Remove
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
      
      {/* Notes Modal */}
      {showNotesModal && (
        <ItemNotesModal
          itemId={showNotesModal.itemId}
          itemName={showNotesModal.itemName}
          onClose={() => setShowNotesModal(null)}
        />
      )}
    </div>
  );
}
