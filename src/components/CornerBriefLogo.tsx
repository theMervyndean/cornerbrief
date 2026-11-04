import React, { useState } from 'react';
import { Globe } from 'lucide-react';

export interface CornerBriefLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  type?: 'full' | 'mark';
  badge?: string | null;
  theme?: 'dark' | 'light' | 'transparent';
  variant?: 'solid' | 'transparent' | 'glow';
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

// Full horizontal logo sizing (bold, large, and responsive across all screens)
const FULL_SIZE_MAP = {
  xs: { img: 'h-7 sm:h-8 w-auto max-w-[150px]', badgeText: 'text-[9px]' },
  sm: { img: 'h-8 sm:h-10 md:h-11 w-auto max-w-[220px]', badgeText: 'text-[10px]' },
  md: { img: 'h-10 sm:h-12 md:h-14 lg:h-16 w-auto max-w-[300px]', badgeText: 'text-[11px]' },
  lg: { img: 'h-14 sm:h-16 md:h-20 lg:h-22 w-auto max-w-[380px]', badgeText: 'text-xs' },
  xl: { img: 'h-16 sm:h-20 md:h-24 lg:h-28 w-auto max-w-[460px]', badgeText: 'text-xs' },
  '2xl': { img: 'h-20 sm:h-24 md:h-30 lg:h-36 w-auto max-w-[560px]', badgeText: 'text-sm' },
  hero: { img: 'h-24 sm:h-32 md:h-40 lg:h-48 w-auto max-w-[640px]', badgeText: 'text-sm' },
};

// Compact icon mark sizing (for small section kickers or collapsed sidebar)
const MARK_SIZE_MAP = {
  xs: { box: 'w-7 h-7', rounded: 'rounded-lg', badgeText: 'text-[9px]' },
  sm: { box: 'w-9 h-9', rounded: 'rounded-xl', badgeText: 'text-[10px]' },
  md: { box: 'w-12 h-12', rounded: 'rounded-xl', badgeText: 'text-[11px]' },
  lg: { box: 'w-16 h-16', rounded: 'rounded-2xl', badgeText: 'text-xs' },
  xl: { box: 'w-24 h-24', rounded: 'rounded-2xl', badgeText: 'text-xs' },
  '2xl': { box: 'w-32 h-32', rounded: 'rounded-3xl', badgeText: 'text-sm' },
  hero: { box: 'w-36 h-36 sm:w-44 sm:h-44', rounded: 'rounded-3xl', badgeText: 'text-sm' },
};

export const CornerBriefLogo: React.FC<CornerBriefLogoProps> = ({
  size = 'md',
  type = 'full',
  badge,
  theme = 'light',
  variant = 'transparent',
  className = '',
  imgClassName = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const isDark = theme === 'dark';
  const isMark = type === 'mark';

  // Primary official full logo path (user uploaded transparent PNG)
  const fullLogoSrc = '/assets/aistudio/CornerBrief_Healthcare_Platform_Logo-removebg-preview_82613c39.png';
  const fullLogoFallback = '/cornerbrief-full-logo.png';
  const markLogoSrc = '/cornerbrief-logo-transparent.png';
  const markLogoFallback = '/cornerbrief-logo.png';

  if (isMark) {
    const conf = MARK_SIZE_MAP[size] || MARK_SIZE_MAP.md;
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div
          className={`relative ${conf.box} ${conf.rounded} overflow-hidden shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-105 ${
            variant === 'glow'
              ? 'shadow-lg ring-2 ring-[#1769E0]/40 shadow-[#1769E0]/20'
              : ''
          } ${
            isDark
              ? 'bg-[#0B1F33] ring-1 ring-white/20'
              : 'bg-white border border-[#E2E8F0] shadow-xs'
          }`}
        >
          {!imgError ? (
            <img
              src={markLogoSrc}
              alt="CornerBrief Logo Mark"
              className={`w-full h-full object-contain p-1 ${conf.rounded} ${imgClassName}`}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith(markLogoFallback)) {
                  target.src = markLogoFallback;
                } else {
                  setImgError(true);
                }
              }}
              loading="eager"
            />
          ) : (
            <svg
              className="w-full h-full p-2"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="64" height="64" rx="14" fill={isDark ? '#0B1F33' : '#F6F9FC'} />
              <path
                d="M16 18C16 16.8954 16.8954 16 18 16H38L48 26V46C48 47.1046 47.1046 48 46 48H18C16.8954 48 16 47.1046 16 46V18Z"
                fill={isDark ? '#1769E0' : '#0B1F33'}
              />
              <path d="M38 16V26H48" fill="#0E9F9A" />
              <path d="M26 35H38" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M32 29V41" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {badge && (
          <span
            className={`inline-flex items-center gap-1.5 font-mono font-bold tracking-wide text-[#0E9F9A] bg-[#0E9F9A]/10 px-2.5 py-1 rounded-md border border-[#0E9F9A]/20 ${conf.badgeText}`}
          >
            <Globe className="w-3 h-3 text-[#0E9F9A]" />
            {badge}
          </span>
        )}
      </div>
    );
  }

  // Full bold responsive horizontal logo lockup
  const conf = FULL_SIZE_MAP[size] || FULL_SIZE_MAP.md;

  return (
    <div
      className={`inline-flex items-center gap-3 select-none transition-transform duration-300 hover:scale-[1.015] active:scale-[0.99] ${
        isDark ? 'bg-white/95 px-3 py-1.5 rounded-xl shadow-md border border-white/20 backdrop-blur-xs' : ''
      } ${className}`}
    >
      <div className="relative shrink-0 flex items-center">
        {!imgError ? (
          <img
            src={fullLogoSrc}
            alt="CornerBrief — Healthcare Information Platform"
            className={`object-contain transition-all duration-300 drop-shadow-xs ${conf.img} ${imgClassName}`}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith(fullLogoFallback)) {
                target.src = fullLogoFallback;
              } else {
                setImgError(true);
              }
            }}
            loading="eager"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F33] text-white flex items-center justify-center font-bold font-display text-lg">
              CB
            </div>
            <div className="text-left">
              <span className="font-display font-extrabold text-xl text-[#0B1F33] tracking-tight">
                Corner<span className="text-[#1769E0]">Brief</span>
              </span>
              <span className="block text-[9px] font-mono tracking-widest text-[#0E9F9A] font-bold uppercase">
                Healthcare Information Platform
              </span>
            </div>
          </div>
        )}
      </div>

      {badge && (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-bold tracking-wide text-[#0E9F9A] bg-[#0E9F9A]/10 px-2.5 py-1 rounded-md border border-[#0E9F9A]/20 shrink-0 ${conf.badgeText}`}
        >
          <Globe className="w-3 h-3 text-[#0E9F9A]" />
          {badge}
        </span>
      )}
    </div>
  );
};
