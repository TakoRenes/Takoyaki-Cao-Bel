import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Sparkles, Heart, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FoxJumpscareProps {
  isOpen: boolean;
  onClose: () => void;
}

export function playFoxSqueak() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Comic boom impact
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(180, now);
    boomOsc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
    boomGain.gain.setValueAtTime(0.55, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 0.28);

    // 2. High-pitched squeaks ("ÉC! ÉC! ÉC~")
    playSingleSqueak(ctx, now + 0.04, 750, 1950, 900, 0.18, 0.45);
    playSingleSqueak(ctx, now + 0.24, 900, 2300, 1050, 0.22, 0.5);
    playSingleSqueak(ctx, now + 0.5, 1100, 1800, 1200, 0.16, 0.35);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

export function playRejectSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (err) {
    console.warn('Reject audio error:', err);
  }
}

/**
 * Synthesizes a joyful, high-pitched fox giggle / playful chirp ("tiếng éc éc vui vẻ của cáo"):
 * Light, rapid playful squeaks between 950Hz and 1750Hz that foxes make when happily petted.
 */
export function playHappyFoxSqueak() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;

    // A couple of light, cute, rapid chirps ("éc... éc!")
    playPlayfulChirp(ctx, now, 950, 1550, 1100, 0.08, 0.22);
    playPlayfulChirp(ctx, now + 0.1, 1150, 1750, 1300, 0.09, 0.25);
  } catch (err) {
    console.warn('Happy fox squeak error:', err);
  }
}

function playPlayfulChirp(
  ctx: AudioContext,
  startTime: number,
  startFreq: number,
  peakFreq: number,
  endFreq: number,
  duration: number,
  volume: number
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Pure sweet sine wave for gentle, cute vocal squeaks
    osc.type = 'sine';

    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, startTime + duration * 0.4);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(peakFreq, startTime);
    filter.Q.setValueAtTime(3.2, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // ignore
  }
}

export function playCalmCelebrationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.28);
      } catch {
        // ignore note errors
      }
    });
  } catch (err) {
    console.warn('Celebration audio error:', err);
  }
}

function playSingleSqueak(
  ctx: AudioContext,
  startTime: number,
  freqStart: number,
  freqPeak: number,
  freqEnd: number,
  duration: number,
  volume: number
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';

    const peakTime = startTime + duration * 0.35;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.linearRampToValueAtTime(freqPeak, peakTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freqPeak, startTime);
    filter.Q.setValueAtTime(5.5, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // ignore
  }
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  size: number;
  text?: string;
}

export const FoxJumpscare: React.FC<FoxJumpscareProps> = ({ isOpen, onClose }) => {
  const [isShaking, setIsShaking] = useState(false);
  const [petProgress, setPetProgress] = useState(0); // 0 to 100
  const [isCalmedDown, setIsCalmedDown] = useState(false);
  const [isPurring, setIsPurring] = useState(false);
  const [rejectShake, setRejectShake] = useState(false);
  const [rejectNotice, setRejectNotice] = useState<string | null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const lastPetTimeRef = useRef<number>(0);
  const lastPurrTimeRef = useRef<number>(0);
  const purrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCalmedDownRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  isCalmedDownRef.current = isCalmedDown;

  // IMPORTANT: Reset ONLY when isOpen changes (never include isCalmedDown here!)
  useEffect(() => {
    if (isOpen) {
      playFoxSqueak();
      setIsShaking(true);
      setPetProgress(0);
      setIsCalmedDown(false);
      setIsPurring(false);
      setRejectShake(false);
      setRejectNotice(null);
      setHearts([]);

      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key safely via ref
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCalmedDownRef.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // When progress reaches 100%, trigger calm down celebration
  useEffect(() => {
    if (petProgress >= 100 && !isCalmedDown) {
      setIsCalmedDown(true);
      setIsPurring(false);
      setRejectNotice(null);
      playCalmCelebrationSound();
    }
  }, [petProgress, isCalmedDown]);

  // Petting progress adder - tuned so it takes ~3.5 to 4 seconds of continuous petting on the head
  const addPetProgress = useCallback(
    (amount: number, clientX?: number, clientY?: number) => {
      if (isCalmedDown) return;

      const now = Date.now();
      if (now - lastPetTimeRef.current < 45) return;
      lastPetTimeRef.current = now;

      // Add a floating heart or cute purr cue near cursor
      if (cardRef.current && clientX !== undefined && clientY !== undefined) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const foxCues = ['❤️', 'éc éc~ 🦊', '❤️', 'keke~ ✨', '❤️', 'éc éc! 🍡'];
        const text = foxCues[Math.floor(Math.random() * foxCues.length)];

        setHearts((prev) => [
          ...prev.slice(-8),
          {
            id: now + Math.random(),
            x: x + (Math.random() * 20 - 10),
            y: y + (Math.random() * 20 - 10),
            size: text.length > 2 ? 13 : Math.floor(Math.random() * 8) + 14,
            text,
          },
        ]);
      }

      setPetProgress((prev) => Math.min(100, prev + amount));
    },
    [isCalmedDown]
  );

  // ONLY called when moving over the fox head & ears hotspot!
  const handleHeadPetMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    let clientX: number | undefined;
    let clientY: number | undefined;

    if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    // Play cheerful baby fox squeaks ("tiếng éc éc vui vẻ của cáo") while petting the head!
    const now = Date.now();
    if (now - lastPurrTimeRef.current > 220) {
      lastPurrTimeRef.current = now;
      playHappyFoxSqueak();
      setIsPurring(true);
      if (purrTimeoutRef.current) clearTimeout(purrTimeoutRef.current);
      purrTimeoutRef.current = setTimeout(() => setIsPurring(false), 400);
    }

    // ~1.25% per 45ms => ~80 movement updates (~3.6 seconds) of continuous petting
    addPetProgress(1.25, clientX, clientY);
  };

  // Close button click handler (Red = Rejected, Green = Close allowed!)
  const handleCloseClick = () => {
    if (!isCalmedDown) {
      playRejectSound();
      setRejectShake(true);
      setRejectNotice('Chưa xoa đầu Cáo Bel nguôi giận nên chưa bấm được đâu nha! 🦊');
      setTimeout(() => setRejectShake(false), 450);
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cáo Bel Jumpscare"
      onClick={() => {
        // Clicking outside closes only if Cáo has calmed down
        if (isCalmedDown) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#140804]/92 backdrop-blur-md select-none overflow-hidden animate-fade-in"
    >
      {/* Background vignette & ambient lighting */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
          isCalmedDown
            ? 'bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.35)_0%,rgba(67,35,20,0.65)_60%,rgba(20,8,4,0.95)_100%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(229,124,41,0.4)_0%,rgba(67,35,20,0.85)_50%,rgba(20,8,4,0.98)_100%)] animate-pulse'
        }`}
      />

      {/* Main Jumpscare Card Container */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex flex-col items-center text-center max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-[#FAF5EB] border-4 transition-all duration-300 shadow-[0_0_60px_rgba(200,75,49,0.65)] ${
          isCalmedDown
            ? 'border-[#22C55E] shadow-[0_0_70px_rgba(34,197,94,0.65)] scale-100'
            : 'border-[#C84B31]'
        } ${
          isShaking
            ? 'animate-[jumpscareBoom_0.35s_cubic-bezier(0.175,0.885,0.32,1.275)_both]'
            : ''
        }`}
      >
        {/* ================================================================= */}
        {/* THE CORNER [X] BUTTON: RED INITIALLY -> TURNS GREEN WHEN CALMED!  */}
        {/* ================================================================= */}
        <div className="absolute -top-4 -right-4 z-50">
          <button
            type="button"
            onClick={handleCloseClick}
            aria-label={isCalmedDown ? 'Tắt cảnh báo' : 'Nút tắt bị khóa'}
            title={
              isCalmedDown
                ? 'Cáo Bel hết giựn rồi, bấm vào đây để tắt nè! 💚'
                : 'Chưa xoa đầu Cáo Bel nên chưa bấm được đâu nha! 🚫'
            }
            className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-xl ${
              isCalmedDown
                ? 'bg-[#16A34A] hover:bg-[#15803D] text-white ring-4 ring-[#86EFAC] scale-110 shadow-[0_0_20px_rgba(34,197,94,0.7)]'
                : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white ring-4 ring-[#FECACA] active:scale-90 opacity-90'
            } ${rejectShake ? 'animate-[buttonWiggle_0.35s_ease-in-out]' : ''}`}
          >
            <X className="w-6 h-6 stroke-[3.5]" />
          </button>
        </div>

        {/* Floating Hearts & Purr Sound Cues */}
        {hearts.map((h) => (
          <div
            key={h.id}
            style={{
              left: `${h.x}px`,
              top: `${h.y}px`,
              fontSize: `${h.size}px`,
            }}
            className="absolute pointer-events-none z-30 animate-[floatUp_0.8s_ease-out_forwards] font-bold text-[#E57C29] whitespace-nowrap drop-shadow-xs select-none"
          >
            {h.text || '❤️'}
          </div>
        ))}

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase mb-3 shadow-xs transition-colors duration-300 ${
            isCalmedDown
              ? 'bg-[#DCFCE7] border border-[#86EFAC] text-[#166534]'
              : 'bg-[#FFE8E2] border border-[#FF8A65] text-[#C84B31] animate-bounce'
          }`}
        >
          {isCalmedDown ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>🌸 CÁO BEL ĐÃ HẾT GIỰN! 🌸</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#E57C29]" />
              <span>CẢNH BÁO TỪ CÁO BEL</span>
            </>
          )}
        </div>

        {/* REJECT ALERT POPUP IF USER CLICKS RED [X] */}
        {rejectNotice && (
          <div className="w-full mb-3 py-1.5 px-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 animate-bounce">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{rejectNotice}</span>
          </div>
        )}

        {/* THE TAKOYAKI FOX MASCOT */}
        <div className="relative my-2 w-64 sm:w-80 h-44 sm:h-52 flex items-center justify-center select-none">
          {/* DEDICATED HEAD & EARS PETTING HOTSPOT (INVISIBLE FUNCTIONAL HITBOX) */}
          {!isCalmedDown && (
            <div
              onMouseMove={handleHeadPetMove}
              onTouchMove={handleHeadPetMove}
              className="absolute top-[4%] left-[28%] w-[44%] h-[54%] z-30 rounded-full cursor-grab active:cursor-grabbing touch-none"
              title="Xoa đỉnh đầu Cáo Bel (nghe tiếng éc éc vui vẻ nè!)"
            />
          )}

          {/* Halo Glow */}
          <div
            className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
              isCalmedDown
                ? 'bg-[#22C55E]/25 scale-125 animate-pulse'
                : isPurring
                ? 'bg-[#F59E0B]/30 scale-125 animate-pulse'
                : 'bg-[#FF7043]/20 scale-125 animate-ping'
            }`}
          />

          {/* FOX IMAGE */}
          <img
            src="/assets/aistudio/download__1__a6655be3.png"
            alt="Cáo Bel Takoyaki"
            className={`relative z-10 w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(67,35,20,0.5)] transition-all ${
              isCalmedDown
                ? 'animate-[happyBounce_0.6s_infinite_alternate_ease-in-out] scale-110'
                : isPurring
                ? 'scale-106 animate-[purrVibrate_0.15s_infinite_alternate]'
                : petProgress > 0
                ? 'scale-105 rotate-1 animate-[petWiggle_0.25s_infinite_alternate]'
                : 'hover:scale-105'
            }`}
          />
        </div>

        {/* PROGRESS / PETTING METER */}
        <div className="w-full max-w-xs mx-auto mb-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#846C5B] mb-1">
            <span className="flex items-center gap-1">
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isCalmedDown ? 'text-[#16A34A] fill-[#16A34A]' : 'text-[#E57C29] fill-[#E57C29]'
                }`}
              />
              {isCalmedDown ? 'Độ nguôi giận: Hoàn thành!' : 'Độ nguôi giận của Cáo:'}
            </span>
            <span
              className={`font-black ${isCalmedDown ? 'text-[#16A34A]' : 'text-[#C84B31]'}`}
            >
              {Math.round(petProgress)}%
            </span>
          </div>
          <div className="w-full h-3 bg-[#EBDDC8] rounded-full overflow-hidden p-0.5 border border-[#D4A373]">
            <div
              style={{ width: `${petProgress}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isCalmedDown
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]'
                  : 'bg-gradient-to-r from-[#E57C29] via-[#F59E0B] to-[#C84B31]'
              }`}
            />
          </div>
        </div>

        {/* MAIN TEXT */}
        <div className="space-y-2">
          {isCalmedDown ? (
            <h2 className="font-display text-base sm:text-lg md:text-xl font-black text-[#15803D] leading-snug tracking-tight drop-shadow-xs px-1">
              HÌ HÌ BỤNG TUI BEL THÌ BÀ CŨNG PHẢI BEL GIỐNG TUI NHA~ BẤM X LỰA TAKOYAKI LIỀN ĐUY! ĐỪNG CÓ CHỌC BỤNG TUÔI NỮA ĐÓ!! THIỆC RA CHỌC RÙI CHO TUI XIN CÁI XOA ĐẦU CŨM ĐƯỢT...:3
            </h2>
          ) : (
            <>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black text-[#C84B31] leading-tight tracking-tight drop-shadow-xs">
                AI CHO CHỌC BỤNG TUI HẢ?! BÀ CHÊ TUI BEL PHẢI HONG?!
              </h2>
              <div className="py-1">
                <p className="text-sm sm:text-base font-bold text-[#B45309] animate-pulse">
                  Di chuột qua lại trên đỉnh đầu Cáo Bel để Cáo hết giựn!!
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes jumpscareBoom {
          0% {
            transform: scale(0.1) rotate(-15deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(6deg);
            opacity: 1;
          }
          75% {
            transform: scale(0.95) rotate(-3deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes happyBounce {
          0% {
            transform: translateY(0) scale(1.05) rotate(-3deg);
          }
          100% {
            transform: translateY(-16px) scale(1.12) rotate(3deg);
          }
        }

        @keyframes petWiggle {
          0% {
            transform: scale(1.03) rotate(-3deg);
          }
          100% {
            transform: scale(1.07) rotate(3deg);
          }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 1;
          }
          100% {
            transform: translateY(-45px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes purrVibrate {
          0% {
            transform: scale(1.05) translate(0, 0) rotate(-0.5deg);
          }
          50% {
            transform: scale(1.06) translate(1px, -1px) rotate(0.5deg);
          }
          100% {
            transform: scale(1.05) translate(-1px, 0.5px) rotate(-0.5deg);
          }
        }

        @keyframes buttonWiggle {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px) rotate(-6deg); }
          40%, 80% { transform: translateX(6px) rotate(6deg); }
        }
      `}</style>
    </div>
  );
};
