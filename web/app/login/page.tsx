'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Toast } from '@/components/common/toast';
import { GlobeCanvas } from '@/components/features/globe';
import { LoginCard } from '@/components/features/auth';

export default function LoginPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-base text-text-primary select-none">
      {/* Misty Forest Background Atmosphere */}
      <div className="fixed inset-0 forest-atmosphere z-0 pointer-events-none" />

      {/* 3D WebGL Earth Globe Canvas in Login View Mode */}
      <GlobeCanvas
        viewMode="login"
        isAutoRotating={false}
        isRadarActive={true}
      />

      {/* Minimalist Top Header */}
      <Header
        viewMode="login"
        homeHref="/"
        portalHref="/login"
      />

      {/* Centered Login Card */}
      <div className="relative z-10 w-full h-full flex items-center px-6 sm:px-12 lg:px-20 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto">
          <LoginCard
            overviewHref="/"
            govHref="/gov"
            citizenHref="/stories"
          />
        </div>
      </div>

      {/* Toast Feedback Notification Banner */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
