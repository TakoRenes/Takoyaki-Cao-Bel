import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { TakoyakiCharacter } from '../types';
import { Heart } from 'lucide-react';
import takoyakiOriginalImg from '../assets/images/takoyaki_ball_original_1791612763230.jpg';
import takoyakiSpicyImg from '../assets/images/takoyaki_ball_spicy_1791612777471.jpg';
import { playTakoyakiSizzle } from '../utils/sizzleSound';
import { useSiteAssets } from '../utils/caoBelAssets';

export interface WelcomeTransitionOrigin {
  foxRect: { top: number; left: number; width: number; height: number };
  cardRect: { top: number; left: number; width: number; height: number };
  id: number;
}

interface WelcomeHeroPageProps {
  onEnterTrays: (origin?: WelcomeTransitionOrigin) => void;
}

export const WelcomeHeroPage: React.FC<WelcomeHeroPageProps> = ({
  onEnterTrays,
}) => {
  const { assets, fallbacks } = useSiteAssets();
  const [showFoxDialogue, setShowFoxDialogue] = useState(false);
  const [isFoxSurprised, setIsFoxSurprised] = useState(false);
  const timerRef = useRef<number | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);
  const foxHotspotRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const playFoxSurpriseSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.39);
    } catch {
      // Audio playback non-blocking
    }
  };

  const handleFoxClick = () => {
    setIsFoxSurprised(true);
    setShowFoxDialogue(true);
    playFoxSurpriseSound();

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    // Auto close after 5.5s if user doesn't dismiss
    timerRef.current = window.setTimeout(() => {
      setShowFoxDialogue(false);
      setIsFoxSurprised(false);
    }, 5500);

    // Reset surprise flinch animation after 600ms
    window.setTimeout(() => {
      setIsFoxSurprised(false);
    }, 600);
  };

  const handleEnterClick = () => {
    playFoxSurpriseSound();
    playTakoyakiSizzle();

    if (foxHotspotRef.current && heroCardRef.current) {
      const fRect = foxHotspotRef.current.getBoundingClientRect();
      const cRect = heroCardRef.current.getBoundingClientRect();
      onEnterTrays({
        foxRect: {
          top: fRect.top,
          left: fRect.left,
          width: fRect.width,
          height: fRect.height,
        },
        cardRect: {
          top: cRect.top,
          left: cRect.left,
          width: cRect.width,
          height: cRect.height,
        },
        id: Date.now(),
      });
      return;
    }

    onEnterTrays();
  };

  return (
    <div
      className="max-w-[1320px] mx-auto px-4 sm:px-8 py-6 sm:py-10 flex items-center justify-center min-h-screen"
      onClick={() => {
        if (showFoxDialogue) setShowFoxDialogue(false);
      }}
    >
      {/* Dedicated Opening Hero Card */}
      <div
        ref={heroCardRef}
        className="relative w-full h-[500px] sm:h-[600px] rounded-[32px] overflow-hidden shadow-xl border border-[#E6D6C1]"
      >
        <img
          src={assets.heroCover}
          onError={(e) => {
            if (e.currentTarget.src !== fallbacks.heroCover) {
              e.currentTarget.src = fallbacks.heroCover;
            }
          }}
          alt="Xe Takoyaki Cáo Bel bên bờ biển"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />

        {/* Soft Left Contrast Scrim so floating text is crisp without any box frame */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(35, 20, 12, 0.62) 0%, rgba(35, 20, 12, 0.32) 45%, transparent 78%)',
          }}
        />

        {/* Floating Typography & CTA Directly Over the Background */}
        <div className="absolute inset-y-0 left-0 flex items-center p-6 sm:p-14 pointer-events-none">
          <div className="w-full max-w-[540px] pointer-events-auto">
            <h1
              className="font-display text-4xl sm:text-[54px] font-bold text-[#FFFDF9] leading-[1.1] tracking-tight mb-3.5"
              style={{
                textShadow: '0 4px 18px rgba(28, 14, 6, 0.55), 0 2px 4px rgba(28, 14, 6, 0.45)',
              }}
            >
              Xe Takoyaki
              <br />
              Cáo Bel
            </h1>
            <p
              className="text-base sm:text-lg font-medium text-[#FAF5EB] mb-7"
              style={{
                textShadow: '0 2px 10px rgba(28, 14, 6, 0.65)',
              }}
            >
              Đủ loại, đủ vị, đủ làm cho ngày thêm vuôi
            </p>
            <button
              type="button"
              onClick={handleEnterClick}
              className="px-7 py-3.5 rounded-full bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-sm sm:text-base shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer"
            >
              Quẹo lựa takoyaki
            </button>
          </div>
        </div>

        {/* Interactive Fox Chef Hotspot Trigger on Cover */}
        <button
          ref={foxHotspotRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFoxClick();
          }}
          aria-label="Bấm vào Cáo Bel trên ảnh bìa"
          className={`group absolute rounded-full cursor-pointer z-20 transition-all duration-200 outline-none select-none left-[58%] sm:left-[56%] md:left-[58%] lg:left-[59%] top-[34%] sm:top-[35%] w-[32%] sm:w-[22%] md:w-[20%] lg:w-[18%] h-[34%] sm:h-[32%] min-w-[100px] min-h-[100px] flex items-center justify-center ${
            isFoxSurprised
              ? 'scale-110 -rotate-6'
              : 'hover:scale-105 active:scale-95'
          }`}
        >
          {/* Interactive Aura on Hover */}
          <span className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-[#E57C29]/60 group-hover:bg-[#E57C29]/15 group-hover:shadow-[0_0_20px_rgba(229,124,41,0.35)] transition-all pointer-events-none" />
        </button>

        {/* Dialogue Speech Bubble */}
        {showFoxDialogue && (
          <div
            role="dialog"
            aria-label="Hội thoại Cáo Bel"
            onClick={(e) => e.stopPropagation()}
            className="absolute z-30 transition-all duration-300 top-[8%] sm:top-[12%] right-3 sm:right-auto sm:left-[59%] sm:-translate-x-1/2 max-w-[calc(100%-24px)] sm:max-w-[360px]"
          >
            <div
              className="relative bg-[#FFFDF9] text-[#432314] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 border-[#E57C29] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              style={{
                filter: 'drop-shadow(0 14px 28px rgba(35, 20, 12, 0.32))',
              }}
            >
              {/* Header badge & Close Button */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE8D6] text-[#C05621] text-xs font-bold tracking-wide">
                  <span>🦊</span>
                  <span>Đầu bếp Cáo Bel</span>
                  <span className="animate-bounce">💦</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFoxDialogue(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8D6B57] hover:text-[#432314] hover:bg-[#F2E5D5] transition-colors cursor-pointer text-xs font-bold"
                  aria-label="Đóng lời thoại"
                  title="Đóng"
                >
                  ✕
                </button>
              </div>

              {/* Exact dialogue line requested by user */}
              <p className="font-display text-sm sm:text-base font-bold text-[#432314] leading-snug tracking-tight">
                &ldquo;Á á á!! Tui hóa trang cục takoyaki chứ hong phải cục takoyaki thiệc đâu nha!&rdquo;
              </p>

              {/* Playful subtext */}
              <p className="mt-1.5 text-[11px] sm:text-xs text-[#8D6B57] italic">
                (Đầu bếp Cáo vội lấy xiên que che lại, sợ bị bạn gắp nhầm vô dĩa ăn mất đó 🥢)
              </p>

              {/* Bubble pointer tail */}
              <div
                className="absolute -bottom-2.5 right-14 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '11px solid transparent',
                  borderRight: '11px solid transparent',
                  borderTop: '11px solid #E57C29',
                }}
              />
              <div
                className="absolute -bottom-2 right-14 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '9px solid transparent',
                  borderRight: '9px solid transparent',
                  borderTop: '9px solid #FFFDF9',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface TakoyakiBallCoverProps {
  isSpicy?: boolean;
  seed?: number;
  isRevealed?: boolean;
}

export const TakoyakiBallCover: React.FC<TakoyakiBallCoverProps> = ({
  isSpicy = false,
  seed = 0,
  isRevealed = false,
}) => {
  // Subtle organic rotation per well so each ball looks freshly turned on the grill
  const angles = [0, 14, -12, 22, -18, 9, -24, 16];
  const angle = angles[seed % angles.length];

  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-full overflow-hidden transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-110 group-focus-visible:opacity-0 bg-[#9E5224] ${
        isRevealed ? 'opacity-0 scale-110' : ''
      }`}
    >
      <img
        src={isSpicy ? takoyakiSpicyImg : takoyakiOriginalImg}
        alt={isSpicy ? 'Viên takoyaki vị cay tê' : 'Viên takoyaki vị truyền thống'}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover select-none"
        style={{
          objectPosition: '50% 50%',
          transform: `rotate(${angle}deg) scale(1.78)`,
        }}
      />
    </div>
  );
};

interface TakoyakiStallHeroProps {
  originalCharacters: TakoyakiCharacter[];
  spicyCharacters: TakoyakiCharacter[];
  favorites: string[];
  onSelectCharacter: (character: TakoyakiCharacter) => void;
  transitionOrigin?: WelcomeTransitionOrigin | null;
  onTransitionComplete?: () => void;
}

export const TakoyakiStallHero: React.FC<TakoyakiStallHeroProps> = ({
  originalCharacters,
  spicyCharacters,
  favorites,
  onSelectCharacter,
  transitionOrigin,
  onTransitionComplete,
}) => {
  const { assets, fallbacks } = useSiteAssets();
  // On touch devices (phone/tablet), 1st tap reveals the character artwork & name, 2nd tap opens details
  const [revealedId, setRevealedId] = React.useState<string | null>(null);
  const lastPointerTypeRef = React.useRef<string>('mouse');

  // Morph transition state from Welcome Cover big Fox -> Discover Helper Fox
  const [isMorphingFox, setIsMorphingFox] = useState<boolean>(() =>
    Boolean(transitionOrigin)
  );
  const [hasJustLanded, setHasJustLanded] = useState<boolean>(false);
  const helperFoxContainerRef = useRef<HTMLDivElement | null>(null);
  const flyingFoxRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
    if (!transitionOrigin) {
      setIsMorphingFox(false);
      return;
    }

    setIsMorphingFox(true);
    setHasJustLanded(false);

    const targetEl = helperFoxContainerRef.current;
    const flyingEl = flyingFoxRef.current;

    if (!targetEl || !flyingEl) {
      setIsMorphingFox(false);
      onTransitionComplete?.();
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const { foxRect } = transitionOrigin;

    // Position the flying fox element directly over the target helper fox box
    flyingEl.style.top = `${targetRect.top}px`;
    flyingEl.style.left = `${targetRect.left}px`;
    flyingEl.style.width = `${targetRect.width}px`;
    flyingEl.style.height = `${targetRect.height}px`;

    // Calculate center-to-center translation from target back to the big Fox on the cover
    const startCx = foxRect.left + foxRect.width / 2;
    const startCy = foxRect.top + foxRect.height / 2;
    const endCx = targetRect.left + targetRect.width / 2;
    const endCy = targetRect.top + targetRect.height / 2;

    const dx = startCx - endCx;
    const dy = startCy - endCy;

    const bigFoxDiameter = Math.max(foxRect.width, foxRect.height) * 1.18;
    const targetDiameter = Math.max(targetRect.width, 96);
    const startScale = Math.max(1.5, Math.min(2.25, bigFoxDiameter / targetDiameter));

    // 2. Animate the Big Fox popping out from the cover stall and shrinking into the Helper Fox
    let foxAnim: Animation | null = null;
    if (typeof flyingEl.animate === 'function') {
      foxAnim = flyingEl.animate(
        [
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${startScale * 0.88}) rotate(-6deg)`,
            opacity: 0.4,
            offset: 0,
          },
          {
            transform: `translate3d(${dx * 0.86}px, ${dy * 0.86 - 30}px, 0) scale(${startScale * 1.1}) rotate(-10deg)`,
            opacity: 1,
            offset: 0.24,
          },
          {
            transform: `translate3d(${dx * 0.32}px, ${dy * 0.22 - 36}px, 0) scale(${1 + (startScale - 1) * 0.4}) rotate(7deg)`,
            opacity: 1,
            offset: 0.65,
          },
          {
            transform: `translate3d(${dx * 0.04}px, -5px, 0) scale(0.96) rotate(-2deg)`,
            opacity: 1,
            offset: 0.9,
          },
          {
            transform: 'translate3d(0px, 0px, 0) scale(1) rotate(0deg)',
            opacity: 1,
            offset: 1,
          },
        ],
        {
          duration: 1180,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );
    }

    let finished = false;
    const finishTransition = () => {
      if (finished) return;
      finished = true;
      setIsMorphingFox(false);
      setHasJustLanded(true);
      onTransitionComplete?.();
    };

    if (foxAnim) {
      foxAnim.onfinish = finishTransition;
    }

    const fallbackTimer = window.setTimeout(finishTransition, 1240);

    return () => {
      window.clearTimeout(fallbackTimer);
      foxAnim?.cancel();
    };
  }, [transitionOrigin, onTransitionComplete]);

  // 3-second peek/flip all takoyaki balls state with Chef Fox helper
  const [isAllFlipped, setIsAllFlipped] = React.useState(false);
  const [countdown, setCountdown] = React.useState(3);
  const flipTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const stopFlipAll = React.useCallback(() => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsAllFlipped(false);
    setCountdown(3);
    playTakoyakiSizzle();
  }, []);

  const startFlipAll = React.useCallback(() => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    playTakoyakiSizzle();
    setIsAllFlipped(true);
    setCountdown(3);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    flipTimerRef.current = setTimeout(() => {
      stopFlipAll();
    }, 3000);
  }, [stopFlipAll]);

  const toggleFlipAll = () => {
    if (isAllFlipped) {
      stopFlipAll();
    } else {
      startFlipAll();
    }
  };

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleBallClick = (char: TakoyakiCharacter) => {
    const isTouchDevice =
      lastPointerTypeRef.current === 'touch' ||
      lastPointerTypeRef.current === 'pen' ||
      (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches);

    if (isTouchDevice && revealedId !== char.id && !isAllFlipped) {
      playTakoyakiSizzle();
      setRevealedId(char.id);
      return;
    }
    onSelectCharacter(char);
  };

  // 12 wells (4 columns x 3 rows) per cooking tray
  const originalSlotCount = Math.max(12, Math.ceil(originalCharacters.length / 4) * 4);
  const originalSlots = Array.from(
    { length: originalSlotCount },
    (_, index) => originalCharacters[index] || null
  );

  const spicySlotCount = Math.max(12, Math.ceil(spicyCharacters.length / 4) * 4);
  const spicySlots = Array.from(
    { length: spicySlotCount },
    (_, index) => spicyCharacters[index] || null
  );

  return (
    <div className="max-w-[1320px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-12 relative">
      {/* =================================================================== */}
      {/* SMOOTH MORPH OVERLAY: WELCOME COVER DISSOLVE + BIG FOX SHRINKING    */}
      {/* =================================================================== */}
      {isMorphingFox && transitionOrigin && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {/* Warm Steam / Golden Puff Ring at Big Fox Launch Point */}
          <div
            style={{
              position: 'fixed',
              top: transitionOrigin.foxRect.top + transitionOrigin.foxRect.height / 2,
              left: transitionOrigin.foxRect.left + transitionOrigin.foxRect.width / 2,
              width: Math.max(transitionOrigin.foxRect.width, 130),
              height: Math.max(transitionOrigin.foxRect.height, 130),
              zIndex: 60,
            }}
            className="rounded-full border-4 border-[#FFE0B2] bg-[#FFF3E0]/55 shadow-[0_0_40px_rgba(229,124,41,0.6)] animate-fox-puff"
          />

          {/* Flying Big Fox Shrinking into the Helper Fox */}
          <div
            ref={flyingFoxRef}
            style={{
              position: 'fixed',
              willChange: 'transform, opacity',
              zIndex: 70,
            }}
            className="flex items-center justify-center"
          >
            <img
              src={assets.foxChef}
              onError={(e) => {
                if (e.currentTarget.src !== fallbacks.foxChef) {
                  e.currentTarget.src = fallbacks.foxChef;
                }
              }}
              alt="Đầu bếp Cáo Bel đang bay ra hỗ trợ"
              className="w-full h-full object-contain filter drop-shadow-[0_18px_28px_rgba(58,30,14,0.42)]"
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CHEF FOX HELPER (IN THE LIGHT BACKGROUND AREA ABOVE WOODEN BOARD)   */}
      {/* =================================================================== */}
      <div className="flex items-end justify-end mb-2 sm:mb-3 pr-2 sm:pr-4">
        <button
          type="button"
          onClick={toggleFlipAll}
          className="group relative flex items-center gap-3 sm:gap-4 cursor-pointer select-none focus:outline-none transition-all duration-200 hover:-translate-y-1 active:scale-95"
          title={isAllFlipped ? 'Bấm để úp bánh lại ngay nhe~' : 'Bấm vào Đầu bếp Cáo để lật bánh xem trong 3s nhe~'}
        >
          {/* Speech Bubble */}
          <div
            className={`relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl rounded-tr-xs shadow-md border-2 transition-all duration-300 ${
              isMorphingFox
                ? 'opacity-0 scale-75'
                : hasJustLanded
                ? 'animate-bubble-pop'
                : ''
            } ${
              isAllFlipped
                ? 'bg-[#FFF7ED] border-[#E57C29] text-[#9A3412] ring-2 ring-[#FED7AA]'
                : 'bg-[#FFFDF9] border-[#E6D6C1] group-hover:border-[#E57C29] text-[#432314]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-bold tracking-tight">
              {isAllFlipped ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E57C29] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E57C29]"></span>
                  </span>
                  <span>Đang lật nè~ ({countdown}s)</span>
                  <span className="text-[11px] sm:text-xs font-semibold bg-[#E57C29]/15 text-[#C84B31] px-2.5 py-0.5 rounded-full border border-[#E57C29]/30">
                    Úp lại
                  </span>
                </>
              ) : (
                <span className="leading-snug">
                  Đầu bếp hỗ trợ lật bánh cho bạn dễ lựa nhe~
                </span>
              )}
            </div>

            {/* Speech Bubble Tail pointing towards the Fox */}
            <div
              className={`absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] transition-colors duration-300 ${
                isAllFlipped ? 'border-l-[#E57C29]' : 'border-l-[#E6D6C1] group-hover:border-l-[#E57C29]'
              }`}
            />
            <div
              className={`absolute -right-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] transition-colors duration-300 ${
                isAllFlipped ? 'border-l-[#FFF7ED]' : 'border-l-[#FFFDF9]'
              }`}
            />
          </div>

          {/* Bigger Chef Fox Mascot Image */}
          <div
            ref={helperFoxContainerRef}
            className={`relative shrink-0 ${
              isMorphingFox ? 'opacity-0' : hasJustLanded ? 'animate-fox-land' : ''
            }`}
          >
            <img
              src={assets.foxChef}
              onError={(e) => {
                if (e.currentTarget.src !== fallbacks.foxChef) {
                  e.currentTarget.src = fallbacks.foxChef;
                }
              }}
              alt="Đầu bếp Cáo Bel"
              className={`w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 object-contain filter drop-shadow-lg transition-all duration-300 ${
                isAllFlipped
                  ? 'animate-bounce scale-110 -rotate-3'
                  : 'group-hover:scale-108 group-hover:rotate-3'
              }`}
            />

            {/* Countdown badge when active */}
            {isAllFlipped && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#E57C29] to-[#C84B31] text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                {countdown}s
              </span>
            )}
          </div>
        </button>
      </div>


      {/* =================================================================== */}
      {/* WOODEN COUNTER BOARD HOLDING ONLY THE TWO CAST-IRON TRAYS           */}
      {/* =================================================================== */}
      <div
        className="wood-board-surface animate-tray-board-enter rounded-[28px] sm:rounded-[32px] p-4 sm:p-7 md:p-9 border border-[#C6A175]"
        style={{
          boxShadow:
            'inset 0 2px 3px rgba(255, 250, 240, 0.55), inset 0 -10px 18px rgba(102, 68, 36, 0.22), 0 10px 0 #B68F62, 0 18px 34px rgba(58, 36, 18, 0.16)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 md:gap-8 items-start">
          {/* --------------------------------------------------------------- */}
          {/* TRAY 1: ORIGINAL FLAVOR                                         */}
          {/* --------------------------------------------------------------- */}
          <div className="flex flex-col items-center w-full relative">
            <div
              className="w-full rounded-[24px] sm:rounded-[26px] p-5 sm:p-6 md:p-7 relative"
              style={{
                background:
                  'linear-gradient(145deg, #5B4437 0%, #4D382C 48%, #412F24 100%)',
                boxShadow:
                  'inset 0 2px 2px rgba(255, 240, 225, 0.18), inset 0 -4px 10px rgba(20, 12, 7, 0.5), 0 11px 0 #312219, 0 20px 30px rgba(38, 22, 12, 0.35)',
                border: '1.5px solid #6B5142',
              }}
            >
              {/* Subtle Inner Cast-Iron Rim Groove */}
              <div
                className="pointer-events-none absolute inset-2.5 rounded-[18px] sm:rounded-[20px] border border-black/25"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                }}
              />

              {/* Hot Steam Rising Overlay (Like My Box) */}
              <svg
                viewBox="0 0 600 450"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute -inset-x-4 -top-12 bottom-0 w-[calc(100%+2rem)] h-[calc(100%+3rem)] z-10 overflow-visible"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <filter id="discoverSteamBlurOrig" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="20" />
                  </filter>
                </defs>
                <g className="pointer-events-none">
                  {/* Initial Warm Vapor Plumes Rising Upward */}
                  <g className="animate-steam-burst" style={{ animationDelay: '20ms' }}>
                    <ellipse cx="160" cy="310" rx="58" ry="38" fill="#FFFDF9" opacity="0.68" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="205" cy="260" rx="46" ry="32" fill="#FFFDF9" opacity="0.55" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                  <g className="animate-steam-burst" style={{ animationDelay: '110ms' }}>
                    <ellipse cx="300" cy="300" rx="72" ry="44" fill="#FFFDF9" opacity="0.72" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="275" cy="240" rx="54" ry="36" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                  <g className="animate-steam-burst" style={{ animationDelay: '200ms' }}>
                    <ellipse cx="440" cy="310" rx="58" ry="38" fill="#FFFDF9" opacity="0.68" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="405" cy="255" rx="46" ry="32" fill="#FFFDF9" opacity="0.55" filter="url(#discoverSteamBlurOrig)" />
                  </g>

                  {/* Continuous Gentle Misty Steam Floating Upward */}
                  <g className="animate-steam-ambient" style={{ animationDelay: '200ms' }}>
                    <ellipse cx="155" cy="320" rx="46" ry="32" fill="#FFFDF9" opacity="0.54" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="185" cy="255" rx="38" ry="26" fill="#FFFDF9" opacity="0.42" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '1100ms' }}>
                    <ellipse cx="265" cy="330" rx="52" ry="34" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="240" cy="260" rx="42" ry="28" fill="#FFFDF9" opacity="0.45" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '650ms' }}>
                    <ellipse cx="355" cy="325" rx="52" ry="34" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="385" cy="255" rx="42" ry="28" fill="#FFFDF9" opacity="0.45" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '1750ms' }}>
                    <ellipse cx="455" cy="320" rx="46" ry="32" fill="#FFFDF9" opacity="0.54" filter="url(#discoverSteamBlurOrig)" />
                    <ellipse cx="425" cy="260" rx="38" ry="26" fill="#FFFDF9" opacity="0.42" filter="url(#discoverSteamBlurOrig)" />
                  </g>
                </g>
              </svg>

              {/* Tray Header */}
              <div className="relative flex items-baseline justify-between gap-2 mb-5 px-1">
                <h2
                  className="font-display text-xl sm:text-2xl md:text-[26px] font-bold text-[#FFFDF9] tracking-tight whitespace-nowrap"
                  style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)' }}
                >
                  Vị truyền thống
                </h2>
              </div>

              {/* 4x3 Grid of Deep Cast-Iron Wells */}
              <div className="relative grid grid-cols-4 gap-3 sm:gap-4 md:gap-5 place-items-center py-1">
                {originalSlots.map((char, index) => {
                  if (!char) {
                    return (
                      <div
                        key={`orig-well-${index}`}
                        className="w-full aspect-square max-w-[88px] rounded-full p-[3px]"
                        style={{
                          background:
                            'linear-gradient(145deg, #3A291F 0%, #654C3E 100%)',
                          boxShadow:
                            '0 2px 3px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            background:
                              'radial-gradient(circle at 62% 65%, #37261D 0%, #271B14 55%, #170F0B 100%)',
                            boxShadow:
                              'inset 0 10px 16px rgba(0, 0, 0, 0.82), inset 0 3px 6px rgba(0, 0, 0, 0.65), inset 0 -3px 5px rgba(255, 225, 195, 0.09)',
                          }}
                        />
                      </div>
                    );
                  }

                  const isFav = favorites.includes(char.id);
                  const isRevealed = isAllFlipped || revealedId === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      data-takoyaki-ball-id={char.id}
                      onPointerDown={(e) => {
                        lastPointerTypeRef.current = e.pointerType;
                      }}
                      onMouseEnter={playTakoyakiSizzle}
                      onClick={() => handleBallClick(char)}
                      title={`${char.name} (Vị truyền thống)`}
                      className={`group relative z-20 w-full aspect-square max-w-[88px] rounded-full transition-all duration-200 hover:-translate-y-1.5 active:scale-90 cursor-pointer focus-visible:outline-none ${
                        isRevealed ? '-translate-y-1.5' : ''
                      }`}
                      style={{
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.52)',
                      }}
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#302119]">
                        {char.artwork ? (
                          <img
                            src={char.artwork.startsWith('data:') ? char.artwork : char.artwork + (char.artwork.includes('?') ? '&' : '?') + 't=' + (char.updatedAt ? new Date(char.updatedAt).getTime() : Date.now())}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-${char.imagePosition || 'center'} scale-95 group-hover:opacity-100 group-hover:scale-105 group-focus-visible:opacity-100 transition-all duration-300 ${
                              isRevealed ? 'opacity-100 scale-105' : 'opacity-0'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center font-display text-base sm:text-lg font-bold text-[#FFFDF9] group-hover:opacity-100 transition-opacity duration-300 ${
                              isRevealed ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {char.name.charAt(0)}
                          </div>
                        )}

                        {/* Takoyaki Ball Cover (visible by default, fades out on hover or 1st tap on mobile) */}
                        <TakoyakiBallCover
                          isSpicy={false}
                          seed={index + 1}
                          isRevealed={isRevealed}
                        />
                      </div>

                      {isFav && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#FFFDF9] text-[#C84B31] flex items-center justify-center shadow-sm">
                          <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                        </span>
                      )}

                      {/* Hover / Tap character name tooltip (hidden during flip-all) */}
                      {!isAllFlipped && (
                        <span
                          className={`pointer-events-none group-hover:opacity-100 transition-opacity absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#2A1A12] text-[#FFFDF9] text-[11px] font-medium whitespace-nowrap shadow-md z-30 ${
                            revealedId === char.id ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {char.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* TRAY 2: SPICY FLAVOR                                            */}
          {/* --------------------------------------------------------------- */}
          <div className="flex flex-col items-center w-full relative">
            <div
              className="w-full rounded-[24px] sm:rounded-[26px] p-5 sm:p-6 md:p-7 relative"
              style={{
                background:
                  'linear-gradient(145deg, #773128 0%, #66261E 48%, #541D17 100%)',
                boxShadow:
                  'inset 0 2px 2px rgba(255, 225, 215, 0.18), inset 0 -4px 10px rgba(28, 7, 5, 0.55), 0 11px 0 #3E140F, 0 20px 30px rgba(52, 14, 10, 0.35)',
                border: '1.5px solid #883B31',
              }}
            >
              {/* Subtle Inner Cast-Iron Rim Groove */}
              <div
                className="pointer-events-none absolute inset-2.5 rounded-[18px] sm:rounded-[20px] border border-black/25"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                }}
              />

              {/* Hot Steam Rising Overlay (Like My Box) */}
              <svg
                viewBox="0 0 600 450"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute -inset-x-4 -top-12 bottom-0 w-[calc(100%+2rem)] h-[calc(100%+3rem)] z-10 overflow-visible"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <filter id="discoverSteamBlurSpicy" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="20" />
                  </filter>
                </defs>
                <g className="pointer-events-none">
                  {/* Initial Warm Vapor Plumes Rising Upward */}
                  <g className="animate-steam-burst" style={{ animationDelay: '60ms' }}>
                    <ellipse cx="165" cy="310" rx="58" ry="38" fill="#FFFDF9" opacity="0.68" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="210" cy="260" rx="46" ry="32" fill="#FFFDF9" opacity="0.55" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                  <g className="animate-steam-burst" style={{ animationDelay: '150ms' }}>
                    <ellipse cx="305" cy="300" rx="72" ry="44" fill="#FFFDF9" opacity="0.72" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="280" cy="240" rx="54" ry="36" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                  <g className="animate-steam-burst" style={{ animationDelay: '240ms' }}>
                    <ellipse cx="445" cy="310" rx="58" ry="38" fill="#FFFDF9" opacity="0.68" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="410" cy="255" rx="46" ry="32" fill="#FFFDF9" opacity="0.55" filter="url(#discoverSteamBlurSpicy)" />
                  </g>

                  {/* Continuous Gentle Misty Steam Floating Upward */}
                  <g className="animate-steam-ambient" style={{ animationDelay: '450ms' }}>
                    <ellipse cx="160" cy="320" rx="46" ry="32" fill="#FFFDF9" opacity="0.54" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="190" cy="255" rx="38" ry="26" fill="#FFFDF9" opacity="0.42" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '1350ms' }}>
                    <ellipse cx="270" cy="330" rx="52" ry="34" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="245" cy="260" rx="42" ry="28" fill="#FFFDF9" opacity="0.45" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '850ms' }}>
                    <ellipse cx="360" cy="325" rx="52" ry="34" fill="#FFFDF9" opacity="0.58" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="390" cy="255" rx="42" ry="28" fill="#FFFDF9" opacity="0.45" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                  <g className="animate-steam-ambient" style={{ animationDelay: '1950ms' }}>
                    <ellipse cx="450" cy="320" rx="46" ry="32" fill="#FFFDF9" opacity="0.54" filter="url(#discoverSteamBlurSpicy)" />
                    <ellipse cx="420" cy="260" rx="38" ry="26" fill="#FFFDF9" opacity="0.42" filter="url(#discoverSteamBlurSpicy)" />
                  </g>
                </g>
              </svg>

              {/* Tray Header */}
              <div className="relative flex items-center justify-between gap-2 mb-5 px-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2
                    className="font-display text-xl sm:text-2xl md:text-[26px] font-bold text-[#FFFDF9] tracking-tight whitespace-nowrap"
                    style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)' }}
                  >
                    Vị cay tê
                  </h2>
                  {/* White Chili Pepper Icon */}
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFFDF9] shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.5 4.5c-1.2 0-2.2.6-2.8 1.5-.9-.2-1.9-.2-2.9.2-2.6 1-4.8 3.6-6.6 6.8-1.5 2.7-2.7 5.5-3.2 7.2-.2.6.4 1.1 1 .9 1.7-.5 4.5-1.7 7.2-3.2 3.2-1.8 5.8-4 6.8-6.6.4-1 .4-2 .2-2.9.9-.6 1.5-1.6 1.5-2.8 0-.6-.5-1.1-1.2-1.1z" />
                  </svg>
                </div>

                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-[#FFFDF9] text-[#7D291E] text-[11px] sm:text-xs font-bold tracking-wide whitespace-nowrap shadow-xs">
                  18+ NSFW
                </span>
              </div>

              {/* 4x3 Grid of Deep Cast-Iron Wells */}
              <div className="relative grid grid-cols-4 gap-3 sm:gap-4 md:gap-5 place-items-center py-1">
                {spicySlots.map((char, index) => {
                  if (!char) {
                    return (
                      <div
                        key={`spicy-well-${index}`}
                        className="w-full aspect-square max-w-[88px] rounded-full p-[3px]"
                        style={{
                          background:
                            'linear-gradient(145deg, #431812 0%, #7C352B 100%)',
                          boxShadow:
                            '0 2px 3px rgba(0, 0, 0, 0.38), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            background:
                              'radial-gradient(circle at 62% 65%, #411E18 0%, #2D1410 55%, #1A0B08 100%)',
                            boxShadow:
                              'inset 0 10px 16px rgba(0, 0, 0, 0.84), inset 0 3px 6px rgba(0, 0, 0, 0.65), inset 0 -3px 5px rgba(255, 210, 195, 0.09)',
                          }}
                        />
                      </div>
                    );
                  }

                  const isFav = favorites.includes(char.id);
                  const isRevealed = isAllFlipped || revealedId === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      data-takoyaki-ball-id={char.id}
                      onPointerDown={(e) => {
                        lastPointerTypeRef.current = e.pointerType;
                      }}
                      onMouseEnter={playTakoyakiSizzle}
                      onClick={() => handleBallClick(char)}
                      title={`${char.name} (Vị cay tê)`}
                      className={`group relative z-20 w-full aspect-square max-w-[88px] rounded-full transition-all duration-200 hover:-translate-y-1.5 active:scale-90 cursor-pointer focus-visible:outline-none ${
                        isRevealed ? '-translate-y-1.5' : ''
                      }`}
                      style={{
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.55)',
                      }}
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#341D17]">
                        {char.artwork ? (
                          <img
                            src={char.artwork.startsWith('data:') ? char.artwork : char.artwork + (char.artwork.includes('?') ? '&' : '?') + 't=' + (char.updatedAt ? new Date(char.updatedAt).getTime() : Date.now())}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-${char.imagePosition || 'center'} scale-95 group-hover:opacity-100 group-hover:scale-105 group-focus-visible:opacity-100 transition-all duration-300 ${
                              isRevealed ? 'opacity-100 scale-105' : 'opacity-0'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center font-display text-base sm:text-lg font-bold text-[#FFFDF9] group-hover:opacity-100 transition-opacity duration-300 ${
                              isRevealed ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {char.name.charAt(0)}
                          </div>
                        )}

                        {/* Spicy Takoyaki Ball Cover (visible by default, fades out on hover or 1st tap on mobile) */}
                        <TakoyakiBallCover
                          isSpicy={true}
                          seed={index + 21}
                          isRevealed={isRevealed}
                        />
                      </div>

                      {isFav && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#FFFDF9] text-[#C83E2B] flex items-center justify-center shadow-sm">
                          <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                        </span>
                      )}

                      {/* Hover / Tap character name tooltip (hidden during flip-all) */}
                      {!isAllFlipped && (
                        <span
                          className={`pointer-events-none group-hover:opacity-100 transition-opacity absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#2A120E] text-[#FFFDF9] text-[11px] font-medium whitespace-nowrap shadow-md z-30 ${
                            revealedId === char.id ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {char.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
