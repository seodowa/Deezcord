import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  targetRef: React.RefObject<HTMLElement | null>;
  show: boolean;
}

export default function Tooltip({ text, targetRef, show }: TooltipProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    }
  }, [show, targetRef]);

  if (!show) return null;

  return createPortal(
    <div
      className="fixed z-9999 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-xl pointer-events-none whitespace-nowrap animate-tooltip-in"
      style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
    >
      {text}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
    </div>,
    document.body
  );
}
