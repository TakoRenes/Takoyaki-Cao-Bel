import React from 'react';
import { TakoyakiCharacter } from '../types';
import { Heart, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { TakoyakiBallCover } from './TakoyakiStallHero';

interface TakoyakiTraySectionProps {
  title: string;
  subtitle: string;
  characters: TakoyakiCharacter[];
  favorites: string[];
  emptyHeading?: string;
  emptySubtext?: string;
  variant?: 'tray' | 'menu';
  rankMetric?: 'favorites' | 'bestsellers';
  isSpicyMenu?: boolean;
  isFresh?: boolean;
  serverStats?: {
    totalFavorites: number;
    totalPlays: number;
    totalCharacters: number;
  };
  isAgeVerified?: boolean;
  onSelectCharacter: (character: TakoyakiCharacter) => void;
  onPlayCharacter: (character: TakoyakiCharacter) => void;
  onToggleFavorite?: (id: string) => void;
}

export const TakoyakiTraySection: React.FC<TakoyakiTraySectionProps> = ({
  title,
  subtitle,
  characters,
  favorites,
  emptyHeading = 'Vỉ nướng vẫn đang chờ mẻ bánh đầu tiên.',
  emptySubtext = 'Hãy quay lại khi chủ quầy vừa nướng xong mẻ truyện mới nhé.',
  variant = 'tray',
  rankMetric = 'favorites',
  isSpicyMenu = false,
  isFresh = false,
  serverStats,
  onSelectCharacter,
  onPlayCharacter,
  onToggleFavorite,
}) => {
  const [revealedId, setRevealedId] = React.useState<string | null>(null);
  const lastPointerTypeRef = React.useRef<string>('mouse');

  // 5 items per page for ranking menu
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 5;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [characters, rankMetric, isSpicyMenu]);

  const totalPages = Math.max(1, Math.ceil(characters.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCharacters = characters.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCompartmentClick = (char: TakoyakiCharacter) => {
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
  if (variant === 'menu') {
    return (
      <section className="max-w-[820px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {/* Traditional Wooden & Paper Japanese Street Stall Menu Board */}
        <div
          className="relative rounded-[28px] sm:rounded-[32px] p-3.5 sm:p-5 border"
          style={{
            background: isSpicyMenu
              ? 'linear-gradient(180deg, #6E271E 0%, #581D16 50%, #46150F 100%)'
              : 'linear-gradient(180deg, #63442B 0%, #4E3420 50%, #3E2818 100%)',
            borderColor: isSpicyMenu ? '#8A3B30' : '#7C573A',
            boxShadow:
              'inset 0 2px 3px rgba(255, 245, 230, 0.22), 0 10px 0 ' +
              (isSpicyMenu ? '#330E0A' : '#2C1B10') +
              ', 0 20px 38px rgba(45, 26, 12, 0.24)',
          }}
        >
          {/* Decorative Brass Corner Rivets on Wooden Menu Frame */}
          <span className="pointer-events-none absolute top-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-[#D9A760] shadow-inner border border-[#5A3918]" />
          <span className="pointer-events-none absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-[#D9A760] shadow-inner border border-[#5A3918]" />
          <span className="pointer-events-none absolute bottom-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-[#D9A760] shadow-inner border border-[#5A3918]" />
          <span className="pointer-events-none absolute bottom-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-[#D9A760] shadow-inner border border-[#5A3918]" />

          {/* Inner Cream Washi Paper Menu Sheet */}
          <div
            className="relative rounded-[20px] sm:rounded-[22px] bg-[#FFFDF8] border-2 px-4 sm:px-8 py-6 sm:py-8"
            style={{
              borderColor: isSpicyMenu ? '#D99B8E' : '#E2CAAA',
              boxShadow: 'inset 0 0 0 4px #FAF3E6, inset 0 2px 10px rgba(92, 58, 33, 0.08)',
            }}
          >
            {/* Menu Board Header */}
            <div className="text-center pb-5 sm:pb-6 border-b-2 border-dashed border-[#D8C09E]">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D251E] tracking-tight">
                {title}
              </h2>
            </div>

            {/* Vertical Numbered Menu List */}
            {characters.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-display text-lg font-semibold text-[#3D251E] mb-1">
                  {emptyHeading}
                </p>
                <p className="text-xs sm:text-sm text-[#7A5C4F]">{emptySubtext}</p>
              </div>
            ) : (
              <div className="divide-y divide-dashed divide-[#E2CAAA] mt-2">
                {paginatedCharacters.map((char, index) => {
                  const rankNum = startIndex + index + 1;
                  const formattedRank = String(rankNum).padStart(2, '0');
                  const isFav = favorites.includes(char.id);

                  const rankTextColor =
                    rankNum === 1
                      ? 'text-[#D97917]'
                      : rankNum === 2
                      ? 'text-[#C84B31]'
                      : rankNum === 3
                      ? 'text-[#8C5327]'
                      : 'text-[#9A7B5C]';

                  return (
                    <div
                      key={char.id}
                      onClick={() => onSelectCharacter(char)}
                      className="group py-4 sm:py-5 px-1.5 sm:px-3 -mx-1 sm:-mx-3 rounded-2xl hover:bg-[#FAF1E2]/80 transition-colors cursor-pointer flex items-start sm:items-center gap-2.5 sm:gap-4"
                    >
                      {/* Clean Menu Numbering without any circle (01, 02, 03...) */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-7 sm:w-12 pt-2 sm:pt-0 select-none">
                        {rankNum <= 3 && (
                          <span className="text-[8px] sm:text-[9px] font-bold tracking-widest uppercase text-[#C84B31] leading-none mb-0.5">
                            TOP
                          </span>
                        )}
                        <span
                          className={`font-display font-extrabold text-xl sm:text-3xl leading-none tracking-tight ${rankTextColor}`}
                        >
                          {formattedRank}
                        </span>
                      </div>

                      {/* Takoyaki Character Avatar Sphere */}
                      <div
                        data-takoyaki-ball-id={char.id}
                        className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-full p-1 shrink-0 transition-transform duration-200 group-hover:scale-105"
                      >
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#FDF8F0]">
                          {char.artwork ? (
                            <img
                              src={char.artwork}
                              alt={char.name}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover object-${char.imagePosition || 'center'}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-display text-lg text-[#3D251E]">
                              {char.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Menu Item Details (Name, Stats next to name & Description) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-display text-base sm:text-lg font-bold text-[#3D251E] group-hover:text-[#E8833A] transition-colors">
                            {char.name}
                          </h3>

                          {(char.allowsFemale || char.allowsMale) && (
                            <span className="inline-flex items-center gap-1 text-xs select-none">
                              {char.allowsFemale && <span title="Chơi được giới nữ (👫)">👫</span>}
                              {char.allowsMale && <span title="Chơi được giới nam (👬)">👬</span>}
                            </span>
                          )}

                          {/* Metric note next to name: click count for bestsellers, favorite count for favorites (no square brackets) */}
                          {rankMetric === 'bestsellers' ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FAF0E1] border border-[#E8D4BE] text-[#6E4B33] text-xs sm:text-[13px] font-semibold select-none"
                              title={`Lượt click: ${char.playCount || 0}`}
                            >
                              <span className="font-mono font-bold">{char.playCount || 0}</span>
                              <span className="text-sm leading-none" role="img" aria-label="cây đũa">🥢</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FFF0ED] border border-[#F5CBC2] text-[#A63C26] text-xs sm:text-[13px] font-semibold select-none"
                              title={`Lượt yêu thích: ${char.favoriteCount || 0}`}
                            >
                              <span className="font-mono font-bold">{char.favoriteCount || 0}</span>
                              <span className="text-sm leading-none" role="img" aria-label="yêu thích">❤️</span>
                            </span>
                          )}
                        </div>

                        {isFav && (
                          <div className="mt-0.5">
                            <span className="text-[10px] text-[#C84B31] font-semibold bg-[#FDECE8] px-1.5 py-0.5 rounded-sm">
                              Đã thích ♥
                            </span>
                          </div>
                        )}

                        <p className="text-xs sm:text-[13px] text-[#7A5C4F] line-clamp-2 mt-1 leading-relaxed">
                          {char.shortDescription || char.plot || 'Nhấn vào viên takoyaki này để xem nhân bên trong.'}
                        </p>

                        {/* Mobile Action Buttons ("Thưởng thức") */}
                        <div className="sm:hidden mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayCharacter(char);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#E8833A] text-[#3D251E] hover:text-white border border-[#D4A373] transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                            title="Thưởng thức takoyaki"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Thưởng thức</span>
                          </button>
                        </div>
                      </div>

                      {/* Desktop Action Buttons: Play Button */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayCharacter(char);
                          }}
                          className="px-4 sm:px-5 py-2 rounded-xl bg-[#F5EBD9] hover:bg-[#E8833A] text-[#3D251E] hover:text-white border border-[#D4A373] transition-colors shrink-0 items-center gap-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex"
                          title="Thưởng thức takoyaki"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Thưởng thức</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls for Ranking (5 items per page) */}
            {totalPages > 1 && (
              <div className="mt-6 pt-5 border-t-2 border-dashed border-[#D8C09E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-[#7A5C4F] font-medium text-center sm:text-left">
                  Hiển thị <span className="font-bold text-[#3D251E]">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, characters.length)}</span> trên tổng số <span className="font-bold text-[#3D251E]">{characters.length}</span> viên Takoyaki
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EADCCB] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4A373] text-[#3D251E] font-bold transition-all cursor-pointer select-none active:scale-95"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#8C5327]" />
                    <span>Trước</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all text-xs cursor-pointer select-none ${
                            isActive
                              ? isSpicyMenu
                                ? 'bg-[#C84B31] text-white shadow-xs scale-105'
                                : 'bg-[#E57C29] text-white shadow-xs scale-105'
                              : 'bg-[#FAF1E2] hover:bg-[#F2E5D3] text-[#7A5C4F] border border-[#E2CAAA]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EADCCB] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4A373] text-[#3D251E] font-bold transition-all cursor-pointer select-none active:scale-95"
                    aria-label="Trang sau"
                  >
                    <span>Sau</span>
                    <ChevronRight className="w-4 h-4 text-[#8C5327]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const sectionMaxWidthClass = isFresh ? 'max-w-[820px]' : 'max-w-[1200px]';
  const gridColsClass = isFresh
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <section className={`${sectionMaxWidthClass} mx-auto px-4 sm:px-8 py-10`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 border-b border-[#E5D3B3]">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3D251E]">
            {title}
          </h2>
          <p className="text-sm text-[#7A5C4F] mt-1">{subtitle}</p>
        </div>
      </div>

      {characters.length === 0 ? (
        <div
          className="my-8 rounded-[28px] p-5 sm:p-8 border border-[#C6A175]"
          style={{
            backgroundColor: '#DBC19C',
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 68px, rgba(139, 98, 56, 0.14) 68px, rgba(139, 98, 56, 0.14) 70px)',
            boxShadow:
              'inset 0 2px 3px rgba(255, 250, 240, 0.55), inset 0 -8px 16px rgba(102, 68, 36, 0.2), 0 8px 0 #B68F62, 0 16px 28px rgba(58, 36, 18, 0.14)',
          }}
        >
          <div className="p-10 sm:p-14 rounded-2xl bg-[#FFFDF9]/95 border border-[#D4B68F] text-center max-w-xl mx-auto shadow-xs">
            {/* Subtle 3-well empty miniature tray motif */}
            <div className="flex items-center justify-center gap-4 mb-5">
              {[0, 1, 2].map((well) => (
                <div
                  key={well}
                  className="w-10 h-10 rounded-full border border-[#D4A373]"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 35%, #E5D3B3 0%, #D4BC96 75%, #C4A980 100%)',
                    boxShadow: 'inset 0 3px 6px rgba(61,37,30,0.18)',
                  }}
                />
              ))}
            </div>
            <p className="font-display text-lg font-semibold text-[#3D251E] mb-1">
              {emptyHeading}
            </p>
            <p className="text-xs sm:text-sm text-[#7A5C4F]">{emptySubtext}</p>
          </div>
        </div>
      ) : (
        /* Partitioned Wooden Tray with Square Compartments (Khay gỗ chia ngăn vuông) */
        <div
          className="mt-8 relative rounded-[28px] sm:rounded-[32px] p-3.5 sm:p-5 md:p-6 border border-[#B08350]"
          style={{
            background:
              'linear-gradient(180deg, #D5B386 0%, #C69E6C 50%, #B88D58 100%)',
            boxShadow:
              'inset 0 2px 3px rgba(255, 250, 240, 0.65), inset 0 -6px 12px rgba(85, 52, 22, 0.28), 0 11px 0 #956D3F, 0 20px 34px rgba(58, 36, 18, 0.2)',
          }}
        >
          {/* Left & Right Carved Wooden Tray Side Handles */}
          <div
            className="hidden md:block pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-24 rounded-full"
            style={{
              background: '#7C562E',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.48), 1px 0 0 rgba(255,248,235,0.45)',
            }}
          />
          <div
            className="hidden md:block pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-24 rounded-full"
            style={{
              background: '#7C562E',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.48), -1px 0 0 rgba(255,248,235,0.45)',
            }}
          />

          {/* Wooden Partition Grid (Thick Wooden Dividers Forming Square Compartments) */}
          <div
            className={`rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 grid ${gridColsClass} gap-3 sm:gap-4 border border-[#966E41]`}
            style={{
              background:
                'linear-gradient(145deg, #BA915E 0%, #AC824F 50%, #9E7442 100%)',
              boxShadow:
                'inset 0 3px 8px rgba(58, 34, 14, 0.38), 0 1px 0 rgba(255, 248, 235, 0.45)',
            }}
          >
            {characters.map((char, index) => {
              const isFav = favorites.includes(char.id);
              const isRevealed = revealedId === char.id;
              return (
                <div
                  key={char.id}
                  onPointerDown={(e) => {
                    lastPointerTypeRef.current = e.pointerType;
                  }}
                  onClick={() => handleCompartmentClick(char)}
                  className="group relative aspect-square rounded-[16px] sm:rounded-[18px] p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-200 wood-board-surface border border-[#8E6538] hover:border-[#E57C29] active:scale-95"
                  style={{
                    boxShadow:
                      'inset 0 6px 16px rgba(68, 40, 16, 0.34), inset 0 2px 5px rgba(45, 25, 8, 0.25), 0 1px 0 rgba(255, 248, 235, 0.5)',
                  }}
                >
                  {/* Top Row inside Square Compartment: Flavor Tag & Favorite Heart */}
                  <div className="w-full flex items-center justify-between gap-1.5 z-10">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-tight shadow-2xs ${
                        char.is_spicy
                          ? 'bg-[#7D291E] text-[#FFFDF9]'
                          : 'bg-[#FFFDF9]/90 text-[#5C3A21] border border-[#D4B68F]'
                      }`}
                    >
                      {char.is_spicy ? 'Vị cay tê 🌶' : 'Vị truyền thống'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onToggleFavorite ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(char.id);
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs border ${
                            isFav
                              ? 'bg-[#C84B31] text-white border-[#C84B31]'
                              : 'bg-[#FFFDF9] text-[#7A5C4F] hover:text-[#C84B31] border-[#E5D3B3]'
                          }`}
                          title={isFav ? 'Bỏ thích' : 'Thích'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current text-white' : ''}`} />
                        </button>
                      ) : (
                        isFav && (
                          <span className="w-5 h-5 rounded-full bg-[#FFFDF9] text-[#C84B31] flex items-center justify-center shadow-2xs border border-[#E5D3B3]">
                            <Heart className="w-3 h-3 fill-current" />
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Center of Square Compartment: Round Takoyaki Ball (Reveals Character on Hover or 1st Tap) */}
                  <div className="relative my-auto flex flex-col items-center justify-center py-1">
                    <div
                      data-takoyaki-ball-id={char.id}
                      className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-full transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:scale-105 ${
                        isRevealed ? '-translate-y-1.5 scale-105' : ''
                      }`}
                      style={{
                        boxShadow: '0 8px 16px rgba(52, 28, 10, 0.42)',
                      }}
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#302119]">
                        {char.artwork ? (
                          <img
                            src={char.artwork}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-top scale-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 ${
                              isRevealed ? 'opacity-100 scale-105' : 'opacity-0'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center font-display text-2xl font-bold text-[#FFFDF9] group-hover:opacity-100 transition-opacity duration-300 ${
                              isRevealed ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {char.name.charAt(0)}
                          </div>
                        )}

                        <TakoyakiBallCover
                          isSpicy={Boolean(char.is_spicy)}
                          seed={index + 5}
                          isRevealed={isRevealed}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom of Square Compartment: Character Name, Short Plot & "Thưởng thức" Button */}
                  <div className="w-full z-10 bg-[#FFFDF9]/92 backdrop-blur-xs rounded-xl px-3 py-2 border border-[#DEC49E] shadow-2xs">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#3D251E] group-hover:text-[#E8833A] transition-colors truncate">
                        {char.name}
                      </h3>
                      {(char.allowsFemale || char.allowsMale) && (
                        <div className="inline-flex items-center gap-0.5 shrink-0 text-xs select-none">
                          {char.allowsFemale && <span title="Chơi được giới nữ (👫)">👫</span>}
                          {char.allowsMale && <span title="Chơi được giới nam (👬)">👬</span>}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7A5C4F] line-clamp-1 mt-0.5">
                      {char.shortDescription || char.plot || 'Nhấn vào để xem chi tiết nhân vật.'}
                    </p>

                    {char.playUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayCharacter(char);
                        }}
                        className="mt-1.5 w-full py-1.5 px-3 rounded-lg bg-[#F5EBD9] hover:bg-[#E8833A] text-[#3D251E] hover:text-white border border-[#D4A373] transition-colors inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                        title="Thưởng thức takoyaki"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Thưởng thức</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* If isFresh and fewer than 3 characters exist, show cozy waiting slots */}
            {isFresh && characters.length < 3 && Array.from({ length: 3 - characters.length }).map((_, emptyIdx) => (
              <div
                key={`fresh-empty-${emptyIdx}`}
                className="aspect-square rounded-[16px] sm:rounded-[18px] p-4 flex flex-col items-center justify-center text-center wood-board-surface border border-dashed border-[#8E6538]/60"
                style={{
                  boxShadow: 'inset 0 4px 14px rgba(68, 40, 16, 0.28)',
                }}
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-[#D4A373]/50 flex items-center justify-center mb-2"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #D4BA94 0%, #C2A379 70%, #AF8E62 100%)',
                    boxShadow: 'inset 0 3px 6px rgba(61,37,30,0.22)',
                  }}
                >
                  <span className="text-xl opacity-40">♨️</span>
                </div>
                <span className="font-display text-xs font-semibold text-[#5C3A21]/80">
                  Chờ mẻ bánh mới...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
