'use client';

import React from 'react';
import { GovHexMapPage } from '@/components/features/gov-view';

export default function GovPage() {
  return (
    <GovHexMapPage
      overviewHref="/"
      storiesHref="/stories"
      workspaceHref="/workspace"
    />
  );
}
