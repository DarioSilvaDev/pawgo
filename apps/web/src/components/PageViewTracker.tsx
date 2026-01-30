'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { EventType } from '@pawgo/shared';

export function PageViewTracker() {
  useEffect(() => {
    // Track page view
    trackEvent(EventType.PAGE_VIEW, { page: 'home' });
  }, []);

  return null;
}

