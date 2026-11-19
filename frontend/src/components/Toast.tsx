import React, { useEffect } from 'react';

export interface ToastProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

/** Minimal bottom-centre status pill that auto-dismisses after `durationMs`. */
export const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  durationMs = 3000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#2A2A29] bg-[#2A2A29] px-4 py-2 text-sm font-medium text-[#FFFFFF] shadow-[0_8px_24px_rgba(42,42,41,0.18)]"
    >
      {message}
    </div>
  );
};

export default Toast;
