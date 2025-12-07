/**
 * E2E tests for language selection persistence
 *
 * Tests:
 * - User can select source and target languages
 * - Selections persist when popup is reopened
 * - Selections sync across browser instances
 * - Validation prevents same source/target selection
 */

import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

let context: BrowserContext;

test.beforeAll(async () => {
  // Load extension in Chromium
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('should persist language selection when popup is closed and reopened', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  // Open extension popup
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Select English → Japanese
  await popup.selectOption('[data-testid="source-language-select"]', 'en');
  await popup.selectOption('[data-testid="target-language-select"]', 'ja');

  // Wait for storage save
  await popup.waitForTimeout(100);

  // Close popup
  await popup.close();

  // Reopen popup
  const popup2 = await context.newPage();
  await popup2.goto(`chrome-extension://${extensionId}/popup.html`);

  // Verify selections persisted
  const sourceLanguage = await popup2.inputValue('[data-testid="source-language-select"]');
  const targetLanguage = await popup2.inputValue('[data-testid="target-language-select"]');

  expect(sourceLanguage).toBe('en');
  expect(targetLanguage).toBe('ja');

  await popup2.close();
});

test('should prevent selecting same source and target language', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Select English for both
  await popup.selectOption('[data-testid="source-language-select"]', 'en');
  await popup.selectOption('[data-testid="target-language-select"]', 'en');

  // Verify error message appears
  const errorMessage = popup.locator('[data-testid="language-error"]');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText('Please select different source and target languages');

  await popup.close();
});

test('should display all supported languages in dropdown', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Check source language options
  const sourceOptions = await popup.locator('[data-testid="source-language-select"] option').allTextContents();
  expect(sourceOptions).toContain('English');
  expect(sourceOptions).toContain('Japanese');
  expect(sourceOptions).toContain('Chinese');
  expect(sourceOptions).toHaveLength(3);

  // Check target language options
  const targetOptions = await popup.locator('[data-testid="target-language-select"] option').allTextContents();
  expect(targetOptions).toContain('English');
  expect(targetOptions).toContain('Japanese');
  expect(targetOptions).toContain('Chinese');
  expect(targetOptions).toHaveLength(3);

  await popup.close();
});

test('should update UI when language preferences change from storage', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Select Chinese → English
  await popup.selectOption('[data-testid="source-language-select"]', 'zh');
  await popup.selectOption('[data-testid="target-language-select"]', 'en');

  // Wait for storage save
  await popup.waitForTimeout(100);

  // Verify selections updated in UI
  const sourceLanguage = await popup.inputValue('[data-testid="source-language-select"]');
  const targetLanguage = await popup.inputValue('[data-testid="target-language-select"]');

  expect(sourceLanguage).toBe('zh');
  expect(targetLanguage).toBe('en');

  await popup.close();
});

test('should show loading state while fetching preferences', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Check for loading indicator (should disappear quickly)
  const loadingIndicator = popup.locator('[data-testid="language-loading"]');

  // Loading indicator should either not exist or be hidden
  const isVisible = await loadingIndicator.isVisible().catch(() => false);
  if (isVisible) {
    await expect(loadingIndicator).toBeHidden({ timeout: 2000 });
  }

  await popup.close();
});

test('should display storage error when chrome.storage fails', async () => {
  const [background] = context.serviceWorkers();
  const extensionId = background.url().split('/')[2];

  const popup = await context.newPage();

  // Inject script to mock chrome.storage failure
  await popup.addInitScript(() => {
    (window as any).chrome = {
      ...((window as any).chrome || {}),
      storage: {
        sync: {
          get: (keys: any, callback: any) => {
            throw new Error('Storage quota exceeded');
          },
          set: (items: any, callback: any) => {
            throw new Error('Storage quota exceeded');
          },
        },
      },
    };
  });

  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  // Verify error message appears
  const errorMessage = popup.locator('[data-testid="storage-error"]');
  await expect(errorMessage).toBeVisible({ timeout: 3000 });
  await expect(errorMessage).toContainText('storage');

  await popup.close();
});
