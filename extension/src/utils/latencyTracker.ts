/**
 * Latency Tracker Utility
 * Tracks P50, P95, P99 metrics for <500ms target
 */

import { LatencyMetrics } from '../types/translation.types';

export class LatencyTracker {
  private latencies: number[] = [];
  private readonly maxSamples = 1000; // Keep last 1000 samples

  /**
   * Record a latency measurement
   * @param startTime - Start timestamp in milliseconds
   * @param endTime - End timestamp in milliseconds (defaults to now)
   */
  record(startTime: number, endTime: number = Date.now()): void {
    const latency = endTime - startTime;
    this.latencies.push(latency);

    // Keep only recent samples to prevent memory bloat
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }
  }

  /**
   * Get current latency statistics
   */
  getStats(): LatencyMetrics {
    if (this.latencies.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        count: 0,
      };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      average: sorted.reduce((sum, val) => sum + val, 0) / count,
      count,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Check if current latency meets constitutional target (<500ms P50)
   */
  meetsTarget(): boolean {
    const stats = this.getStats();
    return stats.p50 < 500; // Constitutional target: <500ms P50
  }

  /**
   * Reset all tracked latencies
   */
  reset(): void {
    this.latencies = [];
  }

  /**
   * Get recent latencies for debugging
   */
  getRecentLatencies(count: number = 10): number[] {
    return this.latencies.slice(-count);
  }
}

// Global instance for debugging in development mode
if (process.env.NODE_ENV === 'development') {
  (window as any).__babelFishLatency = new LatencyTracker();
}
