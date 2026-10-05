/** Types and interfaces for the Relocation Decision Assistant Chat feature. */

import React from 'react';
import type { ChatCitation, ChatMessage, RelocationChatResponse, ToolExecutionRecord } from '@/lib/api/chat';

export interface ChatMessageItemData extends ChatMessage {
  id: string;
  toolsCalled?: string[];
  toolExecutions?: ToolExecutionRecord[];
  citations?: ChatCitation[];
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

export interface ChatCitationBadgeProps {
  /** The citation payload */
  citation: ChatCitation;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatToolExecutionBadgeProps {
  /** The tool execution trace record */
  execution: ToolExecutionRecord;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatToolLoadingStepsProps {
  /** The latest user question being processed */
  userQuestion?: string;
  /** Optional active district context */
  district?: string;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatMessageItemProps {
  /** The message object */
  message: ChatMessageItemData;
  /** Granular styling overrides */
  className?: string;
}

export interface ChatMessageListProps {
  /** Ordered list of messages */
  messages: ChatMessageItemData[];
  /** Whether the assistant is currently generating a reply */
  isLoading?: boolean;
  /** Active district context */
  district?: string;
  /** Callback triggered when user selects a suggested prompt */
  onSelectPrompt?: (prompt: string) => void;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatPromptSuggestionsProps {
  /** Callback when user clicks a prompt chip */
  onSelectPrompt: (prompt: string) => void;
  /** Active district context */
  district?: string;
  /** Number of active messages in the conversation */
  messagesCount?: number;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatPromptCardProps {
  /** The prompt text */
  prompt: string;
  /** Leading icon type */
  iconType?: 'scale' | 'home' | 'building' | 'map';
  /** Callback triggered when the prompt card is clicked */
  onClick: (prompt: string) => void;
  /** Optional index for staggered entrances */
  index?: number;
  /** Custom root className */
  className?: string;
}

export interface ChatEmptyStateProps {
  /** Active district context */
  district?: string;
  /** Callback when user clicks a prompt */
  onSelectPrompt: (prompt: string) => void;
  /** Custom root className */
  className?: string;
}

export interface ChatScenicBackgroundProps {
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatInputBarProps {
  /** Current input value */
  value: string;
  /** On change callback */
  onChange: (value: string) => void;
  /** Submit callback */
  onSubmit: () => void;
  /** Whether the input is disabled / loading */
  disabled?: boolean;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatHeaderProps {
  /** Active district name */
  district: string;
  /** Active model identifier */
  model?: string;
  /** Whether offline fallback was used */
  isFallback?: boolean;
  /** On district change callback */
  onDistrictChange?: (district: string) => void;
  /** On close drawer callback */
  onClose: () => void;
  /** On clear conversation callback */
  onClear: () => void;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Initial or active district context */
  district?: string;
  /** Initial focused habitation ID */
  habitationId?: number | null;
  /** Initial focused candidate site ID */
  siteId?: number | null;
  /** Whether exploratory screening mode is toggled */
  screeningMode?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

export interface ChatFloatingTriggerProps {
  /** Click callback to open drawer */
  onClick: () => void;
  /** Whether the drawer is already open */
  isOpen?: boolean;
  /** Optional badge count */
  badgeCount?: number;
  /** Optional custom CSS classes */
  className?: string;
}
