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
    'Large Price Deviation (>25% below avg)',
    'Strong Bot Evidence + Recent Dump',
    'High Liquidity = Low Risk',
    'Clear Historical Support Level',
    'Quick Recovery Expected (2-3 weeks)'
  ],
  decline: [
    'Price Stable = New Equilibrium',
    'Exit Target Unrealistic',
    'Weak Bot Evidence',
    'Hold Time Too Long (>4 weeks)',
    'Margin Too Thin After Costs',
    'Already Recovering (Missed Entry)',
    'Volume Too Low (Illiquid)'
  ],
  skip: [
    'Outside My Price Range',
    'Already Holding Similar Position',
    'Different Strategy/Timeframe',
    'Too Illiquid for My Volume'
  ],
  correct_rejection: [
    'Correctly Caught Stable Price',
    'Correctly Caught Weak Bot Evidence',
    'Correctly Caught Thin Margins',
    'Correctly Caught Quality Issues'
  ],
  wrong_rejection: [
    'Missed Strong Bot Dump',
    'Stability Filter Too Strict',
    'Margin Threshold Too High',
    'Good Setup Was Filtered Out'
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
