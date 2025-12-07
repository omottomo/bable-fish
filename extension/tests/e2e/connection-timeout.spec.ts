/**
 * E2E test for connection timeout handling
 *
 * Validates that the extension:
 * - Shows timeout notification after 5 seconds
 * - Handles reconnection attempts
 * - Displays appropriate error messages
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');
const CONNECTION_TIMEOUT_MS = 5000; // 5 seconds per spec

test.describe('Connection Timeout Handling', () => {
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

  test('should display timeout notification after 5 seconds if no session_started', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Mock WebSocket to never respond with session_started
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          // Override to prevent session_started message
          const originalOnMessage = this.onmessage;
          this.onmessage = (event: MessageEvent) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type !== 'session_started') {
                if (originalOnMessage) originalOnMessage.call(this, event);
              }
              // Ignore session_started to trigger timeout
            } catch (e) {
              if (originalOnMessage) originalOnMessage.call(this, event);
            }
          };
        }
      };
    });

    // Open popup and attempt to start translation
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    // Wait for timeout notification to appear
    const notificationSelector = '[data-testid="notification-banner"]';
    const notification = await page.waitForSelector(notificationSelector, {
      timeout: CONNECTION_TIMEOUT_MS + 1000,
    });

    expect(notification).toBeTruthy();

    // Verify notification content
    const notificationText = await notification.textContent();
    expect(notificationText).toContain('timeout');
    expect(notificationText?.toLowerCase()).toContain('connection');

    await page.close();
  });

  test('should attempt reconnection with exponential backoff', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Track reconnection attempts
    await page.addInitScript(() => {
      (window as any).__reconnectionAttempts = [];

      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          (window as any).__reconnectionAttempts.push({
            time: Date.now(),
            url,
          });

          // Simulate connection failure
          setTimeout(() => {
            const errorEvent = new Event('error');
            if (this.onerror) this.onerror(errorEvent);

            const closeEvent = new CloseEvent('close', { code: 1006 });
            if (this.onclose) this.onclose(closeEvent);
          }, 100);
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'zh');
    await popup.click('[data-testid="start-translation"]');

    // Wait for multiple reconnection attempts
    await page.waitForTimeout(10000); // Wait 10 seconds to see backoff pattern

    const attempts = await page.evaluate(() => {
      return (window as any).__reconnectionAttempts || [];
    });

    // Should have multiple reconnection attempts
    expect(attempts.length).toBeGreaterThan(1);

    // Verify exponential backoff (1s, 2s, 4s, etc.)
    if (attempts.length >= 3) {
      const delay1 = attempts[1].time - attempts[0].time;
      const delay2 = attempts[2].time - attempts[1].time;

      // Second delay should be roughly 2x first delay (allowing for timing variance)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
    }

    await page.close();
  });

  test('should display "Reconnecting..." notification during retry', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;
      let attemptCount = 0;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          attemptCount++;

          // Fail first 2 attempts, succeed on 3rd
          if (attemptCount < 3) {
            setTimeout(() => {
              if (this.onerror) this.onerror(new Event('error'));
              if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));
            }, 100);
          }
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'zh');
    await popup.click('[data-testid="start-translation"]');

    // Wait for first connection failure
    await page.waitForTimeout(200);

    // Check for "Reconnecting..." notification
    const reconnectingNotification = page.locator('[data-testid="notification-banner"]', {
      hasText: /reconnecting/i,
    });

    await expect(reconnectingNotification).toBeVisible({ timeout: 3000 });

    await page.close();
  });

  test('should stop reconnecting after max retry attempts', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    await page.addInitScript(() => {
      (window as any).__maxRetriesReached = false;

      const OriginalWebSocket = window.WebSocket;
      let attemptCount = 0;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          attemptCount++;

          // Always fail to trigger max retries
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event('error'));
            if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));

            // After 3 attempts, mark max retries reached
            if (attemptCount >= 3) {
              (window as any).__maxRetriesReached = true;
            }
          }, 100);
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'en');
    await popup.click('[data-testid="start-translation"]');

    // Wait for max retries to be reached
    await page.waitForFunction(
      () => {
        return (window as any).__maxRetriesReached === true;
      },
      { timeout: 15000 }
    );

    // Check for "Connection lost" or similar error notification
    const errorNotification = page.locator('[data-testid="notification-banner"]', {
      hasText: /connection lost|failed to connect|cannot connect/i,
    });

    await expect(errorNotification).toBeVisible({ timeout: 2000 });

    await page.close();
  });

  test('should allow manual retry after connection failure', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    let connectionAttempts = 0;

    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          // Fail first attempt, succeed on second (manual retry)
          if ((window as any).__manualRetry) {
            // Succeed on manual retry
            setTimeout(() => {
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 100);
          } else {
            // Fail first attempt
            setTimeout(() => {
              if (this.onerror) this.onerror(new Event('error'));
              if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));
            }, 100);
          }
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'zh');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    // Wait for connection error
    await page.waitForSelector('[data-testid="notification-banner"]', { timeout: 6000 });

    // Enable manual retry to succeed
    await page.evaluate(() => {
      (window as any).__manualRetry = true;
    });

    // Click retry button (if available) or restart translation
    const retryButton = page.locator('[data-testid="retry-connection"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    } else {
      // Restart translation via popup
      await popup.click('[data-testid="start-translation"]');
    }

    // Wait for successful connection
    const overlay = page.locator('[data-testid="translation-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 3000 });

    await page.close();
  });

  test('should handle server unavailable gracefully', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Configure to connect to non-existent server
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          // Immediately fail to simulate server unavailable
          super('ws://invalid-server-that-does-not-exist.local:9999', protocols);
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'en');
    await popup.selectOption('[data-testid="target-language"]', 'ja');
    await popup.click('[data-testid="start-translation"]');

    // Should show connection error notification
    const errorNotification = page.locator('[data-testid="notification-banner"]');
    await expect(errorNotification).toBeVisible({ timeout: 7000 });

    const notificationText = await errorNotification.textContent();
    expect(notificationText?.toLowerCase()).toMatch(/error|timeout|connection|failed/);

    await page.close();
  });

  test('should clear timeout notification on successful connection', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    let shouldSucceed = false;

    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;

      (window as any).WebSocket = class MockWebSocket extends OriginalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);

          if ((window as any).__shouldSucceed) {
            // Succeed
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
            }, 100);
          } else {
            // Fail initially
            setTimeout(() => {
              if (this.onerror) this.onerror(new Event('error'));
              if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006 }));
            }, 100);
          }
        }
      };
    });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.action.openPopup();
      }),
    ]);

    await popup.selectOption('[data-testid="source-language"]', 'ja');
    await popup.selectOption('[data-testid="target-language"]', 'en');
    await popup.click('[data-testid="start-translation"]');

    // Wait for error notification
    await page.waitForSelector('[data-testid="notification-banner"]', { timeout: 6000 });

    // Now allow connection to succeed
    await page.evaluate(() => {
      (window as any).__shouldSucceed = true;
    });

    // Retry connection
    await popup.click('[data-testid="start-translation"]');

    // Wait for overlay (successful connection)
    await page.waitForSelector('[data-testid="translation-overlay"]', { timeout: 3000 });

    // Error notification should be hidden
    const notification = page.locator('[data-testid="notification-banner"]');
    await expect(notification).toBeHidden({ timeout: 2000 });

    await page.close();
  });
});
