import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
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
  Camera,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  X,
  Check,
  Sparkles,
  Bell,
  Mail,
  Send,
} from 'lucide-react';
import { SpicyWhitelistItem, AgeVerificationRequest } from '../types';
import {
  CREATOR_ADMIN_EMAIL,
  saveSpicyEmailToFirestore,
  deleteSpicyEmailFromFirestore,
  fetchSpicyWhitelistFromFirestore,
  saveVerificationToFirestore,
  fetchVerificationsFromFirestore,
  fetchUserVerificationFromFirestore,
  updateVerificationStatusInFirestore,
  deleteVerificationFromFirestore,
  fetchNotificationSettingsFromFirestore,
  saveNotificationSettingsToFirestore,
  sendAdminVerificationNotification,
} from '../firebase';

const WHITELIST_CACHE_KEY = 'takoyaki_spicy_whitelist_cache_v1';
const VERIFICATIONS_CACHE_KEY = 'takoyaki_verifications_cache_v1';
const getUserVerificationCacheKey = (uid: string) => `takoyaki_user_verification_${uid}_v1`;

/**
 * Compress an uploaded image file to a lightweight JPEG Data URL (~45–75 KB)
 * so it uploads fast and never bloats Firestore or server JSON storage.
 */
async function compressVerificationImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 760;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(event.target?.result || ''));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh này.'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Không thể tải file ảnh.'));
    reader.readAsDataURL(file);
  });
}

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
  onSpicyAccessGranted?: () => void;
  onPendingCountChange?: (count: number) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  isCreatorMode,
  isSpicyAllowed = false,
  favoritesCount = 0,
  onLogout,
  onLoginWithGoogle,
  isSigningIn,
  onSpicyAccessGranted,
  onPendingCountChange,
}) => {
  // Strict owner check: ONLY true when logged in as hoangyendo1212@gmail.com
  const isStrictOwner = Boolean(
    isCreatorMode &&
      currentUser?.email &&
      currentUser.email.trim().toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase()
  );

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

  // 18+ Photo Verification state (Customer)
  const [userVerification, setUserVerification] = useState<AgeVerificationRequest | null>(null);
  const [isLoadingUserVerify, setIsLoadingUserVerify] = useState(false);
  const [selectedDocImage, setSelectedDocImage] = useState<string>('');
  const [selectedDocName, setSelectedDocName] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 18+ Photo Verification Queue state (Creator)
  const [verifications, setVerifications] = useState<AgeVerificationRequest[]>([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [verifyFilter, setVerifyFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [lightboxRecord, setLightboxRecord] = useState<AgeVerificationRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Creator Notification Settings (Gmail + Discord Webhook)
  const [showNotifySettings, setShowNotifySettings] = useState(false);
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState(true);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [spicyVerificationEnabled, setSpicyVerificationEnabled] = useState(true);
  const [isSavingNotify, setIsSavingNotify] = useState(false);
  const [isTestingNotify, setIsTestingNotify] = useState(false);

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

  const saveVerificationsCache = (items: AgeVerificationRequest[]) => {
    try {
      localStorage.setItem(VERIFICATIONS_CACHE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage error
    }
  };

  // =========================================================================
  // CUSTOMER: LOAD OWN 18+ VERIFICATION STATUS (FIRESTORE + SERVER + LOCAL)
  // =========================================================================
  const loadCustomerVerification = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsLoadingUserVerify(true);
    const uid = currentUser.uid;
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();

    // 1. Instant local cache
    try {
      const cached = localStorage.getItem(getUserVerificationCacheKey(uid));
      if (cached) {
        const parsed = JSON.parse(cached) as AgeVerificationRequest;
        if (parsed && parsed.userId === uid) {
          setUserVerification(parsed);
        }
      }
    } catch {
      // Ignore
    }

    // 2. Check Server API
    let serverRecord: AgeVerificationRequest | null = null;
    try {
      const res = await fetch(`/api/verifications/user/${encodeURIComponent(uid)}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.verification) {
          serverRecord = data.verification;
        }
      }
    } catch {
      // Static hosting fallback
    }

    // 3. Check Firestore Cloud
    const cloudRecord = await fetchUserVerificationFromFirestore(uid, cleanEmail);

    // Pick the most recently updated/reviewed record
    let latest: AgeVerificationRequest | null = cloudRecord || serverRecord;
    if (cloudRecord && serverRecord) {
      const cloudTime = new Date(cloudRecord.reviewedAt || cloudRecord.submittedAt).getTime();
      const serverTime = new Date(serverRecord.reviewedAt || serverRecord.submittedAt).getTime();
      latest = cloudTime >= serverTime ? cloudRecord : serverRecord;
    }

    if (latest) {
      setUserVerification(latest);
      try {
        localStorage.setItem(getUserVerificationCacheKey(uid), JSON.stringify(latest));
      } catch {
        // Ignore
      }
      if (latest.status === 'verified' && cleanEmail) {
        try {
          localStorage.setItem(`takoyaki_spicy_vip_${cleanEmail}`, 'true');
        } catch {
          // Ignore
        }
        onSpicyAccessGranted?.();
      }
    }

    setIsLoadingUserVerify(false);
  }, [currentUser, onSpicyAccessGranted]);

  useEffect(() => {
    if (currentUser) {
      loadCustomerVerification();
    } else {
      setUserVerification(null);
    }
  }, [currentUser, loadCustomerVerification]);

  // Handle customer selecting an image file
  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP) nha!');
      return;
    }
    try {
      const compressedDataUrl = await compressVerificationImage(file);
      setSelectedDocImage(compressedDataUrl);
      setSelectedDocName(file.name);
    } catch {
      showNotification('Không thể xử lý ảnh này, bạn thử chọn ảnh khác nhé!');
    }
  };

  // Handle customer submitting 18+ photo verification request
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !currentUser.email) return;
    if (!selectedDocImage) {
      showNotification('Bạn vui lòng tải lên 1 ảnh minh chứng năm sinh 18+ nhé!');
      return;
    }

    setIsSubmittingVerify(true);
    const now = new Date().toISOString();
    const recordId = `verify_${currentUser.uid}`;
    const record: AgeVerificationRequest = {
      id: recordId,
      userId: currentUser.uid,
      userEmail: currentUser.email.trim().toLowerCase(),
      userName: currentUser.displayName || currentUser.email.split('@')[0] || 'Thực khách',
      userPhoto: currentUser.photoURL || undefined,
      documentImage: selectedDocImage,
      documentName: selectedDocName || 'verification_18plus.jpg',
      note: customerNote.trim() || undefined,
      status: 'pending',
      submittedAt: now,
    };

    try {
      // 1. Save to Firestore Cloud (works on both AI Studio and GitHub Pages!)
      await saveVerificationToFirestore(record);

      // 2. Save to Server API (if running on AI Studio server)
      try {
        const res = await fetch('/api/verifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.verification) {
            record.id = data.verification.id || recordId;
          }
        }
      } catch {
        // Ignore on GitHub Pages static mode
      }

      // 3. Save to localStorage cache
      try {
        localStorage.setItem(getUserVerificationCacheKey(currentUser.uid), JSON.stringify(record));
      } catch {
        // Ignore
      }

      // 4. Automatically notify Cáo Bel via Gmail (hoangyendo1212@gmail.com) & Discord Webhook!
      void sendAdminVerificationNotification(record, false);

      setUserVerification(record);
      setSelectedDocImage('');
      setSelectedDocName('');
      setCustomerNote('');
      setIsResubmitting(false);
      showNotification('✓ Đã gửi ảnh xác minh 18+ và báo tin cho Cáo Bel duyệt nha~');
    } catch {
      showNotification('Có lỗi nhỏ khi gửi ảnh, bạn thử bấm gửi lại nhé!');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // =========================================================================
  // CREATOR: LOAD & MANAGE 18+ PHOTO VERIFICATION QUEUE + VIP WHITELIST
  // =========================================================================
  const loadVerificationsQueue = useCallback(async () => {
    if (!isStrictOwner) {
      setVerifications([]);
      return;
    }
    setIsLoadingVerifications(true);

    let localList: AgeVerificationRequest[] = [];
    try {
      const cached = localStorage.getItem(VERIFICATIONS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch {
      // Ignore
    }

    let serverList: AgeVerificationRequest[] = [];
    try {
      const res = await fetch('/api/verifications');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.verifications)) serverList = data.verifications;
      }
    } catch {
      // Ignore on static mode
    }

    const cloudList = await fetchVerificationsFromFirestore();

    // Merge by userId so each customer has 1 canonical verification entry
    const byUser = new Map<string, AgeVerificationRequest>();
    for (const item of [...localList, ...serverList, ...cloudList]) {
      if (item && item.userId && item.userEmail) {
        const existing = byUser.get(item.userId);
        if (!existing) {
          byUser.set(item.userId, item);
        } else {
          const existingTime = new Date(existing.reviewedAt || existing.submittedAt).getTime();
          const itemTime = new Date(item.reviewedAt || item.submittedAt).getTime();
          if (itemTime >= existingTime) {
            byUser.set(item.userId, {
              ...existing,
              ...item,
              documentImage: item.documentImage || existing.documentImage,
            });
          }
        }
      }
    }

    const merged = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    setVerifications(merged);
    saveVerificationsCache(merged);
    setIsLoadingVerifications(false);
  }, [isStrictOwner]);

  // Load and 3-way sync whitelist (Server + Firestore + LocalStorage)
  const loadWhitelist = useCallback(async () => {
    if (!isStrictOwner) {
      setWhitelist([]);
      return;
    }
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
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.whitelist)) serverItems = data.whitelist;
      }
    } catch {
      // Ignore
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
  }, [isStrictOwner]);

  useEffect(() => {
    if (isStrictOwner) {
      loadVerificationsQueue();
      loadWhitelist();
      fetchNotificationSettingsFromFirestore().then((settings) => {
        setEmailNotifyEnabled(settings.emailEnabled !== false);
        setDiscordWebhookUrl(settings.discordWebhookUrl || '');
      });
    } else {
      setVerifications([]);
      setWhitelist([]);
      setShowNotifySettings(false);
      setLightboxRecord(null);
      onPendingCountChange?.(0);
      try {
        localStorage.removeItem(VERIFICATIONS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  }, [isStrictOwner, loadVerificationsQueue, loadWhitelist, onPendingCountChange]);

  // Keep parent Navbar badge synced with pending count
  useEffect(() => {
    if (isStrictOwner && onPendingCountChange) {
      const pending = verifications.filter((v) => v.status === 'pending').length;
      onPendingCountChange(pending);
    } else if (!isStrictOwner && onPendingCountChange) {
      onPendingCountChange(0);
    }
  }, [verifications, isStrictOwner, onPendingCountChange]);

  const handleSaveNotifySettings = async () => {
    setIsSavingNotify(true);
    try {
      await saveNotificationSettingsToFirestore({
        emailEnabled: emailNotifyEnabled,
        discordWebhookUrl: discordWebhookUrl.trim(),
        spicyVerificationEnabled,
      });
      showNotification('✓ Đã lưu cài đặt nhận thông báo duyệt ảnh 18+!');
    } finally {
      setIsSavingNotify(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotify(true);
    try {
      await saveNotificationSettingsToFirestore({
        emailEnabled: emailNotifyEnabled,
        discordWebhookUrl: discordWebhookUrl.trim(),
      });
      const dummyRecord: AgeVerificationRequest = {
        id: 'test_notify',
        userId: currentUser?.uid || 'test_uid',
        userEmail: currentUser?.email || 'hoangyendo1212@gmail.com',
        userName: 'Thực Khách Thử Nghiệm (Test)',
        documentImage: '',
        note: 'Đây là tin nhắn kiểm tra thông báo tự động về Gmail & Discord của Cáo Bel 🦊',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      const result = await sendAdminVerificationNotification(dummyRecord, true);
      if (result.emailSent || result.discordSent) {
        showNotification(
          '✓ Đã bắn thông báo thử! Kiểm tra hộp thư Gmail (hoangyendo1212@gmail.com) hoặc Discord nha!'
        );
      } else {
        showNotification('Đã gửi yêu cầu kiểm tra! Hãy mở hộp thư Gmail hoặc phần Thư rác (Spam) nhé.');
      }
    } finally {
      setIsTestingNotify(false);
    }
  };

  // Creator: Approve 18+ Photo Verification -> Marks verified AND auto-whitelists email
  const handleApproveVerification = async (item: AgeVerificationRequest) => {
    setProcessingId(item.id);
    const now = new Date().toISOString();
    const cleanEmail = item.userEmail.trim().toLowerCase();
    const docId = item.id || `verify_${item.userId}`;

    const updatedRecord: AgeVerificationRequest = {
      ...item,
      id: docId,
      status: 'verified',
      rejectionReason: undefined,
      reviewedAt: now,
      reviewedBy: 'Cáo Bel (CRT)',
    };

    const whitelistEntry: SpicyWhitelistItem = {
      email: cleanEmail,
      addedAt: now,
      note: `Đã duyệt ảnh 18+ (${item.userName || cleanEmail})`,
    };

    try {
      // 1. Update Firestore verification + Firestore spicyWhitelist
      await saveVerificationToFirestore(updatedRecord);
      await updateVerificationStatusInFirestore(docId, 'verified', undefined, 'Cáo Bel (CRT)');
      await saveSpicyEmailToFirestore(whitelistEntry);

      // 2. Update Server verification + Server spicyWhitelist
      try {
        await fetch(`/api/verifications/${encodeURIComponent(docId)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'verified',
            reviewedBy: 'Cáo Bel (CRT)',
          }),
        });
        await fetch('/api/spicy-whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(whitelistEntry),
        });
      } catch {
        // Ignore on static GitHub Pages
      }

      // 3. Update local state & cache
      const nextVerifications = verifications.map((v) =>
        v.userId === item.userId || v.id === item.id ? updatedRecord : v
      );
      setVerifications(nextVerifications);
      saveVerificationsCache(nextVerifications);

      const nextWhitelist = [
        whitelistEntry,
        ...whitelist.filter((w) => w.email.toLowerCase() !== cleanEmail),
      ];
      setWhitelist(nextWhitelist);
      saveLocalCache(nextWhitelist);

      if (lightboxRecord?.userId === item.userId) {
        setLightboxRecord(updatedRecord);
      }

      showNotification(`✓ Đã duyệt 18+ & mở khóa Vị Cay Tê cho ${cleanEmail}!`);
    } finally {
      setProcessingId(null);
    }
  };

  // Creator: Reject 18+ Photo Verification with optional reason
  const handleConfirmReject = async (item: AgeVerificationRequest) => {
    setProcessingId(item.id);
    const now = new Date().toISOString();
    const docId = item.id || `verify_${item.userId}`;
    const reason =
      rejectionInput.trim() ||
      'Ảnh chưa rõ ngày tháng năm sinh. Bạn vui lòng chụp rõ phần Năm Sinh (18+) và gửi lại giúp Cáo nhé!';

    const updatedRecord: AgeVerificationRequest = {
      ...item,
      id: docId,
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: 'Cáo Bel (CRT)',
    };

    try {
      await saveVerificationToFirestore(updatedRecord);
      await updateVerificationStatusInFirestore(docId, 'rejected', reason, 'Cáo Bel (CRT)');

      try {
        await fetch(`/api/verifications/${encodeURIComponent(docId)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            rejectionReason: reason,
            reviewedBy: 'Cáo Bel (CRT)',
          }),
        });
      } catch {
        // Ignore on static hosting
      }

      const nextVerifications = verifications.map((v) =>
        v.userId === item.userId || v.id === item.id ? updatedRecord : v
      );
      setVerifications(nextVerifications);
      saveVerificationsCache(nextVerifications);

      if (lightboxRecord?.userId === item.userId) {
        setLightboxRecord(updatedRecord);
      }

      setRejectingId(null);
      setRejectionInput('');
      showNotification(`Đã từ chối yêu cầu của ${item.userEmail}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Creator: Delete a verification record
  const handleDeleteVerification = async (item: AgeVerificationRequest) => {
    const docId = item.id || `verify_${item.userId}`;
    void deleteVerificationFromFirestore(docId);
    if (item.id && item.id !== `verify_${item.userId}`) {
      void deleteVerificationFromFirestore(`verify_${item.userId}`);
    }
    try {
      await fetch(`/api/verifications/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore
    }
    const nextList = verifications.filter(
      (v) => v.userId !== item.userId && v.id !== item.id
    );
    setVerifications(nextList);
    saveVerificationsCache(nextList);
    if (lightboxRecord?.userId === item.userId) {
      setLightboxRecord(null);
    }
    showNotification('✓ Đã xóa yêu cầu xác minh.');
  };

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

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist) ? data.whitelist : [newItem, ...whitelist];
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setNewEmail('');
        setNewNote('');
        showNotification(`✓ Đã cấp quyền VIP cay tê cho ${cleanEmail}!`);
      } else {
        const nextList = [newItem, ...whitelist.filter((w) => w.email !== cleanEmail)];
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setNewEmail('');
        setNewNote('');
        showNotification(`✓ Đã lưu quyền VIP trên Cloud cho ${cleanEmail}!`);
      }
    } catch {
      // Fallback: save locally + Firestore even on static GitHub Pages
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

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist) ? data.whitelist : whitelist;
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setBulkEmailsText('');
        setShowBulkAdd(false);
        showNotification(`✓ Đã thêm thành công ${data.addedCount} email vào danh sách VIP!`);
      } else {
        const addedItems: SpicyWhitelistItem[] = rawList.map((email) => ({
          email,
          addedAt: now,
        }));
        const existingSet = new Set(rawList);
        const nextList = [
          ...addedItems,
          ...whitelist.filter((w) => !existingSet.has(w.email.toLowerCase())),
        ];
        setWhitelist(nextList);
        saveLocalCache(nextList);
        setBulkEmailsText('');
        setShowBulkAdd(false);
        showNotification(`✓ Đã thêm ${rawList.length} email vào Cloud VIP!`);
      }
    } catch {
      const addedItems: SpicyWhitelistItem[] = rawList.map((email) => ({
        email,
        addedAt: now,
      }));
      const existingSet = new Set(rawList);
      const nextList = [
        ...addedItems,
        ...whitelist.filter((w) => !existingSet.has(w.email.toLowerCase())),
      ];
      setWhitelist(nextList);
      saveLocalCache(nextList);
      setBulkEmailsText('');
      setShowBulkAdd(false);
      showNotification(`✓ Đã thêm ${rawList.length} email vào danh sách VIP!`);
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

    void deleteSpicyEmailFromFirestore(target);

    try {
      const res = await fetch(`/api/spicy-whitelist/${encodeURIComponent(target)}`, {
        method: 'DELETE',
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const nextList = Array.isArray(data.whitelist)
          ? data.whitelist
          : whitelist.filter((w) => w.email.toLowerCase() !== target);
        setWhitelist(nextList);
        saveLocalCache(nextList);
        showNotification(`✓ Đã thu hồi quyền của ${emailToDelete}`);
      } else {
        const nextList = whitelist.filter((w) => w.email.toLowerCase() !== target);
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
    if (favoritesCount >= 9)
      return {
        title: 'Bảo Kê Quầy Bánh Cáo Bel',
        color: 'text-[#E57C29] bg-[#FFF3E0] border-[#FFE082]',
      };
    if (favoritesCount >= 4)
      return {
        title: 'Thực Khách Sành Ăn',
        color: 'text-[#C84B31] bg-[#FDECE8] border-[#FCA5A5]',
      };
    if (favoritesCount >= 1)
      return {
        title: 'Mối Ruột Mê Bánh',
        color: 'text-[#2E7D32] bg-[#E8F5E9] border-[#A5D6A7]',
      };
    return {
      title: 'Khách Vãng Lai Tò Mò',
      color: 'text-[#6D4C41] bg-[#EFEBE9] border-[#D7CCC8]',
    };
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

  // Counts & Filtered Verifications for Creator Queue
  const pendingCount = verifications.filter((v) => v.status === 'pending').length;
  const verifiedCount = verifications.filter((v) => v.status === 'verified').length;
  const rejectedCount = verifications.filter((v) => v.status === 'rejected').length;

  const filteredVerifications = verifications.filter((v) => {
    if (verifyFilter === 'all') return true;
    return v.status === verifyFilter;
  });

  const isUserVerifiedOrAllowed =
    isStrictOwner || isSpicyAllowed || userVerification?.status === 'verified';

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
              Đăng nhập bằng tài khoản Google để lưu bánh vào hộp, gửi ảnh xác minh độ tuổi 18+ mở khóa thực đơn Vị Cay Tê và lưu giữ danh hiệu khách quen của bạn!
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
            {isStrictOwner
              ? 'Quản trị viên tiệm Takoyaki Cáo Bel · Duyệt ảnh 18+ & Quản lý danh sách VIP'
              : 'Hồ sơ thực khách và xác minh độ tuổi 18+ mở khóa Vị Cay Tê.'}
          </p>
        </div>
        {isStrictOwner && (
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
              {isStrictOwner && (
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
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${customerRank.color} inline-flex items-center gap-1`}
                >
                  <Award className="w-3 h-3" />
                  {customerRank.title}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#846C5B] truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* User Spicy Flavor Access Status Banner */}
          <div className="p-3.5 rounded-xl bg-[#F5EBD9]/60 border border-[#E5D3B3] flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isUserVerifiedOrAllowed
                  ? 'bg-[#C84B31] text-white'
                  : userVerification?.status === 'pending'
                  ? 'bg-[#E57C29] text-white'
                  : 'bg-[#EADCCB] text-[#846C5B]'
              }`}
            >
              <Flame className="w-4 h-4 fill-current" />
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold text-[#432314] flex items-center gap-1.5 flex-wrap">
                <span>Quyền ăn vị cay tê (18+):</span>
                {isUserVerifiedOrAllowed ? (
                  <span className="text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full text-xs font-bold border border-[#A5D6A7]">
                    ✓ Đã xác minh 18+ (Đã mở khóa)
                  </span>
                ) : userVerification?.status === 'pending' ? (
                  <span className="text-[#E65100] bg-[#FFF3E0] px-2 py-0.5 rounded-full text-xs font-bold border border-[#FFE082]">
                    ⏳ Đang chờ Cáo Bel duyệt ảnh
                  </span>
                ) : userVerification?.status === 'rejected' ? (
                  <span className="text-[#C84B31] bg-[#FDECE8] px-2 py-0.5 rounded-full text-xs font-bold border border-[#FCA5A5]">
                    ✕ Cần gửi lại ảnh xác minh
                  </span>
                ) : (
                  <span className="text-[#C84B31] bg-[#FDECE8] px-2 py-0.5 rounded-full text-xs font-bold border border-[#FCA5A5]">
                    🔒 Chưa mở khóa
                  </span>
                )}
              </p>
              <p className="text-xs text-[#7A5C4F] mt-1 leading-relaxed">
                {isUserVerifiedOrAllowed
                  ? 'Tài khoản của bạn đã được xác minh 18+! Bạn có thể thoải mái bấm Thưởng thức bất kỳ viên takoyaki nào thuộc khay Vị Cay Tê.'
                  : userVerification?.status === 'pending'
                  ? 'Ảnh xác minh độ tuổi của bạn đã được gửi tới quầy của Cáo Bel. Ngay khi Cáo bấm duyệt, khay bánh Vị Cay Tê sẽ tự động mở khóa cho bạn!'
                  : 'Khay bánh Vị Cay Tê chỉ dành cho thực khách đủ 18 tuổi trở lên. Bạn hãy gửi ảnh xác minh năm sinh ở khung bên dưới để Cáo duyệt mở khóa nhé!'}
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CUSTOMER VIEW: 18+ PHOTO AGE VERIFICATION CARD
            ========================================================================= */}
        {!isStrictOwner && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border-2 border-[#D4A373] shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#E5D3B3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDECE8] border border-[#FCA5A5] flex items-center justify-center text-[#C84B31]">
                  <ShieldCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#432314]">
                    Xác minh độ tuổi 18+ (Mở khóa Vị Cay Tê 🌶️)
                  </h2>
                  <p className="text-xs text-[#846C5B] mt-0.5">
                    Gửi ảnh minh chứng năm sinh (đủ 18+) để chủ tiệm Cáo Bel duyệt quyền thưởng thức
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadCustomerVerification}
                disabled={isLoadingUserVerify}
                className="px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EBDDC8] border border-[#D4A373] text-xs font-semibold text-[#432314] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#E57C29] ${isLoadingUserVerify ? 'animate-spin' : ''}`} />
                <span>Kiểm tra trạng thái</span>
              </button>
            </div>

            {/* CASE 1: ALREADY VERIFIED OR WHITELISTED */}
            {isUserVerifiedOrAllowed ? (
              <div className="p-5 rounded-2xl bg-[#E8F5E9]/70 border border-[#A5D6A7] flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#1B5E20]">
                    Chúc mừng! Bạn đã được cấp quyền Thưởng thức Vị Cay Tê 18+ 🎉
                  </h3>
                  <p className="text-xs sm:text-sm text-[#2E7D32] leading-relaxed">
                    Tài khoản <strong>{currentUser.email}</strong> đã nằm trong danh sách VIP 18+ của tiệm Cáo Bel. Bạn có thể ghé khay bánh Vị Cay Tê và thưởng thức mọi câu chuyện ngay bây giờ!
                  </p>
                </div>
              </div>
            ) : userVerification?.status === 'pending' && !isResubmitting ? (
              /* CASE 2: PENDING APPROVAL */
              <div className="p-5 rounded-2xl bg-[#FFF3E0]/80 border border-[#FFE082] space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E57C29] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-base font-bold text-[#432314]">
                        Đang chờ chủ tiệm Cáo Bel duyệt ảnh ⏳
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E57C29] text-white">
                        Đã gửi lúc {new Date(userVerification.submittedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#684932] leading-relaxed">
                      Cáo đã nhận được ảnh xác minh của bạn rồi nha! Sau khi Cáo kiểm tra và bấm duyệt, trạng thái của bạn sẽ chuyển sang <strong>Đã xác minh 18+</strong>.
                    </p>
                    {userVerification.note && (
                      <p className="text-xs italic text-[#7A5C4F] pt-1">
                        Lời nhắn của bạn: "{userVerification.note}"
                      </p>
                    )}
                  </div>
                </div>

                {userVerification.documentImage && (
                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#FFE082] flex-wrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={userVerification.documentImage}
                        alt="Ảnh xác minh đã gửi"
                        className="w-20 h-14 object-cover rounded-lg border border-[#D4A373] shadow-2xs"
                      />
                      <span className="text-xs text-[#7A5C4F]">
                        Ảnh minh chứng đã gửi ({userVerification.documentName || 'Ảnh 18+'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsResubmitting(true)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5EBD9] text-[#432314] border border-[#D4A373] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Đổi ảnh khác
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* CASE 3: NOT SUBMITTED YET OR REJECTED OR RESUBMITTING */
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                {userVerification?.status === 'rejected' && (
                  <div className="p-4 rounded-2xl bg-[#FDECE8] border border-[#FCA5A5] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#C84B31] shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-[#991B1B] space-y-1">
                      <p className="font-bold">Yêu cầu trước đó chưa được duyệt:</p>
                      <p>
                        {userVerification.rejectionReason ||
                          'Ảnh minh chứng chưa nhìn rõ năm sinh 18+. Bạn vui lòng chụp rõ hơn và gửi lại nhé!'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Privacy Tip Box */}
                <div className="p-3.5 rounded-xl bg-[#F5EBD9]/70 border border-[#E5D3B3] text-xs text-[#54382E] space-y-1 leading-relaxed">
                  <p className="font-bold text-[#432314]">
                    🛡️ Hướng dẫn che thông tin bảo mật khi chụp ảnh:
                  </p>
                  <p>
                    • Bạn có thể dùng <strong>CCCD, Thẻ học sinh/sinh viên, Bằng lái xe, hoặc giấy tờ có ngày sinh</strong>.
                  </p>
                  <p>
                    • <strong>Hãy dùng ngón tay hoặc vẽ che kín số CCCD, địa chỉ, ảnh chân dung, mã QR</strong> — chỉ cần để lộ rõ <strong>Năm sinh (từ đủ 16 tuổi trở lên) và Họ tên</strong> để Cáo xác nhận là được nha!
                  </p>
                </div>

                {/* Upload Dropzone */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectPhoto}
                    className="hidden"
                  />

                  {!selectedDocImage ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-[#D4A373] hover:border-[#E57C29] bg-[#FAF5EB]/60 hover:bg-[#F5EBD9]/60 transition-colors flex flex-col items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#FFFDF9] border border-[#D4A373] flex items-center justify-center text-[#E57C29] shadow-2xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#432314]">
                          Bấm vào đây để chọn hoặc chụp ảnh xác minh 18+
                        </p>
                        <p className="text-xs text-[#846C5B] mt-0.5">
                          Hỗ trợ ảnh JPG, PNG, WEBP · Tự động nén nhẹ bảo mật
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#FAF5EB] border border-[#D4A373] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={selectedDocImage}
                          alt="Preview"
                          className="w-24 h-16 object-cover rounded-xl border border-[#D4A373] shadow-xs"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#432314] truncate max-w-[220px]">
                            {selectedDocName || 'Ảnh xác minh 18+'}
                          </p>
                          <p className="text-[11px] text-[#2E7D32] font-semibold mt-0.5">
                            ✓ Ảnh đã sẵn sàng để gửi duyệt
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5EBD9] border border-[#D4A373] text-xs font-semibold text-[#432314] cursor-pointer"
                        >
                          Chọn ảnh khác
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocImage('');
                            setSelectedDocName('');
                          }}
                          className="p-1.5 rounded-xl text-[#C84B31] hover:bg-[#FDECE8] cursor-pointer"
                          title="Xóa ảnh đã chọn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Customer Note */}
                <div>
                  <label className="block text-xs font-bold text-[#432314] mb-1.5">
                    Lời nhắn cho Cáo Bel (không bắt buộc):
                  </label>
                  <input
                    type="text"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="Ví dụ: Mình sinh năm 2004, nhờ Cáo duyệt mở khóa vị cay tê giúp mình nha!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D4A373] text-xs sm:text-sm text-[#432314] placeholder-[#A68F80] focus:outline-none focus:ring-2 focus:ring-[#E57C29]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  {isResubmitting && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResubmitting(false);
                        setSelectedDocImage('');
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#846C5B] hover:text-[#432314] cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingVerify || !selectedDocImage}
                    className="px-6 py-2.5 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isSubmittingVerify ? 'Đang gửi ảnh...' : 'Gửi ảnh xác minh 18+'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            CREATOR ONLY PANEL 1: 18+ PHOTO VERIFICATION REVIEW QUEUE
            ========================================================================= */}
        {isStrictOwner && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border-2 border-[#E57C29] shadow-md space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#E5D3B3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF3E0] border border-[#FFE082] flex items-center justify-center text-[#E57C29]">
                  <ShieldCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#432314]">
                      Hàng đợi duyệt ảnh 18+ (Thực khách gửi)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C84B31] text-white">
                      {pendingCount} chờ duyệt
                    </span>
                  </div>
                  <p className="text-xs text-[#846C5B] mt-0.5">
                    Khi bấm &ldquo;Duyệt 18+&rdquo;, hệ thống sẽ tự động thêm email khách vào danh sách VIP Vị Cay Tê
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowNotifySettings((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    showNotifySettings
                      ? 'bg-[#E57C29] text-white border-[#E57C29]'
                      : 'bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#E65100] border-[#FFE082]'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>🔔 Cài đặt báo về Gmail / Discord</span>
                </button>

                <button
                  type="button"
                  onClick={loadVerificationsQueue}
                  disabled={isLoadingVerifications}
                  className="px-3 py-1.5 rounded-xl bg-[#F5EBD9] hover:bg-[#EBDDC8] border border-[#D4A373] text-xs font-semibold text-[#432314] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#E57C29] ${
                      isLoadingVerifications ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Collapsible Admin Notification Settings (Gmail & Discord Webhook) */}
            {showNotifySettings && (
              <div className="p-4 rounded-2xl bg-[#FFF8EE] border-2 border-[#FFE082] space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#432314] flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#E57C29]" />
                      <span>Nhận thông báo tự động khi có khách gửi ảnh 18+</span>
                    </h3>
                    <p className="text-xs text-[#7A5C4F] leading-relaxed">
                      Vì ảnh giấy tờ 18+ của khách cần bảo mật riêng tư (không đăng công khai lên GitHub Issues), hệ thống sẽ bắn thông báo thẳng về <strong>Gmail (hoangyendo1212@gmail.com)</strong> và <strong>Discord</strong> của Cáo ngay khi khách bấm gửi ảnh!
                    </p>
                  </div>
                </div>

                {/* Option 1: Gmail Auto-Alert */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E5D3B3] space-y-2">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-[#C84B31] shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#432314]">
                          1. Gửi thông báo về Gmail: <span className="font-mono text-[#E57C29]">hoangyendo1212@gmail.com</span>
                        </p>
                        <p className="text-[11px] text-[#846C5B]">
                          Lưu ý: Lần đầu tiên bấm &ldquo;Gửi thử thông báo&rdquo;, bạn mở hộp thư Gmail (hoặc mục Quảng cáo/Spam) tìm thư của <strong>FormSubmit</strong> và bấm nút <strong>Activate Form</strong> 1 lần duy nhất là từ sau thư sẽ tự động nhảy về Gmail như thông báo GitHub!
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailNotifyEnabled}
                      onChange={(e) => setEmailNotifyEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#E57C29] rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>

                {/* Option: Spicy Verification Toggle */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E5D3B3] space-y-2">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-4 h-4 text-[#C84B31] shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#432314]">
                          Thả cảng Vị cay tê (Bỏ qua duyệt 18+)
                        </p>
                        <p className="text-[11px] text-[#846C5B]">
                          Khi bật, thực khách sẽ không cần gửi ảnh xác minh để mở Vị cay tê.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={spicyVerificationEnabled}
                      onChange={(e) => setSpicyVerificationEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#E57C29] rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>

                {/* Option 2: Discord Webhook */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E5D3B3] space-y-2">
                  <label className="block text-xs sm:text-sm font-bold text-[#432314]">
                    2. Báo tin thẳng vào Discord của Cáo (Tùy chọn · Siêu nhạy):
                  </label>
                  <p className="text-[11px] text-[#846C5B] leading-relaxed">
                    Cách lấy link trong 10 giây: Vào server Discord riêng của bạn → Bấm biểu tượng ⚙️ <strong>Chỉnh sửa kênh (Edit Channel)</strong> → <strong>Tích hợp (Integrations)</strong> → <strong>Webhooks</strong> → <strong>Tạo Webhook (New Webhook)</strong> → <strong>Sao chép URL Webhook (Copy Webhook URL)</strong> rồi dán vào ô dưới đây:
                  </p>
                  <input
                    type="url"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF5EB] border border-[#D4A373] text-xs font-mono text-[#432314] placeholder-[#A68F80] focus:outline-none focus:ring-2 focus:ring-[#E57C29]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={isTestingNotify}
                    onClick={handleTestNotification}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5EBD9] text-[#432314] border border-[#D4A373] text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#E57C29]" />
                    <span>
                      {isTestingNotify ? 'Đang gửi thử...' : '📨 Gửi thử thông báo (Kích hoạt Gmail / Test Discord)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingNotify}
                    onClick={handleSaveNotifySettings}
                    className="px-4 py-2 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingNotify ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'pending', label: `⏳ Chờ duyệt (${pendingCount})` },
                { id: 'verified', label: `✓ Đã duyệt (${verifiedCount})` },
                { id: 'rejected', label: `✕ Từ chối (${rejectedCount})` },
                { id: 'all', label: `Tất cả (${verifications.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setVerifyFilter(tab.id as 'pending' | 'verified' | 'rejected' | 'all')
                  }
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    verifyFilter === tab.id
                      ? 'bg-[#E57C29] text-white shadow-2xs'
                      : 'bg-[#F5EBD9] text-[#7A5C4F] hover:text-[#432314]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Verification Cards List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {isLoadingVerifications ? (
                <div className="p-8 text-center text-xs text-[#846C5B]">
                  Đang tải danh sách yêu cầu xác minh 18+...
                </div>
              ) : filteredVerifications.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FAF5EB] border border-[#E5D3B3] text-center space-y-1">
                  <p className="text-sm font-bold text-[#432314]">
                    {verifyFilter === 'pending'
                      ? 'Hiện không có yêu cầu xác minh 18+ nào đang chờ duyệt.'
                      : 'Chưa có dữ liệu trong mục này.'}
                  </p>
                  <p className="text-xs text-[#846C5B]">
                    Khi thực khách gửi ảnh xác minh độ tuổi, yêu cầu sẽ xuất hiện ngay tại đây!
                  </p>
                </div>
              ) : (
                filteredVerifications.map((item) => {
                  const isBusy = processingId === item.id;
                  const isRejectingThis = rejectingId === item.id;
                  return (
                    <div
                      key={item.id || item.userId}
                      className="p-4 rounded-2xl bg-[#FAF5EB] border border-[#D4A373] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        {/* Customer Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {item.userPhoto ? (
                            <img
                              src={item.userPhoto}
                              alt={item.userName}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-[#D4A373] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#E57C29] text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {(item.userName || item.userEmail || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#432314] truncate">
                                {item.userName}
                              </p>
                              {item.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] border border-[#FFE082]">
                                  ⏳ Chờ duyệt
                                </span>
                              )}
                              {item.status === 'verified' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                                  ✓ Đã duyệt 18+
                                </span>
                              )}
                              {item.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDECE8] text-[#C84B31] border border-[#FCA5A5]">
                                  ✕ Đã từ chối
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-[#7A5C4F] truncate">
                              {item.userEmail}
                            </p>
                            <p className="text-[11px] text-[#846C5B] mt-0.5">
                              Gửi lúc: {new Date(item.submittedAt).toLocaleString('vi-VN')}
                            </p>
                            {item.note && (
                              <p className="mt-1.5 p-2 rounded-lg bg-[#FFFDF9] border border-[#E5D3B3] text-xs text-[#432314] italic">
                                💬 &ldquo;{item.note}&rdquo;
                              </p>
                            )}
                            {item.status === 'rejected' && item.rejectionReason && (
                              <p className="mt-1 text-xs text-[#C84B31]">
                                Lý do từ chối: {item.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Document Thumbnail */}
                        {item.documentImage && (
                          <button
                            type="button"
                            onClick={() => setLightboxRecord(item)}
                            className="group relative w-full sm:w-36 h-24 rounded-xl overflow-hidden border-2 border-[#D4A373] bg-black/5 shrink-0 cursor-pointer"
                            title="Bấm để phóng to ảnh xác minh"
                          >
                            <img
                              src={item.documentImage}
                              alt="Ảnh xác minh 18+"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4" />
                              <span>Xem rõ ảnh</span>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Inline Rejection Reason Input */}
                      {isRejectingThis && (
                        <div className="p-3 rounded-xl bg-[#FDECE8] border border-[#FCA5A5] space-y-2">
                          <label className="block text-xs font-bold text-[#991B1B]">
                            Nhập lý do từ chối (để khách biết và chụp lại):
                          </label>
                          <input
                            type="text"
                            value={rejectionInput}
                            onChange={(e) => setRejectionInput(e.target.value)}
                            placeholder="Ví dụ: Ảnh bị mờ năm sinh, bạn chụp rõ năm sinh giúp Cáo nhé!"
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#FCA5A5] text-xs text-[#432314] focus:outline-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionInput('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7A5C4F] hover:text-[#432314] cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmReject(item)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#C84B31] hover:bg-[#A83820] text-white text-xs font-semibold cursor-pointer"
                            >
                              Xác nhận từ chối
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5D3B3] flex-wrap">
                        <button
                          type="button"
                          onClick={() => setLightboxRecord(item)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5EBD9] border border-[#D4A373] text-xs font-semibold text-[#432314] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#E57C29]" />
                          <span>Phóng to ảnh</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {item.status !== 'verified' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApproveVerification(item)}
                              className="px-4 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt 18+ & Cấp VIP</span>
                            </button>
                          )}

                          {item.status !== 'rejected' && !isRejectingThis && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectingId(item.id);
                                setRejectionInput('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#FDECE8] hover:bg-[#FCA5A5]/40 text-[#C84B31] border border-[#FCA5A5] text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ chối</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteVerification(item)}
                            className="p-1.5 rounded-lg text-[#846C5B] hover:text-[#C84B31] hover:bg-[#FDECE8] transition-colors cursor-pointer"
                            title="Xóa yêu cầu này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            CREATOR ONLY PANEL 2: VIP SPICY WHITELIST MANAGEMENT PANEL
            ========================================================================= */}
        {isStrictOwner && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border-2 border-[#D4A373] shadow-md space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#E5D3B3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDECE8] border border-[#FCA5A5] flex items-center justify-center text-[#C84B31]">
                  <Flame className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#432314]">
                      Cấp quyền nhanh bằng Email (VIP Whitelist)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E57C29] text-white">
                      {whitelist.length} email
                    </span>
                  </div>
                  <p className="text-xs text-[#846C5B] mt-0.5">
                    Đồng bộ tự động với hàng đợi duyệt ảnh 18+ · Lưu trên Cloud & Server
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
            <form
              onSubmit={handleAddEmail}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
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
                  {searchQuery
                    ? 'Không tìm thấy email nào khớp với từ khóa.'
                    : 'Chưa có email nào trong danh sách.'}
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
                          {item.note && (
                            <span className="italic text-[#7A5C4F]">Ghi chú: {item.note}</span>
                          )}
                          {item.note && <span>•</span>}
                          <span>
                            {item.addedAt
                              ? new Date(item.addedAt).toLocaleDateString('vi-VN')
                              : 'Đã kích hoạt'}
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

      {/* Lightbox Modal for Creator to inspect 18+ verification photo */}
      {isStrictOwner && lightboxRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-[#FFFDF9] border-2 border-[#D4A373] rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 sm:px-6 bg-[#F5EBD9] border-b border-[#E5D3B3] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-[#432314] truncate">
                  Ảnh xác minh 18+ · {lightboxRecord.userName}
                </p>
                <p className="text-xs font-mono text-[#7A5C4F] truncate">
                  {lightboxRecord.userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxRecord(null)}
                className="p-1.5 rounded-xl text-[#846C5B] hover:text-[#432314] hover:bg-[#E5D3B3]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-[#2A1810] flex items-center justify-center max-h-[65vh] overflow-auto">
              <img
                src={lightboxRecord.documentImage}
                alt={lightboxRecord.userName}
                className="max-w-full max-h-[58vh] object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="p-4 sm:px-6 bg-[#FFFDF9] border-t border-[#E5D3B3] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[#7A5C4F]">
                {lightboxRecord.note ? (
                  <span>💬 Lời nhắn: &ldquo;{lightboxRecord.note}&rdquo;</span>
                ) : (
                  <span>Gửi lúc: {new Date(lightboxRecord.submittedAt).toLocaleString('vi-VN')}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {lightboxRecord.status !== 'verified' && (
                  <button
                    type="button"
                    disabled={processingId === lightboxRecord.id}
                    onClick={() => handleApproveVerification(lightboxRecord)}
                    className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Duyệt 18+ & Cấp VIP</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxRecord(null)}
                  className="px-4 py-2 rounded-xl bg-[#F5EBD9] hover:bg-[#E5D3B3] text-[#432314] text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
