import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delayMs = 220,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const showTooltip = () => {
    if (disabled || !content) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const hideTooltip = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const positionClasses: Record<NonNullable<TooltipProps['side']>, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
  };

  const initialOffset: Record<
    NonNullable<TooltipProps['side']>,
    { x?: number; y?: number }
  > = {
    top: { y: 4 },
    bottom: { y: -4 },
    left: { x: 4 },
    right: { x: -4 },
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <AnimatePresence>
        {visible && !disabled && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.96, ...initialOffset[side] }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, ...initialOffset[side] }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none absolute z-50 px-2.5 py-1 rounded-md bg-[#0B1F33] text-white text-[11px] font-medium whitespace-nowrap shadow-md border border-white/10 ${positionClasses[side]}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
