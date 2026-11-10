import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import {
  TakoyakiCharacter,
  FeedbackReview,
  SpicyWhitelistItem,
  AgeVerificationRequest,
} from './types';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with multi-tier persistence and proper popup resolver
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const CREATOR_ADMIN_EMAIL = 'hoangyendo1212@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let inFlightSignIn: Promise<unknown> | null = null;

export async function signInWithGoogle() {
  if (inFlightSignIn) {
    return inFlightSignIn;
  }
  try {
    inFlightSignIn = signInWithPopup(auth, googleProvider);
    const result = await inFlightSignIn;
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes('Pending promise was never set') ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      console.warn('Google sign-in popup closed or cancelled by user:', errorMsg);
      return null;
    }
    throw err;
  } finally {
    inFlightSignIn = null;
  }
}

export async function signOutUser() {
  return signOut(auth);
}

/**
 * Subscribe to the signed-in user's private Takoyaki Box (`users/{uid}/box`).
 */
export function subscribeToUserBox(
  uid: string,
  onUpdate: (characterIds: string[]) => void
): () => void {
  const boxCollection = collection(db, 'users', uid, 'box');
  let isCancelled = false;
  getDocs(boxCollection)
    .then((snapshot) => {
      if (isCancelled) return;
      const ids: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.characterId === 'string') {
          ids.push(data.characterId);
        } else {
          ids.push(docSnap.id);
        }
      });
      onUpdate(ids);
    })
    .catch((error) => {
      console.warn('Firestore user box fetch notice:', error?.message || error);
    });
  return () => {
    isCancelled = true;
  };
}

/**
 * Add a character to the signed-in user's private Takoyaki Box in Firestore.
 */
export async function addCharacterToUserBox(uid: string, characterId: string): Promise<void> {
  const safeUid = uid.slice(0, 128);
  const safeCharId = characterId.slice(0, 128);
  if (!safeUid || !safeCharId) {
    return;
  }
  try {
    await setDoc(doc(db, 'users', safeUid, 'box', safeCharId), {
      userId: safeUid,
      characterId: safeCharId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to save to user box in Firestore:', error);
  }
}

/**
 * Remove a character from the signed-in user's private Takoyaki Box in Firestore.
 */
export async function removeCharacterFromUserBox(uid: string, characterId: string): Promise<void> {
  const safeUid = uid.slice(0, 128);
  const safeCharId = characterId.slice(0, 128);
  if (!safeUid || !safeCharId) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'users', safeUid, 'box', safeCharId));
  } catch (error) {
    console.warn('Failed to delete from user box in Firestore:', error);
  }
}

/**
 * Load characters stored in Firestore using a quota-efficient one-time fetch
 * instead of a continuous onSnapshot stream that re-reads all 350KB+ documents
 * on every viewCount/playCount increment.
 */
export function subscribeToCharacters(
  isCreator: boolean,
  onUpdate: (characters: TakoyakiCharacter[]) => void
): () => void {
  let isCancelled = false;
  const charactersCollection = collection(db, 'characters');
  const q = isCreator
    ? charactersCollection
    : query(charactersCollection, where('status', '==', 'published'));

  getDocs(q)
    .then((snapshot) => {
      if (isCancelled) return;
      const chars: TakoyakiCharacter[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name) {
          const artwork = data.artwork || '';
          chars.push({
            id: docSnap.id,
            name: data.name || '',
            artwork,
            avatar: data.avatar || artwork,
            coverImage: data.coverImage || artwork,
            shortDescription: data.shortDescription || '',
            plot: data.plot || '',
            personality: data.personality || '',
            scenario: data.scenario || '',
            openingScene: data.openingScene || '',
            setting: data.setting || '',
            relationship: data.relationship || '',
            genre: data.genre || 'Slice of Life',
            tags: Array.isArray(data.tags) ? data.tags : [],
            contentWarning: data.contentWarning || '',
            creator: data.creator || 'Cáo Bel',
            playUrl: data.playUrl || '',
            is_spicy: Boolean(data.is_spicy),
            allowsMale: Boolean(data.allowsMale),
            allowsFemale: data.allowsFemale !== undefined ? Boolean(data.allowsFemale) : false,
            playCount: Math.max(0, Number(data.playCount) || 0),
            viewCount: Math.max(0, Number(data.viewCount) || 0),
            favoriteCount: Math.max(0, Number(data.favoriteCount) || 0),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            status: data.status === 'draft' ? 'draft' : 'published',
          });
        }
      });
      chars.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(chars);
    })
    .catch((error) => {
      console.warn('Firestore characters fetch notice (using server backup):', error?.message || error);
    });

  return () => {
    isCancelled = true;
  };
}

/**
 * Save or update a character in Firestore.
 * Deduplicates avatar and coverImage when identical to artwork, reducing Firestore document size by ~66%.
 */
export async function saveCharacterToFirestore(char: TakoyakiCharacter): Promise<void> {
  const safeId = char.id.slice(0, 128);
  try {
    const artwork = char.artwork || '';
    const avatar = char.avatar && char.avatar !== artwork ? char.avatar : '';
    const coverImage = char.coverImage && char.coverImage !== artwork ? char.coverImage : '';

    const payload: Record<string, unknown> = {
      id: safeId,
      name: char.name || '',
      artwork,
      avatar,
      coverImage,
      shortDescription: char.shortDescription || '',
      plot: char.plot || '',
      personality: char.personality || '',
      scenario: char.scenario || '',
      openingScene: char.openingScene || '',
      setting: char.setting || '',
      relationship: char.relationship || '',
      genre: char.genre || 'Slice of Life',
      tags: Array.isArray(char.tags) ? char.tags : [],
      contentWarning: char.contentWarning || '',
      creator: char.creator || 'Cáo Bel',
      playUrl: char.playUrl || '',
      is_spicy: Boolean(char.is_spicy),
      allowsMale: Boolean(char.allowsMale),
      allowsFemale: Boolean(char.allowsFemale),
      playCount: Number(char.playCount) || 0,
      viewCount: Number(char.viewCount) || 0,
      favoriteCount: Number(char.favoriteCount) || 0,
      createdAt: char.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: char.status === 'draft' ? 'draft' : 'published',
    };
    await setDoc(doc(db, 'characters', safeId), payload);
  } catch (error) {
    console.warn('Firestore save notice (character safely persisted to server DB):', error);
  }
}

/**
 * Delete a character from Firestore.
 */
export async function deleteCharacterFromFirestore(characterId: string): Promise<void> {
  const safeId = characterId.slice(0, 128);
  try {
    await deleteDoc(doc(db, 'characters', safeId));
  } catch (error) {
    console.warn('Firestore delete notice (character deleted from server DB):', error);
  }
}

/**
 * Increment view count, play count, or favorite count on a character in Firestore.
 */
export async function incrementCharacterMetric(
  characterId: string,
  metric: 'view' | 'play' | 'favorite' | 'unfavorite'
): Promise<void> {
  const safeId = characterId.slice(0, 128);
  const docRef = doc(db, 'characters', safeId);
  try {
    let delta = 1;
    let field = 'viewCount';
    if (metric === 'view') {
      field = 'viewCount';
      delta = 1;
    } else if (metric === 'play') {
      field = 'playCount';
      delta = 1;
    } else if (metric === 'favorite') {
      field = 'favoriteCount';
      delta = 1;
    } else if (metric === 'unfavorite') {
      field = 'favoriteCount';
      delta = -1;
    }

    await updateDoc(docRef, {
      [field]: increment(delta),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Non-blocking
    console.warn('Failed to update character metric in Firestore:', error);
  }
}

/**
 * Load customer feedbacks stored in Firestore using a quota-efficient one-time fetch.
 */
export function subscribeToFeedbacks(
  onUpdate: (feedbacks: FeedbackReview[]) => void
): () => void {
  let isCancelled = false;
  const feedbacksCollection = collection(db, 'feedbacks');
  getDocs(feedbacksCollection)
    .then((snapshot) => {
      if (isCancelled) return;
      const items: FeedbackReview[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id === 'fb_real_thanh_hoai_20261028') return;
        const data = docSnap.data();
        if (data && typeof data.authorName === 'string') {
          items.push({
            id: docSnap.id,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar || '',
            isAnonymous: Boolean(data.isAnonymous),
            rating: Number(data.rating) || 5,
            comment: data.comment || '',
            photos: Array.isArray(data.photos) ? data.photos : [],
            helpfulCount: Number(data.helpfulCount) || 0,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        }
      });
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(items);
    })
    .catch((error) => {
      console.warn('Firestore feedbacks fetch notice (using server backup):', error?.message || error);
    });

  return () => {
    isCancelled = true;
  };
}

/**
 * Save a feedback review directly to Firestore (visible to all users across the server).
 */
export async function saveFeedbackToFirestore(feedback: FeedbackReview): Promise<void> {
  const safeId = feedback.id.slice(0, 128);
  try {
    await setDoc(doc(db, 'feedbacks', safeId), {
      id: safeId,
      authorName: feedback.authorName || 'Thực khách',
      authorAvatar: feedback.authorAvatar || '',
      isAnonymous: Boolean(feedback.isAnonymous),
      rating: Number(feedback.rating) || 5,
      comment: feedback.comment || '',
      photos: Array.isArray(feedback.photos) ? feedback.photos : [],
      helpfulCount: Number(feedback.helpfulCount) || 0,
      createdAt: feedback.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Firestore feedback save notice (saved to server DB):', error);
  }
}

/**
 * Increment helpfulCount for a feedback in Firestore.
 */
export async function incrementFeedbackHelpfulInFirestore(feedbackId: string): Promise<void> {
  const safeId = feedbackId.slice(0, 128);
  const docRef = doc(db, 'feedbacks', safeId);
  try {
    await updateDoc(docRef, {
      helpfulCount: increment(1),
    });
  } catch (error) {
    console.warn('Failed to increment feedback helpfulCount in Firestore:', error);
  }
}

/**
 * Delete a feedback review from Firestore (Creator only).
 */
export async function deleteFeedbackFromFirestore(feedbackId: string): Promise<void> {
  const safeId = feedbackId.slice(0, 128);
  try {
    await deleteDoc(doc(db, 'feedbacks', safeId));
  } catch (error) {
    console.warn('Firestore feedback delete notice:', error);
  }
}

// =========================================================================
// SPICY WHITELIST CLOUD PERSISTENCE (FIRESTORE + SERVER + LOCALSTORAGE)
// =========================================================================

function emailToDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_').slice(0, 120);
}

export async function saveSpicyEmailToFirestore(item: SpicyWhitelistItem): Promise<void> {
  const docId = emailToDocId(item.email);
  if (!docId) return;
  try {
    await setDoc(doc(db, 'spicyWhitelist', docId), {
      email: item.email.trim().toLowerCase(),
      addedAt: item.addedAt || new Date().toISOString(),
      note: item.note || '',
    });
  } catch (error) {
    console.warn('Firestore spicyWhitelist save notice (saved to Server & Local):', error);
  }
}

export async function deleteSpicyEmailFromFirestore(email: string): Promise<void> {
  const docId = emailToDocId(email);
  if (!docId) return;
  try {
    await deleteDoc(doc(db, 'spicyWhitelist', docId));
  } catch (error) {
    console.warn('Firestore spicyWhitelist delete notice:', error);
  }
}

export async function fetchSpicyWhitelistFromFirestore(): Promise<SpicyWhitelistItem[]> {
  try {
    const snap = await getDocs(collection(db, 'spicyWhitelist'));
    const list: SpicyWhitelistItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && typeof data.email === 'string') {
        list.push({
          email: data.email.trim().toLowerCase(),
          addedAt: data.addedAt || new Date().toISOString(),
          note: data.note || undefined,
        });
      }
    });
    return list;
  } catch (error) {
    console.warn('Firestore spicyWhitelist fetch notice (using Server & Local):', error);
    return [];
  }
}

export async function checkSpicyEmailInFirestore(email: string): Promise<boolean> {
  const docId = emailToDocId(email);
  if (!docId) return false;
  try {
    const snap = await getDoc(doc(db, 'spicyWhitelist', docId));
    return snap.exists();
  } catch {
    return false;
  }
}

// =========================================================================
// 18+ PHOTO AGE VERIFICATION CLOUD PERSISTENCE (FIRESTORE + SERVER + LOCAL)
// =========================================================================

export async function saveVerificationToFirestore(
  record: AgeVerificationRequest
): Promise<void> {
  const safeId = (record.id || `verify_${record.userId}`).slice(0, 128);
  if (!safeId) return;
  try {
    await setDoc(doc(db, 'verifications', safeId), {
      id: safeId,
      userId: record.userId || '',
      userEmail: (record.userEmail || '').trim().toLowerCase(),
      userName: record.userName || record.userEmail || 'Thực khách',
      userPhoto: record.userPhoto || '',
      documentImage: record.documentImage || '',
      documentName: record.documentName || '',
      note: record.note || '',
      status: record.status || 'pending',
      rejectionReason: record.rejectionReason || '',
      submittedAt: record.submittedAt || new Date().toISOString(),
      reviewedAt: record.reviewedAt || '',
      reviewedBy: record.reviewedBy || '',
    });
  } catch (error) {
    console.warn('Firestore verification save notice:', error);
  }
}

export async function fetchVerificationsFromFirestore(): Promise<AgeVerificationRequest[]> {
  const currentEmail = auth.currentUser?.email?.trim().toLowerCase();
  if (currentEmail !== CREATOR_ADMIN_EMAIL.toLowerCase()) {
    return [];
  }
  try {
    const snap = await getDocs(collection(db, 'verifications'));
    const list: AgeVerificationRequest[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.userId && data.userEmail) {
        list.push({
          id: data.id || d.id,
          userId: String(data.userId),
          userEmail: String(data.userEmail).trim().toLowerCase(),
          userName: String(data.userName || data.userEmail),
          userPhoto: data.userPhoto || undefined,
          documentImage: String(data.documentImage || ''),
          documentName: data.documentName || undefined,
          note: data.note || undefined,
          status:
            data.status === 'verified' || data.status === 'rejected'
              ? data.status
              : 'pending',
          rejectionReason: data.rejectionReason || undefined,
          submittedAt: data.submittedAt || new Date().toISOString(),
          reviewedAt: data.reviewedAt || undefined,
          reviewedBy: data.reviewedBy || undefined,
        });
      }
    });
    list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return list;
  } catch (error) {
    console.warn('Firestore verifications fetch notice:', error);
    return [];
  }
}

export async function fetchUserVerificationFromFirestore(
  userId: string,
  userEmail?: string
): Promise<AgeVerificationRequest | null> {
  if (!userId) return null;
  try {
    const directId = `verify_${userId}`.slice(0, 128);
    const directSnap = await getDoc(doc(db, 'verifications', directId));
    if (directSnap.exists()) {
      const data = directSnap.data();
      const docEmail = String(data.userEmail || '').trim().toLowerCase();
      const targetEmail = (userEmail || '').trim().toLowerCase();
      if (targetEmail && docEmail && docEmail !== targetEmail) {
        return null;
      }
      return {
        id: data.id || directSnap.id,
        userId: String(data.userId || userId),
        userEmail: docEmail || targetEmail,
        userName: String(data.userName || data.userEmail || 'Thực khách'),
        userPhoto: data.userPhoto || undefined,
        documentImage: String(data.documentImage || ''),
        documentName: data.documentName || undefined,
        note: data.note || undefined,
        status:
          data.status === 'verified' || data.status === 'rejected'
            ? data.status
            : 'pending',
        rejectionReason: data.rejectionReason || undefined,
        submittedAt: data.submittedAt || new Date().toISOString(),
        reviewedAt: data.reviewedAt || undefined,
        reviewedBy: data.reviewedBy || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateVerificationStatusInFirestore(
  id: string,
  status: 'verified' | 'rejected' | 'pending',
  rejectionReason?: string,
  reviewedBy?: string
): Promise<void> {
  const safeId = id.slice(0, 128);
  if (!safeId) return;
  try {
    await updateDoc(doc(db, 'verifications', safeId), {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason || '' : '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewedBy || 'Cáo Bel (CRT)',
    });
  } catch (error) {
    console.warn('Firestore verification status update notice:', error);
  }
}

export async function deleteVerificationFromFirestore(id: string): Promise<void> {
  const safeId = id.slice(0, 128);
  if (!safeId) return;
  try {
    await deleteDoc(doc(db, 'verifications', safeId));
  } catch (error) {
    console.warn('Firestore verification delete notice:', error);
  }
}

// =========================================================================
// ADMIN NOTIFICATION SETTINGS & INSTANT ALERTS (GMAIL + DISCORD WEBHOOK)
// =========================================================================

export interface AdminNotificationSettings {
  emailEnabled: boolean;
  discordWebhookUrl: string;
  spicyVerificationEnabled: boolean;
  updatedAt?: string;
}

const NOTIFICATION_CONFIG_DOC_ID = '__notification_config__';
const NOTIFICATION_CACHE_KEY = 'takoyaki_admin_notify_settings_v1';

export async function fetchNotificationSettingsFromFirestore(): Promise<AdminNotificationSettings> {
  let cachedSettings: AdminNotificationSettings = {
    emailEnabled: true,
    discordWebhookUrl: '',
    spicyVerificationEnabled: true,
  };
  try {
    const localRaw = localStorage.getItem(NOTIFICATION_CACHE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && typeof parsed === 'object') {
        cachedSettings = {
          emailEnabled: parsed.emailEnabled !== false,
          discordWebhookUrl: String(parsed.discordWebhookUrl || ''),
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {
    // Ignore localStorage error
  }

  try {
    const snap = await getDoc(doc(db, 'spicyWhitelist', NOTIFICATION_CONFIG_DOC_ID));
    if (snap.exists()) {
      const data = snap.data();
      const cloudSettings: AdminNotificationSettings = {
        emailEnabled: data.emailEnabled !== false,
        discordWebhookUrl: String(data.discordWebhookUrl || '').trim(),
        spicyVerificationEnabled: data.spicyVerificationEnabled !== false,
        updatedAt: String(data.updatedAt || ''),
      };
      try {
        localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(cloudSettings));
      } catch {
        // Ignore
      }
      return cloudSettings;
    }
  } catch (error) {
    console.warn('Firestore notification config fetch notice:', error);
  }

  return cachedSettings;
}

export async function saveNotificationSettingsToFirestore(
  settings: AdminNotificationSettings
): Promise<void> {
  const payload = {
    emailEnabled: settings.emailEnabled !== false,
    discordWebhookUrl: (settings.discordWebhookUrl || '').trim(),
    spicyVerificationEnabled: settings.spicyVerificationEnabled !== false,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore
  }

  try {
    await setDoc(doc(db, 'spicyWhitelist', NOTIFICATION_CONFIG_DOC_ID), payload);
  } catch (error) {
    console.warn('Firestore notification config save notice:', error);
  }
}

/**
 * Automatically notifies Cáo Bel (hoangyendo1212@gmail.com) via Gmail (FormSubmit AJAX)
 * and optional Discord Webhook whenever a customer submits an 18+ verification photo.
 */
export async function sendAdminVerificationNotification(
  record: AgeVerificationRequest,
  isTest = false
): Promise<{ emailSent: boolean; discordSent: boolean }> {
  const settings = await fetchNotificationSettingsFromFirestore();
  let emailSent = false;
  let discordSent = false;

  const submittedTime = new Date(record.submittedAt || Date.now()).toLocaleString('vi-VN');
  const shopUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.href
      : 'https://takorenes.github.io/Takoyaki-Cao-Bel/';

  // 1. Send automatic Email notification to hoangyendo1212@gmail.com
  if (settings.emailEnabled !== false) {
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${CREATOR_ADMIN_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: isTest
            ? '🦊 [Test Thông Báo] Tiệm Bánh Takoyaki Cáo Bel đã kết nối Gmail!'
            : `🦊 [Tiệm Cáo Bel] ${record.userName} vừa gửi ảnh xác minh 18+!`,
          _template: 'table',
          _captcha: 'false',
          Trạng_thái: isTest
            ? 'Thư kiểm tra kết nối thông báo tự động'
            : '⏳ Đang chờ Cáo Bel duyệt ảnh 18+',
          Thực_khách: record.userName || 'Thực khách',
          Email_khách: record.userEmail,
          Lời_nhắn: record.note || 'Không có lời nhắn',
          Thời_gian_gửi: submittedTime,
          Link_vào_duyệt_ngay: shopUrl,
        }),
      });
      if (res.ok) {
        emailSent = true;
      }
    } catch (error) {
      console.warn('Email notification notice:', error);
    }
  }

  // 2. Send instant Discord Webhook notification if configured
  if (
    settings.discordWebhookUrl &&
    settings.discordWebhookUrl.startsWith('https://discord')
  ) {
    try {
      const discordRes = await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Tiệm Bánh Cáo Bel 🦊🐙',
          embeds: [
            {
              title: isTest
                ? '🔔 Test thông báo Discord thành công!'
                : '🌶️ Có thực khách vừa gửi ảnh xác minh 18+!',
              description: isTest
                ? 'Kênh Discord của Cáo Bel đã sẵn sàng nhận thông báo mỗi khi có khách gửi ảnh xác minh độ tuổi.'
                : `Thực khách **${record.userName}** (\`${record.userEmail}\`) vừa gửi ảnh minh chứng năm sinh 18+ để mở khóa khay Vị Cay Tê.`,
              color: 0xe57c29,
              fields: [
                {
                  name: '👤 Thực khách',
                  value: `${record.userName || 'Khách'} (${record.userEmail})`,
                  inline: true,
                },
                {
                  name: '🕒 Thời gian',
                  value: submittedTime,
                  inline: true,
                },
                {
                  name: '💬 Lời nhắn',
                  value: record.note || 'Không có lời nhắn',
                  inline: false,
                },
                {
                  name: '🔗 Duyệt ảnh tại quầy',
                  value: `[Bấm vào đây để mở Tiệm Cáo Bel & Duyệt 18+](${shopUrl})`,
                  inline: false,
                },
              ],
              footer: {
                text: 'Tiệm Bánh Takoyaki Cáo Bel · Hệ thống báo duyệt 18+ tự động',
              },
            },
          ],
        }),
      });
      if (discordRes.ok) {
        discordSent = true;
      }
    } catch (error) {
      console.warn('Discord webhook notice:', error);
    }
  }

  return { emailSent, discordSent };
}




