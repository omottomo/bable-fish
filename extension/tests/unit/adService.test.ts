/**
 * Unit tests for adService
 *
 * Tests PropellerAds SDK integration and graceful failure handling
 */

import { adService } from '../../src/services/adService';

// Mock PropellerAds SDK
const mockPropellerAds = {
  init: jest.fn(),
  load: jest.fn(),
  destroy: jest.fn(),
};

// Mock script loading
const mockScriptElement = {
  src: '',
  async: false,
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

describe('adService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document.createElement for script injection
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'script') {
        return mockScriptElement as any;
      }
      return document.createElement(tagName);
    });

    // Mock document.body.appendChild
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    // Reset window.PropellerAds
    (window as any).PropellerAds = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should load PropellerAds SDK asynchronously', async () => {
    const loadPromise = adService.initialize('test-zone-id');

    // Simulate SDK loading
    setTimeout(() => {
      (window as any).PropellerAds = mockPropellerAds;
      if (mockScriptElement.onload) {
        mockScriptElement.onload();
      }
    }, 10);

    await loadPromise;

    expect(document.createElement).toHaveBeenCalledWith('script');
    expect(mockScriptElement.async).toBe(true);
    expect(mockScriptElement.src).toContain('propellerads');
  });

  it('should display ad in container element', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container = document.createElement('div');
    container.id = 'ad-container';

    const success = await adService.displayAd(container, 'zone-123');

    expect(success).toBe(true);
  });

  it('should handle SDK load failure gracefully', async () => {
    const loadPromise = adService.initialize('test-zone-id');

    // Simulate SDK load error
    setTimeout(() => {
      if (mockScriptElement.onerror) {
        mockScriptElement.onerror();
      }
    }, 10);

    await expect(loadPromise).rejects.toThrow('Failed to load PropellerAds SDK');
  });

  it('should handle ad display failure gracefully', async () => {
    (window as any).PropellerAds = {
      ...mockPropellerAds,
      load: jest.fn(() => {
        throw new Error('Ad load failed');
      }),
    };

    const container = document.createElement('div');

    const success = await adService.displayAd(container, 'zone-123');

    expect(success).toBe(false);
  });

  it('should not block on ad failure', async () => {
    // Simulate SDK not available (ad blocker scenario)
    (window as any).PropellerAds = undefined;

    const container = document.createElement('div');

    const success = await adService.displayAd(container, 'zone-123');

    // Should fail gracefully without throwing
    expect(success).toBe(false);
  });

  it('should track ad load time', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container = document.createElement('div');
    const startTime = Date.now();

    await adService.displayAd(container, 'zone-123');

    const loadTime = adService.getLastLoadTime();

    expect(loadTime).toBeGreaterThanOrEqual(0);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  it('should allow retry after failure', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container = document.createElement('div');

    // First attempt fails
    mockPropellerAds.load.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    const firstAttempt = await adService.displayAd(container, 'zone-123');
    expect(firstAttempt).toBe(false);

    // Second attempt succeeds
    mockPropellerAds.load.mockImplementationOnce(() => {
      return Promise.resolve();
    });

    const secondAttempt = await adService.displayAd(container, 'zone-123');
    expect(secondAttempt).toBe(true);
  });

  it('should detect ad blocker', async () => {
    // Simulate ad blocker preventing script load
    const loadPromise = adService.initialize('test-zone-id');

    setTimeout(() => {
      // Ad blocker prevents script from loading
      if (mockScriptElement.onerror) {
        mockScriptElement.onerror();
      }
    }, 10);

    await expect(loadPromise).rejects.toThrow();

    const isBlocked = adService.isAdBlocked();
    expect(isBlocked).toBe(true);
  });

  it('should cleanup on destroy', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container = document.createElement('div');
    await adService.displayAd(container, 'zone-123');

    adService.destroy();

    expect(mockPropellerAds.destroy).toHaveBeenCalled();
  });

  it('should handle concurrent ad display requests', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container1 = document.createElement('div');
    const container2 = document.createElement('div');

    const [result1, result2] = await Promise.all([
      adService.displayAd(container1, 'zone-123'),
      adService.displayAd(container2, 'zone-123'),
    ]);

    // Only one should succeed (no duplicate ads)
    expect(result1 || result2).toBe(true);
  });

  it('should respect 3-second timeout for ad loading', async () => {
    jest.useFakeTimers();

    (window as any).PropellerAds = {
      load: jest.fn(() => {
        // Simulate slow ad load
        return new Promise((resolve) => {
          setTimeout(resolve, 5000); // 5 seconds (exceeds 3-second target)
        });
      }),
    };

    const container = document.createElement('div');
    const displayPromise = adService.displayAd(container, 'zone-123');

    // Fast-forward 3 seconds
    jest.advanceTimersByTime(3000);

    // Should timeout and fail gracefully
    await expect(displayPromise).resolves.toBe(false);

    jest.useRealTimers();
  });

  it('should provide ad metrics', async () => {
    (window as any).PropellerAds = mockPropellerAds;

    const container = document.createElement('div');
    await adService.displayAd(container, 'zone-123');

    const metrics = adService.getMetrics();

    expect(metrics).toHaveProperty('attemptsTotal');
    expect(metrics).toHaveProperty('attemptsSuccess');
    expect(metrics).toHaveProperty('attemptsFailed');
    expect(metrics).toHaveProperty('averageLoadTime');
  });
});
