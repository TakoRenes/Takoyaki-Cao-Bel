import { useState, useEffect } from 'react';
import caobelHeroCoverLocked from '../assets/images/caobel_hero_cover_locked.png';
import caobelFoxLogoLocked from '../assets/images/caobel_fox_logo_locked.png';
import caobelFoxChefLocked from '../assets/images/caobel_fox_chef_locked.png';

export interface SiteAssets {
  heroCover: string;
  foxLogo: string;
  foxChef: string;
}

// Permanently locked Cáo Bel images bundled directly via Vite + backed up in /public/assets/aistudio & /data/site_assets.json
export const LOCKED_SITE_ASSETS: SiteAssets = {
  heroCover: caobelHeroCoverLocked,
  foxLogo: caobelFoxLogoLocked,
  foxChef: caobelFoxChefLocked,
};

export const FALLBACK_SITE_ASSETS: SiteAssets = {
  heroCover: `${import.meta.env.BASE_URL}assets/aistudio/image_5644bac5.png`,
  foxLogo: `${import.meta.env.BASE_URL}assets/aistudio/download__1__a6655be3.png`,
  foxChef: `${import.meta.env.BASE_URL}assets/aistudio/download__2__a08e50a0.png`,
};

let cachedBackupAssets: Partial<SiteAssets> | null = null;
let hasFetchedBackup = false;
const listeners = new Set<(assets: SiteAssets) => void>();

async function ensureBackupLoaded() {
  if (hasFetchedBackup) return;
  hasFetchedBackup = true;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/site_assets.json`);
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === 'object') {
        cachedBackupAssets = json;
        notifyListeners();
      }
    }
  } catch {
    // Ignore
  }
}

function getEffectiveAssets(): SiteAssets {
  return {
    heroCover: LOCKED_SITE_ASSETS.heroCover || cachedBackupAssets?.heroCover || FALLBACK_SITE_ASSETS.heroCover,
    foxLogo: LOCKED_SITE_ASSETS.foxLogo || cachedBackupAssets?.foxLogo || FALLBACK_SITE_ASSETS.foxLogo,
    foxChef: LOCKED_SITE_ASSETS.foxChef || cachedBackupAssets?.foxChef || FALLBACK_SITE_ASSETS.foxChef,
  };
}

function notifyListeners() {
  const next = getEffectiveAssets();
  for (const listener of listeners) {
    listener(next);
  }
}

export function useSiteAssets() {
  const [assets, setAssets] = useState<SiteAssets>(getEffectiveAssets);

  useEffect(() => {
    const handler = (next: SiteAssets) => setAssets(next);
    listeners.add(handler);
    void ensureBackupLoaded();
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    assets,
    fallbacks: {
      heroCover: cachedBackupAssets?.heroCover || FALLBACK_SITE_ASSETS.heroCover,
      foxLogo: cachedBackupAssets?.foxLogo || FALLBACK_SITE_ASSETS.foxLogo,
      foxChef: cachedBackupAssets?.foxChef || FALLBACK_SITE_ASSETS.foxChef,
    },
  };
}
