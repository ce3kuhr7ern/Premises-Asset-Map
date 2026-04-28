'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'help-mode';
const EVENT_NAME = 'help-mode-changed';

export type HelpMode = 'shown' | 'hidden';

/**
 * Per-browser preference for whether help banners and icons render.
 * Defaults to 'shown'. Toggling broadcasts a custom event so all hooked
 * components update in sync without a full page reload.
 *
 * SSR-safe: returns 'shown' on the server, hydrates from localStorage on
 * the client. Brief flash on first paint is acceptable for this low-frequency
 * setting.
 */
export function useHelpMode(): { mode: HelpMode; setMode: (m: HelpMode) => void } {
  const [mode, setModeState] = useState<HelpMode>('shown');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'hidden' || saved === 'shown') setModeState(saved);

    const handler = (e: Event) => {
      const next = (e as CustomEvent<HelpMode>).detail;
      if (next === 'hidden' || next === 'shown') setModeState(next);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const setMode = useCallback((next: HelpMode) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    window.dispatchEvent(new CustomEvent<HelpMode>(EVENT_NAME, { detail: next }));
  }, []);

  return { mode, setMode };
}
