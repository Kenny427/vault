'use client';

import { useState, useRef, useEffect } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemName: string;
  feedbackType: 'accept' | 'decline' | 'skip';
  aiRecommendation?: {
    confidence: number;
    thesis: string;
    targets: {
      entry: number;
      exit: number;
    };
  };
  onSubmit: (feedback: {
    itemId: number;
    feedbackType: 'accept' | 'decline' | 'skip';
    reason: string;
    tags: string[];
    confidence: number;
  }) => void;
}

const QUICK_REASONS = {
  accept: [
    'Strong fundamentals',
    'Good entry price',
    'Historical pattern matches',
    'Low risk',
    'Quick flip potential',
  ],
  decline: [
    'Price too high',
    'Weak recovery potential',
    'Better alternatives available',
    'High risk',
    'Liquidity concerns',
    'Hold time too long',
  ],
  skip: [
    'Need more data',
    'Market conditions unclear',
    'Too volatile',
    'Not interested in this item',
    'Already trading similar',
  ],
};

export default function FeedbackModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  feedbackType,
  aiRecommendation,
  onSubmit,
}: FeedbackModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickReasons = QUICK_REASONS[feedbackType];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!reason.trim() && selectedTags.length === 0) {
      alert('Please provide at least a reason or select tags');
      return;
    }

    setSubmitting(true);
    await onSubmit({
      itemId,
      feedbackType,
      reason: reason.trim(),
      tags: selectedTags,
      confidence,
    });
    setSubmitting(false);
    onClose();
  };

  const getTitle = () => {
    switch (feedbackType) {
      case 'accept':
        return '✅ Why are you accepting this?';
      case 'decline':
        return '❌ Why are you declining this?';
      case 'skip':
        return '⏭️ Why are you skipping this?';
    }
  };

  const getColor = () => {
    switch (feedbackType) {
      case 'accept':
        return {
          header: 'bg-green-900/20 border-b border-green-700/50',
          title: 'text-green-400',
          button: 'bg-green-600 hover:bg-green-700',
          tag: 'bg-green-600',
        };
      case 'decline':
        return {
          header: 'bg-red-900/20 border-b border-red-700/50',
          title: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-700',
          tag: 'bg-red-600',
        };
      case 'skip':
        return {
          header: 'bg-yellow-900/20 border-b border-yellow-700/50',
          title: 'text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          tag: 'bg-yellow-600',
        };
    }
  };

  const colors = getColor();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`${colors.header} p-6`}>
          <h2 className={`text-2xl font-bold ${colors.title}`}>{getTitle()}</h2>
          <p className="text-sm text-slate-400 mt-1">{itemName}</p>
        </div>

        {/* AI Recommendation Summary */}
        {aiRecommendation && (
          <div className="p-6 border-b border-slate-700 bg-slate-800/30">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">🤖 AI&apos;s Thesis</h3>
            <p className="text-xs text-slate-400 mb-3">{aiRecommendation.thesis}</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Confidence:</span>
                <span className="ml-2 font-semibold text-blue-400">{aiRecommendation.confidence}%</span>
              </div>
              <div>
                <span className="text-slate-500">Entry:</span>
                <span className="ml-2 font-semibold text-green-400">
                  {aiRecommendation.targets.entry.toLocaleString()}gp
                </span>
              </div>
              <div>
                <span className="text-slate-500">Exit:</span>
                <span className="ml-2 font-semibold text-purple-400">
                  {aiRecommendation.targets.exit.toLocaleString()}gp
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Quick Tags (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {quickReasons.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? `${colors.tag} text-white`
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Your Reasoning (helps AI learn)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What factors influenced your decision?"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:border-osrs-accent focus:ring-1 focus:ring-osrs-accent outline-none resize-none"
              rows={3}
            />
            <p className="text-xs text-slate-500 mt-2">
              💡 Your feedback helps AI understand your trading style and improve future recommendations
            </p>
          </div>

          {/* Confidence Slider */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Your Confidence: {confidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Uncertain</span>
              <span>Very Confident</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 px-4 py-2 ${colors.button} disabled:bg-slate-700 text-white rounded font-medium transition-colors`}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
