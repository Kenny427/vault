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
  accept: [
    'Strong Setup',
    'Bot Pattern Clear',
    'Good Risk/Reward',
    'Fast Recovery Expected'
  ],
  decline: [
    'Price Too Stable (New Equilibrium)',
    'ROI Too Low (<15%)',
    'Organic Decline (Not Bots)',
    'Recovery Too Slow (>4 weeks)',
    'Weak Bot Evidence'
  ],
  skip: [
    'Not My Strategy',
    'Already Holding Similar',
    'Low Liquidity Risk'
  ],
  correct_rejection: [
    'Correctly Filtered (Structural)',
    'Correctly Filtered (ROI)',
    'Correctly Filtered (Quality)'
  ],
  wrong_rejection: [
    'Should Pass (Strong Bot Dump)',
    'Should Pass (Good ROI)',
    'Too Strict (Borderline Good)'
  ]
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
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemId,
          itemName: itemName,
          feedbackType: feedbackType,
          tags: [tag],
          reason: null,
          confidence: null,
          aiConfidence: aiConfidence,
          aiThesis: aiThesis,
          aiRejectionReason: aiRejectionReason,
          priceAtFeedback: price
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Feedback API error:', errorData);
        throw new Error('Failed to save feedback');
      }
      
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
