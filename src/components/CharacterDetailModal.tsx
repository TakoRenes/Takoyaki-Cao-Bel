import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { TakoyakiCharacter } from '../types';
import { X, Heart, Play, Flame, Edit3 } from 'lucide-react';

interface CharacterDetailModalProps {
  character: TakoyakiCharacter | null;
  isFavorite: boolean;
  isCreatorMode: boolean;
  isAgeVerified?: boolean;
  onGoToProfile?: () => void;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onPlayCharacter: (character: TakoyakiCharacter) => void;
  onEditCharacter: (character: TakoyakiCharacter) => void;
}

// Track the last clicked takoyaki ball DOM element for exact FLIP origin
let lastClickedBallEl: HTMLElement | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as HTMLElement | null;
      const ballEl = target?.closest?.('[data-takoyaki-ball-id]') as HTMLElement | null;
      if (ballEl) {
        lastClickedBallEl = ballEl;
      }
    },
    { capture: true, passive: true }
  );
}

function getOriginBallElement(characterId: string): HTMLElement | null {
  if (
    lastClickedBallEl &&
    document.body.contains(lastClickedBallEl) &&
    lastClickedBallEl.getAttribute('data-takoyaki-ball-id') === characterId
  ) {
    return lastClickedBallEl;
  }
  return document.querySelector<HTMLElement>(
    `[data-takoyaki-ball-id="${CSS.escape(characterId)}"]`
  );
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  isFavorite,
  isCreatorMode,
  onClose,
  onToggleFavorite,
  onPlayCharacter,
  onEditCharacter,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ballAvatarRef = useRef<HTMLDivElement>(null);
  const flyingBallRef = useRef<HTMLDivElement>(null);

  const [isBallFlying, setIsBallFlying] = useState(false);
  const [hasBallLanded, setHasBallLanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [flyingTargetRect, setFlyingTargetRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const animatedCharIdRef = useRef<string | null>(null);
  const activeOriginElRef = useRef<HTMLElement | null>(null);

  const restoreOriginElement = useCallback((withBounce = false) => {
    const el = activeOriginElRef.current;
    if (el && document.body.contains(el)) {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.transition = '';
      if (withBounce && typeof el.animate === 'function') {
        el.animate(
          [
            { transform: 'scale(0.86) translateY(4px)' },
            { transform: 'scale(1.08) translateY(-3px)', offset: 0.55 },
            { transform: 'scale(1) translateY(0)' },
          ],
          {
            duration: 420,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      }
    }
    activeOriginElRef.current = null;
  }, []);

  // Reset state if character is cleared externally
  useEffect(() => {
    if (!character) {
      animatedCharIdRef.current = null;
      setIsBallFlying(false);
      setHasBallLanded(false);
      setIsClosing(false);
      setFlyingTargetRect(null);
      restoreOriginElement(false);
    }
  }, [character, restoreOriginElement]);

  // Smooth FLIP Open Animation when a character is selected
  useLayoutEffect(() => {
    if (!character) return;
    if (animatedCharIdRef.current === character.id) return;
    animatedCharIdRef.current = character.id;
    setIsClosing(false);
    setHasBallLanded(false);

    const backdropEl = backdropRef.current;
    const cardEl = cardRef.current;
    const avatarEl = ballAvatarRef.current;
    if (!backdropEl || !cardEl || !avatarEl) return;

    const targetRect = avatarEl.getBoundingClientRect();
    const originEl = getOriginBallElement(character.id);
    const originRect = originEl ? originEl.getBoundingClientRect() : null;

    // Dim the picked takoyaki ball in its well while the modal is open
    if (originEl && originRect && originRect.width > 0) {
      activeOriginElRef.current = originEl;
      originEl.style.transition = 'opacity 250ms ease, transform 250ms ease';
      originEl.style.opacity = '0.18';
      originEl.style.transform = 'scale(0.88)';
    }

    // 1. Backdrop smooth fade-in
    const backdropAnim = backdropEl.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 540,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );

    // 2. Wooden Boat Modal Card smooth entrance toward center
    const cardRect = cardEl.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    const originCenterX = originRect
      ? originRect.left + originRect.width / 2
      : cardCenterX;
    const originCenterY = originRect
      ? originRect.top + originRect.height / 2
      : cardCenterY + 40;

    const shiftX = (originCenterX - cardCenterX) * 0.22;
    const shiftY = (originCenterY - cardCenterY) * 0.22 + 16;

    const cardAnim = cardEl.animate(
      [
        {
          opacity: 0,
          transform: `translate3d(${shiftX}px, ${shiftY}px, 0) scale(0.88)`,
        },
        {
          opacity: 1,
          transform: 'translate3d(0, -2px, 0) scale(1.01)',
          offset: 0.78,
        },
        {
          opacity: 1,
          transform: 'translate3d(0, 0, 0) scale(1)',
        },
      ],
      {
        duration: 640,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );

    // 3. Flying Takoyaki Ball FLIP Morph from grill well -> modal avatar frame
    let flyTimer: number | undefined;
    if (originRect && originRect.width > 0 && targetRect.width > 0) {
      setFlyingTargetRect({
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
      });
      setIsBallFlying(true);

      requestAnimationFrame(() => {
        const flyEl = flyingBallRef.current;
        if (!flyEl) {
          setIsBallFlying(false);
          setHasBallLanded(true);
          return;
        }

        const dx =
          originRect.left +
          originRect.width / 2 -
          (targetRect.left + targetRect.width / 2);
        const dy =
          originRect.top +
          originRect.height / 2 -
          (targetRect.top + targetRect.height / 2);
        const startScale = Math.max(0.28, originRect.width / targetRect.width);
        const midScale = startScale + (1 - startScale) * 0.68;

        const flyAnim = flyEl.animate(
          [
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${startScale}) rotate(-14deg)`,
              boxShadow: '0 14px 28px rgba(61, 37, 30, 0.45)',
            },
            {
              transform: `translate3d(${dx * 0.34}px, ${dy * 0.34 - 28}px, 0) scale(${midScale}) rotate(6deg)`,
              boxShadow: '0 24px 38px rgba(61, 37, 30, 0.38)',
              offset: 0.5,
            },
            {
              transform: 'translate3d(0px, -3px, 0) scale(1.04) rotate(-1.5deg)',
              boxShadow: '0 12px 24px rgba(61, 37, 30, 0.25)',
              offset: 0.85,
            },
            {
              transform: 'translate3d(0px, 0px, 0) scale(1) rotate(0deg)',
              boxShadow: '0 6px 14px rgba(61, 37, 30, 0.18)',
            },
          ],
          {
            duration: 680,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );

        flyAnim.onfinish = () => {
          setIsBallFlying(false);
          setHasBallLanded(true);
        };
      });

      flyTimer = window.setTimeout(() => {
        setIsBallFlying(false);
        setHasBallLanded(true);
      }, 720);
    } else {
      setIsBallFlying(false);
      setHasBallLanded(true);
    }

    return () => {
      if (flyTimer) window.clearTimeout(flyTimer);
      backdropAnim.cancel();
      cardAnim.cancel();
    };
  }, [character?.id]);

  // Smooth Reverse FLIP Close Animation when closing the modal
  const handleRequestClose = useCallback(() => {
    if (isClosing || !character) return;
    setIsClosing(true);

    const backdropEl = backdropRef.current;
    const cardEl = cardRef.current;
    const avatarEl = ballAvatarRef.current;
    const originEl =
      activeOriginElRef.current && document.body.contains(activeOriginElRef.current)
        ? activeOriginElRef.current
        : getOriginBallElement(character.id);

    const currentAvatarRect = avatarEl?.getBoundingClientRect() ?? null;
    const destOriginRect = originEl?.getBoundingClientRect() ?? null;

    if (backdropEl) {
      backdropEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 440,
        easing: 'cubic-bezier(0.32, 0, 0.2, 1)',
        fill: 'forwards',
      });
    }

    if (cardEl) {
      const cardRect = cardEl.getBoundingClientRect();
      const shiftX = destOriginRect
        ? (destOriginRect.left +
            destOriginRect.width / 2 -
            (cardRect.left + cardRect.width / 2)) *
          0.18
        : 0;
      const shiftY = destOriginRect
        ? (destOriginRect.top +
            destOriginRect.height / 2 -
            (cardRect.top + cardRect.height / 2)) *
            0.18 +
          12
        : 16;

      cardEl.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          {
            opacity: 0,
            transform: `translate3d(${shiftX}px, ${shiftY}px, 0) scale(0.88)`,
          },
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(0.32, 0, 0.2, 1)',
          fill: 'forwards',
        }
      );
    }

    if (
      currentAvatarRect &&
      destOriginRect &&
      currentAvatarRect.width > 0 &&
      destOriginRect.width > 0
    ) {
      setFlyingTargetRect({
        left: currentAvatarRect.left,
        top: currentAvatarRect.top,
        width: currentAvatarRect.width,
        height: currentAvatarRect.height,
      });
      setIsBallFlying(true);
      setHasBallLanded(false);

      requestAnimationFrame(() => {
        const flyEl = flyingBallRef.current;
        if (!flyEl) return;

        const dx =
          destOriginRect.left +
          destOriginRect.width / 2 -
          (currentAvatarRect.left + currentAvatarRect.width / 2);
        const dy =
          destOriginRect.top +
          destOriginRect.height / 2 -
          (currentAvatarRect.top + currentAvatarRect.height / 2);
        const endScale = Math.max(0.28, destOriginRect.width / currentAvatarRect.width);
        const midScale = 1 - (1 - endScale) * 0.45;

        flyEl.animate(
          [
            {
              transform: 'translate3d(0px, 0px, 0) scale(1) rotate(0deg)',
              opacity: 1,
            },
            {
              transform: `translate3d(${dx * 0.45}px, ${dy * 0.45 - 22}px, 0) scale(${midScale}) rotate(-8deg)`,
              opacity: 1,
              offset: 0.48,
            },
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${endScale}) rotate(6deg)`,
              opacity: 0.92,
            },
          ],
          {
            duration: 450,
            easing: 'cubic-bezier(0.32, 0, 0.2, 1)',
            fill: 'forwards',
          }
        );
      });
    }

    window.setTimeout(() => {
      restoreOriginElement(true);
      setIsBallFlying(false);
      setIsClosing(false);
      onClose();
    }, 450);
  }, [character, isClosing, onClose, restoreOriginElement]);

  // Close on Escape key with smooth transition
  useEffect(() => {
    if (!character) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [character, handleRequestClose]);

  if (!character) return null;

  const ballGradient = character.is_spicy
    ? 'radial-gradient(circle at 30% 25%, #E8833A 0%, #C84B31 65%, #7D2918 100%)'
    : 'radial-gradient(circle at 30% 25%, #F4B942 0%, #E8833A 60%, #8C6239 100%)';

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#3D251E]/45 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-detail-title"
    >
      {/* Floating FLIP Takoyaki Ball (renders outside card overflow-hidden during open/close flight) */}
      {isBallFlying && flyingTargetRect && (
        <div
          ref={flyingBallRef}
          style={{
            position: 'fixed',
            left: `${flyingTargetRect.left}px`,
            top: `${flyingTargetRect.top}px`,
            width: `${flyingTargetRect.width}px`,
            height: `${flyingTargetRect.height}px`,
            background: ballGradient,
            zIndex: 70,
            willChange: 'transform',
          }}
          className="pointer-events-none rounded-full p-2 shadow-xl"
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-[#FFFDF9] border-2 border-white">
            {character.artwork ? (
              <img
                src={character.artwork}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-4xl text-[#E8833A]">
                {character.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={cardRef}
        className="relative w-full max-w-3xl bg-[#FDF8F0] border-2 border-[#D4A373] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-[#3D251E]"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Top Wooden Boat Tray Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-[#F5EBD9] border-b border-[#E5D3B3]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#7A5C4F]">
            <Flame
              className={`w-4 h-4 ${
                character.is_spicy ? 'text-[#C84B31] fill-current' : 'text-[#E8833A]'
              }`}
            />
            <span className={character.is_spicy ? 'text-[#C84B31] font-semibold' : 'text-[#3D251E]'}>
              {character.is_spicy ? 'Vị cay tê' : 'Vị truyền thống'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCreatorMode && (
              <button
                type="button"
                onClick={() => {
                  restoreOriginElement(false);
                  onEditCharacter(character);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3D251E] bg-white hover:bg-[#F5EBD9] border border-[#D4A373] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#E8833A]" />
                <span>Edit in Kitchen</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 text-[#7A5C4F] hover:text-[#3D251E] bg-white/80 hover:bg-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close detail view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 sm:space-y-8">
          {/* Character Header Section */}
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
            {/* Picked Takoyaki Artwork Frame */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
              {/* Warm Steam Puff Ring on Landing */}
              {hasBallLanded && !isClosing && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 w-32 h-32 sm:w-44 sm:h-44 rounded-full border-2 border-[#E8833A]/55 bg-[#FFFDF9]/30 animate-fox-puff z-0"
                />
              )}

              <div
                ref={ballAvatarRef}
                className={`relative z-10 w-32 h-32 sm:w-44 sm:h-44 rounded-full p-2 shadow-md transition-opacity duration-75 ${
                  isBallFlying ? 'opacity-0' : 'opacity-100'
                } ${hasBallLanded && !isClosing ? 'animate-tako-ball-settle' : ''}`}
                style={{
                  background: ballGradient,
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#FFFDF9] border-2 border-white">
                  {character.artwork ? (
                    <img
                      src={character.artwork}
                      alt={character.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-4xl text-[#E8833A]">
                      {character.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Identity & Unboxed Metadata */}
            <div
              className="flex-1 text-center sm:text-left animate-tako-modal-item"
              style={{ animationDelay: '90ms' }}
            >
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#7A5C4F] mb-2">
                <span
                  className={
                    character.is_spicy
                      ? 'font-semibold text-[#C84B31]'
                      : 'font-semibold text-[#8C6239]'
                  }
                >
                  {character.is_spicy ? '🌶 Vị cay tê' : 'Vị truyền thống'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  By{' '}
                  {!character.creator || character.creator === 'Stall Master'
                    ? 'Cáo Bel'
                    : character.creator}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-nums text-[#7A5C4F]">{character.viewCount || 0} lượt xem</span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-3">
                <h2
                  id="character-detail-title"
                  className="font-display text-2xl sm:text-3xl font-semibold text-[#3D251E]"
                >
                  {character.name}
                </h2>

                {(character.allowsFemale || character.allowsMale) && (
                  <div className="inline-flex items-center gap-1.5 select-none">
                    {character.allowsFemale && (
                      <span
                        title="Chơi được giới nữ (👫)"
                        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-sm shadow-2xs cursor-default"
                        aria-label="Chơi được giới nữ (👫)"
                      >
                        👫
                      </span>
                    )}
                    {character.allowsMale && (
                      <span
                        title="Chơi được giới nam (👬)"
                        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-sm shadow-2xs cursor-default"
                        aria-label="Chơi được giới nam (👬)"
                      >
                        👬
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm sm:text-base text-[#54382E] leading-relaxed mb-4">
                {character.shortDescription || 'A warm story fresh off the takoyaki grill.'}
              </p>

              {/* Unboxed Clean Tags */}
              {character.tags && character.tags.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-[#C84B31] font-medium">
                  {character.tags.map((tag, idx) => (
                    <React.Fragment key={tag}>
                      <span>#{tag}</span>
                      {idx < character.tags.length - 1 && (
                        <span aria-hidden="true" className="text-[#D4A373]">
                          ·
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Actions Bar: Favorite & Eat */}
          <div
            className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 sm:gap-3 w-full animate-tako-modal-item"
            style={{ animationDelay: '160ms' }}
          >
            <button
              type="button"
              onClick={() => onToggleFavorite(character.id)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                isFavorite
                  ? 'bg-[#C84B31] border-[#C84B31] text-white hover:bg-[#B33E26]'
                  : 'bg-white border-[#D4A373] text-[#3D251E] hover:bg-[#FFFDF9] hover:border-[#C84B31]'
              }`}
            >
              <Heart className={`w-4 h-4 shrink-0 ${isFavorite ? 'fill-current text-white' : 'text-[#C84B31]'}`} />
              <span>{isFavorite ? 'Đã thích · Trong hộp của bạn ♥' : 'Thích · Bỏ vào hộp'}</span>
            </button>

            {character.playUrl && (
              <button
                type="button"
                onClick={() => onPlayCharacter(character)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#E8833A] hover:bg-[#D67229] text-white shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <Play className="w-4 h-4 shrink-0 fill-current" />
                <span>Thưởng thức</span>
              </button>
            )}
          </div>

          {/* INSIDE THE TAKOYAKI: "What's inside?" (Vertical single-column layout) */}
          <div
            className="space-y-6 border-t border-[#E5D3B3] pt-6 animate-tako-modal-item"
            style={{ animationDelay: '230ms' }}
          >
            <div>
              <h3 className="font-display text-lg font-semibold text-[#C84B31] mb-2">
                What&apos;s inside? (The Plot)
              </h3>
              <p className="text-sm sm:text-base text-[#3D251E] leading-relaxed whitespace-pre-line">
                {character.plot || 'No plot details specified yet.'}
              </p>
            </div>

            {character.openingScene && (
              <div className="pt-4 border-t border-[#EFE4D2]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8C6239] mb-2">
                  Opening Scene
                </h4>
                <p className="text-sm sm:text-base text-[#54382E] leading-relaxed whitespace-pre-line">
                  {character.openingScene}
                </p>
              </div>
            )}

            {character.personality && (
              <div className="pt-4 border-t border-[#EFE4D2]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8C6239] mb-2">
                  Small Note
                </h4>
                <p className="text-sm sm:text-base text-[#54382E] leading-relaxed whitespace-pre-line">
                  {character.personality}
                </p>
              </div>
            )}

            {character.scenario && (
              <div className="pt-4 border-t border-[#EFE4D2]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8C6239] mb-2">
                  Scenario
                </h4>
                <p className="text-sm sm:text-base text-[#54382E] leading-relaxed whitespace-pre-line">
                  {character.scenario}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

