/**
 * useLanguagePreferences Hook
 *
 * Manages language preferences using chrome.storage.sync for cross-device persistence.
 * Provides loading state, error handling, and validation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types/translation.types';
import { LanguagePreference, STORAGE_KEYS } from '../types/storage.types';
import { ErrorHandler, AppError } from '../utils/errorHandler';

interface UseLanguagePreferencesResult {
  sourceLanguage: Language | null;
  targetLanguage: Language | null;
  loading: boolean;
  error: AppError | null;
  setLanguages: (source: Language, target: Language) => Promise<void>;
}

export const useLanguagePreferences = (): UseLanguagePreferencesResult => {
  const [sourceLanguage, setSourceLanguage] = useState<Language | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);

  // Load preferences from chrome.storage.sync on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        chrome.storage.sync.get([STORAGE_KEYS.LANGUAGE_PREFERENCES], (result) => {
          const preferences = result[STORAGE_KEYS.LANGUAGE_PREFERENCES] as LanguagePreference | undefined;

          if (preferences) {
            setSourceLanguage(preferences.sourceLanguage);
            setTargetLanguage(preferences.targetLanguage);
          }

          setLoading(false);
        });
      } catch (err) {
        const storageError = ErrorHandler.createError(
          'STORAGE_ERROR',
          'Failed to load language preferences',
          true
        );
        setError(storageError);
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Listen for storage changes from other browser instances
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'sync' && changes[STORAGE_KEYS.LANGUAGE_PREFERENCES]) {
        const newValue = changes[STORAGE_KEYS.LANGUAGE_PREFERENCES].newValue as LanguagePreference | undefined;

        if (newValue) {
          setSourceLanguage(newValue.sourceLanguage);
          setTargetLanguage(newValue.targetLanguage);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Save language preferences to chrome.storage.sync
  const setLanguages = useCallback(async (source: Language, target: Language) => {
    setError(null);

    // Validate: prevent same source and target
    const validationError = ErrorHandler.validateLanguages(source, target);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const preference: LanguagePreference = {
        sourceLanguage: source,
        targetLanguage: target,
        updatedAt: new Date(),
      };

      chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE_PREFERENCES]: preference }, () => {
        if (chrome.runtime.lastError) {
          const storageError = ErrorHandler.createError(
            'STORAGE_ERROR',
            chrome.runtime.lastError.message || 'Failed to save language preferences',
            true
          );
          setError(storageError);
          return;
        }

        setSourceLanguage(source);
        setTargetLanguage(target);
      });
    } catch (err) {
      const storageError = ErrorHandler.createError(
        'STORAGE_ERROR',
        'Failed to save language preferences',
        true
      );
      setError(storageError);
    }
  }, []);

  return {
    sourceLanguage,
    targetLanguage,
    loading,
    error,
    setLanguages,
  };
};
