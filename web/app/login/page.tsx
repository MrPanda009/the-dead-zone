'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { RouteStage } from '@/components/layout/transition';
import { Toast } from '@/components/common/toast';
import { APP_ROUTES, NAV_TABS } from '@/lib/routes';
import { GlobeCanvas } from '@/components/features/globe';
import { LoginCard } from '@/components/features/auth';

export default function LoginPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <RouteStage
      as="div"
      className="relative w-full h-dvh min-h-screen overflow-x-hidden overflow-y-auto bg-bg-base text-text-primary select-none flex flex-col"
    >
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
        homeHref={APP_ROUTES.home}
        portalHref={APP_ROUTES.login}
        tabs={NAV_TABS}
        activeTabId=""
      />

      {/* Centered Login Card Area with Guaranteed Top Header Clearance */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center items-center lg:items-start pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-12 px-4 sm:px-10 lg:px-16 xl:px-24 pointer-events-none">
        <div className="w-full max-w-lg xl:max-w-xl my-auto pointer-events-auto">
          <LoginCard
            overviewHref={APP_ROUTES.home}
            govHref={APP_ROUTES.gov}
            citizenHref={APP_ROUTES.stories}
          />
        </div>
      </div>

      {/* Toast Feedback Notification Banner */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </RouteStage>
  );
}
