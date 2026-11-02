import React, { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Mail,
  User as UserIcon,
  LogOut,
  LogIn,
  Flame,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { SpicyWhitelistItem } from '../types';
import {
  saveSpicyEmailToFirestore,
  deleteSpicyEmailFromFirestore,
  fetchSpicyWhitelistFromFirestore,
} from '../firebase';

const WHITELIST_CACHE_KEY = 'takoyaki_spicy_whitelist_cache_v1';

interface UserProfilePageProps {
  currentUser: FirebaseUser | null;
  isCreatorMode: boolean;
  isSpicyAllowed?: boolean;
  favoritesCount?: number;
  onGoToFavorites?: () => void;
  onGoToKitchen?: () => void;
  onLogout: () => void;
  onLoginWithGoogle: () => void;
  isSigningIn: boolean;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  isCreatorMode,
  isSpicyAllowed = false,
  favoritesCount = 0,
  onLogout,
  onLoginWithGoogle,
  isSigningIn,
}) => {
  // Whitelist management state for Creator
  const [whitelist, setWhitelist] = useState<SpicyWhitelistItem[]>([]);
  const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const saveLocalCache = (items: SpicyWhitelistItem[]) => {
    try {
      localStorage.setItem(WHITELIST_CACHE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage error
    }
  };

  // Load and 3-way sync whitelist (Server + Firestore + LocalStorage)
  const loadWhitelist = useCallback(async () => {
    if (!isCreatorMode) return;
    setIsLoadingWhitelist(true);

    // 1. Load from localStorage cache
    let localItems: SpicyWhitelistItem[] = [];
    try {
      const cached = localStorage.getItem(WHITELIST_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) localItems = parsed;
      }
    } catch {
      // Ignore
    }

    // 2. Load from Server API
    let serverItems: SpicyWhitelistItem[] = [];
    try {
      const res = await fetch('/api/spicy-whitelist');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.whitelist)) serverItems = data.whitelist;
      }
    } catch (err) {
      console.error('Failed to load server spicy whitelist:', err);
    }

    // 3. Load from Firestore Cloud DB
    const cloudItems = await fetchSpicyWhitelistFromFirestore();

    // 4. Merge all 3 sources so zero emails are ever lost
    const map = new Map<string, SpicyWhitelistItem>();
    for (const item of [...localItems, ...cloudItems, ...serverItems]) {
      if (item && item.email) {
        const key = item.email.trim().toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          email: key,
          addedAt: item.addedAt || existing?.addedAt || new Date().toISOString(),
          note: item.note || existing?.note || undefined,
        });
      }
    }

    const merged = Array.from(map.values());
    setWhitelist(merged);
    saveLocalCache(merged);
    setIsLoadingWhitelist(false);

    // 5. Backfill any missing items to Server and Firestore in background
    const serverEmails = new Set(serverItems.map((i) => i.email.toLowerCase()));
    const missingOnServer = merged
      .filter((i) => !serverEmails.has(i.email.toLowerCase()))
      .map((i) => i.email);

    if (missingOnServer.length > 0) {
      fetch('/api/spicy-whitelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: missingOnServer }),
      }).catch(() => {});
    }

    const cloudEmails = new Set(cloudItems.map((i) => i.email.toLowerCase()));
    for (const item of merged) {
      if (!cloudEmails.has(item.email.toLowerCase())) {
        void saveSpicyEmailToFirestore(item);
      }
    }
  }, [isCreatorMode]);

  useEffect(() => {
    if (isCreatorMode) {
      loadWhitelist();
    }
  }, [isCreatorMode, loadWhitelist]);

  // Handle adding single email (saves to Server + Firestore + LocalStorage)
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showNotification('Vui lòng nhập đúng định dạng email (ví dụ: friend@gmail.com)');
      return;
    }

    setIsAddingEmail(true);
    const now = new Date().toISOString();
    const newItem: SpicyWhitelistItem = {
      email: cleanEmail,
      addedAt: now,
      note: newNote.trim() || undefined,
    };

    // 1. Save to Firestore cloud
    void saveSpicyEmailToFirestore(newItem);

    try {
      // 2. Save to Server
      const res = await fetch('/api/spicy-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          note: newNote.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist) ? data.whitelist : [newItem, ...whitelist];
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setNewEmail('');
        setNewNote('');
        showNotification(`✓ Đã cấp quyền VIP cay tê cho ${cleanEmail}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || 'Có lỗi xảy ra khi thêm email.');
      }
    } catch {
      // Fallback: save locally even if server hiccups
      const nextList = [newItem, ...whitelist.filter((w) => w.email !== cleanEmail)];
      setWhitelist(nextList);
      saveLocalCache(nextList);
      setNewEmail('');
      setNewNote('');
      showNotification(`✓ Đã lưu quyền VIP cho ${cleanEmail}!`);
    } finally {
      setIsAddingEmail(false);
    }
  };

  // Handle bulk adding emails (saves to Server + Firestore + LocalStorage)
  const handleBulkAdd = async () => {
    const rawList = bulkEmailsText
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@') && s.includes('.'));

    if (rawList.length === 0) {
      showNotification('Không tìm thấy địa chỉ email hợp lệ nào trong ô nhập.');
      return;
    }

    setIsAddingEmail(true);
    const now = new Date().toISOString();
    for (const email of rawList) {
      void saveSpicyEmailToFirestore({ email, addedAt: now });
    }

    try {
      const res = await fetch('/api/spicy-whitelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: rawList }),
      });

      if (res.ok) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist) ? data.whitelist : whitelist;
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setBulkEmailsText('');
        setShowBulkAdd(false);
        showNotification(`✓ Đã thêm thành công ${data.addedCount} email vào danh sách VIP!`);
      }
    } catch {
      showNotification('Lỗi khi gửi danh sách email hàng loạt.');
    } finally {
      setIsAddingEmail(false);
    }
  };

  // Handle deleting email (removes from Server + Firestore + LocalStorage)
  const handleDeleteEmail = async (emailToDelete: string) => {
    const target = emailToDelete.trim().toLowerCase();
    if (target === 'hoangyendo1212@gmail.com') {
      showNotification('Không thể xóa quyền của tài khoản chủ tiệm Cáo Bel.');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn thu hồi quyền vị cay tê của "${emailToDelete}" không?`)) {
      return;
    }

    void deleteSpicyEmailFromFirestore(target);

    try {
      const res = await fetch(`/api/spicy-whitelist/${encodeURIComponent(target)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist)
          ? data.whitelist
          : whitelist.filter((w) => w.email.toLowerCase() !== target);
        setWhitelist(nextList);
        saveLocalCache(nextList);
        showNotification(`✓ Đã thu hồi quyền của ${emailToDelete}`);
      }
    } catch {
      const nextList = whitelist.filter((w) => w.email.toLowerCase() !== target);
      setWhitelist(nextList);
      saveLocalCache(nextList);
      showNotification(`✓ Đã thu hồi quyền của ${emailToDelete}`);
    }
  };

  // Export whitelist JSON for safe local backup
  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(whitelist, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spicy_whitelist_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('✓ Đã tải file sao lưu danh sách email về máy tính!');
  };

  // Customer loyalty badge title
  const customerRank = (() => {
    if (favoritesCount >= 9) return { title: 'Bảo Kê Quầy Bánh Cáo Bel', color: 'text-[#E57C29] bg-[#FFF3E0] border-[#FFE082]' };
    if (favoritesCount >= 4) return { title: 'Thực Khách Sành Ăn', color: 'text-[#C84B31] bg-[#FDECE8] border-[#FCA5A5]' };
    if (favoritesCount >= 1) return { title: 'Mối Ruột Mê Bánh', color: 'text-[#2E7D32] bg-[#E8F5E9] border-[#A5D6A7]' };
    return { title: 'Khách Vãng Lai Tò Mò', color: 'text-[#6D4C41] bg-[#EFEBE9] border-[#D7CCC8]' };
  })();

  // Filter whitelist for search
  const filteredWhitelist = whitelist.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.email.toLowerCase().includes(q) ||
      (item.note && item.note.toLowerCase().includes(q))
    );
  });

  // If not logged in, prompt user to sign in
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#FFFDF9] border-2 border-[#E5D3B3] text-center shadow-sm space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F5EBD9] border border-[#D4A373] flex items-center justify-center text-[#E57C29]">
            <UserIcon className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#432314]">
              Ghé tiệm Takoyaki Cáo Bel
            </h2>
            <p className="text-sm text-[#846C5B] max-w-md mx-auto leading-relaxed">
              Đăng nhập bằng tài khoản Google để lưu bánh vào hộp, xem quyền thưởng thức vị cay tê và lưu giữ danh hiệu khách quen của bạn!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onLoginWithGoogle}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSigningIn ? 'Đang kết nối...' : 'Đăng nhập với Google'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#432314] text-white text-xs sm:text-sm font-semibold shadow-xl border border-[#D4A373] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#81C784]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#432314]">
            Thực khách
          </h1>
          <p className="text-sm sm:text-base text-[#846C5B] mt-1.5">
            {isCreatorMode
              ? 'Quản trị viên tiệm Takoyaki Cáo Bel · Quản lý danh sách cấp quyền VIP'
              : 'Hồ sơ thực khách và trạng thái thưởng thức bánh của bạn.'}
          </p>
        </div>
        {isCreatorMode && (
          <span className="px-3 py-1 rounded-full bg-[#E57C29] text-white text-xs font-bold uppercase tracking-wider shadow-2xs">
            Quản trị viên CRT
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* User Info Card & Stamp Badge */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E5D3B3] shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Tài khoản của tôi'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#D4A373] shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#EADEF7] text-[#6A1B9A] border border-[#D1C4E9] flex items-center justify-center font-display font-semibold text-xl shadow-2xs">
                  <UserIcon className="w-7 h-7 stroke-[1.8] text-[#7B1FA2]" />
                </div>
              )}
              {isCreatorMode && (
                <span
                  className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#E57C29] text-[10px] text-white font-bold border border-[#FAF5EB]"
                  title="Creator / Admin"
                >
                  CRT
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base sm:text-lg font-bold text-[#432314] truncate">
                  {currentUser.displayName || 'Tài khoản của tôi'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${customerRank.color} inline-flex items-center gap-1`}>
                  <Award className="w-3 h-3" />
                  {customerRank.title}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#846C5B] truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* User Spicy Flavor Access Status */}
          <div className="p-3.5 rounded-xl bg-[#F5EBD9]/60 border border-[#E5D3B3] flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSpicyAllowed || isCreatorMode ? 'bg-[#C84B31] text-white' : 'bg-[#EADCCB] text-[#846C5B]'}`}>
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold text-[#432314] flex items-center gap-1.5">
                <span>Quyền ăn vị cay tê:</span>
                {isCreatorMode || isSpicyAllowed ? (
                  <span className="text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full text-xs font-bold border border-[#A5D6A7]">
                    ✓ Đã kích hoạt (VIP)
                  </span>
                ) : (
                  <span className="text-[#C84B31] bg-[#FDECE8] px-2 py-0.5 rounded-full text-xs font-bold border border-[#FCA5A5]">
                    ✕ Chưa kích hoạt
                  </span>
                )}
              </p>
              <p className="text-xs text-[#7A5C4F] mt-1 leading-relaxed">
                {isCreatorMode || isSpicyAllowed
                  ? 'Tài khoản của bạn đã được cấp phép! Bạn có thể thoải mái bấm Thưởng thức bất kỳ bánh nào thuộc vị cay tê.'
                  : 'Bánh vị cay tê chỉ mở cho thực khách trong danh sách VIP của Cáo. Bạn hãy nhắn tin riêng cho Cáo Bel để được thêm email nhé~'}
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CREATOR ONLY: VIP SPICY WHITELIST MANAGEMENT PANEL
            ========================================================================= */}
        {isCreatorMode && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border-2 border-[#D4A373] shadow-md space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#E5D3B3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDECE8] border border-[#FCA5A5] flex items-center justify-center text-[#C84B31]">
                  <Flame className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#432314]">
                      Cấp quyền Thưởng thức Vị Cay Tê (VIP Whitelist)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E57C29] text-white">
                      {whitelist.length} email
                    </span>
                  </div>
                  <p className="text-xs text-[#846C5B] mt-0.5">
                    Lưu trữ trên Server tiệm · Chống mất 100% · Không lo hết quota Google
                  </p>
                </div>
              </div>

              {/* Backup & Bulk actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EBDDC8] border border-[#D4A373] text-xs font-semibold text-[#432314] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title="Tải file backup về máy"
                >
                  <Download className="w-3.5 h-3.5 text-[#E57C29]" />
                  <span>Sao lưu (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(!showBulkAdd)}
                  className="px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EBDDC8] border border-[#D4A373] text-xs font-semibold text-[#432314] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E57C29]" />
                  <span>{showBulkAdd ? 'Đóng thêm nhiều' : 'Thêm hàng loạt'}</span>
                </button>
              </div>
            </div>

            {/* Bulk Add Textarea */}
            {showBulkAdd && (
              <div className="p-4 rounded-xl bg-[#F5EBD9]/60 border border-[#D4A373] space-y-3">
                <label className="block text-xs font-bold text-[#432314]">
                  Dán danh sách email (ngăn cách bởi dấu phẩy hoặc xuống dòng):
                </label>
                <textarea
                  rows={3}
                  value={bulkEmailsText}
                  onChange={(e) => setBulkEmailsText(e.target.value)}
                  placeholder="friend1@gmail.com&#10;friend2@gmail.com, friend3@gmail.com"
                  className="w-full p-2.5 rounded-lg border border-[#D4A373] bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#E57C29]"
                />
                <button
                  type="button"
                  onClick={handleBulkAdd}
                  disabled={isAddingEmail || !bulkEmailsText.trim()}
                  className="px-4 py-2 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAddingEmail ? 'Đang thêm...' : 'Xác nhận thêm hàng loạt'}
                </button>
              </div>
            )}

            {/* Single Add Form */}
            <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Nhập email độc giả... (vd: ban_a@gmail.com)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D4A373] text-xs sm:text-sm text-[#432314] placeholder-[#A68F80] focus:outline-none focus:ring-2 focus:ring-[#E57C29]"
                  required
                />
              </div>
              <div className="w-full sm:w-48">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi chú (vd: Facebook Mai)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D4A373] text-xs sm:text-sm text-[#432314] placeholder-[#A68F80] focus:outline-none focus:ring-2 focus:ring-[#E57C29]"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingEmail || !newEmail.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingEmail ? 'Đang thêm...' : 'Cấp quyền'}</span>
              </button>
            </form>

            {/* Search Filter & Whitelist Count */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-[#846C5B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm email hoặc ghi chú..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] text-xs text-[#432314] focus:outline-none focus:ring-1 focus:ring-[#E57C29]"
                />
              </div>
              <span className="text-xs text-[#846C5B]">
                Hiển thị {filteredWhitelist.length} / {whitelist.length} email
              </span>
            </div>

            {/* Whitelist Display List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-[#E5D3B3] rounded-xl border border-[#E5D3B3] bg-[#FFFDF9]">
              {isLoadingWhitelist ? (
                <div className="p-6 text-center text-xs text-[#846C5B]">
                  Đang tải danh sách email...
                </div>
              ) : filteredWhitelist.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#846C5B]">
                  {searchQuery ? 'Không tìm thấy email nào khớp với từ khóa.' : 'Chưa có email nào trong danh sách.'}
                </div>
              ) : (
                filteredWhitelist.map((item) => {
                  const isMainAdmin = item.email.toLowerCase() === 'hoangyendo1212@gmail.com';
                  return (
                    <div
                      key={item.email}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5EBD9]/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-[#432314] truncate font-mono">
                            {item.email}
                          </p>
                          {isMainAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E57C29] text-white">
                              Chủ tiệm
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#846C5B] mt-0.5">
                          {item.note && <span className="italic text-[#7A5C4F]">Ghi chú: {item.note}</span>}
                          {item.note && <span>•</span>}
                          <span>
                            {item.addedAt ? new Date(item.addedAt).toLocaleDateString('vi-VN') : 'Đã kích hoạt'}
                          </span>
                        </div>
                      </div>

                      {!isMainAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEmail(item.email)}
                          className="p-2 rounded-lg text-[#846C5B] hover:text-[#C84B31] hover:bg-[#FDECE8] transition-colors cursor-pointer"
                          title="Thu hồi quyền vị cay tê"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="pt-4 border-t border-[#E5D3B3]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-[#FDECE8] text-[#C84B31] hover:text-[#991B1B] border border-[#E5D3B3] hover:border-[#FCA5A5] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
