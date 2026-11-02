import React from 'react';
import { TakoyakiCharacter } from '../types';
import { X, Heart, Play, Flame, AlertTriangle, Edit3, ChevronDown } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#3D251E]/45 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-1000"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-detail-title"
    >
      <div className="relative w-full max-w-3xl bg-[#FDF8F0] border-2 border-[#D4A373] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-[#3D251E] animate-in fade-in zoom-in-95 duration-1000 ease-out">
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
            <div className="relative shrink-0 mx-auto sm:mx-0 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-lg border border-[#D4A373]/50">
              {character.artwork ? (
                <img
                  src={character.artwork}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-4xl text-[#E8833A] bg-[#FFFDF9]">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Primary Identity & Unboxed Metadata */}
            <div className="flex-1 text-center sm:text-left flex flex-col gap-4">
              {/* Identity Info */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#7A5C4F]">
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

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
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

                <p className="text-sm sm:text-base text-[#54382E] leading-relaxed">
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

              {/* Primary Actions Bar: Favorite & Eat */}
              <div className="flex flex-col min-[380px]:flex-row sm:flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(character.id)}
                  className={`w-full min-[380px]:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
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
                    className="w-full min-[380px]:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#E8833A] hover:bg-[#D67229] text-white shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Play className="w-4 h-4 shrink-0 fill-current" />
                    <span>Thưởng thức</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* INSIDE THE TAKOYAKI: "What's inside?" (Accordion layout) */}
          <div className="space-y-3 border-t border-[#E5D3B3] pt-6">
            {React.useMemo(() => {
              const sections = [
                { title: 'What\'s inside? (The Plot)', content: character.plot },
                { title: 'Opening Scene', content: character.openingScene },
                { title: 'Small Note', content: character.personality },
                { title: 'Scenario', content: character.scenario },
              ].filter(s => s.content);

              return sections.map((section, index) => (
                <AccordionSection key={index} title={section.title} content={section.content || ''} />
              ));
            }, [character])}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccordionSection: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border border-[#E5D3B3] rounded-xl overflow-hidden bg-white/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left font-display text-lg font-semibold text-[#C84B31] hover:bg-[#F5EBD9] transition-colors cursor-pointer"
      >
        {title}
        <ChevronDown className={`w-5 h-5 text-[#8C6239] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-sm sm:text-base text-[#3D251E] leading-relaxed whitespace-pre-line border-t border-[#E5D3B3]">
          {content}
        </div>
      )}
    </div>
  );
};
