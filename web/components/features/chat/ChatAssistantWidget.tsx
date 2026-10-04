'use client';

import React, { useState } from 'react';
import { ChatDrawer } from './ChatDrawer';
import { ChatFloatingTrigger } from './ChatFloatingTrigger';

export interface ChatAssistantWidgetProps {
  /** Default district in context */
  initialDistrict?: string;
  /** Custom CSS classes */
  className?: string;
}

export const ChatAssistantWidget: React.FC<ChatAssistantWidgetProps> = ({
  initialDistrict = 'Barpeta',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <ChatFloatingTrigger
        isOpen={isOpen}
        onClick={() => setIsOpen(true)}
      />
      <ChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        district={initialDistrict}
      />
    </div>
  );
};
