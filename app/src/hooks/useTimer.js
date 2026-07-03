import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Countdown timer hook
 * @param {number} duration - Duration in seconds
 * @param {Function} onExpire - Callback when timer reaches 0
 * @returns {{ timeLeft: number, progress: number, isRunning: boolean, start: Function, stop: Function, reset: Function }}
 */
export function useTimer(duration = 10, onExpire) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  
  // Keep callback ref updated
  onExpireRef.current = onExpire;
  
  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      cancelAnimationFrame(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);
  
  const reset = useCallback(() => {
    stop();
    setTimeLeft(duration);
  }, [stop, duration]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    let rafId;
    
    const tick = (now) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setIsRunning(false);
        onExpireRef.current?.();
        return;
      }
      
      rafId = requestAnimationFrame(tick);
    };
    
    rafId = requestAnimationFrame(tick);
    intervalRef.current = rafId;
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isRunning, duration]);
  
  const progress = timeLeft / duration; // 1 = full, 0 = expired
  
  return { timeLeft, progress, isRunning, start, stop, reset };
}
