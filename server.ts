import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initializeFirebaseApp } from 'firebase/app';
import {
  getFirestore as getFirebaseFirestore,
  collection as fbCollection,
  getDocs as fbGetDocs,
  doc as fbDoc,
  setDoc as fbSetDoc,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'characters.json');
const SPICY_WHITELIST_FILE = path.join(DATA_DIR, 'spicy_whitelist.json');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');
const SITE_ASSETS_FILE = path.join(DATA_DIR, 'site_assets.json');
const PUBLIC_AISTUDIO_DIR = path.join(__dirname, 'public', 'assets', 'aistudio');
const CREATOR_EMAIL = 'hoangyendo1212@gmail.com';

// Initialize server-side Firestore client for automatic cloud backup & startup hydration
const firebaseConfigRaw = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8')
);
const serverFirebaseApp = initializeFirebaseApp(firebaseConfigRaw, 'server-sync');
const serverFirestore = getFirebaseFirestore(
  serverFirebaseApp,
  firebaseConfigRaw.firestoreDatabaseId
);

interface StoredCharacter {
  id: string;
  name: string;
  artwork: string;
  avatar: string;
  coverImage: string;
  shortDescription: string;
  plot: string;
  personality: string;
  scenario: string;
  openingScene?: string;
  setting: string;
  relationship: string;
  genre: string;
  tags: string[];
  contentWarning: string;
  creator: string;
  playUrl: string;
  is_spicy: boolean;
  allowsMale?: boolean;
  allowsFemale?: boolean;
  playCount: number;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
}

interface StoredFeedback {
  id: string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  rating: number;
  comment: string;
  photos: string[];
  helpfulCount: number;
  createdAt: string;
}

interface StoredVerification {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  documentImage: string;
  documentName?: string;
  note?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface WhitelistItem {
  email: string;
  addedAt: string;
  note?: string;
}

interface DatabaseSchema {
  characters: StoredCharacter[];
  feedbacks?: StoredFeedback[];
  userBoxes?: Record<string, string[]>;
  userPlays?: Record<string, string[]>;
  verifications?: StoredVerification[];
  spicyWhitelist?: WhitelistItem[];
}

const FAKE_FEEDBACK_IDS = new Set([
  'fb_1793205805208_1',
  'fb_1793205805209_2',
  'fb_1793205805209_3',
  'fb_real_thanh_hoai_20261028',
]);

// Filter out only the 3 old hardcoded fake metric triplets from legacy cache
function isLegacyFakeMetric(playCount: number, favoriteCount: number): boolean {
  return (
    (playCount === 128 && favoriteCount === 95) ||
    (playCount === 86 && favoriteCount === 54) ||
    (playCount === 65 && favoriteCount === 42)
  );
}

function loadWhitelistFromFile(): WhitelistItem[] {
  try {
    if (fs.existsSync(SPICY_WHITELIST_FILE)) {
      const raw = fs.readFileSync(SPICY_WHITELIST_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.error('Failed to read spicy_whitelist.json:', err);
  }
  return [];
}

function saveWhitelistToFile(list: WhitelistItem[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SPICY_WHITELIST_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write spicy_whitelist.json:', err);
  }
}

function loadFeedbacksFromFile(): StoredFeedback[] {
  try {
    if (fs.existsSync(FEEDBACKS_FILE)) {
      const raw = fs.readFileSync(FEEDBACKS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter((f) => f && !FAKE_FEEDBACK_IDS.has(f.id));
      }
    }
  } catch (err) {
    console.error('Failed to read feedbacks.json:', err);
  }
  return [];
}

function saveFeedbacksToFile(list: StoredFeedback[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const clean = list.filter((f) => f && !FAKE_FEEDBACK_IDS.has(f.id));
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(clean, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write feedbacks.json:', err);
  }
}

// Ensure database files exist
function ensureDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let fileWhitelist = loadWhitelistFromFile();
  if (!fileWhitelist.some((w) => w.email.toLowerCase() === CREATOR_EMAIL.toLowerCase())) {
    fileWhitelist.unshift({
      email: CREATOR_EMAIL,
      addedAt: new Date().toISOString(),
      note: 'Chủ tiệm Cáo Bel (Creator / Admin)',
    });
    saveWhitelistToFile(fileWhitelist);
  }

  const fileFeedbacks = loadFeedbacksFromFile();

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      characters: [],
      feedbacks: fileFeedbacks,
      userBoxes: {},
      userPlays: {},
      verifications: [],
      spicyWhitelist: fileWhitelist,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.map((c) => ({
          ...c,
          artwork: c.artwork || '',
          avatar: c.avatar || c.artwork || '',
          coverImage: c.coverImage || c.artwork || '',
          is_spicy: Boolean(c.is_spicy),
          allowsMale: Boolean(c.allowsMale),
          allowsFemale: Boolean(c.allowsFemale),
        }))
      : [];

    // Merge feedbacks from characters.json + feedbacks.json so none are ever lost
    const fbMap = new Map<string, StoredFeedback>();
    for (const f of fileFeedbacks) {
      if (f && f.id && !FAKE_FEEDBACK_IDS.has(f.id)) fbMap.set(f.id, f);
    }
    if (Array.isArray(parsed.feedbacks)) {
      for (const f of parsed.feedbacks) {
        if (f && f.id && !FAKE_FEEDBACK_IDS.has(f.id)) {
          const existing = fbMap.get(f.id);
          fbMap.set(f.id, {
            ...f,
            helpfulCount: Math.max(existing?.helpfulCount || 0, f.helpfulCount || 0),
          });
        }
      }
    }
    const feedbacks = Array.from(fbMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const userBoxes =
      parsed.userBoxes && typeof parsed.userBoxes === 'object' ? parsed.userBoxes : {};
    const userPlays =
      parsed.userPlays && typeof parsed.userPlays === 'object' ? parsed.userPlays : {};
    const verifications = Array.isArray(parsed.verifications) ? parsed.verifications : [];

    // Merge whitelist
    const map = new Map<string, WhitelistItem>();
    for (const item of fileWhitelist) {
      if (item && item.email) map.set(item.email.toLowerCase().trim(), item);
    }
    if (Array.isArray(parsed.spicyWhitelist)) {
      for (const item of parsed.spicyWhitelist) {
        if (item && item.email) {
          const key = item.email.toLowerCase().trim();
          if (!map.has(key)) map.set(key, item);
        }
      }
    }
    const spicyWhitelist = Array.from(map.values());

    const result: DatabaseSchema = {
      characters,
      feedbacks,
      userBoxes,
      userPlays,
      verifications,
      spicyWhitelist,
    };
    return result;
  } catch {
    return {
      characters: [],
      feedbacks: fileFeedbacks,
      userBoxes: {},
      userPlays: {},
      verifications: [],
      spicyWhitelist: fileWhitelist,
    };
  }
}

function saveDatabase(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (Array.isArray(data.spicyWhitelist)) {
    saveWhitelistToFile(data.spicyWhitelist);
  }
  const cleanFeedbacks = (data.feedbacks || []).filter(
    (f) => f && !FAKE_FEEDBACK_IDS.has(f.id)
  );
  saveFeedbacksToFile(cleanFeedbacks);
  // Deduplicate avatar & coverImage if identical to artwork to save ~66% disk space
  const compactData: DatabaseSchema = {
    ...data,
    feedbacks: cleanFeedbacks,
    characters: (data.characters || []).map((c) => {
      const artwork = c.artwork || '';
      return {
        ...c,
        artwork,
        avatar: c.avatar && c.avatar !== artwork ? c.avatar : '',
        coverImage: c.coverImage && c.coverImage !== artwork ? c.coverImage : '',
      };
    }),
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(compactData, null, 2), 'utf-8');
}

// Background cloud hydration on server startup (restores feedbacks, whitelist & characters from Firestore if container restarted)
async function hydrateFromFirestoreOnStartup(): Promise<void> {
  try {
    const db = ensureDatabase();
    let changed = false;

    // 1. Hydrate feedbacks from Firestore
    try {
      const fbSnap = await fbGetDocs(fbCollection(serverFirestore, 'feedbacks'));
      const byId = new Map<string, StoredFeedback>();
      for (const f of db.feedbacks || []) byId.set(f.id, f);
      fbSnap.forEach((d) => {
        if (FAKE_FEEDBACK_IDS.has(d.id)) return;
        const data = d.data();
        if (data && typeof data.authorName === 'string') {
          const existing = byId.get(d.id);
          byId.set(d.id, {
            id: d.id,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar || '',
            isAnonymous: Boolean(data.isAnonymous),
            rating: Number(data.rating) || 5,
            comment: data.comment || '',
            photos: Array.isArray(data.photos) ? data.photos : [],
            helpfulCount: Math.max(existing?.helpfulCount || 0, Number(data.helpfulCount) || 0),
            createdAt: data.createdAt || new Date().toISOString(),
          });
          changed = true;
        }
      });
      db.feedbacks = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      // Ignore if offline or quota limit
    }

    // 2. Hydrate spicyWhitelist from Firestore
    try {
      const wlSnap = await fbGetDocs(fbCollection(serverFirestore, 'spicyWhitelist'));
      const wlMap = new Map<string, WhitelistItem>();
      for (const w of db.spicyWhitelist || []) wlMap.set(w.email.toLowerCase().trim(), w);
      wlSnap.forEach((d) => {
        const data = d.data();
        if (data && typeof data.email === 'string') {
          const key = data.email.toLowerCase().trim();
          if (!wlMap.has(key)) {
            wlMap.set(key, {
              email: key,
              addedAt: data.addedAt || new Date().toISOString(),
              note: data.note || undefined,
            });
            changed = true;
          }
        }
      });
      db.spicyWhitelist = Array.from(wlMap.values());
    } catch {
      // Ignore if offline or quota limit
    }

    if (changed) {
      saveDatabase(db);
    }
  } catch {
    // Non-blocking startup hydration
  }
}

async function startServer() {
  // Parse port from CLI arguments or environment variable, default to 3000
  let port = 3000;
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort)) port = envPort;
  }
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const argPort = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(argPort)) port = argPort;
  }
  const PORT = port;
  const app = express();

  // Support large image uploads for character artwork, avatar, and cover image
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Initialize stall database and run background cloud hydration
  ensureDatabase();
  void hydrateFromFirestoreOnStartup();

  // GET all characters
  app.get('/api/characters', (_req, res) => {
    const db = ensureDatabase();
    res.json({ characters: db.characters });
  });

  // POST sync characters from Firestore / client cache into server backup
  app.post('/api/characters/sync', (req, res) => {
    const db = ensureDatabase();
    const incoming = Array.isArray(req.body?.characters) ? req.body.characters : [];
    if (incoming.length === 0) {
      res.json({ characters: db.characters });
      return;
    }

    let changed = false;
    const now = new Date().toISOString();

    for (const rawChar of incoming) {
      if (!rawChar || typeof rawChar.name !== 'string' || !rawChar.name.trim()) continue;
      const incomingId =
        typeof rawChar.id === 'string' && rawChar.id.trim()
          ? rawChar.id.trim()
          : `tako_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const trimmedName = rawChar.name.trim().slice(0, 100);

      // Match by ID first, or fallback to matching by exact name
      const existingIdx = db.characters.findIndex(
        (c) => c.id === incomingId || c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      const artwork = typeof rawChar.artwork === 'string' ? rawChar.artwork : '';
      const normalized: StoredCharacter = {
        id: incomingId,
        name: trimmedName,
        artwork,
        avatar:
          typeof rawChar.avatar === 'string' && rawChar.avatar ? rawChar.avatar : artwork,
        coverImage:
          typeof rawChar.coverImage === 'string' && rawChar.coverImage
            ? rawChar.coverImage
            : artwork,
        shortDescription:
          typeof rawChar.shortDescription === 'string'
            ? rawChar.shortDescription.trim().slice(0, 300)
            : '',
        plot: typeof rawChar.plot === 'string' ? rawChar.plot.trim().slice(0, 5000) : '',
        personality:
          typeof rawChar.personality === 'string'
            ? rawChar.personality.trim().slice(0, 4000)
            : '',
        scenario:
          typeof rawChar.scenario === 'string' ? rawChar.scenario.trim().slice(0, 4000) : '',
        openingScene:
          typeof rawChar.openingScene === 'string'
            ? rawChar.openingScene.trim().slice(0, 5000)
            : '',
        setting:
          typeof rawChar.setting === 'string' ? rawChar.setting.trim().slice(0, 1000) : '',
        relationship:
          typeof rawChar.relationship === 'string'
            ? rawChar.relationship.trim().slice(0, 500)
            : '',
        genre:
          typeof rawChar.genre === 'string' && rawChar.genre ? rawChar.genre : 'Slice of Life',
        tags: Array.isArray(rawChar.tags)
          ? rawChar.tags
              .map((t: unknown) => String(t).trim())
              .filter(Boolean)
              .slice(0, 12)
          : [],
        contentWarning:
          typeof rawChar.contentWarning === 'string'
            ? rawChar.contentWarning.trim().slice(0, 500)
            : '',
        creator:
          typeof rawChar.creator === 'string' &&
          rawChar.creator.trim() &&
          rawChar.creator.trim() !== 'Stall Master'
            ? rawChar.creator.trim().slice(0, 80)
            : 'Cáo Bel',
        playUrl:
          typeof rawChar.playUrl === 'string' ? rawChar.playUrl.trim().slice(0, 1000) : '',
        is_spicy: Boolean(rawChar.is_spicy),
        allowsMale: Boolean(rawChar.allowsMale),
        allowsFemale: Boolean(rawChar.allowsFemale),
        playCount: isLegacyFakeMetric(Number(rawChar.playCount) || 0, Number(rawChar.favoriteCount) || 0)
          ? 0
          : Math.max(0, Number(rawChar.playCount) || 0),
        viewCount: isLegacyFakeMetric(Number(rawChar.playCount) || 0, Number(rawChar.favoriteCount) || 0)
          ? 0
          : Math.max(0, Number(rawChar.viewCount) || 0),
        favoriteCount: isLegacyFakeMetric(Number(rawChar.playCount) || 0, Number(rawChar.favoriteCount) || 0)
          ? 0
          : Math.max(0, Number(rawChar.favoriteCount) || 0),
        createdAt: typeof rawChar.createdAt === 'string' && rawChar.createdAt ? rawChar.createdAt : now,
        updatedAt: typeof rawChar.updatedAt === 'string' && rawChar.updatedAt ? rawChar.updatedAt : now,
        status: rawChar.status === 'draft' ? 'draft' : 'published',
      };

      if (existingIdx === -1) {
        db.characters.push(normalized);
        changed = true;
      } else {
        const existing = db.characters[existingIdx];
        const merged: StoredCharacter = {
          ...existing,
          ...normalized,
          artwork: normalized.artwork || existing.artwork,
          avatar: normalized.avatar || existing.avatar || normalized.artwork || existing.artwork,
          coverImage:
            normalized.coverImage ||
            existing.coverImage ||
            normalized.artwork ||
            existing.artwork,
          playCount: Math.max(existing.playCount || 0, normalized.playCount || 0),
          viewCount: Math.max(existing.viewCount || 0, normalized.viewCount || 0),
          favoriteCount: Math.max(existing.favoriteCount || 0, normalized.favoriteCount || 0),
        };
        db.characters[existingIdx] = merged;
        changed = true;
      }
    }

    if (changed) {
      db.characters.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveDatabase(db);
    }

    const hydrated = ensureDatabase();
    res.json({ characters: hydrated.characters });
  });

  // POST create new character (preserves client/Firestore ID if provided)
  app.post('/api/characters', (req, res) => {
    const db = ensureDatabase();
    const body = req.body;

    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'Character name is required.' });
      return;
    }

    const now = new Date().toISOString();
    const id =
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim().slice(0, 128)
        : `tako_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newChar: StoredCharacter = {
      id,
      name: body.name.trim().slice(0, 100),
      artwork: typeof body.artwork === 'string' ? body.artwork : '',
      avatar:
        typeof body.avatar === 'string' && body.avatar
          ? body.avatar
          : typeof body.artwork === 'string'
          ? body.artwork
          : '',
      coverImage:
        typeof body.coverImage === 'string' && body.coverImage
          ? body.coverImage
          : typeof body.artwork === 'string'
          ? body.artwork
          : '',
      shortDescription:
        typeof body.shortDescription === 'string'
          ? body.shortDescription.trim().slice(0, 300)
          : '',
      plot: typeof body.plot === 'string' ? body.plot.trim().slice(0, 5000) : '',
      personality:
        typeof body.personality === 'string' ? body.personality.trim().slice(0, 4000) : '',
      scenario: typeof body.scenario === 'string' ? body.scenario.trim().slice(0, 4000) : '',
      openingScene:
        typeof body.openingScene === 'string' ? body.openingScene.trim().slice(0, 5000) : '',
      setting: typeof body.setting === 'string' ? body.setting.trim().slice(0, 1000) : '',
      relationship:
        typeof body.relationship === 'string' ? body.relationship.trim().slice(0, 500) : '',
      genre: typeof body.genre === 'string' && body.genre ? body.genre : 'Slice of Life',
      tags: Array.isArray(body.tags)
        ? body.tags
            .map((t: unknown) => String(t).trim())
            .filter(Boolean)
            .slice(0, 12)
        : [],
      contentWarning:
        typeof body.contentWarning === 'string' ? body.contentWarning.trim().slice(0, 500) : '',
      creator:
        typeof body.creator === 'string' &&
        body.creator.trim() &&
        body.creator.trim() !== 'Stall Master'
          ? body.creator.trim().slice(0, 80)
          : 'Cáo Bel',
      playUrl: typeof body.playUrl === 'string' ? body.playUrl.trim().slice(0, 1000) : '',
      is_spicy: Boolean(body.is_spicy),
      allowsMale: Boolean(body.allowsMale),
      allowsFemale: Boolean(body.allowsFemale),
      playCount: Math.max(0, Number(body.playCount) || 0),
      viewCount: Math.max(0, Number(body.viewCount) || 0),
      favoriteCount: Math.max(0, Number(body.favoriteCount) || 0),
      createdAt: typeof body.createdAt === 'string' && body.createdAt ? body.createdAt : now,
      updatedAt: now,
      status: body.status === 'published' ? 'published' : 'draft',
      imagePosition: typeof body.imagePosition === 'string' ? body.imagePosition : 'center',
    };

    const existingIdx = db.characters.findIndex((c) => c.id === id);
    if (existingIdx !== -1) {
      db.characters[existingIdx] = newChar;
    } else {
      db.characters.unshift(newChar);
    }
    saveDatabase(db);
    res.status(201).json({ character: newChar });
  });

  // PUT update existing character (or upsert if ID was created in Firestore first)
  app.put('/api/characters/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const body = req.body || {};
    const now = new Date().toISOString();
    let idx = db.characters.findIndex((c) => c.id === id);

    // Fallback: match by name if ID was previously generated differently
    if (idx === -1 && typeof body.name === 'string' && body.name.trim()) {
      const targetName = body.name.trim().toLowerCase();
      idx = db.characters.findIndex((c) => c.name.trim().toLowerCase() === targetName);
    }

    if (idx === -1) {
      const artwork = typeof body.artwork === 'string' ? body.artwork : '';
      const created: StoredCharacter = {
        id,
        name: typeof body.name === 'string' ? body.name.trim().slice(0, 100) : 'Takoyaki',
        artwork,
        avatar: typeof body.avatar === 'string' && body.avatar ? body.avatar : artwork,
        coverImage:
          typeof body.coverImage === 'string' && body.coverImage ? body.coverImage : artwork,
        shortDescription:
          typeof body.shortDescription === 'string'
            ? body.shortDescription.trim().slice(0, 300)
            : '',
        plot: typeof body.plot === 'string' ? body.plot.trim().slice(0, 5000) : '',
        personality:
          typeof body.personality === 'string' ? body.personality.trim().slice(0, 4000) : '',
        scenario: typeof body.scenario === 'string' ? body.scenario.trim().slice(0, 4000) : '',
        openingScene:
          typeof body.openingScene === 'string' ? body.openingScene.trim().slice(0, 5000) : '',
        setting: typeof body.setting === 'string' ? body.setting.trim().slice(0, 1000) : '',
        relationship:
          typeof body.relationship === 'string' ? body.relationship.trim().slice(0, 500) : '',
        genre: typeof body.genre === 'string' && body.genre ? body.genre : 'Slice of Life',
        tags: Array.isArray(body.tags)
          ? body.tags
              .map((t: unknown) => String(t).trim())
              .filter(Boolean)
              .slice(0, 12)
          : [],
        contentWarning:
          typeof body.contentWarning === 'string' ? body.contentWarning.trim().slice(0, 500) : '',
        creator:
          typeof body.creator === 'string' && body.creator.trim()
            ? body.creator.trim().slice(0, 80)
            : 'Cáo Bel',
        playUrl: typeof body.playUrl === 'string' ? body.playUrl.trim().slice(0, 1000) : '',
        is_spicy: Boolean(body.is_spicy),
        allowsMale: Boolean(body.allowsMale),
        allowsFemale: Boolean(body.allowsFemale),
        playCount: Math.max(0, Number(body.playCount) || 0),
        viewCount: Math.max(0, Number(body.viewCount) || 0),
        favoriteCount: Math.max(0, Number(body.favoriteCount) || 0),
        createdAt: typeof body.createdAt === 'string' && body.createdAt ? body.createdAt : now,
        updatedAt: now,
        status: body.status === 'draft' ? 'draft' : 'published',
      };
      db.characters.unshift(created);
      saveDatabase(db);
      res.json({ character: created });
      return;
    }

    const existing = db.characters[idx];

    const updated: StoredCharacter = {
      ...existing,
      id,
      name:
        typeof body.name === 'string' && body.name.trim()
          ? body.name.trim().slice(0, 100)
          : existing.name,
      artwork: typeof body.artwork === 'string' ? body.artwork : existing.artwork,
      avatar: typeof body.avatar === 'string' ? body.avatar : existing.avatar,
      coverImage: typeof body.coverImage === 'string' ? body.coverImage : existing.coverImage,
      shortDescription:
        typeof body.shortDescription === 'string'
          ? body.shortDescription.trim().slice(0, 300)
          : existing.shortDescription,
      plot:
        typeof body.plot === 'string'
          ? body.plot.trim().slice(0, 5000)
          : existing.plot,
      personality:
        typeof body.personality === 'string'
          ? body.personality.trim().slice(0, 4000)
          : existing.personality,
      scenario:
        typeof body.scenario === 'string'
          ? body.scenario.trim().slice(0, 4000)
          : existing.scenario,
      openingScene:
        typeof body.openingScene === 'string'
          ? body.openingScene.trim().slice(0, 5000)
          : existing.openingScene || '',
      setting:
        typeof body.setting === 'string'
          ? body.setting.trim().slice(0, 1000)
          : existing.setting,
      relationship:
        typeof body.relationship === 'string'
          ? body.relationship.trim().slice(0, 500)
          : existing.relationship,
      genre: typeof body.genre === 'string' ? body.genre : existing.genre,
      tags: Array.isArray(body.tags)
        ? body.tags
            .map((t: unknown) => String(t).trim())
            .filter(Boolean)
            .slice(0, 12)
        : existing.tags,
      contentWarning:
        typeof body.contentWarning === 'string'
          ? body.contentWarning.trim().slice(0, 500)
          : existing.contentWarning,
      creator:
        typeof body.creator === 'string' && body.creator.trim()
          ? body.creator.trim().slice(0, 80)
          : existing.creator,
      playUrl:
        typeof body.playUrl === 'string'
          ? body.playUrl.trim().slice(0, 1000)
          : existing.playUrl,
      is_spicy:
        typeof body.is_spicy === 'boolean' ? body.is_spicy : Boolean(existing.is_spicy),
      allowsMale:
        typeof body.allowsMale === 'boolean' ? body.allowsMale : Boolean(existing.allowsMale),
      allowsFemale:
        typeof body.allowsFemale === 'boolean' ? body.allowsFemale : Boolean(existing.allowsFemale),
      status:
        body.status === 'published' || body.status === 'draft'
          ? body.status
          : existing.status,
      updatedAt: now,
      imagePosition: typeof body.imagePosition === 'string' ? body.imagePosition : existing.imagePosition,
    };

    db.characters[idx] = updated;
    saveDatabase(db);
    res.json({ character: updated });
  });

  // DELETE character
  app.delete('/api/characters/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const initialLen = db.characters.length;
    db.characters = db.characters.filter((c) => c.id !== id);

    if (db.characters.length === initialLen) {
      res.status(404).json({ error: 'Character not found.' });
      return;
    }

    saveDatabase(db);
    res.json({ success: true });
  });

  // POST increment metric (play, view, favorite, unfavorite)
  // Strictly tracks unique real authenticated accounts (userBoxes & userPlays)
  app.post('/api/characters/:id/metrics', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const { action, userId } = req.body as {
      action?: 'play' | 'view' | 'favorite' | 'unfavorite';
      userId?: string;
    };

    const character = db.characters.find((c) => c.id === id);
    if (!character) {
      res.status(404).json({ error: 'Character not found.' });
      return;
    }

    if (!db.userBoxes || typeof db.userBoxes !== 'object') {
      db.userBoxes = {};
    }
    if (!db.userPlays || typeof db.userPlays !== 'object') {
      db.userPlays = {};
    }

    const cleanUserId = typeof userId === 'string' ? userId.trim() : '';

    if (action === 'play') {
      if (cleanUserId) {
        const playList = Array.isArray(db.userPlays[cleanUserId]) ? db.userPlays[cleanUserId] : [];
        if (!playList.includes(id)) {
          db.userPlays[cleanUserId] = [...playList, id];
          character.playCount = (character.playCount || 0) + 1;
        }
      } else {
        character.playCount = (character.playCount || 0) + 1;
      }
    } else if (action === 'view') {
      character.viewCount = (character.viewCount || 0) + 1;
    } else if (action === 'favorite') {
      if (cleanUserId) {
        const userList = Array.isArray(db.userBoxes[cleanUserId]) ? db.userBoxes[cleanUserId] : [];
        if (!userList.includes(id)) {
          db.userBoxes[cleanUserId] = [...userList, id];
          character.favoriteCount = (character.favoriteCount || 0) + 1;
        }
      } else {
        character.favoriteCount = (character.favoriteCount || 0) + 1;
      }
    } else if (action === 'unfavorite') {
      if (cleanUserId) {
        const userList = Array.isArray(db.userBoxes[cleanUserId]) ? db.userBoxes[cleanUserId] : [];
        if (userList.includes(id)) {
          db.userBoxes[cleanUserId] = userList.filter((itemId) => itemId !== id);
          character.favoriteCount = Math.max(0, (character.favoriteCount || 0) - 1);
        }
      } else {
        character.favoriteCount = Math.max(0, (character.favoriteCount || 0) - 1);
      }
    }

    saveDatabase(db);
    res.json({ character, favorites: cleanUserId ? db.userBoxes[cleanUserId] : undefined });
  });

  // GET all feedbacks
  app.get('/api/feedbacks', (_req, res) => {
    const db = ensureDatabase();
    res.json({ feedbacks: db.feedbacks || [] });
  });

  // POST sync feedbacks from Firestore into server backup
  app.post('/api/feedbacks/sync', (req, res) => {
    const db = ensureDatabase();
    const incoming = Array.isArray(req.body?.feedbacks) ? req.body.feedbacks : [];
    if (!Array.isArray(db.feedbacks)) {
      db.feedbacks = [];
    }
    if (incoming.length === 0) {
      res.json({ feedbacks: db.feedbacks });
      return;
    }

    let changed = false;
    for (const rawFb of incoming) {
      if (!rawFb || typeof rawFb.id !== 'string' || !rawFb.id.trim()) continue;
      if (FAKE_FEEDBACK_IDS.has(rawFb.id.trim())) continue;
      const idx = db.feedbacks.findIndex((f) => f.id === rawFb.id);
      const normalized: StoredFeedback = {
        id: rawFb.id.trim(),
        authorName:
          typeof rawFb.authorName === 'string' && rawFb.authorName.trim()
            ? rawFb.authorName.trim()
            : 'Thực khách',
        authorAvatar: typeof rawFb.authorAvatar === 'string' ? rawFb.authorAvatar : '',
        isAnonymous: Boolean(rawFb.isAnonymous),
        rating: Math.min(5, Math.max(1, Number(rawFb.rating) || 5)),
        comment: typeof rawFb.comment === 'string' ? rawFb.comment : '',
        photos: Array.isArray(rawFb.photos) ? rawFb.photos : [],
        helpfulCount: Math.max(0, Number(rawFb.helpfulCount) || 0),
        createdAt:
          typeof rawFb.createdAt === 'string' && rawFb.createdAt
            ? rawFb.createdAt
            : new Date().toISOString(),
      };
      if (idx === -1) {
        db.feedbacks.push(normalized);
        changed = true;
      } else {
        const existing = db.feedbacks[idx];
        db.feedbacks[idx] = {
          ...existing,
          ...normalized,
          helpfulCount: Math.max(existing.helpfulCount || 0, normalized.helpfulCount || 0),
        };
        changed = true;
      }
    }

    if (changed) {
      db.feedbacks.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveDatabase(db);
    }

    res.json({ feedbacks: db.feedbacks });
  });

  // POST create new feedback
  app.post('/api/feedbacks', (req, res) => {
    const db = ensureDatabase();
    const body = req.body;

    const ratingNum = Number(body?.rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: 'Rating between 1 and 5 is required.' });
      return;
    }

    const isAnonymous = Boolean(body?.isAnonymous);
    const rawName = typeof body?.authorName === 'string' ? body.authorName.trim() : '';
    const authorName = isAnonymous
      ? 'Thực khách ẩn danh'
      : rawName.slice(0, 80) || 'Khách ghé quầy';

    const comment = typeof body?.comment === 'string' ? body.comment.trim().slice(0, 3000) : '';
    const photos = Array.isArray(body?.photos)
      ? body.photos
          .filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
          .slice(0, 6)
      : [];

    const newFeedback: StoredFeedback = {
      id:
        typeof body?.id === 'string' && body.id
          ? body.id
          : `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      authorName,
      authorAvatar:
        !isAnonymous && typeof body?.authorAvatar === 'string' ? body.authorAvatar : '',
      isAnonymous,
      rating: Math.round(ratingNum),
      comment,
      photos,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.feedbacks)) {
      db.feedbacks = [];
    }
    db.feedbacks.unshift(newFeedback);
    saveDatabase(db);

    // Server-side backup to Firestore (guarantees cloud persistence even if browser tab closes immediately)
    void fbSetDoc(fbDoc(serverFirestore, 'feedbacks', newFeedback.id), {
      id: newFeedback.id,
      authorName: newFeedback.authorName,
      authorAvatar: newFeedback.authorAvatar || '',
      isAnonymous: newFeedback.isAnonymous,
      rating: newFeedback.rating,
      comment: newFeedback.comment,
      photos: newFeedback.photos,
      helpfulCount: newFeedback.helpfulCount,
      createdAt: newFeedback.createdAt,
    }).catch(() => {});

    res.status(201).json({ feedback: newFeedback });
  });

  // POST increment helpful count on a feedback
  app.post('/api/feedbacks/:id/helpful', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const feedbacks = db.feedbacks || [];
    const item = feedbacks.find((f) => f.id === id);
    if (!item) {
      res.status(404).json({ error: 'Feedback not found.' });
      return;
    }
    item.helpfulCount = (item.helpfulCount || 0) + 1;
    saveDatabase(db);
    res.json({ feedback: item });
  });

  // DELETE feedback (for creator moderation)
  app.delete('/api/feedbacks/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const feedbacks = db.feedbacks || [];
    db.feedbacks = feedbacks.filter((f) => f.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // GET private user box favorites for a specific Google Account UID
  app.get('/api/user-box/:uid', (req, res) => {
    const db = ensureDatabase();
    const uid = String(req.params.uid || '').trim();
    if (!uid) {
      res.status(400).json({ error: 'User UID is required.' });
      return;
    }
    const list = db.userBoxes && Array.isArray(db.userBoxes[uid]) ? db.userBoxes[uid] : [];
    res.json({ favorites: list });
  });

  // POST toggle or set a character in a specific user's private box
  app.post('/api/user-box/:uid/toggle', (req, res) => {
    const db = ensureDatabase();
    const uid = String(req.params.uid || '').trim();
    const { characterId, action } = req.body as {
      characterId?: string;
      action?: 'add' | 'remove';
    };

    if (!uid || !characterId) {
      res.status(400).json({ error: 'uid and characterId are required.' });
      return;
    }

    if (!db.userBoxes || typeof db.userBoxes !== 'object') {
      db.userBoxes = {};
    }

    const currentList = Array.isArray(db.userBoxes[uid]) ? db.userBoxes[uid] : [];
    const exists = currentList.includes(characterId);

    const character = db.characters.find((c) => c.id === characterId);

    let nextList = currentList;
    if (action === 'add' || (!action && !exists)) {
      if (!exists) {
        nextList = [...currentList, characterId];
        if (character) {
          character.favoriteCount = (character.favoriteCount || 0) + 1;
        }
      }
    } else if (action === 'remove' || (!action && exists)) {
      if (exists) {
        nextList = currentList.filter((id) => id !== characterId);
        if (character) {
          character.favoriteCount = Math.max(0, (character.favoriteCount || 0) - 1);
        }
      }
    }

    db.userBoxes[uid] = nextList;
    saveDatabase(db);
    res.json({ favorites: nextList, character });
  });

  // GET all age verification requests (for Creator review queue)
  app.get('/api/verifications', (_req, res) => {
    const db = ensureDatabase();
    res.json({ verifications: db.verifications || [] });
  });

  // GET verification request for specific user ID
  app.get('/api/verifications/user/:userId', (req, res) => {
    const db = ensureDatabase();
    const userId = req.params.userId;
    const item = (db.verifications || []).find((v) => v.userId === userId) || null;
    res.json({ verification: item });
  });

  // Helper: Send Discord Bot notification for a newly saved pending age verification request.
  // Strictly sends ONLY non-PII metadata (request ID, timestamp, status, and admin URL).
  const sendDiscordVerificationNotification = async (
    payload: { id: string; submittedAt: string; status: StoredVerification['status'] },
    adminReviewUrl?: string
  ): Promise<void> => {
    try {
      if (payload.status !== 'pending') return;

      const rawToken = (process.env.DISCORD_BOT_TOKEN || '').trim();
      const channelId = (process.env.DISCORD_CHANNEL_ID || '').trim();

      if (!rawToken || !channelId || rawToken === 'MY_DISCORD_BOT_TOKEN' || channelId === 'MY_DISCORD_CHANNEL_ID') {
        console.warn(
          '[Discord Notification] Skipped: DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID is not configured on the server.'
        );
        return;
      }

      const authHeader = rawToken.startsWith('Bot ') ? rawToken : `Bot ${rawToken}`;
      const formattedTime = new Date(payload.submittedAt).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
      });

      const lines = [
        '🔔 **Yêu cầu xác minh độ tuổi (18+) mới đang chờ duyệt**',
        `• **Mã yêu cầu:** \`${payload.id}\``,
        `• **Trạng thái:** \`${payload.status}\` (Chờ duyệt)`,
        `• **Thời gian gửi:** ${formattedTime} (\`${payload.submittedAt}\`)`,
      ];

      if (adminReviewUrl) {
        lines.push(`• **Trang quản trị duyệt tuổi:** ${adminReviewUrl}`);
      }

      const response = await fetch(
        `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: lines.join('\n'),
            allowed_mentions: { parse: [] },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(
          `[Discord Notification] Failed to send message (HTTP ${response.status}): ${errText.slice(0, 300)}`
        );
      }
    } catch (error) {
      console.error('[Discord Notification] Unexpected error while sending notification:', error);
    }
  };

  const resolveAdminReviewUrl = (req: express.Request): string | undefined => {
    const envUrl = (process.env.APP_URL || '').trim();
    if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
      return envUrl.replace(/\/+$/, '');
    }
    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
    if (originHeader && /^https?:\/\//i.test(originHeader)) {
      return originHeader.replace(/\/+$/, '');
    }
    const host = req.get('host');
    if (host) {
      const forwardedProto =
        typeof req.headers['x-forwarded-proto'] === 'string'
          ? req.headers['x-forwarded-proto'].split(',')[0].trim()
          : '';
      const proto = forwardedProto || req.protocol || 'https';
      return `${proto}://${host}`;
    }
    return undefined;
  };

  // POST submit or update an age verification request
  app.post('/api/verifications', (req, res) => {
    const db = ensureDatabase();
    const body = req.body as Partial<StoredVerification>;

    if (!body || !body.userId || !body.userEmail) {
      res.status(400).json({ error: 'userId and userEmail are required.' });
      return;
    }

    if (!Array.isArray(db.verifications)) {
      db.verifications = [];
    }

    const now = new Date().toISOString();
    const existingIdx = db.verifications.findIndex((v) => v.userId === body.userId);

    const record: StoredVerification = {
      id:
        (typeof body.id === 'string' && body.id.trim()) ||
        (existingIdx !== -1
          ? db.verifications[existingIdx].id
          : `verify_${body.userId}`),
      userId: body.userId,
      userEmail: String(body.userEmail).trim().toLowerCase(),
      userName: String(body.userName || body.userEmail).trim(),
      userPhoto: typeof body.userPhoto === 'string' ? body.userPhoto : undefined,
      documentImage: typeof body.documentImage === 'string' ? body.documentImage : '',
      documentName: typeof body.documentName === 'string' ? body.documentName : undefined,
      note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : undefined,
      status: 'pending', // Re-submitting resets status to pending for CRT review
      submittedAt: now,
      reviewedAt: undefined,
      reviewedBy: undefined,
    };

    if (existingIdx !== -1) {
      db.verifications[existingIdx] = record;
    } else {
      db.verifications.unshift(record);
    }

    saveDatabase(db);

    // Fire-and-forget Discord notification after the record is safely persisted
    const adminReviewUrl = resolveAdminReviewUrl(req);
    void sendDiscordVerificationNotification(
      {
        id: record.id,
        submittedAt: record.submittedAt,
        status: record.status,
      },
      adminReviewUrl
    );

    res.status(201).json({ verification: record });
  });

  // PATCH approve or reject an age verification request (Creator only)
  app.patch('/api/verifications/:id/status', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    const { status, reviewedBy, rejectionReason } = req.body as {
      status?: 'verified' | 'rejected' | 'pending';
      reviewedBy?: string;
      rejectionReason?: string;
    };

    if (!status || !['verified', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be verified, rejected, or pending.' });
      return;
    }

    if (!Array.isArray(db.verifications)) {
      db.verifications = [];
    }

    const idx = db.verifications.findIndex((v) => v.id === id || `verify_${v.userId}` === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Verification request not found.' });
      return;
    }

    const now = new Date().toISOString();
    const updated: StoredVerification = {
      ...db.verifications[idx],
      status,
      reviewedAt: now,
      reviewedBy: reviewedBy || 'Admin CRT',
      rejectionReason: rejectionReason || undefined,
    };

    db.verifications[idx] = updated;

    // When approved as 18+ verified, automatically add their email to spicyWhitelist
    if (status === 'verified' && updated.userEmail) {
      const cleanEmail = updated.userEmail.trim().toLowerCase();
      if (!Array.isArray(db.spicyWhitelist)) {
        db.spicyWhitelist = [];
      }
      const alreadyInWhitelist = db.spicyWhitelist.some(
        (w) => w.email.trim().toLowerCase() === cleanEmail
      );
      if (!alreadyInWhitelist) {
        db.spicyWhitelist.unshift({
          email: cleanEmail,
          addedAt: now,
          note: `Duyệt ảnh 18+ (${updated.userName || cleanEmail})`,
        });
      }
    }

    saveDatabase(db);
    res.json({ verification: updated, whitelist: db.spicyWhitelist });
  });

  // DELETE a verification request
  app.delete('/api/verifications/:id', (req, res) => {
    const db = ensureDatabase();
    const { id } = req.params;
    if (!Array.isArray(db.verifications)) {
      db.verifications = [];
    }
    db.verifications = db.verifications.filter(
      (v) => v.id !== id && `verify_${v.userId}` !== id
    );
    saveDatabase(db);
    res.json({ success: true });
  });

  // =========================================================================
  // SPICY FLAVOR ACCESS (VIP WHITELIST) API
  // =========================================================================

  // GET all whitelisted emails (for Creator management view)
  app.get('/api/spicy-whitelist', (_req, res) => {
    const db = ensureDatabase();
    res.json({ whitelist: db.spicyWhitelist || [] });
  });

  // GET check if a specific email has permission to play spicy characters
  app.get('/api/spicy-access/check', (req, res) => {
    const db = ensureDatabase();
    const rawEmail = String(req.query.email || '').trim().toLowerCase();
    if (!rawEmail) {
      res.json({ allowed: false, email: '' });
      return;
    }

    if (rawEmail === CREATOR_EMAIL.toLowerCase()) {
      res.json({ allowed: true, isCreator: true, email: rawEmail });
      return;
    }

    const list = db.spicyWhitelist || [];
    const inWhitelist = list.some((item) => item.email.toLowerCase().trim() === rawEmail);
    const inVerifiedPhotos = (db.verifications || []).some(
      (v) => v.userEmail.toLowerCase().trim() === rawEmail && v.status === 'verified'
    );
    res.json({ allowed: inWhitelist || inVerifiedPhotos, email: rawEmail });
  });

  // POST add email to spicy whitelist (Creator only)
  app.post('/api/spicy-whitelist', (req, res) => {
    const db = ensureDatabase();
    const body = req.body || {};
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';

    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      return;
    }

    if (!Array.isArray(db.spicyWhitelist)) {
      db.spicyWhitelist = [];
    }

    const existingIdx = db.spicyWhitelist.findIndex(
      (w) => w.email.toLowerCase().trim() === rawEmail
    );

    const now = new Date().toISOString();
    const item: WhitelistItem = {
      email: rawEmail,
      addedAt: now,
      note: note || undefined,
    };

    if (existingIdx !== -1) {
      db.spicyWhitelist[existingIdx] = {
        ...db.spicyWhitelist[existingIdx],
        note: note || db.spicyWhitelist[existingIdx].note,
      };
    } else {
      db.spicyWhitelist.unshift(item);
    }

    saveDatabase(db);
    res.status(201).json({ success: true, item, whitelist: db.spicyWhitelist });
  });

  // DELETE remove email from spicy whitelist
  app.delete('/api/spicy-whitelist/:email', (req, res) => {
    const db = ensureDatabase();
    const targetEmail = decodeURIComponent(req.params.email || '').trim().toLowerCase();

    if (!targetEmail) {
      res.status(400).json({ error: 'Email không được để trống.' });
      return;
    }

    if (targetEmail === CREATOR_EMAIL.toLowerCase()) {
      res.status(400).json({ error: 'Không thể xóa quyền của tài khoản Creator chính.' });
      return;
    }

    if (Array.isArray(db.spicyWhitelist)) {
      db.spicyWhitelist = db.spicyWhitelist.filter(
        (w) => w.email.toLowerCase().trim() !== targetEmail
      );
      saveDatabase(db);
    }

    res.json({ success: true, whitelist: db.spicyWhitelist || [] });
  });

  // POST bulk add multiple emails
  app.post('/api/spicy-whitelist/bulk', (req, res) => {
    const db = ensureDatabase();
    const body = req.body || {};
    const emails = Array.isArray(body.emails) ? body.emails : [];
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (!Array.isArray(db.spicyWhitelist)) {
      db.spicyWhitelist = [];
    }

    let addedCount = 0;
    const now = new Date().toISOString();

    for (const raw of emails) {
      const email = String(raw || '').trim().toLowerCase();
      if (!email || !email.includes('@') || !email.includes('.')) continue;

      const exists = db.spicyWhitelist.some(
        (w) => w.email.toLowerCase().trim() === email
      );

      if (!exists) {
        db.spicyWhitelist.unshift({
          email,
          addedAt: now,
          note: note || undefined,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      saveDatabase(db);
    }

    res.json({ success: true, addedCount, whitelist: db.spicyWhitelist });
  });

  // =========================================================================
  // LOCKED SITE ASSETS (CÁO BEL LOGO & CHEF MASCOT SELF-HEALING BACKUP)
  // =========================================================================
  try {
    const srcImagesDir = path.join(__dirname, 'src', 'assets', 'images');
    if (!fs.existsSync(PUBLIC_AISTUDIO_DIR)) {
      fs.mkdirSync(PUBLIC_AISTUDIO_DIR, { recursive: true });
    }
    if (!fs.existsSync(srcImagesDir)) {
      fs.mkdirSync(srcImagesDir, { recursive: true });
    }

    const lockedPairs = [
      {
        key: 'heroCover',
        srcFile: path.join(srcImagesDir, 'caobel_hero_cover_locked.png'),
        pubFile: path.join(PUBLIC_AISTUDIO_DIR, 'image_5644bac5.png'),
      },
      {
        key: 'foxLogo',
        srcFile: path.join(srcImagesDir, 'caobel_fox_logo_locked.png'),
        pubFile: path.join(PUBLIC_AISTUDIO_DIR, 'download__1__a6655be3.png'),
      },
      {
        key: 'foxChef',
        srcFile: path.join(srcImagesDir, 'caobel_fox_chef_locked.png'),
        pubFile: path.join(PUBLIC_AISTUDIO_DIR, 'download__2__a08e50a0.png'),
      },
    ];

    let jsonBackup: Record<string, string> = {};
    if (fs.existsSync(SITE_ASSETS_FILE)) {
      try {
        jsonBackup = JSON.parse(fs.readFileSync(SITE_ASSETS_FILE, 'utf-8'));
      } catch {
        jsonBackup = {};
      }
    }

    let jsonUpdated = false;
    for (const item of lockedPairs) {
      if (fs.existsSync(item.srcFile) && !fs.existsSync(item.pubFile)) {
        fs.copyFileSync(item.srcFile, item.pubFile);
      } else if (fs.existsSync(item.pubFile) && !fs.existsSync(item.srcFile)) {
        fs.copyFileSync(item.pubFile, item.srcFile);
      } else if (!fs.existsSync(item.srcFile) && !fs.existsSync(item.pubFile) && jsonBackup[item.key]) {
        const match = jsonBackup[item.key].match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
        if (match && match[1]) {
          const buf = Buffer.from(match[1], 'base64');
          fs.writeFileSync(item.srcFile, buf);
          fs.writeFileSync(item.pubFile, buf);
        }
      }

      if (!jsonBackup[item.key] && fs.existsSync(item.srcFile)) {
        const buf = fs.readFileSync(item.srcFile);
        jsonBackup[item.key] = `data:image/png;base64,${buf.toString('base64')}`;
        jsonUpdated = true;
      }
    }

    if (jsonUpdated) {
      fs.writeFileSync(SITE_ASSETS_FILE, JSON.stringify(jsonBackup, null, 2), 'utf-8');
    }
  } catch {
    // Non-blocking self-healing check
  }

  app.get('/api/site-assets', (_req, res) => {
    try {
      if (fs.existsSync(SITE_ASSETS_FILE)) {
        const raw = fs.readFileSync(SITE_ASSETS_FILE, 'utf-8');
        res.json({ assets: JSON.parse(raw) });
        return;
      }
    } catch {
      // Ignore
    }
    res.json({ assets: {} });
  });

  // Serve /data/*.json for static fallback parity
  app.use('/data', express.static(DATA_DIR));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Takoyaki Story Stall server running on http://localhost:${PORT}`);
  });
}

startServer();
