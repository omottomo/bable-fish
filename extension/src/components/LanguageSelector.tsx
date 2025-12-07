/**
 * LanguageSelector Component
 *
 * Displays dropdowns for source and target language selection.
 * Supports English, Japanese, and Chinese.
 */

import React from 'react';
import { Language } from '../types/translation.types';

interface LanguageSelectorProps {
  sourceLanguage: Language | null;
  targetLanguage: Language | null;
  onSourceChange: (language: Language) => void;
  onTargetChange: (language: Language) => void;
  error?: string | null;
  loading?: boolean;
}

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
  error,
  loading = false,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="source-language" className="block text-sm font-medium text-gray-700 mb-1">
          Source Language
        </label>
        <select
          id="source-language"
          data-testid="source-language-select"
          value={sourceLanguage || ''}
          onChange={(e) => onSourceChange(e.target.value as Language)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="" disabled>
            Select source language
          </option>
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="target-language" className="block text-sm font-medium text-gray-700 mb-1">
          Target Language
        </label>
        <select
          id="target-language"
          data-testid="target-language-select"
          value={targetLanguage || ''}
          onChange={(e) => onTargetChange(e.target.value as Language)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="" disabled>
            Select target language
          </option>
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          data-testid="language-error"
          className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          data-testid="language-loading"
          className="text-sm text-gray-500 flex items-center gap-2"
        >
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          Loading preferences...
        </div>
      )}
    </div>
  );
};
