'use client';

import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatDrawerProps, ChatMessageItemData } from './types';
import { ChatScenicBackground } from './ChatScenicBackground';
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

  // GSAP Pop-up Window Animation positioned on the LEFT
  useGSAP(
    () => {
      if (isOpen) {
        gsap.to(backdropRef.current, { opacity: 1, duration: 0.22, ease: 'power2.out' });
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' }
        );
      } else {
        gsap.to(backdropRef.current, { opacity: 0, duration: 0.18, ease: 'power2.in' });
        gsap.to(panelRef.current, {
          opacity: 0,
          scale: 0.92,
          y: 16,
          duration: 0.2,
          ease: 'power2.in',
        });
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
      {/* Click outside subtle backdrop to dismiss */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] opacity-0 pointer-events-auto transition-opacity"
      />

      {/* Pop-up Window on the RIGHT bottom side */}
      <div
        ref={panelRef}
        className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[460px] md:w-[480px] h-[580px] sm:h-[630px] max-h-[calc(100vh-3.5rem)] rounded-3xl bg-bg-base dark:bg-forest-dark border border-emerald-200/90 dark:border-white/15 shadow-2xl flex flex-col pointer-events-auto overflow-hidden select-none origin-bottom-right"
      >
        {/* Scenic Mountain Valley Background */}
        <ChatScenicBackground />

        {/* Top Header */}
        <ChatHeader
          district={district}
          model={activeModel}
          isFallback={isFallback}
          onClose={onClose}
          onClear={handleClear}
        />

        {/* Scrollable Message List / Empty State */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          district={district}
          onSelectPrompt={(prompt) => handleSendMessage(prompt)}
        />

        {/* Compact prompt chips when conversation is active */}
        <ChatPromptSuggestions
          district={district}
          messagesCount={messages.length}
          onSelectPrompt={(prompt) => handleSendMessage(prompt)}
        />

        {/* Floating Input Bar */}
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

export default ChatDrawer;
