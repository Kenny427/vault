'use client';

import { useEffect, useRef } from 'react';

interface DetailedAnalysis {
  itemId: number;
  itemName: string;
  detailedAnalysis: string;
}

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyses: DetailedAnalysis[];
}

export default function DetailedAnalysisModal({
  isOpen,
  onClose,
  analyses,
}: DetailedAnalysisModalProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">📊 Detailed Analysis</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {analyses.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No detailed analysis available yet. Try refreshing the analysis.
            </p>
          ) : (
            analyses.map((analysis, idx) => (
              <div
                key={analysis.itemId}
                className="border border-slate-700 rounded-lg p-4 bg-slate-800/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {idx + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-osrs-accent">
                    {analysis.itemName}
                  </h3>
                  <span className="text-xs text-slate-400 ml-auto">ID: {analysis.itemId}</span>
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {analysis.detailedAnalysis}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
