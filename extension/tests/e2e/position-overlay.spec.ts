/**
 * E2E test for positioning functionality
 *
 * Validates that translation overlay can be repositioned by dragging the header
 * and maintains fixed positioning when page scrolls
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Translation Overlay Positioning', () => {
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

  test('should drag overlay by header to new position', async () => {
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
    await overlay.waitFor({ state: 'visible', timeout: 3000 });

    const initialBox = await overlay.boundingBox();
    expect(initialBox).not.toBeNull();

    // Find drag handle (header)
    const dragHandle = page.locator('[data-testid="drag-handle"]');
    await dragHandle.waitFor({ state: 'visible' });

    // Drag to new position
    const handleBox = await dragHandle.boundingBox();
    if (handleBox && initialBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 200, handleBox.y + 150);
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();
      expect(newBox).not.toBeNull();
      expect(newBox!.x).not.toBe(initialBox.x);
      expect(newBox!.y).not.toBe(initialBox.y);
    }

    await page.close();
  });

  test('should maintain fixed positioning when page scrolls', async () => {
    const page = await context.newPage();

    // Create a page with scrollable content
    await page.setContent(`
      <html>
        <body style="height: 3000px; background: linear-gradient(white, gray);">
          <h1 style="margin-top: 100px;">Scrollable Page</h1>
        </body>
      </html>
    `);

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => chrome.action.openPopup()),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'en');
    await popup.click('[data-testid="start-translation"]');

    const overlay = page.locator('[data-testid="translation-overlay"]');
    await overlay.waitFor({ state: 'visible' });

    const positionBefore = await overlay.boundingBox();

    // Scroll the page
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    const positionAfter = await overlay.boundingBox();

    // Position should remain the same (fixed positioning)
    expect(positionAfter!.x).toBe(positionBefore!.x);
    expect(positionAfter!.y).toBe(positionBefore!.y);

    await page.close();
  });

  test('should constrain overlay to viewport bounds', async () => {
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

    const dragHandle = page.locator('[data-testid="drag-handle"]');
    const handleBox = await dragHandle.boundingBox();

    if (handleBox) {
      // Try to drag beyond viewport
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(-500, -500); // Off screen
      await page.mouse.up();

      await page.waitForTimeout(100);

      const newBox = await overlay.boundingBox();

      // Should be constrained to viewport
      expect(newBox!.x).toBeGreaterThanOrEqual(0);
      expect(newBox!.y).toBeGreaterThanOrEqual(0);
    }

    await page.close();
  });

  test('should persist position across page navigation', async () => {
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

    // Move overlay to new position
    const dragHandle = page.locator('[data-testid="drag-handle"]');
    const handleBox = await dragHandle.boundingBox();

    if (handleBox) {
      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 100, handleBox.y + 100);
      await page.mouse.up();
    }

    await page.waitForTimeout(200);
    const movedBox = await overlay.boundingBox();

    // Navigate to different page
    await page.goto('https://www.example.com');
    await page.waitForTimeout(500);

    // Check if position persisted
    const persistedBox = await overlay.boundingBox();
    expect(persistedBox!.x).toBe(movedBox!.x);
    expect(persistedBox!.y).toBe(movedBox!.y);

    await page.close();
  });

  test('should show move cursor on hover over drag handle', async () => {
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

    const dragHandle = page.locator('[data-testid="drag-handle"]');
    await dragHandle.waitFor({ state: 'visible' });

    const cursor = await dragHandle.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toMatch(/move|grab/);

    await page.close();
  });

  test('should allow dragging to all four corners of viewport', async () => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
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

    const dragHandle = page.locator('[data-testid="drag-handle"]');

    const corners = [
      { name: 'top-left', x: 50, y: 50 },
      { name: 'top-right', x: 1000, y: 50 },
      { name: 'bottom-left', x: 50, y: 650 },
      { name: 'bottom-right', x: 1000, y: 650 },
    ];

    for (const corner of corners) {
      const handleBox = await dragHandle.boundingBox();

      if (handleBox) {
        await page.mouse.move(handleBox.x, handleBox.y);
        await page.mouse.down();
        await page.mouse.move(corner.x, corner.y);
        await page.mouse.up();

        await page.waitForTimeout(100);

        const newBox = await overlay.boundingBox();

        // Verify overlay is near the target corner
        expect(Math.abs(newBox!.x - corner.x)).toBeLessThan(100);
        expect(Math.abs(newBox!.y - corner.y)).toBeLessThan(100);

        console.log(`Dragged to ${corner.name}: (${newBox!.x}, ${newBox!.y})`);
      }
    }

    await page.close();
  });

  test('should use fixed CSS positioning', async () => {
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

    const position = await overlay.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });

    expect(position).toBe('fixed');

    await page.close();
  });

  test('should drag smoothly without lag', async () => {
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

    const dragHandle = page.locator('[data-testid="drag-handle"]');
    const handleBox = await dragHandle.boundingBox();

    if (handleBox) {
      const startTime = Date.now();

      await page.mouse.move(handleBox.x, handleBox.y);
      await page.mouse.down();

      // Perform smooth drag with multiple steps
      for (let i = 0; i < 30; i++) {
        await page.mouse.move(handleBox.x + i * 3, handleBox.y + i * 2);
        await page.waitForTimeout(5);
      }

      await page.mouse.up();

      const dragTime = Date.now() - startTime;

      // Drag should be responsive (< 400ms for 30 steps)
      expect(dragTime).toBeLessThan(400);
    }

    await page.close();
  });
});
