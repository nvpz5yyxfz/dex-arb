import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetTime: number; // epoch ms
  intervalHours: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CountdownTimer({ targetTime, intervalHours }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    let target = targetTime;
    const now = Date.now();
    // If target is in the past, advance to next interval
    if (target <= now && intervalHours > 0) {
      const intervalMs = intervalHours * 3600 * 1000;
      const elapsed = now - target;
      const periods = Math.ceil(elapsed / intervalMs);
      target = target + periods * intervalMs;
    }
    return Math.max(0, target - now);
  });

  useEffect(() => {
    let effectiveTarget = targetTime;
    const intervalMs = intervalHours * 3600 * 1000;

    const timer = setInterval(() => {
      const now = Date.now();
      // Auto-advance if past target
      if (effectiveTarget <= now && intervalMs > 0) {
        const elapsed = now - effectiveTarget;
        const periods = Math.ceil(elapsed / intervalMs);
        effectiveTarget = effectiveTarget + periods * intervalMs;
      }
      setRemaining(Math.max(0, effectiveTarget - now));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, intervalHours]);

  if (!targetTime || targetTime <= 0) return null;

  return (
    <span className="countdown">{formatCountdown(remaining)}</span>
  );
}
