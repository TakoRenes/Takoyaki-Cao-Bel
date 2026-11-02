import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { Search, User, ChevronDown } from 'lucide-react';
import { FoxJumpscare } from './FoxJumpscare';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  favoritesCount: number;
  isCreatorMode: boolean;
  userEmail: string | null;
  userPhotoUrl: string | null;
  onOpenSearch: () => void;
  onToggleCreatorModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  favoritesCount,
  isCreatorMode,
  userEmail,
  userPhotoUrl,
  onOpenSearch,
  onToggleCreatorModal,
}) => {
  const [isJumpscareOpen, setIsJumpscareOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'discover', label: 'Discover' },
    { id: 'fresh', label: 'Fresh' },
    { id: 'ranking', label: 'Ranking' },
    {
      id: 'my-box',
      label: favoritesCount > 0 ? `My Box (${favoritesCount})` : 'My Box',
    },
    { id: 'feedback', label: 'Feedback' },
  ];

  if (isCreatorMode) {
    navItems.push({ id: 'kitchen', label: 'Kitchen' });
  }

  const currentItem = navItems.find((item) => item.id === activeTab);
  const currentTabLabel =
    currentItem?.label ||
    (activeTab === 'welcome'
      ? 'Trang chủ'
      : activeTab === 'profile'
      ? 'Tôi'
      : 'Menu');

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#FAF5EB]/95 backdrop-blur-md border-b border-[#EBDDC8] relative">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo + Navigation */}
          <div className="flex items-center gap-3 sm:gap-7 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Cáo Bel Takoyaki Mascot - Jumpscare Easter Egg Trigger */}
              <button
                type="button"
                onClick={() => setIsJumpscareOpen(true)}
                className="relative h-10 sm:h-11 flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-150 hover:scale-115 active:scale-90 focus-visible:outline-none"
                title="Đừng chọc Cáo Bel nha! 🦊 (Click thử xem...)"
                aria-label="Cáo Bel Mascot"
              >
                <img
                  src="/assets/aistudio/download__1__a6655be3.png"
                  alt="Takoyaki Cáo Bel"
                  className="h-full w-auto max-w-[80px] object-contain drop-shadow-xs"
                />
              </button>

              {/* Brand Text - Pure decorative text, no link */}
              <span className="font-display text-2xl font-bold tracking-tight text-[#432314] -ml-0.5 sm:-ml-1 select-none">
                Cáo Bel
              </span>
            </div>

            {/* Desktop Navigation (visible on md+) */}
            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-1"
            >
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#EFE4D2] text-[#432314] font-semibold'
                        : 'text-[#846C5B] hover:text-[#432314]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Dropdown Menu Trigger Button with Arrow */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all border cursor-pointer select-none ${
                  isMobileMenuOpen
                    ? 'bg-[#E57C29] text-white border-[#E57C29] shadow-sm'
                    : 'bg-[#EFE4D2] text-[#432314] border-[#E2D2BD] hover:bg-[#E8D8C0]'
                }`}
                aria-expanded={isMobileMenuOpen}
                aria-label="Danh sách mục điều hướng"
                title="Bấm để xem các mục"
              >
                <span className="truncate max-w-[110px]">{currentTabLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    isMobileMenuOpen ? 'rotate-180 text-white' : 'text-[#7A5F4D]'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right: Search + Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSearch();
              }}
              className="p-2 text-[#6B4E3D] hover:text-[#432314] rounded-full hover:bg-[#EFE4D2]/60 transition-colors cursor-pointer"
              title="Search characters"
              aria-label="Search characters"
            >
              <Search className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab('profile');
              }}
              className={`p-1.5 text-[#6B4E3D] hover:text-[#432314] rounded-full hover:bg-[#EFE4D2]/60 transition-colors cursor-pointer relative flex items-center justify-center ${
                activeTab === 'profile' ? 'ring-2 ring-[#E57C29] bg-[#EFE4D2]' : ''
              }`}
              title={userEmail ? `Tôi (${userEmail})` : 'Tôi · Đăng nhập với Google'}
              aria-label="Trang Tôi"
            >
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="User profile"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#D4A373]"
                />
              ) : (
                <User className="w-5 h-5 stroke-[2.2]" />
              )}
              {isCreatorMode && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#E57C29] border border-[#FAF5EB]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel when user taps the arrow button */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 z-40 md:hidden bg-[#FAF5EB] border-b border-[#EBDDC8] shadow-2xl px-3.5 py-2.5 flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
              <div className="px-2.5 pt-1 pb-1 text-[11px] font-bold text-[#A48873] uppercase tracking-wider">
                Chọn trang
              </div>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#E57C29] text-white font-semibold shadow-xs'
                        : 'text-[#432314] hover:bg-[#EFE4D2]/80 active:bg-[#EFE4D2]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </header>

    <FoxJumpscare
      isOpen={isJumpscareOpen}
      onClose={() => setIsJumpscareOpen(false)}
    />
  </>
);
};
