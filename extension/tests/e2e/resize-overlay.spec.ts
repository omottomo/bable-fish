/**
 * E2E test for resize functionality
 *
 * Validates that translation overlay can be resized by dragging edges/corners
 * with proper bounds constraints (200-800w, 100-600h)
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Translation Overlay Resize', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should resize overlay by dragging corner handle', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Start translation
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible', timeout: 3000 });

    // Get initial size
    const initialBox = await overlay.boundingBox();
    expect(initialBox).not.toBeNull();

    // Find resize handle (bottom-right corner)
    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    await resizeHandle.waitFor({ state: 'visible' });

    // Drag to resize
    const handleBox = await resizeHandle.boundingBox();
    if (handleBox && initialBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 100, handleBox.y + 50);
      await page.mouse.up();

      // Wait for resize to complete
      await page.waitForTimeout(100);

      // Verify size changed
      const newBox = await overlay.boundingBox();
      expect(newBox).not.toBeNull();
      expect(newBox!.width).toBeGreaterThan(initialBox.width);
      expect(newBox!.height).toBeGreaterThan(initialBox.height);
    }

    await page.close();
  });

  test('should enforce minimum width constraint (200px)', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'en');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      // Try to resize smaller than minimum
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 500, handleBox.y);
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();
      expect(newBox!.width).toBeGreaterThanOrEqual(200);
    }

    await page.close();
  });

  test('should enforce maximum width constraint (800px)', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'zh');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      // Try to resize larger than maximum
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 1000, handleBox.y);
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();
      expect(newBox!.width).toBeLessThanOrEqual(800);
    }

    await page.close();
  });

  test('should enforce minimum height constraint (100px)', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'zh');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x, handleBox.y - 500);
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();
      expect(newBox!.height).toBeGreaterThanOrEqual(100);
    }

    await page.close();
  });

  test('should enforce maximum height constraint (600px)', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'zh');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x, handleBox.y + 1000);
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();
      expect(newBox!.height).toBeLessThanOrEqual(600);
    }

    await page.close();
  });

  test('should persist resized dimensions across page navigation', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    // Resize overlay
    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 100, handleBox.y + 50);
      await page.mouse.up();
    }

    await page.waitForTimeout(200);
    const resizedBox = await overlay.boundingBox();

    // Navigate to different page
    await page.goto('https://www.example.com');
    await page.waitForTimeout(500);

    // Check if size persisted
    const persistedBox = await overlay.boundingBox();
    expect(persistedBox!.width).toBe(resizedBox!.width);
    expect(persistedBox!.height).toBe(resizedBox!.height);

    await page.close();
  });

  test('should show resize cursor on hover over handles', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'zh');
    await popup.selectOption('[data-testid="target-language"]', 'en');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    await resizeHandle.waitFor({ state: 'visible' });

    const cursor = await resizeHandle.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toMatch(/resize|nwse-resize/);

    await page.close();
  });

  test('should resize smoothly without lag or flickering', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
    const handleBox = await resizeHandle.boundingBox();

    if (handleBox) {
      const startTime = Date.now();

      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();

      // Perform smooth resize with multiple steps
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(handleBox.x + i * 5, handleBox.y + i * 2);
        await page.waitForTimeout(10);
      }

      await page.mouse.up();

      const resizeTime = Date.now() - startTime;

      // Resize should be responsive (< 500ms for 20 steps)
      expect(resizeTime).toBeLessThan(500);
    }

    await page.close();
  });
});
