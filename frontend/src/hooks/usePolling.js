import { useEffect, useRef } from 'react';

// Calls `fn` now and then every `intervalMs` while `enabled` is true.
// This replaces Firestore's onSnapshot live listeners. Polling pauses while the tab is hidden.
export function usePolling(fn, intervalMs, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;
    let timer;

    const tick = async () => {
      if (!document.hidden) {
        try { await fnRef.current(); } catch (err) { console.warn('[poll]', err.message); }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    tick();

    return () => { stopped = true; clearTimeout(timer); };
  }, [intervalMs, enabled]);
}
