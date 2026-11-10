import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  CREATOR_ADMIN_EMAIL,
  signInWithGoogle,
  signOutUser,
  subscribeToUserBox,
  addCharacterToUserBox,
  removeCharacterFromUserBox,
  subscribeToCharacters,
  saveCharacterToFirestore,
  deleteCharacterFromFirestore,
  incrementCharacterMetric,
  subscribeToFeedbacks,
  saveFeedbackToFirestore,
  incrementFeedbackHelpfulInFirestore,
  deleteFeedbackFromFirestore,
  checkSpicyEmailInFirestore,
  fetchUserVerificationFromFirestore,
  fetchVerificationsFromFirestore,
  fetchNotificationSettingsFromFirestore,
} from './firebase';
import {
  TakoyakiCharacter,
  CharacterCreateInput,
  FeedbackReview,
  FeedbackCreateInput,
  ActiveTab,
} from './types';
import { Navbar } from './components/Navbar';
import { WelcomeHeroPage, TakoyakiStallHero } from './components/TakoyakiStallHero';
import { CharacterDetailModal } from './components/CharacterDetailModal';
import { TakoyakiKitchen } from './components/TakoyakiKitchen';
import { TakoyakiTraySection } from './components/TakoyakiTraySection';
import { MyTakoyakiBox } from './components/MyTakoyakiBox';
import { FeedbackSection } from './components/FeedbackSection';
import { UserProfilePage } from './components/UserProfilePage';
import { playGreetingSound } from './utils/greetingSound';
import { Search, X, ChefHat, Flame, LogIn, LogOut, UserCheck, User as UserIcon, Lock, Bell } from 'lucide-react';

const GUEST_FAVORITES_STORAGE_KEY = 'takoyaki_guest_box_favorites_v1';
const getAccountBoxCacheKey = (uid: string) => `takoyaki_user_box_${uid}_v1`;
const CHARACTERS_CACHE_KEY = 'takoyaki_characters_cache_v4';
const FEEDBACKS_CACHE_KEY = 'takoyaki_feedbacks_cache_v4';
const ACTIVE_TAB_STORAGE_KEY = 'takoyaki_active_tab_v2';

export default function App() {
  const [characters, setCharacters] = useState<TakoyakiCharacter[]>(() => {
    try {
      localStorage.removeItem('takoyaki_characters_cache_v2');
      localStorage.removeItem('takoyaki_characters_cache_v3');
      const saved = localStorage.getItem(CHARACTERS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [feedbacks, setFeedbacks] = useState<FeedbackReview[]>(() => {
    try {
      localStorage.removeItem('takoyaki_feedbacks_cache_v1');
      localStorage.removeItem('takoyaki_feedbacks_cache_v2');
      localStorage.removeItem('takoyaki_feedbacks_cache_v3');
      localStorage.removeItem('takoyaki_feedbacks');
      const saved = localStorage.getItem(FEEDBACKS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [isRefreshingFeedbacks, setIsRefreshingFeedbacks] = useState<boolean>(false);
  // Start on the outer welcome page ('welcome')
  const [activeTab, setActiveTab] = useState<ActiveTab>('welcome');
  const [selectedCharacter, setSelectedCharacter] = useState<TakoyakiCharacter | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<TakoyakiCharacter | null>(null);

  useEffect(() => {
    try {
      sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Firebase Auth user state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Strict Creator/Admin check: ONLY true when logged in as hoangyendo1212@gmail.com
  const isCreatorMode = useMemo(() => {
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email.toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase();
  }, [currentUser]);

  // VIP Spicy Flavor Access State (Whitelisted accounts or Creator)
  const [isSpicyAllowed, setIsSpicyAllowed] = useState<boolean>(false);
  const [spicyGateModalChar, setSpicyGateModalChar] = useState<TakoyakiCharacter | null>(null);

  // Check spicy access whenever currentUser changes (Web Server + Browser localStorage cache)
  useEffect(() => {
    let isCancelled = false;
    const cleanEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
    const vipCacheKey = cleanEmail ? `takoyaki_spicy_vip_${cleanEmail}` : '';

    if (isCreatorMode && vipCacheKey) {
      setIsSpicyAllowed(true);
      try {
        localStorage.setItem(vipCacheKey, 'true');
      } catch {
        // Ignore
      }
      return;
    }

    // 1. Instant check from browser localStorage cache
    if (vipCacheKey) {
      try {
        if (localStorage.getItem(vipCacheKey) === 'true') {
          setIsSpicyAllowed(true);
        }
      } catch {
        // Ignore
      }
    }

    // 2. Verify with Web Server, Static JSON (GitHub Pages), and Firestore Cloud
    async function checkSpicyAccess() {
      let allowed = false;
      const settings = await fetchNotificationSettingsFromFirestore();
      if (settings.spicyVerificationEnabled === false) {
        allowed = true;
      } else if (!cleanEmail) {
        allowed = false;
      } else {
        try {
          const res = await fetch(
            `/api/spicy-access/check?email=${encodeURIComponent(cleanEmail)}`
          );
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const data = await res.json();
            if (data.allowed) allowed = true;
          }
        } catch {
          // Fallback for GitHub Pages static hosting
        }

        if (!allowed) {
          try {
            const staticRes = await fetch(`${import.meta.env.BASE_URL}data/spicy_whitelist.json`);
            if (staticRes.ok) {
              const list = await staticRes.json();
              if (
                Array.isArray(list) &&
                list.some((w: { email?: string }) => w?.email?.trim().toLowerCase() === cleanEmail)
              ) {
                allowed = true;
              }
            }
          } catch {
            // Ignore
          }
        }

        if (!allowed) {
          const inCloud = await checkSpicyEmailInFirestore(cleanEmail);
          if (inCloud) allowed = true;
        }

        if (!allowed && currentUser?.uid) {
          const verifyRecord = await fetchUserVerificationFromFirestore(
            currentUser.uid,
            cleanEmail
          );
          if (verifyRecord?.status === 'verified') {
            allowed = true;
          }
        }
      }

      if (!isCancelled) {
        setIsSpicyAllowed(allowed);
        if (vipCacheKey) {
          try {
            if (allowed && settings.spicyVerificationEnabled !== false) {
              localStorage.setItem(vipCacheKey, 'true');
            } else if (!allowed) {
              localStorage.removeItem(vipCacheKey);
            }
          } catch {
            // Ignore
          }
        }
      }
    }
    checkSpicyAccess();
    return () => {
      isCancelled = true;
    };
  }, [currentUser, isCreatorMode, activeTab]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // If user logs out or is not creator while on the kitchen tab, redirect to discover
  useEffect(() => {
    if (!isCreatorMode && activeTab === 'kitchen') {
      setActiveTab('discover');
    }
  }, [isCreatorMode, activeTab]);

  // Creator live pending 18+ verification requests counter (ONLY for hoangyendo1212@gmail.com)
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState<number>(0);
  const [spicyVerificationEnabled, setSpicyVerificationEnabled] = useState<boolean>(true);

  useEffect(() => {
    const isStrictCreator =
      isCreatorMode &&
      Boolean(
        currentUser?.email &&
          currentUser.email.trim().toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase()
      );

    if (!isStrictCreator) {
      setPendingVerificationsCount(0);
      try {
        localStorage.removeItem('takoyaki_verifications_cache_v1');
      } catch {
        // Ignore
      }
      return;
    }

    let isCancelled = false;
    async function checkPendingVerifications() {
      try {
        const cloudList = await fetchVerificationsFromFirestore();
        if (isCancelled) return;
        const pending = cloudList.filter((v) => v.status === 'pending').length;
        setPendingVerificationsCount(pending);
      } catch {
        // Ignore
      }
    }

    checkPendingVerifications();
    const interval = setInterval(checkPendingVerifications, 15000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isCreatorMode, currentUser]);

  // Favorites ("My Takoyaki Box") — strictly isolated per Google account in Server DB + Firestore
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthReady) return;

    // When not logged in, use separate guest local storage
    if (!currentUser) {
      try {
        const savedGuest = localStorage.getItem(GUEST_FAVORITES_STORAGE_KEY);
        setFavorites(savedGuest ? JSON.parse(savedGuest) : []);
      } catch {
        setFavorites([]);
      }
      return;
    }

    const uid = currentUser.uid;
    let isCancelled = false;

    // 1. Immediately load local cache for this UID if available
    try {
      const cached = localStorage.getItem(getAccountBoxCacheKey(uid));
      if (cached) {
        setFavorites(JSON.parse(cached));
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    }

    // 2. Fetch authoritative server-persisted box for this Google account (works across tabs/browsers/devices)
    async function fetchServerUserBox() {
      try {
        const res = await fetch(`/api/user-box/${encodeURIComponent(uid)}`);
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (Array.isArray(data.favorites)) {
            setFavorites(data.favorites);
            try {
              localStorage.setItem(
                getAccountBoxCacheKey(uid),
                JSON.stringify(data.favorites)
              );
            } catch {
              // Ignore storage error
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user box from server:', err);
      }
    }
    fetchServerUserBox();

    // 3. Also subscribe to Firestore user box for real-time updates
    let unsubscribeBox: (() => void) | null = null;
    try {
      unsubscribeBox = subscribeToUserBox(uid, (cloudFavIds) => {
        if (isCancelled) return;
        if (cloudFavIds.length > 0) {
          setFavorites((prev) => {
            const merged = Array.from(new Set([...prev, ...cloudFavIds]));
            try {
              localStorage.setItem(getAccountBoxCacheKey(uid), JSON.stringify(merged));
            } catch {
              // Ignore
            }
            return merged;
          });
        }
      });
    } catch {
      // Non-blocking if Firestore rules/listener fail
    }

    return () => {
      isCancelled = true;
      if (unsubscribeBox) {
        unsubscribeBox();
      }
    };
  }, [currentUser, isAuthReady]);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchBatchFilter, setSearchBatchFilter] = useState<'all' | 'original' | 'spicy'>('all');

  // Account / Google Login Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Ranking category sub-filter & flavor filter: Most Favorite vs Best Seller
  const [rankingSort, setRankingSort] = useState<'bestsellers' | 'favorites'>('bestsellers');
  const [rankingBatch, setRankingBatch] = useState<'all' | 'original' | 'spicy'>('all');

  // 1. Authoritative Server Characters Loader (Runs immediately on mount & polls periodically)
  useEffect(() => {
    let isCancelled = false;

    async function loadServerCharacters() {
      try {
        let charsList: TakoyakiCharacter[] | null = null;
        try {
          const res = await fetch('/api/characters');
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data.characters) && data.characters.length > 0) {
              charsList = data.characters;
            }
          }
        } catch {
          // Fallback to static JSON on GitHub Pages
        }

        if (!charsList) {
          const staticRes = await fetch(`${import.meta.env.BASE_URL}data/characters.json`);
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            if (Array.isArray(staticData.characters) && staticData.characters.length > 0) {
              charsList = staticData.characters;
            }
          }
        }

        if (charsList && !isCancelled) {
          const formatted = charsList.map((c: TakoyakiCharacter) => ({
            ...c,
            artwork: c.artwork || '',
            avatar: c.avatar || c.artwork || '',
            coverImage: c.coverImage || c.artwork || '',
            is_spicy: Boolean(c.is_spicy),
            imagePosition: c.imagePosition || 'center',
          }));
          setCharacters((prev) => {
            if (prev.length === 0) return formatted;
            const byId = new Map<string, TakoyakiCharacter>();
            for (const item of formatted) byId.set(item.id, item);
            for (const item of prev) {
              const s = byId.get(item.id);
              if (s) {
                byId.set(item.id, {
                  ...s,
                  imagePosition: s.imagePosition || item.imagePosition || 'center',
                  playCount: Math.max(s.playCount || 0, item.playCount || 0),
                  favoriteCount: Math.max(s.favoriteCount || 0, item.favoriteCount || 0),
                });
              } else {
                byId.set(item.id, item);
              }
            }
            return Array.from(byId.values());
          });
          try {
            localStorage.setItem(CHARACTERS_CACHE_KEY, JSON.stringify(formatted));
          } catch {
            // Ignore storage limit
          }
        }
      } catch (err) {
        console.warn('Initial characters load warning:', err);
      }
    }

    loadServerCharacters();
    const interval = setInterval(loadServerCharacters, 10000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // 2. Firestore characters cloud sync (runs when auth is settled, non-blocking if quota is reached)
  useEffect(() => {
    if (!isAuthReady) return;
    let isCancelled = false;

    const unsubscribe = subscribeToCharacters(isCreatorMode, async (cloudChars) => {
      if (isCancelled || cloudChars.length === 0) return;

      try {
        const syncRes = await fetch('/api/characters/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: cloudChars }),
        });
        if (syncRes.ok && !isCancelled) {
          const syncData = await syncRes.json();
          if (Array.isArray(syncData.characters) && syncData.characters.length > 0) {
            const formatted = syncData.characters.map((c: TakoyakiCharacter) => ({
              ...c,
              is_spicy: Boolean(c.is_spicy), 
              avatar: c.avatar || c.artwork || '', 
              coverImage: c.coverImage || c.artwork || '',
              imagePosition: c.imagePosition || 'center',
            }));
            setCharacters(formatted);
            try {
              localStorage.setItem(CHARACTERS_CACHE_KEY, JSON.stringify(formatted));
            } catch {
              // Ignore
            }
            return;
          }
        }
      } catch {
        // Fallback to in-memory merge if sync request fails
      }

      if (!isCancelled) {
        setCharacters((prev) => {
          const byId = new Map<string, TakoyakiCharacter>();
          for (const item of prev) {
            byId.set(item.id, item);
          }
          for (const item of cloudChars) {
            byId.set(item.id, item);
          }
          const merged = Array.from(byId.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          try {
            localStorage.setItem(CHARACTERS_CACHE_KEY, JSON.stringify(merged));
          } catch {
            // Ignore
          }
          return merged;
        });
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isCreatorMode, isAuthReady]);

  // Authoritative global feedbacks loader from server + Firestore two-way backup
  const loadFeedbacks = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setIsRefreshingFeedbacks(true);
    try {
      const res = await fetch('/api/feedbacks');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.feedbacks)) {
          const fakeIds = new Set([
            'fb_1793205805208_1',
            'fb_1793205805209_2',
            'fb_1793205805209_3',
            'fb_real_thanh_hoai_20261028',
          ]);
          setFeedbacks((prev) => {
            const byId = new Map<string, FeedbackReview>();
            for (const item of prev) {
              if (item && item.id && !fakeIds.has(item.id)) byId.set(item.id, item);
            }
            for (const item of data.feedbacks as FeedbackReview[]) {
              if (item && item.id && !fakeIds.has(item.id)) byId.set(item.id, item);
            }
            const merged = Array.from(byId.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            try {
              localStorage.setItem(FEEDBACKS_CACHE_KEY, JSON.stringify(merged));
            } catch {
              // Ignore
            }
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    } finally {
      if (showLoadingIndicator) setIsRefreshingFeedbacks(false);
    }
  };

  // Fetch feedbacks on initial mount from both Server and Firestore (and sync Firestore feedbacks to Server)
  useEffect(() => {
    let isCancelled = false;
    loadFeedbacks();

    const unsubscribeFeedbacks = subscribeToFeedbacks(async (cloudFeedbacks) => {
      if (isCancelled || cloudFeedbacks.length === 0) return;
      try {
        const syncRes = await fetch('/api/feedbacks/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedbacks: cloudFeedbacks }),
        });
        if (syncRes.ok && !isCancelled) {
          const syncData = await syncRes.json();
          if (Array.isArray(syncData.feedbacks)) {
            setFeedbacks(syncData.feedbacks);
            try {
              localStorage.setItem(FEEDBACKS_CACHE_KEY, JSON.stringify(syncData.feedbacks));
            } catch {
              // Ignore
            }
            return;
          }
        }
      } catch {
        // Fallback to local merge
      }
      if (!isCancelled) {
        setFeedbacks((prev) => {
          const byId = new Map<string, FeedbackReview>();
          for (const item of prev) byId.set(item.id, item);
          for (const item of cloudFeedbacks) byId.set(item.id, item);
          const merged = Array.from(byId.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          try {
            localStorage.setItem(FEEDBACKS_CACHE_KEY, JSON.stringify(merged));
          } catch {
            // Ignore
          }
          return merged;
        });
      }
    });

    return () => {
      isCancelled = true;
      unsubscribeFeedbacks();
    };
  }, []);

  // Poll server feedbacks when viewing the feedback tab
  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedbacks(false);
      const interval = setInterval(() => {
        loadFeedbacks(false);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  //All published characters
  const publishedCharacters = useMemo(
    () => characters.filter((c) => c.status === 'published'),
    [characters]
  );

  // Tray 1: Original Flavor (is_spicy === false)
  const originalCharacters = useMemo(
    () => publishedCharacters.filter((c) => !c.is_spicy),
    [publishedCharacters]
  );

  // Tray 2: Spicy Flavor (is_spicy === true)
  const spicyCharacters = useMemo(
    () => publishedCharacters.filter((c) => Boolean(c.is_spicy)),
    [publishedCharacters]
  );

  // Filtered characters for Search modal
  const searchedCharacters = useMemo(() => {
    return publishedCharacters.filter((c) => {
      if (searchBatchFilter === 'original' && c.is_spicy) return false;
      if (searchBatchFilter === 'spicy' && !c.is_spicy) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inName = c.name.toLowerCase().includes(q);
      const inDesc = c.shortDescription.toLowerCase().includes(q);
      const inPlot = c.plot.toLowerCase().includes(q);
      const inTags = c.tags.some((t) => t.toLowerCase().includes(q));
      return inName || inDesc || inPlot || inTags;
    });
  }, [publishedCharacters, searchBatchFilter, searchQuery]);

  // Pick up a takoyaki (increments view count on server & opens detail page)
  const handleSelectCharacter = async (char: TakoyakiCharacter) => {
    setSelectedCharacter(char);
    try {
      const res = await fetch(`/api/characters/${char.id}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.character) {
          setCharacters((prev) =>
            prev.map((item) => (item.id === char.id ? data.character : item))
          );
          setSelectedCharacter(data.character);
        }
      }
    } catch {
      // Non-blocking metric update
    }
  };

  // Toggle favorite ("Most Favorite" Ranking) — strictly aggregates valid likes from authenticated accounts across all servers
  const handleToggleFavorite = async (id: string) => {
    // If not authenticated, prompt sign-in so only authenticated accounts contribute to global rankings
    if (!currentUser) {
      setAuthError('Vui lòng đăng nhập tài khoản Google để thích takoyaki và bình chọn bảng xếp hạng Most Favorite nhé!');
      setIsAuthModalOpen(true);
      return;
    }

    const uid = currentUser.uid;
    const isAlreadyFav = favorites.includes(id);
    const nextFavs = isAlreadyFav
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(nextFavs);

    // 1. Optimistic local update for instantaneous UI feedback
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              favoriteCount: isAlreadyFav
                ? Math.max(0, (c.favoriteCount || 0) - 1)
                : (c.favoriteCount || 0) + 1,
            }
          : c
      )
    );
    if (selectedCharacter?.id === id) {
      setSelectedCharacter((prev) =>
        prev
          ? {
              ...prev,
              favoriteCount: isAlreadyFav
                ? Math.max(0, (prev.favoriteCount || 0) - 1)
                : (prev.favoriteCount || 0) + 1,
            }
          : null
      );
    }

    try {
      localStorage.setItem(getAccountBoxCacheKey(uid), JSON.stringify(nextFavs));
    } catch {
      // Ignore storage error
    }

    // 2. Synchronize to Firestore (broadcasts real-time to all clients across all servers)
    incrementCharacterMetric(id, isAlreadyFav ? 'unfavorite' : 'favorite');
    try {
      if (isAlreadyFav) {
        await removeCharacterFromUserBox(uid, id);
      } else {
        await addCharacterToUserBox(uid, id);
      }
    } catch (err) {
      console.error('Failed to sync favorite to Firestore user box:', err);
    }

    // 3. Persist to authoritative server database (1 real account = 1 favorite per character)
    try {
      const res = await fetch(`/api/user-box/${encodeURIComponent(uid)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: id,
          action: isAlreadyFav ? 'remove' : 'add',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.character) {
          setCharacters((prev) =>
            prev.map((item) => (item.id === id ? data.character : item))
          );
          if (selectedCharacter?.id === id) {
            setSelectedCharacter(data.character);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync user-box toggle:', err);
    }
  };

  // Best Seller Ranking: Track valid clicks by real authenticated accounts
  const handlePlayCharacter = async (char: TakoyakiCharacter) => {
    if (!char.playUrl) return;

    // Spicy Flavor VIP Gate: Creator or Whitelisted VIP only
    if (char.is_spicy && !isCreatorMode && !isSpicyAllowed) {
      setSpicyGateModalChar(char);
      return;
    }

    // 1. Open the retrieval link in a new tab
    const a = document.createElement('a');
    a.href = char.playUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 2. Only count towards Best Seller ranking if user is logged in with a real Google account (1 account = 1 count)
    if (!currentUser?.uid) return;

    incrementCharacterMetric(char.id, 'play');

    try {
      const res = await fetch(`/api/characters/${char.id}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          userId: currentUser.uid,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.character) {
          setCharacters((prev) =>
            prev.map((item) => (item.id === char.id ? data.character : item))
          );
          if (selectedCharacter?.id === char.id) {
            setSelectedCharacter(data.character);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync play metric:', err);
    }
  };

  // Save (Create or Update) Character in Takoyaki Kitchen (Creator only)
  const handleSaveCharacter = async (
    input: CharacterCreateInput,
    existingId?: string
  ) => {
    if (!isCreatorMode) {
      throw new Error('Only the Creator can create or edit characters.');
    }

    const now = new Date().toISOString();
    const existingChar = existingId ? characters.find((c) => c.id === existingId) : undefined;
    const id = existingId || `tako_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const charToSave: TakoyakiCharacter = {
      id,
      name: input.name.trim().slice(0, 100),
      artwork: input.artwork || '',
      avatar: input.avatar || input.artwork || '',
      coverImage: input.coverImage || input.artwork || '',
      shortDescription: input.shortDescription || '',
      plot: input.plot || '',
      personality: input.personality || '',
      scenario: input.scenario || '',
      openingScene: input.openingScene || '',
      setting: input.setting || '',
      relationship: input.relationship || '',
      genre: input.genre || 'Slice of Life',
      tags: input.tags || [],
      contentWarning: input.contentWarning || '',
      creator: input.creator || 'Cáo Bel',
      playUrl: input.playUrl || '',
      is_spicy: Boolean(input.is_spicy),
      allowsMale: Boolean(input.allowsMale),
      allowsFemale: Boolean(input.allowsFemale),
      playCount: existingChar?.playCount || 0,
      viewCount: existingChar?.viewCount || 0,
      favoriteCount: existingChar?.favoriteCount || 0,
      createdAt: existingChar?.createdAt || now,
      updatedAt: now,
      status: input.status,
      imagePosition: input.imagePosition || 'center',
    };

    // 1. Persist to authoritative server API first so characters are NEVER lost even if Firestore hits quota
    try {
      if (existingId) {
        await fetch(`/api/characters/${existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(charToSave),
        });
      } else {
        await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(charToSave),
        });
      }
    } catch (err) {
      console.error('Server save warning:', err);
    }

    // 2. Also save to cloud Firestore (non-blocking if quota temporarily reached)
    await saveCharacterToFirestore(charToSave);

    // 3. Immediate local state update for zero-latency feedback
    setCharacters((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx !== -1) {
        return prev.map((c) => (c.id === id ? charToSave : c));
      }
      return [charToSave, ...prev];
    });
  };

  // Delete Character (Creator only)
  const handleDeleteCharacter = async (id: string) => {
    if (!isCreatorMode) return;

    // 1. Delete from server DB first
    try {
      await fetch(`/api/characters/${id}`, {
        method: 'DELETE',
      });
    } catch {
      // Non-blocking
    }

    // 2. Delete from Firestore cloud database
    await deleteCharacterFromFirestore(id);

    // 3. Update local state
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(null);
    }
  };

  // Add new customer feedback / review (saves to both Server DB and Firestore)
  const handleAddFeedback = async (input: FeedbackCreateInput) => {
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error('Không thể gửi đánh giá lúc này. Vui lòng thử lại nhé!');
    }
    const data = await res.json();
    if (data.feedback) {
      setFeedbacks((prev) => [data.feedback, ...prev.filter((f) => f.id !== data.feedback.id)]);
      await saveFeedbackToFirestore(data.feedback);
      loadFeedbacks();
    }
  };

  // Mark a feedback as helpful (updates both Server DB and Firestore)
  const handleMarkFeedbackHelpful = async (id: string) => {
    incrementFeedbackHelpfulInFirestore(id);
    try {
      const res = await fetch(`/api/feedbacks/${id}/helpful`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feedback) {
          setFeedbacks((prev) =>
            prev.map((item) => (item.id === id ? data.feedback : item))
          );
        }
      }
    } catch {
      // Non-blocking
    }
  };

  // Delete feedback (Creator only — deletes from both Server DB and Firestore)
  const handleDeleteFeedback = async (id: string) => {
    if (!isCreatorMode) return;
    await deleteFeedbackFromFirestore(id);
    const res = await fetch(`/api/feedbacks/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setIsAuthModalOpen(false);
        setActiveTab('profile');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        !msg.includes('popup-closed-by-user') &&
        !msg.includes('cancelled-popup-request') &&
        !msg.includes('Pending promise was never set')
      ) {
        setAuthError(msg || 'Google Sign-In failed.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    try {
      await signOutUser();
      setIsAuthModalOpen(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-Out failed.');
    }
  };

  const freshBatchList = useMemo(
    () =>
      [...publishedCharacters]
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 3),
    [publishedCharacters]
  );

  // Global Ranking pool: supports 'all' (entire stall), 'original', or 'spicy'
  const rankingPool = useMemo(() => {
    if (rankingBatch === 'original') return originalCharacters;
    if (rankingBatch === 'spicy') return spicyCharacters;
    return publishedCharacters;
  }, [rankingBatch, originalCharacters, spicyCharacters, publishedCharacters]);

  // Two independent ranking categories:
  // 1. Best Seller = globally ranked by total retrieval-link clicks (playCount) in descending order.
  // 2. Most Favorite = globally ranked by total valid likes (favoriteCount) from authenticated accounts in descending order.
  const rankedCharacters = useMemo(() => {
    if (rankingSort === 'bestsellers') {
      return [...rankingPool].sort((a, b) => {
        const diff = (b.playCount || 0) - (a.playCount || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return [...rankingPool].sort((a, b) => {
      const diff = (b.favoriteCount || 0) - (a.favoriteCount || 0);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rankingPool, rankingSort]);

  // Favorites ("My Box")
  const myBoxCharacters = useMemo(
    () => publishedCharacters.filter((c) => favorites.includes(c.id)),
    [publishedCharacters, favorites]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF5EB] text-[#432314]">
      {/* Forced Tailwind generation */}
      <div className="hidden object-top object-center object-bottom" />
      {/* Top Bar Navigation (Hidden on the Welcome Cover Page) */}
      {activeTab !== 'welcome' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          favoritesCount={myBoxCharacters.length}
          isCreatorMode={isCreatorMode}
          pendingVerificationsCount={isCreatorMode ? pendingVerificationsCount : 0}
          userEmail={currentUser?.email || null}
          userPhotoUrl={currentUser?.photoURL || null}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleCreatorModal={() => {
            setAuthError(null);
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Live Creator Notification Banner when there are pending 18+ photo requests (STRICTLY OWNER ONLY) */}
      {isCreatorMode &&
        currentUser?.email?.trim().toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase() &&
        pendingVerificationsCount > 0 &&
        activeTab !== 'profile' && (
          <div className="bg-[#FFF3E0] border-b border-[#FFE082] px-4 py-2.5">
            <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#432314]">
                <span className="w-6 h-6 rounded-full bg-[#C84B31] text-white flex items-center justify-center shrink-0 animate-bounce">
                  <Bell className="w-3.5 h-3.5" />
                </span>
                <span>
                  Đang có <strong className="text-[#C84B31]">{pendingVerificationsCount} thực khách</strong> vừa gửi ảnh xác minh 18+ chờ Cáo Bel duyệt!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-3.5 py-1.5 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Xem & Duyệt ngay →
              </button>
            </div>
          </div>
        )}

      {/* Main View Content */}
      <main className="flex-1">
        {/* DEDICATED OPENING PAGE: Hero Stall Banner with "Quẹo lựa takoyaki" */}
        {activeTab === 'welcome' && (
          <WelcomeHeroPage
            onEnterTrays={() => setActiveTab('discover')}
          />
        )}

        {/* TWO TRAYS PAGE: Original Flavor & Spicy Flavor side by side */}
        {activeTab === 'discover' && (
          <TakoyakiStallHero
            originalCharacters={originalCharacters}
            spicyCharacters={spicyCharacters}
            favorites={favorites}
            onSelectCharacter={handleSelectCharacter}
          />
        )}

        {activeTab === 'fresh' && (
          <TakoyakiTraySection
            isFresh={true}
            title="Bánh mới ra lò, ăn nóng là ngon nhất!"
            subtitle="Khay 3 viên mới nhất vừa xuất xưởng nóng hổi trên vỉ nướng."
            characters={freshBatchList}
            favorites={favorites}
            emptyHeading="Vỉ nướng vẫn đang chờ mẻ bánh đầu tiên."
            emptySubtext="Hãy quay lại khi chủ quầy vừa nướng xong mẻ truyện mới nhé."
            onSelectCharacter={handleSelectCharacter}
            onPlayCharacter={handlePlayCharacter}
          />
        )}

        {activeTab === 'ranking' && (
          <div>
            {/* Ranking Controls: Metric Sort & Flavor Switcher */}
            <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F5EBD9] border border-[#E5D3B3]">
                {[
                  { id: 'bestsellers', label: '🥢 Best Seller (Lượt click)' },
                  { id: 'favorites', label: '❤️ Most Favorite (Lượt yêu thích)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setRankingSort(tab.id as 'bestsellers' | 'favorites')
                    }
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      rankingSort === tab.id
                        ? 'bg-[#E57C29] text-white shadow-sm'
                        : 'text-[#7A5C4F] hover:text-[#432314]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Flavor Filter: All vs Original Flavor vs Spicy Flavor */}
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5EBD9] border border-[#E5D3B3] flex-wrap">
                <button
                  type="button"
                  onClick={() => setRankingBatch('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    rankingBatch === 'all'
                      ? 'bg-[#E57C29] text-white shadow-2xs'
                      : 'text-[#7A5C4F] hover:text-[#432314]'
                  }`}
                >
                  Toàn quầy bánh
                </button>
                <button
                  type="button"
                  onClick={() => setRankingBatch('original')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    rankingBatch === 'original'
                      ? 'bg-[#432314] text-white'
                      : 'text-[#7A5C4F] hover:text-[#432314]'
                  }`}
                >
                  Vị truyền thống
                </button>
                <button
                  type="button"
                  onClick={() => setRankingBatch('spicy')}
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    rankingBatch === 'spicy'
                      ? 'bg-[#C84B31] text-white'
                      : 'text-[#C84B31] hover:bg-[#FDECE8]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Vị cay tê</span>
                </button>
              </div>
            </div>

            <TakoyakiTraySection
              variant="menu"
              rankMetric={rankingSort}
              isSpicyMenu={rankingBatch === 'spicy'}
              title={
                rankingSort === 'bestsellers'
                  ? rankingBatch === 'spicy'
                    ? 'Bảng xếp hạng Best Seller · Vị cay tê 🌶'
                    : rankingBatch === 'original'
                    ? 'Bảng xếp hạng Best Seller · Vị truyền thống'
                    : 'Bảng xếp hạng Best Seller · Toàn bộ quầy bánh'
                  : rankingBatch === 'spicy'
                  ? 'Bảng xếp hạng Most Favorite · Vị cay tê 🌶'
                  : rankingBatch === 'original'
                  ? 'Bảng xếp hạng Most Favorite · Vị truyền thống'
                  : 'Bảng xếp hạng Most Favorite · Toàn bộ quầy bánh'
              }
              subtitle=""
              characters={rankedCharacters}
              favorites={favorites}
              emptyHeading={
                rankingBatch === 'spicy'
                  ? 'Mẻ bánh cay tê chưa ra lò.'
                  : 'Vỉ nướng vẫn đang chờ mẻ bánh đầu tiên.'
              }
              onSelectCharacter={handleSelectCharacter}
              onPlayCharacter={handlePlayCharacter}
            />
          </div>
        )}

        {activeTab === 'my-box' && (
          <MyTakoyakiBox
            characters={myBoxCharacters}
            onSelectCharacter={handleSelectCharacter}
            onPlayCharacter={handlePlayCharacter}
            onRemoveFavorite={handleToggleFavorite}
            onGoToTrays={() => setActiveTab('discover')}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackSection
            feedbacks={feedbacks}
            currentUserName={currentUser?.displayName || null}
            currentUserAvatar={currentUser?.photoURL || null}
            isCreatorMode={isCreatorMode}
            onAddFeedback={handleAddFeedback}
            onMarkHelpful={handleMarkFeedbackHelpful}
            onDeleteFeedback={handleDeleteFeedback}
            onRefreshFeedbacks={() => loadFeedbacks(true)}
            isRefreshing={isRefreshingFeedbacks}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfilePage
            currentUser={currentUser}
            isCreatorMode={isCreatorMode}
            isSpicyAllowed={isSpicyAllowed}
            favoritesCount={myBoxCharacters.length}
            onGoToFavorites={() => setActiveTab('my-box')}
            onGoToKitchen={() => setActiveTab('kitchen')}
            onLogout={handleLogout}
            onLoginWithGoogle={handleGoogleLogin}
            isSigningIn={isSigningIn}
            onSpicyAccessGranted={() => setIsSpicyAllowed(true)}
            onPendingCountChange={setPendingVerificationsCount}
          />
        )}

        {activeTab === 'kitchen' && isCreatorMode && (
          <TakoyakiKitchen
            characters={characters}
            initialEditCharacter={editingCharacter}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onSelectCharacter={handleSelectCharacter}
            onClearInitialEdit={() => setEditingCharacter(null)}
          />
        )}
      </main>

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-[#432314]/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search characters"
        >
          <div className="w-full max-w-2xl bg-[#FAF5EB] border-2 border-[#D4A373] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#F5EBD9] border-b border-[#E5D3B3] flex items-center gap-3">
              <Search className="w-5 h-5 text-[#E57C29] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by character name, plot, or tag..."
                className="flex-1 bg-transparent text-sm sm:text-base text-[#432314] placeholder-[#846C5B] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 text-[#846C5B] hover:text-[#432314] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tray Filter (Original Flavor vs Spicy Flavor) */}
            <div className="px-4 sm:px-5 py-2.5 bg-[#FFFDF9] border-b border-[#E5D3B3] flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#846C5B]">Tray:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSearchBatchFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    searchBatchFilter === 'all'
                      ? 'bg-[#432314] text-white'
                      : 'bg-[#F5EBD9] text-[#846C5B] hover:text-[#432314]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSearchBatchFilter('original')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    searchBatchFilter === 'original'
                      ? 'bg-[#E57C29] text-white'
                      : 'bg-[#F5EBD9] text-[#846C5B] hover:text-[#432314]'
                  }`}
                >
                  Vị truyền thống
                </button>
                <button
                  type="button"
                  onClick={() => setSearchBatchFilter('spicy')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    searchBatchFilter === 'spicy'
                      ? 'bg-[#C84B31] text-white'
                      : 'bg-[#FDECE8] text-[#C84B31]'
                  }`}
                >
                  🌶 Vị cay tê
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {searchedCharacters.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-base text-[#432314] mb-1">
                    {publishedCharacters.length === 0
                      ? 'The grill is still empty. No characters yet.'
                      : 'No matching takoyaki found on the grill.'}
                  </p>
                  <p className="text-xs text-[#846C5B]">
                    {publishedCharacters.length === 0
                      ? 'Fresh batch coming soon.'
                      : 'Try another search keyword.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchedCharacters.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        handleSelectCharacter(char);
                      }}
                      className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-[#FFFDF9] hover:bg-[#F5EBD9] border border-[#E5D3B3] text-left transition-colors cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#F5EBD9] border border-[#D4A373] shrink-0 flex items-center justify-center">
                        {char.artwork ? (
                          <img
                            src={char.artwork.startsWith('data:') ? char.artwork : char.artwork + (char.artwork.includes('?') ? '&' : '?') + 't=' + (char.updatedAt ? new Date(char.updatedAt).getTime() : Date.now())}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover object-${char.imagePosition || 'center'}`}
                          />
                        ) : (
                          <span className="font-display text-sm text-[#432314]">
                            {char.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#846C5B]">
                          <span
                            className={
                              char.is_spicy
                                ? 'text-[#C84B31] font-semibold'
                                : 'text-[#8C6239] font-semibold'
                            }
                          >
                            {char.is_spicy ? '🌶 Vị cay tê' : 'Vị truyền thống'}
                          </span>
                        </div>
                        <p className="font-display text-sm font-semibold text-[#432314] truncate">
                          {char.name}
                        </p>
                        <p className="text-xs text-[#846C5B] truncate">
                          {char.shortDescription}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account / Google Sign-In Modal */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#432314]/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Account Login"
        >
          <div className="w-full max-w-md bg-[#FAF5EB] border-2 border-[#D4A373] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5D3B3]">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#E57C29]" />
                <h3 className="font-display text-lg font-semibold text-[#432314]">
                  Tài khoản · Đăng nhập
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 text-[#846C5B] hover:text-[#432314] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FDECE8] border border-[#C84B31] text-xs text-[#C84B31] font-medium">
                {authError}
              </div>
            )}

            {!currentUser ? (
              <div className="text-center py-4">
                <p className="text-sm text-[#54382E] leading-relaxed mb-6">
                  Đăng kí làm khách quen tiệm bánh takoyaki Cáo Bel nhé
                </p>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-5 rounded-xl bg-[#432314] hover:bg-[#5A321E] text-[#FAF5EB] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4 text-[#E57C29]" />
                  <span>{isSigningIn ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F5EBD9] border border-[#E5D3B3]">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-[#D4A373]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#E57C29] text-white flex items-center justify-center font-display font-bold text-lg">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-[#432314] truncate">
                      {currentUser.displayName || 'Khách ghé quầy'}
                    </p>
                    <p className="text-xs text-[#846C5B] truncate">
                      {currentUser.email}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-[#E57C29]" />
                      <span className={isCreatorMode ? 'text-[#C84B31]' : 'text-[#684932]'}>
                        {isCreatorMode ? 'Chủ quầy (Creator / Admin)' : 'Khách hàng (Visitor)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setActiveTab('profile');
                  }}
                  className="w-full py-2.5 px-4 bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Xem trang Thực khách →</span>
                </button>

                {isCreatorMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthModalOpen(false);
                      setActiveTab('kitchen');
                    }}
                    className="w-full py-2.5 px-4 bg-[#FAF5EB] hover:bg-[#F5EBD9] text-[#432314] border border-[#E5D3B3] font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Vào Takoyaki Kitchen →
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#F5EBD9] text-[#432314] border border-[#E5D3B3] font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-[#C84B31]" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Picked Takoyaki Character Detail Modal */}
      <CharacterDetailModal
        character={selectedCharacter}
        isFavorite={
          selectedCharacter ? favorites.includes(selectedCharacter.id) : false
        }
        isCreatorMode={isCreatorMode}
        onGoToProfile={() => setActiveTab('profile')}
        onClose={() => setSelectedCharacter(null)}
        onToggleFavorite={handleToggleFavorite}
        onPlayCharacter={handlePlayCharacter}
        onEditCharacter={(char) => {
          setSelectedCharacter(null);
          setEditingCharacter(char);
          setActiveTab('kitchen');
        }}
      />

      {/* Spicy VIP Gate Notice Modal */}
      {spicyGateModalChar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D251E]/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FFFDF9] border-2 border-[#D4A373] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-[#3D251E]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5D3B3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FDECE8] border border-[#FCA5A5] flex items-center justify-center text-[#C84B31]">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#432314]">
                  Bánh Vị Cay Tê Đặc Biệt 🌶️
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSpicyGateModalChar(null)}
                className="p-1 rounded-lg text-[#846C5B] hover:text-[#432314] hover:bg-[#F5EBD9] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[#7A5C4F] leading-relaxed">
              <p>
                Viên takoyaki <strong className="text-[#C84B31] font-bold">"{spicyGateModalChar.name}"</strong> thuộc dòng bánh vị cay tê đặc biệt của tiệm Cáo Bel.
              </p>

              {!currentUser ? (
                <div className="p-3.5 rounded-2xl bg-[#FFF3E0] border border-[#FFE082] text-[#843B00] space-y-2">
                  <p className="font-bold text-[#E65100]">
                    👉 Bạn chưa đăng nhập tài khoản.
                  </p>
                  <p className="text-xs">
                    Vui lòng đăng nhập bằng Google rồi gửi ảnh xác minh đủ 18 tuổi tại mục <strong>Thực khách</strong> để Cáo duyệt mở khóa nhé!
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FFF3E0] border border-[#FFE082] text-[#843B00] space-y-2">
                  <p className="font-semibold flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                    <span>Tài khoản hiện tại:</span>
                    <code className="px-1.5 py-0.5 rounded bg-white font-mono text-xs text-[#E65100] border border-[#FFD54F]">
                      {currentUser.email}
                    </code>
                  </p>
                  <p className="text-xs leading-relaxed">
                    Khay bánh Vị Cay Tê chỉ dành cho thực khách từ đủ <strong>18 tuổi trở lên</strong>. Bạn hãy bấm nút bên dưới để gửi ảnh xác minh năm sinh 18+ (che kín thông tin nhạy cảm) cho <strong>Cáo Bel</strong> duyệt mở khóa ngay nha!
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSpicyGateModalChar(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#846C5B] hover:text-[#432314] hover:bg-[#F5EBD9] transition-colors cursor-pointer"
              >
                Để sau
              </button>
              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setSpicyGateModalChar(null);
                    handleGoogleLogin();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập để xác minh 18+</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSpicyGateModalChar(null);
                    setActiveTab('profile');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>📸 Gửi ảnh xác minh 18+ ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
