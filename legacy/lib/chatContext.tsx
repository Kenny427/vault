'use client';

import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  isOpen: boolean;
  openChat: (question?: string) => void;
  closeChat: () => void;
  pendingQuestion: string | null;
  clearPendingQuestion: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const openChat = (question?: string) => {
    if (question) {
      setPendingQuestion(question);
    }
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const clearPendingQuestion = () => {
    setPendingQuestion(null);
  };

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, pendingQuestion, clearPendingQuestion }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
