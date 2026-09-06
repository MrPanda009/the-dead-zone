'use client';

import React from 'react';
import { PublicStoriesPage } from '@/components/features/public-stories';

export default function StoriesPage() {
  return (
    <PublicStoriesPage
      overviewHref="/"
      govHref="/gov"
    />
  );
}
