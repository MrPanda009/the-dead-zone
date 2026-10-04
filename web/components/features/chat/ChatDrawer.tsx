'use client';

import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatDrawerProps, ChatMessageItemData } from './types';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatPromptSuggestions } from './ChatPromptSuggestions';
import { ChatInputBar } from './ChatInputBar';
import { sendRelocationChatMessage } from '@/lib/api/chat';

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  district = 'Barpeta',
  habitationId = null,
  siteId = null,
  screeningMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessageItemData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState('openai/gpt-oss-120b');
  const [isFallback, setIsFallback] = useState(false);

  useGSAP(
    () => {
      if (isOpen) {
        gsap.to(backdropRef.current, { opacity: 1, duration: 0.25, ease: 'power2.out' });
        gsap.to(panelRef.current, { x: 0, duration: 0.35, ease: 'power3.out' });
      } else {
        gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' });
        gsap.to(panelRef.current, { x: '100%', duration: 0.25, ease: 'power3.in' });
      }
    },
    { scope: containerRef, dependencies: [isOpen] },
  );

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessageItemData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await sendRelocationChatMessage({
        messages: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        district,
        habitation_id: habitationId,
        site_id: siteId,
        screening_mode: screeningMode,
      });

      const assistantMsg: ChatMessageItemData = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resp.reply,
        timestamp: new Date().toISOString(),
        toolsCalled: resp.tools_called,
        citations: resp.citations,
        fallbackUsed: resp.fallback_used,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.model) setActiveModel(resp.model);
      setIsFallback(Boolean(resp.fallback_used));
    } catch (err: unknown) {
      const fallbackMsg: ChatMessageItemData = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error contacting relocation assistant: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 pointer-events-none ${isOpen ? 'visible' : 'invisible'} ${className}`}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 pointer-events-auto transition-opacity"
      />

      {/* Slide-out Drawer Panel */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 w-full max-w-lg md:max-w-xl bg-bg-base dark:bg-forest-dark border-l border-line dark:border-white/10 shadow-2xl flex flex-col pointer-events-auto translate-x-full transition-transform"
      >
        <ChatHeader
          district={district}
          model={activeModel}
          isFallback={isFallback}
          onClose={onClose}
          onClear={handleClear}
        />

        <ChatMessageList messages={messages} isLoading={isLoading} />

        <ChatPromptSuggestions
          district={district}
          onSelectPrompt={(prompt) => handleSendMessage(prompt)}
        />

        <ChatInputBar
          value={input}
          onChange={setInput}
          onSubmit={() => handleSendMessage()}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
