/**
 * Chrome Storage Types
 * Based on data-model.md storage strategy
 */

import { Language } from './translation.types';

// Chrome Storage Sync (cross-device, persistent)
export interface LanguagePreference {
  sourceLanguage: Language;
  targetLanguage: Language;
  updatedAt: Date;
}

// Chrome Storage Local (session-scoped)
export interface TranslationDisplayAreaState {
  width: number; // pixels, min: 200, max: 800
  height: number; // pixels, min: 100, max: 600
  x: number; // viewport coordinates
  y: number; // viewport coordinates
  isVisible: boolean;
  currentText: string;
}

export interface AdvertisementDisplayAreaState {
  width: number; // pixels, fixed: 300
  height: number; // pixels, fixed: 250
  position: 'top' | 'bottom' | 'side';
  isVisible: boolean;
  adLoaded: boolean;
}

// Storage keys
export const STORAGE_KEYS = {
  LANGUAGE_PREFERENCES: 'language_preferences',
  DISPLAY_STATE: 'display_state',
  AD_STATE: 'ad_state',
} as const;

// Helper types for chrome.storage API
export interface SyncStorage {
  [STORAGE_KEYS.LANGUAGE_PREFERENCES]?: LanguagePreference;
}

export interface LocalStorage {
  [STORAGE_KEYS.DISPLAY_STATE]?: TranslationDisplayAreaState;
  [STORAGE_KEYS.AD_STATE]?: AdvertisementDisplayAreaState;
}
