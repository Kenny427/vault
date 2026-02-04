'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/lib/chatContext';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  itemName?: string;
  timestamp: Date;
}

export default function Chat() {
  const { pendingQuestion, clearPendingQuestion } = useChat();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'ai',
      content: '👋 Hi! I\'m your AI flipping advisor. Ask me about any OSRS item - I\'ll analyze its price history and give you detailed investment analysis. Try asking "Is Avantoe a good flip?" or "Tell me about Runite bolts"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle pending question from context
  useEffect(() => {
    if (pendingQuestion) {
      setInput(pendingQuestion);
      clearPendingQuestion();
      // Auto-submit after a brief delay
      setTimeout(() => {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        document.querySelector('form')?.dispatchEvent(submitEvent);
      }, 100);
    }
  }, [pendingQuestion, clearPendingQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      // Extract item name from user input
      // Simple approach: look for key phrases like "about X", "is X", "X good", etc.
      const itemNameMatch = input.match(/(?:about|is|tell me about|should i buy|flip|invest in)\s+([^?]+)/i);
      const itemName = itemNameMatch ? itemNameMatch[1].trim() : input.trim();

      const response = await fetch('/api/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze item');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.analysis,
        itemName: data.itemName,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Error: ${err.message}. Make sure the item name is spelled correctly and exists in the OSRS economy.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 p-4">
        <h2 className="text-xl font-bold text-osrs-accent">🤖 AI Flipping Advisor</h2>
        <p className="text-sm text-slate-400 mt-1">Ask me about any item for detailed price analysis</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-osrs-accent text-slate-900 font-medium'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}
            >
              {message.itemName && (
                <p className="text-xs font-bold text-osrs-accent mb-2 uppercase">
                  📊 {message.itemName}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-slate-700' : 'text-slate-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-osrs-accent rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-osrs-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-osrs-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-900 p-4">
        {error && (
          <p className="text-sm text-red-400 mb-3 bg-red-900/20 border border-red-700 rounded px-3 py-2">
            ❌ {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about an item (e.g., 'Is Avantoe a good flip?')..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-osrs-accent focus:ring-1 focus:ring-osrs-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-osrs-accent hover:bg-osrs-accent/90 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold px-6 py-3 rounded transition-colors"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          💡 Tip: Ask about specific items to get detailed analysis. Each query costs less than a full pool refresh!
        </p>
      </div>
    </div>
  );
}
