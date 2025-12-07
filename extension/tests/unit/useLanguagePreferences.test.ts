/**
 * Unit tests for useLanguagePreferences hook
 *
 * Tests:
 * - Loading language preferences from chrome.storage.sync
 * - Saving language preferences to chrome.storage.sync
 * - Validation: prevent same source/target language
 * - Error handling: storage failures
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useLanguagePreferences } from '../../src/hooks/useLanguagePreferences';
import { Language } from '../../src/types/translation.types';

// Mock chrome.storage API
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageOnChanged = { addListener: jest.fn(), removeListener: jest.fn() };

global.chrome = {
  storage: {
    sync: {
      get: mockStorageGet,
      set: mockStorageSet,
      onChanged: mockStorageOnChanged,
    },
  },
} as any;

describe('useLanguagePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load language preferences from chrome.storage.sync on mount', async () => {
    const mockPreferences = {
      language_preferences: {
        sourceLanguage: 'en' as Language,
        targetLanguage: 'ja' as Language,
        updatedAt: new Date('2025-12-06').toISOString(),
      },
    };

    mockStorageGet.mockImplementation((keys, callback) => {
      callback(mockPreferences);
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await waitFor(() => {
      expect(result.current.sourceLanguage).toBe('en');
      expect(result.current.targetLanguage).toBe('ja');
      expect(result.current.loading).toBe(false);
    });

    expect(mockStorageGet).toHaveBeenCalledWith(['language_preferences'], expect.any(Function));
  });

  it('should save language preferences to chrome.storage.sync', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      callback({});
    });

    mockStorageSet.mockImplementation((items, callback) => {
      callback();
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await act(async () => {
      await result.current.setLanguages('en', 'zh');
    });

    expect(mockStorageSet).toHaveBeenCalledWith(
      {
        language_preferences: {
          sourceLanguage: 'en',
          targetLanguage: 'zh',
          updatedAt: expect.any(String),
        },
      },
      expect.any(Function)
    );

    expect(result.current.sourceLanguage).toBe('en');
    expect(result.current.targetLanguage).toBe('zh');
    expect(result.current.error).toBeNull();
  });

  it('should prevent setting same source and target language', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      callback({});
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await act(async () => {
      await result.current.setLanguages('en', 'en');
    });

    expect(mockStorageSet).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({
      code: 'INVALID_LANGUAGE',
      message: 'Source and target must be different',
      userMessage: 'Please select different source and target languages.',
      timestamp: expect.any(Number),
      recoverable: true,
    });
  });

  it('should handle storage.sync.get failures', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe('STORAGE_ERROR');
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle storage.sync.set failures', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      callback({});
    });

    mockStorageSet.mockImplementation((items, callback) => {
      throw new Error('Storage write failed');
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await act(async () => {
      await result.current.setLanguages('en', 'ja');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('STORAGE_ERROR');
    expect(result.current.error?.recoverable).toBe(true);
  });

  it('should return default values when no preferences stored', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      callback({});
    });

    const { result } = renderHook(() => useLanguagePreferences());

    await waitFor(() => {
      expect(result.current.sourceLanguage).toBeNull();
      expect(result.current.targetLanguage).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should listen for storage changes across browser instances', async () => {
    mockStorageGet.mockImplementation((keys, callback) => {
      callback({});
    });

    const { result } = renderHook(() => useLanguagePreferences());

    // Simulate storage change from another browser instance
    const storageChangeHandler = mockStorageOnChanged.addListener.mock.calls[0][0];

    act(() => {
      storageChangeHandler(
        {
          language_preferences: {
            newValue: {
              sourceLanguage: 'zh',
              targetLanguage: 'en',
              updatedAt: new Date().toISOString(),
            },
          },
        },
        'sync'
      );
    });

    await waitFor(() => {
      expect(result.current.sourceLanguage).toBe('zh');
      expect(result.current.targetLanguage).toBe('en');
    });
  });
});
