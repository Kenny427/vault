'use client';

import { useRef, useEffect } from 'react';

interface AlphaFeedInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlphaFeedInfoModal({ isOpen, onClose }: AlphaFeedInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-purple-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">📚 Alpha Feed Analysis Guide</h2>
            <p className="text-sm text-blue-200 mt-1">
              How the system finds high-quality mean-reversion opportunities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-3xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Overview */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-5">
            <h3 className="text-xl font-bold text-blue-300 mb-3">🎯 System Overview</h3>
            <p className="text-slate-300 leading-relaxed">
              The Alpha Feed uses a <strong>3-stage filtering pipeline</strong> to find items temporarily suppressed below their historical value (mean-reversion opportunities). 
              Items flow through quality filters, mathematical profitability checks, and AI analysis to identify the top 10-15 high-confidence opportunities.
            </p>
          </div>

          {/* The Pipeline */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
            <h3 className="text-xl font-bold text-purple-300 mb-4">🔄 The Analysis Pipeline</h3>
            
            {/* Stage 0 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">0</div>
                <h4 className="text-lg font-semibold text-green-400">Stage 0: Software Pre-Filter (Quality Over Quantity)</h4>
              </div>
              <div className="ml-11 space-y-2 text-slate-300">
                <p className="leading-relaxed">
                  <strong>Goal:</strong> Remove mathematically unprofitable items before expensive AI analysis (saves 70% cost)
                </p>
                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 mt-2">
                  <p className="font-semibold text-slate-200 mb-2">Automatic Rejections:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>ROI &lt; 10%</strong> → Below worthwhile threshold (GE tax is 2%)</li>
                    <li><strong>Exit target &lt; 1.12x entry</strong> → Too marginal, any slippage = loss</li>
                    <li><strong>Current ≥ 90d average</strong> → No suppression exists to revert from</li>
                    <li><strong>Hold time &gt; 6 weeks</strong> → Too long unless ROI &gt; 50% (exceptional returns)</li>
                    <li><strong>Liquidity &lt; 30</strong> → Hard to exit positions at target price</li>
                  </ul>
                </div>
                <p className="text-sm text-blue-300 mt-2">
                  💡 Typically filters 80-85 items, sending only 25-30 profitable candidates to AI
                </p>
              </div>
            </div>

            {/* Stage 1 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                <h4 className="text-lg font-semibold text-orange-400">Stage 1: AI Mandatory Rejections (Structural Repricing Detection)</h4>
              </div>
              <div className="ml-11 space-y-2 text-slate-300">
                <p className="leading-relaxed">
                  <strong>Goal:</strong> Catch items that found a NEW permanent price (not temporary suppression)
                </p>
                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 mt-2">
                  <p className="font-semibold text-slate-200 mb-2">Uses Temporal Analysis (6 metrics):</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Price Stability (0-100)</strong> → How volatile price has been (100 = rock solid)</li>
                    <li><strong>Trend Direction</strong> → Rising, falling, or stable over 90 days</li>
                    <li><strong>Days Since Major Shift</strong> → Time since last 15%+ price change</li>
                    <li><strong>Momentum</strong> → Accelerating/decelerating up/down/flat</li>
                    <li><strong>Structural Repricing Risk</strong> → VERY HIGH if stable 90+ days with 70+ stability</li>
                  </ul>
                </div>
                <div className="bg-red-900/20 border border-red-700/50 rounded p-3 mt-2">
                  <p className="font-semibold text-red-300 mb-2">🚫 Mandatory Rejections (Auto-reject, no exceptions):</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Structural Repricing Risk = <strong>VERY HIGH</strong> (new equilibrium, not bot dump)</li>
                    <li>Stable &gt;90 days + Stability &gt;70 (found new price floor)</li>
                    <li>Trend falling + Momentum accelerating down (organic demand death)</li>
                    <li>High stability contradicts bot dump claim (bots create volatility)</li>
                  </ul>
                </div>
                <p className="text-sm text-blue-300 mt-2">
                  💡 Example: Dragon dart stable 210 days at 1200gp → AI detects new equilibrium, rejects despite appearing &quot;below average&quot;
                </p>
              </div>
            </div>

            {/* Stage 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                <h4 className="text-lg font-semibold text-purple-400">Stage 2: AI Quality Standards (Only Approve Strong Setups)</h4>
              </div>
              <div className="ml-11 space-y-2 text-slate-300">
                <p className="leading-relaxed">
                  <strong>Goal:</strong> Only approve TOP 10-15 opportunities with exceptional risk/reward
                </p>
                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 mt-2">
                  <p className="font-semibold text-slate-200 mb-2">Must Pass ALL Criteria:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>ROI ≥ 15% minimum</strong> → Worth the effort and risk</li>
                    <li><strong>Price 20%+ below longer-term averages</strong> → Clear suppression (not noise)</li>
                    <li><strong>Strong bot evidence</strong> → Bot likelihood &gt;50%, dump score aligns with price</li>
                    <li><strong>Historical averages stable</strong> → Not organic decline (&lt;5% YoY drop)</li>
                    <li><strong>Active demand</strong> → Item still regularly traded (not obsolete)</li>
                    <li><strong>Recovery within 2-4 weeks</strong> → Quick returns for active flipping</li>
                    <li><strong>Acceptable risk</strong> → Liquidity &gt;40, not extreme volatility</li>
                    <li><strong>High confidence</strong> → AI would personally invest in this</li>
                  </ul>
                </div>
                <p className="text-sm text-green-300 mt-2">
                  ✅ Result: Only 10-15 TOP-TIER opportunities approved (33% → 13% approval rate improvement)
                </p>
              </div>
            </div>
          </div>

          {/* Cost & Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-400 mb-2">💰 Cost Efficiency</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Stage 0 saves 70% AI costs</li>
                <li>• ~$0.006 per scan (vs $0.021 before)</li>
                <li>• ~$2/month at daily scanning</li>
                <li>• gpt-4o-mini (13× cheaper than GPT-4o)</li>
              </ul>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-400 mb-2">⚡ Performance</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• 112 items analyzed in ~45 seconds</li>
                <li>• 10-15 high-quality approvals</li>
                <li>• 15-96% ROI range</li>
                <li>• Zero false positives (Dragon dart ✓)</li>
              </ul>
            </div>
          </div>

          {/* Key Concepts */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
            <h3 className="text-xl font-bold text-yellow-300 mb-4">🔑 Key Concepts</h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <div>
                <strong className="text-yellow-400">Mean-Reversion:</strong> The tendency of prices to return to their average after temporary deviations. We exploit bot-induced suppression (temporary) vs organic decline (permanent).
              </div>
              <div>
                <strong className="text-yellow-400">Structural Repricing:</strong> When an item finds a NEW permanent price level (e.g., 3000gp → spike → crash to 1200gp new equilibrium). System detects this via temporal analysis to avoid false positives.
              </div>
              <div>
                <strong className="text-yellow-400">Bot Suppression:</strong> Bots flooding supply temporarily pushes prices below equilibrium. Creates mean-reversion opportunity when supply normalizes (typically 2-4 weeks).
              </div>
              <div>
                <strong className="text-yellow-400">Liquidity Score:</strong> Measures how easily you can buy/sell at target prices. Low liquidity (&lt;30) means you might not be able to exit at projected profit target.
              </div>
            </div>
          </div>

          {/* Example Flow */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-5">
            <h3 className="text-xl font-bold text-blue-300 mb-4">📖 Example: Unicorn Horn Dust</h3>
            <div className="space-y-2 text-slate-300 text-sm">
              <p><strong className="text-blue-400">Current Price:</strong> 143gp</p>
              <p><strong className="text-blue-400">90d Average:</strong> 280gp (49% below)</p>
              <p><strong className="text-blue-400">System Analysis:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Stage 0: ROI 96% ✅, Exit 1.96x ✅, Hold 10 weeks (but ROI &gt;50% so approved) ✅</li>
                <li>Stage 1: Stability 60/100 (recent volatility) ✅, Days since shift 15 (&lt;90) ✅, No structural risk ✅</li>
                <li>Stage 2: ROI 96% ✅, 49% below average ✅, Bot evidence strong ✅, Recovery 10 weeks ✅</li>
              </ul>
              <p className="text-green-400 font-semibold mt-3">✅ APPROVED: Top-tier opportunity (96% ROI, clear suppression)</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded font-medium transition-all"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
