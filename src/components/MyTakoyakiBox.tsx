import React, { useState } from 'react';
import { TakoyakiCharacter } from '../types';
import { X, Compass, PackageOpen, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { playPaperBoxOpenSound } from '../utils/sizzleSound';
import { TakoyakiBallCover } from './TakoyakiStallHero';

const BOX_CAPACITY = 3;

interface MyTakoyakiBoxProps {
  characters: TakoyakiCharacter[];
  onSelectCharacter: (character: TakoyakiCharacter) => void;
  onPlayCharacter: (character: TakoyakiCharacter) => void;
  onRemoveFavorite: (id: string) => void;
  onGoToTrays: () => void;
}

export const MyTakoyakiBox: React.FC<MyTakoyakiBoxProps> = ({
  characters,
  onSelectCharacter,
  onRemoveFavorite,
  onGoToTrays,
}) => {
  // Always start closed when switching to My Box
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isGameOpen, setIsGameOpen] = useState<boolean>(false);
  const [steamTriggerCount, setSteamTriggerCount] = useState<number>(0);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [currentBoxIndex, setCurrentBoxIndex] = useState<number>(0);
  const lastPointerTypeRef = React.useRef<string>('mouse');

  const totalBoxes = Math.max(1, Math.ceil(characters.length / BOX_CAPACITY));
  const activeBoxIndex = Math.min(currentBoxIndex, Math.max(0, totalBoxes - 1));
  const activeBoxCharacters = characters.slice(
    activeBoxIndex * BOX_CAPACITY,
    (activeBoxIndex + 1) * BOX_CAPACITY
  );

  const handlePrevBox = () => {
    if (activeBoxIndex > 0) {
      setCurrentBoxIndex(activeBoxIndex - 1);
      setRevealedId(null);
    }
  };

  const handleNextBox = () => {
    if (activeBoxIndex < totalBoxes - 1) {
      setCurrentBoxIndex(activeBoxIndex + 1);
      setRevealedId(null);
    }
  };

  const handleBallClick = (char: TakoyakiCharacter) => {
    const isTouchDevice =
      lastPointerTypeRef.current === 'touch' ||
      lastPointerTypeRef.current === 'pen' ||
      (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches);

    if (isTouchDevice && revealedId !== char.id) {
      setRevealedId(char.id);
      return;
    }
    onSelectCharacter(char);
  };

  const handleOpenBox = () => {
    playPaperBoxOpenSound();
    setIsOpen(true);
    setSteamTriggerCount((c) => c + 1);
  };

  const handleCloseBox = () => {
    setIsOpen(false);
  };

  const handleToggleBox = () => {
    if (isOpen) {
      handleCloseBox();
    } else {
      handleOpenBox();
    }
  };

  return (
    <section className="max-w-[1080px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Header Title, Open/Close Lid Toggle Button & Box Switcher */}
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-4">
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[#432314] tracking-tight mb-2 sm:whitespace-nowrap">
          Hộp đựng những viên takoyaki yêu thích nhất của&nbsp;bạn
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
          <button
            type="button"
            onClick={handleToggleBox}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EFE4D2] hover:bg-[#E5D5BC] border border-[#D4B68F] text-[#432314] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            {isOpen ? (
              <>
                <Package className="w-3.5 h-3.5 text-[#8A4B38]" />
                <span>Close Box Lid (Đóng nắp hộp)</span>
              </>
            ) : (
              <>
                <PackageOpen className="w-3.5 h-3.5 text-[#E57C29]" />
                <span>Open Box Lid (Mở nắp hộp)</span>
              </>
            )}
          </button>
        </div>

        {/* Box Switcher (When there are more than 6 pieces, creating multiple boxes) */}
        {totalBoxes > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              type="button"
              onClick={handlePrevBox}
              disabled={activeBoxIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF3E6] hover:bg-[#F2E5D3] disabled:opacity-35 disabled:cursor-not-allowed border border-[#D4B68F] text-[#432314] text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
              aria-label="Previous box"
            >
              <ChevronLeft className="w-4 h-4 text-[#8C6239]" />
              <span className="hidden xs:inline">Hộp trước</span>
            </button>

            {/* Box Tabs / Quick Selectors */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#EDE1CD]/70 border border-[#D4B68F]">
              {Array.from({ length: totalBoxes }).map((_, idx) => {
                const countInThisBox = characters.slice(
                  idx * BOX_CAPACITY,
                  (idx + 1) * BOX_CAPACITY
                ).length;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentBoxIndex(idx);
                      setRevealedId(null);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeBoxIndex === idx
                        ? 'bg-[#B84A32] text-white shadow-xs scale-105'
                        : 'text-[#63422D] hover:bg-[#F8EFE4]'
                    }`}
                  >
                    Hộp {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextBox}
              disabled={activeBoxIndex === totalBoxes - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF3E6] hover:bg-[#F2E5D3] disabled:opacity-35 disabled:cursor-not-allowed border border-[#D4B68F] text-[#432314] text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
              aria-label="Next box"
            >
              <span className="hidden xs:inline">Hộp tiếp theo</span>
              <ChevronRight className="w-4 h-4 text-[#8C6239]" />
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE OPEN/CLOSE FOLDED KRAFT-PAPER CLAMSHELL TAKEAWAY BOX    */}
      {/* =================================================================== */}
      <div className="relative w-full max-w-[920px] mx-auto select-none overflow-hidden px-0 sm:px-2">
        {/* Floating Side Arrows for Fast Box Switching when > 6 pieces */}
        {totalBoxes > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevBox}
              disabled={activeBoxIndex === 0}
              title="Hộp trước"
              aria-label="Hộp trước"
              className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FAF3E6]/95 hover:bg-[#FFFDF9] disabled:opacity-0 disabled:pointer-events-none border border-[#C5A680] text-[#5C3724] shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextBox}
              disabled={activeBoxIndex === totalBoxes - 1}
              title="Hộp tiếp theo"
              aria-label="Hộp tiếp theo"
              className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FAF3E6]/95 hover:bg-[#FFFDF9] disabled:opacity-0 disabled:pointer-events-none border border-[#C5A680] text-[#5C3724] shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        {/* Slightly zoom the box horizontally on narrow mobile screens so the paper tray fills the screen width */}
        <div className="relative w-[118%] -left-[9%] sm:w-full sm:left-0 aspect-[1000/670]">
          {/* --------------------------------------------------------------- */}
          {/* LAYER 1: BASE TRAY & OPEN LID (When Box is Open)                */}
          {/* --------------------------------------------------------------- */}
          <svg
            viewBox="0 0 1000 670"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full block"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Subtle Matte Kraft Paper Fiber Filter */}
              <filter id="kraftPaperGrain" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.65"
                  numOctaves="3"
                  stitchTiles="stitch"
                  result="noise"
                />
                <feColorMatrix
                  type="matrix"
                  values="1 0 0 0 0.92
                          0 1 0 0 0.84
                          0 0 1 0 0.72
                          0 0 0 0.045 0"
                  in="noise"
                  result="tintedNoise"
                />
                <feComposite operator="in" in="tintedNoise" in2="SourceGraphic" result="grain" />
                <feBlend mode="multiply" in="SourceGraphic" in2="grain" />
              </filter>

              {/* Soft Table Contact Shadow */}
              <filter id="softContactShadow" x="-10%" y="-10%" width="120%" height="125%">
                <feGaussianBlur stdDeviation="16" />
              </filter>

              {/* Soft Vapor Mist Blur Filter */}
              <filter id="steamMistBlur" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="22" />
              </filter>

              <linearGradient id="lidInnerPaper" x1="500" y1="45" x2="500" y2="285" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F5E9D6" />
                <stop offset="75%" stopColor="#EEDBC0" />
                <stop offset="100%" stopColor="#E2CAA8" />
              </linearGradient>

              <linearGradient id="lidSideFlapLeft" x1="150" y1="80" x2="215" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E8D2B3" />
                <stop offset="100%" stopColor="#DBC09D" />
              </linearGradient>

              <linearGradient id="lidSideFlapRight" x1="850" y1="80" x2="785" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E8D2B3" />
                <stop offset="100%" stopColor="#DBC09D" />
              </linearGradient>

              <linearGradient id="trayBottomFloor" x1="500" y1="298" x2="500" y2="555" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EAD6B8" />
                <stop offset="25%" stopColor="#F2E2C9" />
                <stop offset="100%" stopColor="#F6E9D5" />
              </linearGradient>

              <linearGradient id="trayBackWall" x1="500" y1="280" x2="500" y2="328" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#D6B994" />
                <stop offset="100%" stopColor="#E2C8A6" />
              </linearGradient>

              <linearGradient id="trayLeftWall" x1="115" y1="440" x2="215" y2="440" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EFE0C6" />
                <stop offset="100%" stopColor="#DFC4A0" />
              </linearGradient>

              <linearGradient id="trayRightWall" x1="885" y1="440" x2="785" y2="440" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E6D0B0" />
                <stop offset="100%" stopColor="#D9BC96" />
              </linearGradient>

              <linearGradient id="trayFrontWall" x1="500" y1="540" x2="500" y2="625" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E8D2B2" />
                <stop offset="100%" stopColor="#D7B992" />
              </linearGradient>

              <linearGradient id="closedLidTop" x1="500" y1="265" x2="500" y2="565" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EED9BA" />
                <stop offset="60%" stopColor="#E6CCA8" />
                <stop offset="100%" stopColor="#D9B990" />
              </linearGradient>
            </defs>

            {/* 1. SOFT AMBIENT TABLE CONTACT SHADOWS */}
            <path
              d="M 165 340 L 835 340 L 885 605 Q 500 622 115 605 Z"
              fill="#6E492D"
              opacity="0.16"
              filter="url(#softContactShadow)"
            />
            <path
              d="M 145 585 Q 500 605 855 585 L 840 628 Q 500 645 160 628 Z"
              fill="#4A2E1B"
              opacity="0.2"
              filter="url(#softContactShadow)"
            />

            {/* 2. OPEN CARDBOARD LID (Tilts forward & hides smoothly when closed) */}
            <g
              onClick={handleCloseBox}
              className="cursor-pointer transition-all duration-500 ease-in-out"
              style={{
                transformOrigin: '500px 282px',
                transform: isOpen ? 'scaleY(1) translateY(0px)' : 'scaleY(0.05) translateY(12px)',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
              }}
            >
              <g filter="url(#kraftPaperGrain)">
                {/* Top Curved Lock Tab */}
                <path
                  d="M 380 54 L 402 22 Q 500 14 598 22 L 620 54 Z"
                  fill="#E6CEAD"
                  stroke="#C5A680"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M 384 53 Q 500 49 616 53"
                  stroke="#B8966D"
                  strokeWidth="1.2"
                  strokeDasharray="6 4"
                />
                <path d="M 402 36 L 418 38" stroke="#A6855E" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 598 36 L 582 38" stroke="#A6855E" strokeWidth="1.5" strokeLinecap="round" />

                {/* Left Folded Side Dust Flap */}
                <path
                  d="M 192 54 L 146 86 L 178 272 L 214 282 Z"
                  fill="url(#lidSideFlapLeft)"
                  stroke="#C2A37D"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M 192 54 L 178 272"
                  stroke="#B5936B"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.65"
                />

                {/* Right Folded Side Dust Flap */}
                <path
                  d="M 808 54 L 854 86 L 822 272 L 786 282 Z"
                  fill="url(#lidSideFlapRight)"
                  stroke="#C2A37D"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M 808 54 L 822 272"
                  stroke="#B5936B"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.65"
                />

                {/* Main Tilted Lid Inner Panel */}
                <path
                  d="M 192 54 Q 500 46 808 54 L 786 282 L 214 282 Z"
                  fill="url(#lidInnerPaper)"
                  stroke="#C2A37D"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                <line x1="214" y1="282" x2="192" y2="54" stroke="#B6946B" strokeWidth="1.4" />
                <line x1="786" y1="282" x2="808" y2="54" stroke="#B6946B" strokeWidth="1.4" />
                <path d="M 218 268 L 782 268" stroke="#CDB08A" strokeWidth="1" opacity="0.6" />
              </g>
            </g>

            {/* 3. FOLDED HINGE CREASE */}
            <path
              d="M 214 282 L 786 282 L 774 316 L 226 316 Z"
              fill="url(#trayBackWall)"
              stroke="#B8976F"
              strokeWidth="1.2"
            />
            <line
              x1="216"
              y1="283"
              x2="784"
              y2="283"
              stroke="#9E7C54"
              strokeWidth="1.4"
              strokeDasharray="8 5"
            />

            {/* 4. OPEN BOTTOM PAPER TRAY */}
            <g filter="url(#kraftPaperGrain)">
              <path
                d="M 226 316 L 774 316 L 816 552 L 184 552 Z"
                fill="url(#trayBottomFloor)"
                stroke="#C5A680"
                strokeWidth="1.4"
              />

              <line
                x1="205"
                y1="434"
                x2="795"
                y2="434"
                stroke="#DFC7A5"
                strokeWidth="1"
                strokeDasharray="10 6"
              />
              <line x1="226" y1="316" x2="265" y2="352" stroke="#D2B58E" strokeWidth="1.2" />
              <line x1="774" y1="316" x2="735" y2="352" stroke="#D2B58E" strokeWidth="1.2" />
              <line x1="184" y1="552" x2="235" y2="512" stroke="#D2B58E" strokeWidth="1.2" />
              <line x1="816" y1="552" x2="765" y2="512" stroke="#D2B58E" strokeWidth="1.2" />

              {/* Left Slanted Paper Side Wall */}
              <path
                d="M 164 292 L 226 316 L 184 552 L 112 562 Z"
                fill="url(#trayLeftWall)"
                stroke="#C2A27B"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M 164 292 L 214 282 L 226 316 Z"
                fill="#D4B68F"
                stroke="#B8966D"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 112 562 L 184 552 L 166 608 L 128 596 Z"
                fill="#DEC29E"
                stroke="#B8966D"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <line
                x1="112"
                y1="562"
                x2="195"
                y2="490"
                stroke="#C5A57E"
                strokeWidth="1.2"
                strokeDasharray="5 3"
              />

              {/* Right Slanted Paper Side Wall */}
              <path
                d="M 836 292 L 774 316 L 816 552 L 888 562 Z"
                fill="url(#trayRightWall)"
                stroke="#C2A27B"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M 836 292 L 786 282 L 774 316 Z"
                fill="#CFAF86"
                stroke="#B8966D"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 888 562 L 816 552 L 834 608 L 872 596 Z"
                fill="#D6B892"
                stroke="#B8966D"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <line
                x1="888"
                y1="562"
                x2="805"
                y2="490"
                stroke="#BE9D75"
                strokeWidth="1.2"
                strokeDasharray="5 3"
              />

              {/* Thin rolled paper top rims on left and right walls */}
              <path
                d="M 164 292 L 112 562 L 106 560 L 158 290 Z"
                fill="#F7EBD9"
                stroke="#C5A680"
                strokeWidth="1"
              />
              <path
                d="M 836 292 L 888 562 L 894 560 L 842 290 Z"
                fill="#F3E4CE"
                stroke="#C5A680"
                strokeWidth="1"
              />
            </g>

            {/* Empty Box Paper Floor Stamp (Only visible when box is open & empty) */}
            {characters.length === 0 && isOpen && (
              <g opacity="0.48">
                <circle
                  cx="500"
                  cy="434"
                  r="42"
                  stroke="#9C7A56"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                  fill="none"
                />
                <text
                  x="500"
                  y="431"
                  textAnchor="middle"
                  fill="#8C6947"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="2"
                >
                  空き箱
                </text>
                <text
                  x="500"
                  y="447"
                  textAnchor="middle"
                  fill="#9C7A56"
                  fontSize="9"
                  fontWeight="600"
                  letterSpacing="1.5"
                >
                  FOLDED PAPER TRAY
                </text>
              </g>
            )}
          </svg>

          {/* --------------------------------------------------------------- */}
          {/* LAYER 2: DYNAMIC SAVED TAKOYAKI CHARACTERS INSIDE THE PAPER BOX */}
          {/* --------------------------------------------------------------- */}
          <div
            className={`absolute inset-x-[18.5%] sm:inset-x-[22%] top-[46%] bottom-[17%] z-20 flex items-center justify-center transition-all duration-300 ${
              isOpen
                ? 'opacity-100 scale-100 pointer-events-auto delay-150'
                : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {activeBoxCharacters.length > 0 && (() => {
              const ballSizeClass = 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24';

              return (
                <div className="w-full h-full px-1 flex items-center justify-center overflow-visible">
                  <div className="w-full max-w-[92%] sm:max-w-[84%] grid grid-cols-3 gap-x-2 sm:gap-x-6 md:gap-x-8 items-start justify-items-center m-auto">
                    {activeBoxCharacters.map((char, idx) => {
                      const isRevealed = revealedId === char.id;

                      return (
                        <div
                          key={char.id}
                          className={`group relative hover:z-40 flex flex-col items-center w-full min-w-0 ${
                            isRevealed ? 'z-40' : 'z-10'
                          }`}
                        >
                          {/* Soft paper contact shadow directly beneath each takoyaki ball */}
                          <div
                            className="pointer-events-none absolute -bottom-0.5 w-7 sm:w-12 h-1.5 sm:h-2.5 rounded-full blur-xs opacity-35"
                            style={{ background: '#6E4526' }}
                          />

                          {/* Remove favorite button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFavorite(char.id);
                            }}
                            title="Remove from My Box"
                            aria-label={`Remove ${char.name} from My Box`}
                            className={`group-hover:opacity-100 focus:opacity-100 transition-opacity absolute -top-1 right-0.5 sm:right-2 z-30 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#FFFDF9] hover:bg-[#B84A32] text-[#5C3724] hover:text-white border border-[#C5A680] flex items-center justify-center shadow-xs cursor-pointer ${
                              isRevealed ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>

                          {/* Spicy indicator tag */}
                          {char.is_spicy && (
                            <span className="pointer-events-none absolute -top-1 left-0.5 sm:left-2 z-30 px-1 py-0 rounded-full bg-[#7D291E] text-[#FFFDF9] text-[6.5px] sm:text-[8px] font-bold tracking-wide shadow-2xs leading-tight">
                              18+
                            </span>
                          )}

                          {/* Takoyaki Ball with Uploaded Character Artwork (Reveals Character on Hover or 1st Tap) */}
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              lastPointerTypeRef.current = e.pointerType;
                            }}
                            onClick={() => handleBallClick(char)}
                            className={`relative ${ballSizeClass} shrink-0 rounded-full transition-transform duration-200 group-hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none ${
                              isRevealed ? '-translate-y-0.5' : ''
                            }`}
                            style={{
                              boxShadow: '0 4px 10px rgba(68, 38, 16, 0.36)',
                            }}
                          >
                            <div className="relative w-full h-full rounded-full overflow-hidden bg-[#302119]">
                              {char.artwork ? (
                                <img
                                  src={char.artwork.startsWith('data:') ? char.artwork : char.artwork + (char.artwork.includes('?') ? '&' : '?') + 't=' + (char.updatedAt ? new Date(char.updatedAt).getTime() : Date.now())}
                                  alt={char.name}
                                  referrerPolicy="no-referrer"
                                  style={{ objectPosition: char.imagePosition || 'center' }}
                                  className={`w-full h-full object-cover object-${char.imagePosition || 'center'} scale-95 group-hover:opacity-100 group-hover:scale-105 group-focus-visible:opacity-100 transition-all duration-300 ${
                                    isRevealed ? 'opacity-100 scale-105' : 'opacity-0'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center font-display text-xs sm:text-base font-bold text-[#FFFDF9] group-hover:opacity-100 transition-opacity duration-300 ${
                                    isRevealed ? 'opacity-100' : 'opacity-0'
                                  }`}
                                >
                                  {char.name.charAt(0)}
                                </div>
                              )}

                              <TakoyakiBallCover
                                isSpicy={Boolean(char.is_spicy)}
                                seed={idx + 11 + activeBoxIndex * 10}
                                isRevealed={isRevealed}
                              />
                            </div>
                          </button>

                          {/* Character Name Paper Tag */}
                          <span
                            className={`rounded-full group-hover:bg-[#432314] group-hover:text-[#FFFDF9] border border-[#D4B68F] font-display font-semibold transition-colors text-center whitespace-nowrap shadow-2xs leading-tight text-[7.5px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 mt-1.5 ${
                              isRevealed
                                ? 'bg-[#432314] text-[#FFFDF9]'
                                : 'bg-[#F7EBD9]/95 text-[#432314]'
                            }`}
                          >
                            {char.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* LAYER 3: FOREGROUND FRONT WALL & CLOSED LID COVER               */}
          {/* --------------------------------------------------------------- */}
          <svg
            viewBox="0 0 1000 670"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full block absolute inset-0 z-30 pointer-events-none"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Front Slanted Paper Wall */}
            <g filter="url(#kraftPaperGrain)">
              <path
                d="M 112 562 Q 500 568 888 562 L 856 616 Q 500 624 144 616 Z"
                fill="url(#trayFrontWall)"
                stroke="#B8966D"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              <path
                d="M 108 559 Q 500 565 892 559 L 888 564 Q 500 570 112 564 Z"
                fill="#F6E9D6"
                stroke="#C5A680"
                strokeWidth="1.1"
              />

              {/* Die-Cut Tab Slot in the Front Paper Wall */}
              <path
                d="M 442 586 Q 500 590 558 586"
                stroke="#7A5638"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 436 582 L 444 590 M 564 582 L 556 590"
                stroke="#9C7853"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <path
                d="M 144 616 L 195 563 L 222 618 Z"
                fill="#D2B38B"
                opacity="0.55"
              />
              <path
                d="M 856 616 L 805 563 L 778 618 Z"
                fill="#C9A87E"
                opacity="0.55"
              />
            </g>

            {/* ============================================================= */}
            {/* HOT STEAM RISING EFFECT (Soft misty vapor rising when opened) */}
            {/* ============================================================= */}
            {isOpen && (
              <g key={`steam-${steamTriggerCount}`} className="pointer-events-none">
                {/* Initial Warm Vapor Plumes Rising Upward when Lid Opens */}
                <g className="animate-steam-burst" style={{ animationDelay: '20ms' }}>
                  <ellipse cx="330" cy="435" rx="68" ry="44" fill="#FFFDF9" opacity="0.78" filter="url(#steamMistBlur)" />
                  <ellipse cx="375" cy="390" rx="54" ry="38" fill="#FFFDF9" opacity="0.65" filter="url(#steamMistBlur)" />
                  <ellipse cx="315" cy="345" rx="46" ry="34" fill="#FFFDF9" opacity="0.52" filter="url(#steamMistBlur)" />
                </g>

                <g className="animate-steam-burst" style={{ animationDelay: '90ms' }}>
                  <ellipse cx="500" cy="430" rx="88" ry="52" fill="#FFFDF9" opacity="0.82" filter="url(#steamMistBlur)" />
                  <ellipse cx="465" cy="375" rx="66" ry="44" fill="#FFFDF9" opacity="0.68" filter="url(#steamMistBlur)" />
                  <ellipse cx="535" cy="335" rx="58" ry="40" fill="#FFFDF9" opacity="0.56" filter="url(#steamMistBlur)" />
                </g>

                <g className="animate-steam-burst" style={{ animationDelay: '180ms' }}>
                  <ellipse cx="665" cy="435" rx="68" ry="44" fill="#FFFDF9" opacity="0.78" filter="url(#steamMistBlur)" />
                  <ellipse cx="625" cy="390" rx="54" ry="38" fill="#FFFDF9" opacity="0.65" filter="url(#steamMistBlur)" />
                  <ellipse cx="680" cy="345" rx="46" ry="34" fill="#FFFDF9" opacity="0.52" filter="url(#steamMistBlur)" />
                </g>

                {/* Continuous Gentle Misty Steam Floating Upward While Open */}
                <g className="animate-steam-ambient" style={{ animationDelay: '250ms' }}>
                  <ellipse cx="315" cy="430" rx="52" ry="36" fill="#FFFDF9" opacity="0.62" filter="url(#steamMistBlur)" />
                  <ellipse cx="350" cy="375" rx="44" ry="30" fill="#FFFDF9" opacity="0.48" filter="url(#steamMistBlur)" />
                </g>

                <g className="animate-steam-ambient" style={{ animationDelay: '1150ms' }}>
                  <ellipse cx="445" cy="435" rx="60" ry="38" fill="#FFFDF9" opacity="0.66" filter="url(#steamMistBlur)" />
                  <ellipse cx="415" cy="370" rx="48" ry="32" fill="#FFFDF9" opacity="0.5" filter="url(#steamMistBlur)" />
                </g>

                <g className="animate-steam-ambient" style={{ animationDelay: '650ms' }}>
                  <ellipse cx="555" cy="435" rx="60" ry="38" fill="#FFFDF9" opacity="0.66" filter="url(#steamMistBlur)" />
                  <ellipse cx="585" cy="370" rx="48" ry="32" fill="#FFFDF9" opacity="0.5" filter="url(#steamMistBlur)" />
                </g>

                <g className="animate-steam-ambient" style={{ animationDelay: '1750ms' }}>
                  <ellipse cx="685" cy="430" rx="52" ry="36" fill="#FFFDF9" opacity="0.62" filter="url(#steamMistBlur)" />
                  <ellipse cx="650" cy="375" rx="44" ry="30" fill="#FFFDF9" opacity="0.48" filter="url(#steamMistBlur)" />
                </g>
              </g>
            )}

            {/* ============================================================= */}
            {/* CLOSED KRAFT PAPER LID (Folds down over the tray when closed) */}
            {/* ============================================================= */}
            <g
              onClick={handleOpenBox}
              className="cursor-pointer transition-all duration-500 ease-in-out"
              style={{
                transformOrigin: '500px 282px',
                transform: isOpen ? 'scaleY(0.04) translateY(-10px)' : 'scaleY(1) translateY(0px)',
                opacity: isOpen ? 0 : 1,
                pointerEvents: isOpen ? 'none' : 'auto',
              }}
            >
              <g filter="url(#kraftPaperGrain)">
                {/* Left Closed Lid Side Skirt */}
                <path
                  d="M 214 282 L 154 294 L 102 560 L 112 564 Z"
                  fill="#DEC39E"
                  stroke="#B8966D"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                {/* Right Closed Lid Side Skirt */}
                <path
                  d="M 786 282 L 846 294 L 898 560 L 888 564 Z"
                  fill="#D4B58D"
                  stroke="#B8966D"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />

                {/* Top Exterior Kraft Paper Lid Surface */}
                <path
                  d="M 214 282 Q 500 276 786 282 L 888 562 Q 500 568 112 562 Z"
                  fill="url(#closedLidTop)"
                  stroke="#B8966D"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Subtle Lid Crease Lines & Steam Vent Holes */}
                <line
                  x1="214"
                  y1="282"
                  x2="112"
                  y2="562"
                  stroke="#C4A37A"
                  strokeWidth="1.4"
                />
                <line
                  x1="786"
                  y1="282"
                  x2="888"
                  y2="562"
                  stroke="#C4A37A"
                  strokeWidth="1.4"
                />

                {/* Two tiny die-cut steam vent holes on the top lid */}
                <circle cx="310" cy="360" r="5" fill="#9A7650" opacity="0.55" />
                <circle cx="690" cy="360" r="5" fill="#9A7650" opacity="0.55" />

                {/* Front Tongue Flap Folded Down and Tucked Into the Front Wall Slit! */}
                <path
                  d="M 418 564 L 444 587 Q 500 591 556 587 L 582 564 Z"
                  fill="#D9BA93"
                  stroke="#A88459"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <line
                  x1="418"
                  y1="564"
                  x2="582"
                  y2="564"
                  stroke="#9C7853"
                  strokeWidth="1.4"
                  strokeDasharray="6 4"
                />
              </g>

              {/* Traditional Red & Cream Paper Belly Band / Takeout Label Sticker on Top of Closed Box */}
              <g>
                {/* Vertical Paper Obi Strip */}
                <path
                  d="M 425 279 L 575 279 L 592 565 L 408 565 Z"
                  fill="#FAF3E6"
                  stroke="#C84B31"
                  strokeWidth="2"
                />
                <line x1="433" y1="280" x2="417" y2="564" stroke="#C84B31" strokeWidth="0.8" strokeDasharray="4 3" />
                <line x1="567" y1="280" x2="583" y2="564" stroke="#C84B31" strokeWidth="0.8" strokeDasharray="4 3" />

                {/* Center Red Chibi Fox Medallion on Closed Lid */}
                <circle cx="500" cy="390" r="39" fill="#C84B31" />
                <circle cx="500" cy="390" r="34" stroke="#FAF3E6" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />

                {/* Cute Chibi Golden-Yellow Fox Head ("Cáo Vàng") Illustration inside the Red Medallion */}
                {/* Replacement Fox Image */}
                <image
                  href="./assets/aistudio/image_e9917af5.png"
                  x="450"
                  y="340"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGameOpen(true);
                  }}
                />

                <text
                  x="500"
                  y="456"
                  textAnchor="middle"
                  fill="#432314"
                  fontSize="15"
                  fontWeight="700"
                  letterSpacing="0.5"
                >
                  Takoyaki Cáo Bel
                </text>
                <text
                  x="500"
                  y="478"
                  textAnchor="middle"
                  fill="#C84B31"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="1.8"
                >
                  {activeBoxCharacters.length}{' '}
                  {activeBoxCharacters.length === 1 ? 'PIECE PACKED' : 'PIECES PACKED'}
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* =================================================================== */}
      {/* EMPTY STATE MESSAGE & CTA BELOW THE PAPER BOX                       */}
      {/* =================================================================== */}
      {characters.length === 0 && (
        <div className="mt-2 text-center max-w-md mx-auto">
          <button
            type="button"
            onClick={onGoToTrays}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-sm shadow-sm transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Fill thêm takoyaki vào hộp khum?</span>
          </button>
        </div>
      )}
      {isGameOpen && (
        <RockPaperScissorsModal
          onClose={() => setIsGameOpen(false)}
          onWin={() => {
            setIsGameOpen(false);
            setIsOpen(true);
          }}
        />
      )}
    </section>
  );
};


const RockPaperScissorsModal: React.FC<{ onClose: () => void; onWin: () => void }> = ({ onClose, onWin }) => {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Sẵn sàng chưa? 1... 2... 3!');
  const [foxState, setFoxState] = useState<'idle' | 'counting' | 'showing' | 'result'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [foxMove, setFoxMove] = useState<'búa' | 'bao' | 'kéo' | null>(null);
  const [playerMove, setPlayerMove] = useState<'búa' | 'bao' | 'kéo' | null>(null);

  const moveIcons = { 'búa': '✊', 'bao': '🖐️', 'kéo': '✌️' };

  const playFoxLaugh = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const startRound = () => {
    setFoxState('counting');
    setCountdown(3);
    setFoxMove(null);
    setPlayerMove(null);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === 1) {
          clearInterval(interval);
          setFoxState('showing');
          return null;
        }
        return (c || 0) - 1;
      });
    }, 800);
  };

  const play = (move: 'búa' | 'bao' | 'kéo') => {
    if (foxState !== 'showing') return;
    
    setPlayerMove(move);
    const moves = ['búa', 'bao', 'kéo'] as const;
    const fMove = moves[Math.floor(Math.random() * 3)];
    setFoxMove(fMove);
    setFoxState('result');
    
    let result = '';
    if (move === fMove) result = 'Hòa!';
    else if (
      (move === 'búa' && fMove === 'kéo') ||
      (move === 'bao' && fMove === 'búa') ||
      (move === 'kéo' && fMove === 'bao')
    ) {
      result = 'Bạn thắng vòng này!';
      setWins(wins + 1);
    } else {
      result = 'Cáo thắng vòng này!';
      playFoxLaugh();
      setLosses(losses + 1);
    }
    
    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound > 3) {
        if (wins + (result === 'Bạn thắng vòng này!' ? 1 : 0) >= 2) {
          setMessage(`Bạn thắng ${wins + (result === 'Bạn thắng vòng này!' ? 1 : 0)} - ${losses + (result === 'Cáo thắng vòng này!' ? 1 : 0)}! Mở hộp thôi!`);
          setTimeout(onWin, 1500);
        } else {
          setMessage(`Bạn thua ${wins + (result === 'Bạn thắng vòng này!' ? 1 : 0)} - ${losses + (result === 'Cáo thắng vòng này!' ? 1 : 0)}! Éc éc éc! Chơi lại nha!`);
          setWins(0); setLosses(0); setRound(1);
          setFoxState('idle');
        }
      } else {
        setMessage(`Cáo ra ${fMove}. ${result} (Tỉ số: ${wins + (result === 'Bạn thắng vòng này!' ? 1 : 0)}-${losses + (result === 'Cáo thắng vòng này!' ? 1 : 0)})`);
        setRound(nextRound);
        setFoxState('idle');
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D251E]/60 backdrop-blur-sm">
      <div className="bg-[#FFFDF9] border-2 border-[#D4A373] rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center">
        <h3 className="font-display text-xl font-bold text-[#432314] mb-4">Oẳn tù tì với Cáo Bel</h3>
        <div className="mb-6 flex flex-col items-center">
            <img src="/assets/aistudio/image_e9917af5.png" alt="Cáo Bel" className={`w-24 h-24 mb-4 object-contain transition-transform ${foxState === 'counting' ? 'animate-bounce' : ''}`} />
            {foxState === 'result' && (
              <div className="flex gap-4 mb-2 text-2xl font-bold">
                <span>Bạn: {playerMove && moveIcons[playerMove]}</span>
                <span>Cáo: {foxMove && moveIcons[foxMove]}</span>
              </div>
            )}
            <p className="text-sm text-[#7A5C4F]">{countdown ? `Đếm: ${countdown}!` : message}</p>
        </div>
        
        {foxState === 'idle' && (
             <button onClick={startRound} className="px-6 py-2 bg-[#E57C29] text-white rounded-lg cursor-pointer">Bắt đầu vòng {round}</button>
        )}
        
        {foxState === 'showing' && (
            <div className="flex justify-center gap-4">
              <button onClick={() => play('búa')} className="px-4 py-2 bg-[#E57C29] text-white rounded-lg cursor-pointer">✊ Búa</button>
              <button onClick={() => play('bao')} className="px-4 py-2 bg-[#E57C29] text-white rounded-lg cursor-pointer">🖐️ Bao</button>
              <button onClick={() => play('kéo')} className="px-4 py-2 bg-[#E57C29] text-white rounded-lg cursor-pointer">✌️ Kéo</button>
            </div>
        )}
      </div>
    </div>
  );
};
