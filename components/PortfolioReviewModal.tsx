import React from 'react';

export default function PortfolioReviewModal({ review, onClose }) {
  if (!review) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-purple-700/50 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">×</button>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-2">📊 AI Portfolio Review</h2>
          <div className="mb-4 text-slate-300">
            <div><b>Overall Risk:</b> <span className="font-semibold text-yellow-300">{review.overallRisk}</span></div>
            <div><b>Diversification:</b> {review.diversificationScore}/100</div>
            <div><b>Recommendations:</b> {review.recommendations?.join(', ')}</div>
            {review.warnings?.length > 0 && (
              <div className="text-red-400 mt-2"><b>Warnings:</b> {review.warnings.join(', ')}</div>
            )}
          </div>
          <div className="space-y-4">
            {review.items?.map(item => (
              <div key={item.itemId} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-lg text-purple-200">{item.itemName}</div>
                  <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                </div>
                <div className="text-slate-300 text-sm mb-1">Buy: {item.buyPrice}gp • Current: {item.currentPrice}gp • P/L: {Math.round(item.unrealizedPL).toLocaleString()}gp</div>
                <div className="text-slate-400 text-xs mb-1">Risk: <b className="text-yellow-300">{item.riskLevel}</b> • Recommendation: <b className="text-green-300">{item.recommendation}</b></div>
                <div className="text-slate-400 text-xs mb-1">{item.reasoning}</div>
                {item.suggestedAction && (
                  <div className="text-blue-300 text-xs">Suggested Action: {item.suggestedAction} {item.exitPrice ? `@ ${item.exitPrice}gp` : ''}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
