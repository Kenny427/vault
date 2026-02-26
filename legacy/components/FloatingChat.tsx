'use client';

import React, { useState } from 'react';
import Chat from './Chat';
import { useChat } from '@/lib/chatContext';

export default function FloatingChat() {
  const { isOpen, openChat, closeChat } = useChat();
  const [isFullSize, setIsFullSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chat-fullsize') === 'true';
    }
    return false;
  });

  const toggleFullSize = () => {
    const newSize = !isFullSize;
    setIsFullSize(newSize);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-fullsize', newSize.toString());
    }
  };

  return (
    <>
      {/* Chat button - always visible in bottom right */}
      {!isOpen && (
        <button
          onClick={() => openChat()}
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
      {isOpen && (
        <div className={`fixed bg-gray-900 border-2 border-blue-500/30 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 ${
          isFullSize 
            ? 'bottom-6 right-6 left-6 top-6' 
            : 'bottom-6 right-6 w-96 h-[600px]'
        }`}>
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
            
            <div className="flex items-center gap-2">
              {/* Expand/Shrink button */}
              <button
                onClick={toggleFullSize}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label={isFullSize ? "Shrink chat" : "Expand chat"}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isFullSize ? (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" 
                    />
                  ) : (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
                    />
                  )}
                </svg>
              </button>

              {/* Minimize button */}
              <button
                onClick={closeChat}
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
