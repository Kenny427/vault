'use client';

import { useState } from 'react';

interface QuickFeedbackProps {
  itemId: number;
  itemName: string;
  feedbackType: 'accept' | 'decline' | 'skip' | 'correct_rejection' | 'wrong_rejection';
  aiConfidence?: number;
  aiThesis?: string;
  aiRejectionReason?: string;
  price?: number;
  onComplete?: () => void;
}

const QUICK_TAGS = {
  accept: ['Good Analysis', 'High Confidence', 'Matches Research'],
  decline: ['Wrong Analysis', 'Too Risky', 'Better Options'],
  skip: ['Not Interested', 'Already Trading', 'Low Liquidity'],
  correct_rejection: ['Good Filter', 'Correct Decision', 'Would Skip'],
  wrong_rejection: ['Should Pass', 'Good Opportunity', 'Too Strict']
};

export default function QuickFeedback({
  itemId,
  itemName,
  feedbackType,
  aiConfidence,
  aiThesis,
  aiRejectionReason,
  price,
  onComplete
}: QuickFeedbackProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleQuickTag = async (tag: string) => {
    if (submitting || submitted) return;
    
    setSubmitting(true);
    
    try {
      await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          item_name: itemName,
          feedback_type: feedbackType,
          tags: [tag],
          reason: null,
          user_confidence: null,
          ai_confidence: aiConfidence,
          ai_thesis: aiThesis,
          ai_rejection_reason: aiRejectionReason,
          price_at_feedback: price
        })
      });
      
      setSubmitted(true);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitting(false);
    }
  };

  const handleSkipFeedback = () => {
    setSubmitted(true);
    onComplete?.();
  };

  if (submitted) {
    return (
      <div className="text-xs text-green-400 font-medium">
        ✓ Feedback saved
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TAGS[feedbackType].map(tag => (
          <button
            key={tag}
            onClick={() => handleQuickTag(tag)}
            disabled={submitting}
            className="px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 
                     text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {tag}
          </button>
        ))}
      </div>
      <button
        onClick={handleSkipFeedback}
        className="text-xs text-slate-500 hover:text-slate-400 underline"
      >
        Skip feedback
      </button>
    </div>
  );
}
