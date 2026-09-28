'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { ScrollReveal } from './ScrollReveal';
import type { AboutSplitSectionProps } from './types';

export const AboutSplitSection: React.FC<AboutSplitSectionProps> = ({
  eyebrow,
  headline,
  description,
  imageSrc,
  imageAlt,
  imagePosition = 'right',
  cornerStyle = 'top-left-arch',
  actionLabel = 'Learn More',
  actionHref = '/workspace',
  className = '',
  classNames = {},
}) => {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Dynamic subtle scroll float for the narrative text box
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const el = textContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight && rect.bottom > 0) {
          const centerDelta = rect.top + rect.height / 2 - windowHeight / 2;
          const translateY = centerDelta * 0.05;
          el.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  useGSAP(
    () => {
      const btn = buttonRef.current;
      if (!btn || prefersReducedMotion) return;

      const onEnter = () => gsap.to(btn, { scale: 1.03, duration: 0.2, ease: 'power2.out' });
      const onLeave = () => gsap.to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' });
      const onDown = () => gsap.to(btn, { scale: 0.97, duration: 0.1 });
      const onUp = () => gsap.to(btn, { scale: 1.03, duration: 0.15 });

      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('mouseleave', onLeave);
      btn.addEventListener('mousedown', onDown);
      btn.addEventListener('mouseup', onUp);

      return () => {
        btn.removeEventListener('mouseenter', onEnter);
        btn.removeEventListener('mouseleave', onLeave);
        btn.removeEventListener('mousedown', onDown);
        btn.removeEventListener('mouseup', onUp);
      };
    },
    { scope: buttonRef, dependencies: [prefersReducedMotion] }
  );

  const getCornerClasses = () => {
    switch (cornerStyle) {
      case 'top-left-arch':
        return 'rounded-tl-[70px] sm:rounded-tl-[110px] md:rounded-tl-[130px] rounded-br-[36px] rounded-tr-[24px] rounded-bl-[24px]';
      case 'top-right-arch':
        return 'rounded-tr-[70px] sm:rounded-tr-[110px] md:rounded-tr-[130px] rounded-bl-[36px] rounded-tl-[24px] rounded-br-[24px]';
      case 'pill':
        return 'rounded-[48px] sm:rounded-[64px]';
      default:
        return 'rounded-3xl';
    }
  };

  const textBlock = (
    <div
      ref={textContainerRef}
      className={`flex flex-col justify-center max-w-lg will-change-transform ${
        imagePosition === 'right' ? 'lg:pr-8' : 'lg:pl-8'
      } ${classNames.textContent ?? ''}`}
    >
      {/* Category Eyebrow */}
      <span
        className={`text-xs font-mono font-medium tracking-[0.25em] text-text-muted dark:text-neutral-400 uppercase mb-4 ${
          classNames.eyebrow ?? ''
        }`}
      >
        {eyebrow}
      </span>

      {/* Editorial Headline */}
      <h2
        className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink dark:text-text-primary leading-[1.12] mb-6 font-editorial ${
          classNames.headline ?? ''
        }`}
      >
        {headline}
      </h2>

      {/* Narrative Body Copy */}
      <p
        className={`text-base sm:text-lg leading-relaxed text-text-secondary dark:text-neutral-300 font-normal mb-8 ${
          classNames.description ?? ''
        }`}
      >
        {description}
      </p>

      {/* Dark Pill CTA Button */}
      <div>
        <Link
          ref={buttonRef}
          href={actionHref}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink dark:bg-white text-surface-0 dark:text-ink font-mono text-xs font-bold tracking-wider shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-citron transition-shadow ${
            classNames.button ?? ''
          }`}
        >
          <span>{actionLabel}</span>
          <span className="text-sm">→</span>
        </Link>
      </div>
    </div>
  );

  const imageBlock = (
    <div
      className={`relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3.2] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.45)] border border-line/70 dark:border-white/10 group ${getCornerClasses()} ${
        classNames.imageContainer ?? ''
      }`}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );

  // Side animation direction:
  // When image is right, text appears from the left, image appears from the right.
  // When image is left, image appears from the left, text appears from the right.
  const textDirection = imagePosition === 'right' ? 'left' : 'right';
  const imageDirection = imagePosition === 'right' ? 'right' : 'left';

  return (
    <section
      aria-label={typeof headline === 'string' ? headline : eyebrow}
      className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 overflow-hidden ${className} ${
        classNames.root ?? ''
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
        {imagePosition === 'left' ? (
          <>
            <ScrollReveal direction={imageDirection} distance={72} duration={0.9} threshold={0.12}>
              {imageBlock}
            </ScrollReveal>
            <ScrollReveal direction={textDirection} distance={72} duration={0.9} delay={0.1} threshold={0.12}>
              {textBlock}
            </ScrollReveal>
          </>
        ) : (
          <>
            <ScrollReveal direction={textDirection} distance={72} duration={0.9} threshold={0.12}>
              {textBlock}
            </ScrollReveal>
            <ScrollReveal direction={imageDirection} distance={72} duration={0.9} delay={0.1} threshold={0.12}>
              {imageBlock}
            </ScrollReveal>
          </>
        )}
      </div>
    </section>
  );
};
