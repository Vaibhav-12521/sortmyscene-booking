import { useEffect, useState, useRef } from 'react';

/**
 * Counts down to a target timestamp, ticking every second.
 * @param {string|number|Date|null} target deadline (e.g. reservation.expiresAt)
 * @param {() => void} [onExpire] called once when the countdown reaches zero
 * @returns {{ remainingMs, mmss, expired }}
 */
export function useCountdown(target, onExpire) {
  const targetMs = target ? new Date(target).getTime() : null;
  const [remainingMs, setRemainingMs] = useState(() =>
    targetMs ? Math.max(0, targetMs - Date.now()) : 0
  );
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (!targetMs) {
      setRemainingMs(0);
      return undefined;
    }

    const tick = () => {
      const left = Math.max(0, targetMs - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');

  return { remainingMs, mmss: `${mm}:${ss}`, expired: remainingMs <= 0 };
}
