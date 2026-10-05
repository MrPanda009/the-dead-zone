'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatToolLoadingStepsProps } from './types';

export const ChatToolLoadingSteps: React.FC<ChatToolLoadingStepsProps> = ({
  userQuestion = '',
  district = 'Barpeta',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qLower = userQuestion.toLowerCase();

  // Determine tool to highlight based on user question context
  let primaryTool = 'list_urgent_villages';
  let toolArg = `district="${district}"`;

  if (qLower.includes('compare') || qLower.includes('external') || qLower.includes('difference')) {
    primaryTool = 'compare_relocation_plans';
    toolArg = `district="${district}"`;
  } else if (qLower.includes('infrastructure') || qLower.includes('missing') || qLower.includes('water') || qLower.includes('school')) {
    primaryTool = 'get_missing_infrastructure';
    const match = userQuestion.match(/#?(\d+)/);
    toolArg = `site_id=${match ? match[1] : '1752'}`;
  } else if (qLower.includes('site') || qLower.includes('parcel') || qLower.includes('capacity')) {
    primaryTool = 'get_candidate_site_details';
    const match = userQuestion.match(/#?(\d+)/);
    toolArg = `site_id=${match ? match[1] : '1752'}`;
  } else if (qLower.includes('village') || qLower.includes('habitation') || qLower.includes('why') || qLower.includes('priority')) {
    primaryTool = 'get_village_priority';
    const match = userQuestion.match(/#?(\d+)/);
    toolArg = `name_or_id="${match ? match[1] : '775'}"`;
  }

  const steps = [
    { label: 'Resolving query intent & LLM tool schema', icon: '⚡' },
    { label: `Invoking tool: ${primaryTool}(${toolArg})`, icon: '⚙️', isTool: true },
    { label: 'Auditing PostGIS spatial cells & Section 6.8 H7 Gates', icon: '🛡️' },
    { label: 'Synthesizing verified resettlement brief...', icon: '📝' },
  ];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 700);
    const timer2 = setTimeout(() => setActiveStep(2), 2200);
    const timer3 = setTimeout(() => setActiveStep(3), 4000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useGSAP(
    () => {
      gsap.fromTo(
        '.tool-step-item',
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out' },
      );
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className={`max-w-md rounded-xl p-3.5 bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/10 shadow-sm space-y-2.5 text-xs ${className}`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-line/40 dark:border-white/10">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Active Pipeline Execution</span>
        </div>
        <span className="text-[10px] text-text-muted font-mono">
          Step {Math.min(activeStep + 1, steps.length)} of {steps.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isUpcoming = idx > activeStep;

          return (
            <div
              key={step.label}
              className={`tool-step-item flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/10 text-ink dark:text-text-primary font-medium'
                  : isDone
                    ? 'text-text-secondary opacity-80'
                    : 'text-text-muted opacity-40'
              }`}
            >
              <span className="text-sm shrink-0">{step.icon}</span>
              <span className={`flex-1 truncate font-mono text-[11px] ${step.isTool && isCurrent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                {step.label}
              </span>

              {isDone && (
                <span className="text-emerald-500 text-[11px] font-bold">✓</span>
              )}
              {isCurrent && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </span>
              )}
              {isUpcoming && (
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
