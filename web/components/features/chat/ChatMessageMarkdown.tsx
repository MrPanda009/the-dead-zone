'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ChatMessageMarkdownProps {
  /** Raw markdown content */
  content: string;
  /** Optional custom CSS classes */
  className?: string;
}

export const ChatMessageMarkdown: React.FC<ChatMessageMarkdownProps> = ({
  content,
  className = '',
}) => {
  // Pre-process any literal <br> or <br/> tags inside markdown strings to newlines
  const sanitizedContent = content.replace(/<br\s*\/?>/gi, '\n');

  return (
    <div className={`markdown-content text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-base font-bold text-ink dark:text-text-primary mt-3 mb-2 pb-1 border-b border-line/60 dark:border-white/10"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-sm font-bold text-ink dark:text-text-primary mt-3.5 mb-2"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-3 mb-1.5"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="text-xs font-semibold text-ink dark:text-text-primary mt-2 mb-1"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p
              className="mb-2.5 last:mb-0 text-text-secondary dark:text-text-primary/95 leading-relaxed"
              {...props}
            />
          ),
          ul: ({ ...props }) => (
            <ul
              className="list-disc list-outside ml-4 mb-2.5 space-y-1 text-text-secondary dark:text-text-primary/95"
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <ol
              className="list-decimal list-outside ml-4 mb-2.5 space-y-1 text-text-secondary dark:text-text-primary/95"
              {...props}
            />
          ),
          li: ({ ...props }) => (
            <li className="leading-relaxed pl-1" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong
              className="font-semibold text-ink dark:text-white"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-2 border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-2 rounded-r-md my-2.5 text-xs italic text-text-secondary dark:text-text-muted"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-line/70 dark:border-white/15">
              <table
                className="w-full border-collapse text-xs text-left"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead
              className="bg-surface-1 dark:bg-forest-surface text-ink dark:text-text-primary font-semibold border-b border-line dark:border-white/10"
              {...props}
            />
          ),
          th: ({ ...props }) => (
            <th
              className="py-2 px-3 font-semibold border-r border-line/40 dark:border-white/10 last:border-r-0 whitespace-nowrap"
              {...props}
            />
          ),
          tbody: ({ ...props }) => (
            <tbody
              className="divide-y divide-line/30 dark:divide-white/5 bg-surface-0/60 dark:bg-forest-dark/60"
              {...props}
            />
          ),
          tr: ({ ...props }) => (
            <tr
              className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className="py-2 px-3 border-r border-line/30 dark:border-white/10 last:border-r-0 text-text-secondary dark:text-text-primary/90"
              {...props}
            />
          ),
          code: ({ ...props }) => (
            <code
              className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px] text-emerald-600 dark:text-emerald-300"
              {...props}
            />
          ),
          pre: ({ ...props }) => (
            <pre
              className="p-3 rounded-lg bg-black/5 dark:bg-black/40 overflow-x-auto my-2 text-xs font-mono border border-line/40 dark:border-white/10"
              {...props}
            />
          ),
          hr: () => (
            <hr className="my-3 border-line/60 dark:border-white/10" />
          ),
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};
