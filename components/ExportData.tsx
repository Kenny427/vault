'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { useTradeHistoryStore } from '@/lib/tradeHistoryStore';

export default function ExportData() {
  const portfolioStore = usePortfolioStore(state => state.items);
  const portfolio = portfolioStore || [];
  const favorites = useDashboardStore(state => state.favorites);
  const trades = useTradeHistoryStore(state => state.trades);
  const [exportType, setExportType] = useState<'portfolio' | 'favorites' | 'trades'>('portfolio');

  const exportToCSV = () => {
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (exportType) {
      case 'portfolio':
        headers = ['Item Name', 'Quantity', 'Buy Price', 'Purchase Date'];
        data = portfolio.map(item => ({
          'Item Name': item.itemName,
          'Quantity': item.quantity,
          'Buy Price': item.buyPrice,
          'Purchase Date': new Date(item.datePurchased).toLocaleString(),
        }));
        filename = 'portfolio.csv';
        break;
      
      case 'favorites':
        headers = ['Item Name', 'Item ID'];
        data = favorites.map(fav => ({
          'Item Name': fav.name,
          'Item ID': fav.id,
        }));
        filename = 'favorites.csv';
        break;
      
      case 'trades':
        headers = ['Item Name', 'Qty Sold', 'Buy Price', 'Sell Price', 'Profit', 'ROI %', 'Hold Days', 'Sell Date'];
        data = trades.map(trade => ({
          'Item Name': trade.itemName,
          'Qty Sold': trade.quantitySold,
          'Buy Price': trade.buyPrice,
          'Sell Price': trade.sellPrice,
          'Profit': trade.profit,
          'ROI %': trade.roi.toFixed(2),
          'Hold Days': trade.holdDays,
          'Sell Date': new Date(trade.sellDate).toLocaleString(),
        }));
        filename = 'trade-history.csv';
        break;
    }

    if (data.length === 0) {
      alert('No data to export!');
      return;
    }

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    let data: any;
    let filename = '';

    switch (exportType) {
      case 'portfolio':
        data = portfolio;
        filename = 'portfolio.json';
        break;
      case 'favorites':
        data = favorites;
        filename = 'favorites.json';
        break;
      case 'trades':
        data = trades;
        filename = 'trade-history.json';
        break;
    }

    if (!data || data.length === 0) {
      alert('No data to export!');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Export Data</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Data to Export
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setExportType('portfolio')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  exportType === 'portfolio'
                    ? 'border-osrs-accent bg-osrs-accent/10 text-osrs-accent'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">💼</div>
                <div className="text-sm font-medium">Portfolio</div>
                <div className="text-xs opacity-70">{portfolio.length} items</div>
              </button>
              <button
                onClick={() => setExportType('favorites')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  exportType === 'favorites'
                    ? 'border-osrs-accent bg-osrs-accent/10 text-osrs-accent'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-sm font-medium">Favorites</div>
                <div className="text-xs opacity-70">{favorites.length} items</div>
              </button>
              <button
                onClick={() => setExportType('trades')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  exportType === 'trades'
                    ? 'border-osrs-accent bg-osrs-accent/10 text-osrs-accent'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">📊</div>
                <div className="text-sm font-medium">Trade History</div>
                <div className="text-xs opacity-70">{trades.length} flips</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportToCSV}
                className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors"
              >
                <div className="text-2xl mb-1">📄</div>
                Export as CSV
              </button>
              <button
                onClick={exportToJSON}
                className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
              >
                <div className="text-2xl mb-1">📋</div>
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Export Tips</h3>
        <ul className="text-sm text-blue-200/80 space-y-1">
          <li>• CSV files can be opened in Excel or Google Sheets</li>
          <li>• JSON files preserve full data structure for backups</li>
          <li>• Exports are generated instantly from your browser</li>
        </ul>
      </div>
    </div>
  );
}
