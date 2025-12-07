/**
 * Ad Service
 *
 * Handles PropellerAds SDK integration with:
 * - Async script loading
 * - Graceful error handling
 * - Ad blocker detection
 * - Performance metrics
 */

interface PropellerAdsSDK {
  init?: (config: any) => void;
  load?: (zoneId: string, container: HTMLElement) => Promise<void>;
  destroy?: () => void;
}

interface AdMetrics {
  attemptsTotal: number;
  attemptsSuccess: number;
  attemptsFailed: number;
  averageLoadTime: number;
}

class AdServiceClass {
  private sdkLoaded: boolean = false;
  private adBlocked: boolean = false;
  private lastLoadTime: number = 0;
  private loadTimes: number[] = [];
  private metrics: AdMetrics = {
    attemptsTotal: 0,
    attemptsSuccess: 0,
    attemptsFailed: 0,
    averageLoadTime: 0,
  };
  private activeDisplays: Set<string> = new Set();

  /**
   * Initialize PropellerAds SDK
   */
  async initialize(zoneId: string): Promise<void> {
    if (this.sdkLoaded) {
      return; // Already initialized
    }

    return new Promise((resolve, reject) => {
      // Check if SDK already loaded
      if ((window as any).PropellerAds) {
        this.sdkLoaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://cdn.propellerads.com/sdk/v1/propellerads.min.js`;

      script.onload = () => {
        this.sdkLoaded = true;
        this.adBlocked = false;
        resolve();
      };

      script.onerror = () => {
        this.sdkLoaded = false;
        this.adBlocked = true;
        reject(new Error('Failed to load PropellerAds SDK'));
      };

      // Append to document
      document.body.appendChild(script);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.sdkLoaded) {
          this.adBlocked = true;
          reject(new Error('PropellerAds SDK load timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Display ad in container
   */
  async displayAd(container: HTMLElement, zoneId: string): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.attemptsTotal++;

    try {
      // Check if already displaying an ad
      if (this.activeDisplays.has(zoneId)) {
        console.warn('[adService] Ad already displaying for zone:', zoneId);
        return false;
      }

      // Check if SDK is available
      if (!this.sdkLoaded || !(window as any).PropellerAds) {
        throw new Error('PropellerAds SDK not loaded');
      }

      // Add timeout for ad loading (3 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Ad load timeout')), 3000);
      });

      // Attempt to display ad
      const displayPromise = this.loadAdContent(container, zoneId);

      await Promise.race([displayPromise, timeoutPromise]);

      // Track success
      this.activeDisplays.add(zoneId);
      this.metrics.attemptsSuccess++;
      this.lastLoadTime = Date.now() - startTime;
      this.loadTimes.push(this.lastLoadTime);
      this.updateAverageLoadTime();

      return true;
    } catch (error) {
      console.error('[adService] Ad display failed:', error);
      this.metrics.attemptsFailed++;
      this.lastLoadTime = Date.now() - startTime;

      // Check for ad blocker
      if (error instanceof Error && error.message.includes('timeout')) {
        this.adBlocked = true;
      }

      return false;
    }
  }

  /**
   * Load ad content into container
   */
  private async loadAdContent(container: HTMLElement, zoneId: string): Promise<void> {
    const sdk = (window as any).PropellerAds as PropellerAdsSDK;

    // Clear container
    container.innerHTML = '';

    // Create ad placeholder
    const adDiv = document.createElement('div');
    adDiv.className = 'propeller-ad';
    adDiv.setAttribute('data-zone-id', zoneId);
    container.appendChild(adDiv);

    // In production, this would call the actual PropellerAds API
    // For now, we'll simulate ad loading
    if (sdk.load) {
      await sdk.load(zoneId, adDiv);
    } else {
      // Fallback: display placeholder content
      adDiv.innerHTML = `
        <div style="width: 300px; height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Advertisement</div>
            <div style="font-size: 12px; opacity: 0.9;">Zone: ${zoneId}</div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Check if ad blocker is detected
   */
  isAdBlocked(): boolean {
    return this.adBlocked;
  }

  /**
   * Get last ad load time
   */
  getLastLoadTime(): number {
    return this.lastLoadTime;
  }

  /**
   * Get ad metrics
   */
  getMetrics(): AdMetrics {
    return { ...this.metrics };
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(): void {
    if (this.loadTimes.length === 0) {
      this.metrics.averageLoadTime = 0;
      return;
    }

    const sum = this.loadTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageLoadTime = sum / this.loadTimes.length;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    const sdk = (window as any).PropellerAds as PropellerAdsSDK;

    if (sdk && sdk.destroy) {
      sdk.destroy();
    }

    this.activeDisplays.clear();
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      attemptsTotal: 0,
      attemptsSuccess: 0,
      attemptsFailed: 0,
      averageLoadTime: 0,
    };
    this.loadTimes = [];
  }
}

// Export singleton instance
export const adService = new AdServiceClass();
