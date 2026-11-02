import React from 'react';
import { TakoyakiCharacter } from '../types';
import { X, Heart, Play, Flame, AlertTriangle, Edit3 } from 'lucide-react';

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

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  isFavorite,
  isCreatorMode,
  onClose,
  onToggleFavorite,
  onPlayCharacter,
  onEditCharacter,
}) => {
  if (!character) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#3D251E]/45 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-detail-title"
    >
      <div className="relative w-full max-w-3xl bg-[#FDF8F0] border-2 border-[#D4A373] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-[#3D251E]">
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
                onClick={() => onEditCharacter(character)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3D251E] bg-white hover:bg-[#F5EBD9] border border-[#D4A373] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#E8833A]" />
                <span>Edit in Kitchen</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
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
              <div
                className="w-32 h-32 sm:w-44 sm:h-44 rounded-full p-2 shadow-md"
                style={{
                  background: character.is_spicy
                    ? 'radial-gradient(circle at 30% 25%, #E8833A 0%, #C84B31 65%, #7D2918 100%)'
                    : 'radial-gradient(circle at 30% 25%, #F4B942 0%, #E8833A 60%, #8C6239 100%)',
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
            <div className="flex-1 text-center sm:text-left">
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
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 sm:gap-3 w-full">
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
          <div className="space-y-6 border-t border-[#E5D3B3] pt-6">
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
