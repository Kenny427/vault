'use client';

import React, { useState } from 'react';
import Chat from './Chat';

export default function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Chat button - always visible in bottom right */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group"
          aria-label="Open AI Chat"
        >
          <svg 
            className="w-8 h-8 transition-transform group-hover:rotate-12" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
            />
          </svg>
          
          {/* Notification pulse */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 rounded-full animate-ping"></span>
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 rounded-full"></span>
        </button>
      )}

      {/* Expanded chat window */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-900 border-2 border-blue-500/30 rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5 duration-300">
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold">AI Flip Advisor</h3>
                <p className="text-xs text-gray-400">Ask about any item</p>
              </div>
            </div>
            
            {/* Minimize button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Minimize chat"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </button>
          </div>

          {/* Chat component */}
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      )}
    </>
  );
}
