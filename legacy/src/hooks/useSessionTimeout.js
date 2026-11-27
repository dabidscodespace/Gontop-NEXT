// src/hooks/useSessionTimeout.js

import { useCallback, useEffect, useRef } from "react";

const useSessionTimeout = ({ timeout = 30 * 60 * 1000, onTimeout, isAuthenticated }) => {
  const timeoutRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    clearTimer();
    localStorage.setItem("last_activity", Date.now().toString());

    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [isAuthenticated, timeout, onTimeout, clearTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimer();
      return;
    }

    // Check if already expired on mount
    const lastActivity = localStorage.getItem("last_activity");
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= timeout) {
        onTimeout();
        return;
      }
    }

    // Activity events
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];

    let throttle = null;
    const handleActivity = () => {
      if (throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        resetTimer();
      }, 1000);
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimer();
      if (throttle) clearTimeout(throttle);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, timeout, onTimeout, resetTimer, clearTimer]);

  return { resetTimer };
};

export default useSessionTimeout;