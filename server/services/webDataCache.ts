import crypto from 'crypto';

export interface CachedResult {
  data: string | null;
  timestamp: number;
  expiresAt: number;
}

export interface WebDataCacheOptions {
  ttlMinutes?: number; // Time-to-live in minutes
  maxCacheSize?: number; // Maximum number of cached items
  enableLogging?: boolean;
}

/**
 * In-memory cache for web data to avoid rate limits
 * Implements LRU (Least Recently Used) eviction policy
 */
export class WebDataCache {
  private cache: Map<string, CachedResult> = new Map();
  private accessOrder: Map<string, number> = new Map(); // Track access order for LRU
  private ttlMinutes: number;
  private maxCacheSize: number;
  private enableLogging: boolean;
  private accessCounter: number = 0;

  constructor(options: WebDataCacheOptions = {}) {
    this.ttlMinutes = options.ttlMinutes || 15; // Default: 15 minutes TTL for market data
    this.maxCacheSize = options.maxCacheSize || 1000; // Default: max 1000 cached items
    this.enableLogging = options.enableLogging || false;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
    
    if (this.enableLogging) {
      console.log(`WebDataCache initialized: TTL=${this.ttlMinutes}min, MaxSize=${this.maxCacheSize}`);
    }
  }

  /**
   * Generate a cache key from the query string
   */
  private generateCacheKey(query: string): string {
    // Normalize query and create hash for consistent keying
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalizedQuery).digest('hex').slice(0, 16);
  }

  /**
   * Check if cached data is still valid
   */
  private isValid(cachedResult: CachedResult): boolean {
    return Date.now() < cachedResult.expiresAt;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Evict least recently used items when cache is full
   */
  private evictLRU(): void {
    if (this.cache.size < this.maxCacheSize) return;

    // Find least recently used key
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, accessTime] of Array.from(this.accessOrder.entries())) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      
      if (this.enableLogging) {
        console.log(`WebDataCache: Evicted LRU item (key: ${lruKey})`);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, cachedResult] of Array.from(this.cache.entries())) {
      if (now >= cachedResult.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        expiredCount++;
      }
    }

    if (this.enableLogging && expiredCount > 0) {
      console.log(`WebDataCache: Cleaned up ${expiredCount} expired entries`);
    }
  }

  /**
   * Get cached data for a query
   */
  async get(query: string): Promise<string | null> {
    const key = this.generateCacheKey(query);
    const cachedResult = this.cache.get(key);

    if (!cachedResult) {
      if (this.enableLogging) {
        console.log(`WebDataCache: MISS for query: ${query.slice(0, 50)}...`);
      }
      return null;
    }

    if (!this.isValid(cachedResult)) {
      // Expired entry
      this.cache.delete(key);
      this.accessOrder.delete(key);
      
      if (this.enableLogging) {
        console.log(`WebDataCache: EXPIRED for query: ${query.slice(0, 50)}...`);
      }
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    if (this.enableLogging) {
      const ageMinutes = Math.round((Date.now() - cachedResult.timestamp) / 60000);
      console.log(`WebDataCache: HIT for query: ${query.slice(0, 50)}... (age: ${ageMinutes}min)`);
    }

    return cachedResult.data;
  }

  /**
   * Store data in cache
   */
  async set(query: string, data: string | null): Promise<void> {
    const key = this.generateCacheKey(query);
    const now = Date.now();
    const expiresAt = now + (this.ttlMinutes * 60 * 1000);

    // Evict if cache is full
    this.evictLRU();

    const cachedResult: CachedResult = {
      data,
      timestamp: now,
      expiresAt
    };

    this.cache.set(key, cachedResult);
    this.updateAccessOrder(key);

    if (this.enableLogging) {
      console.log(`WebDataCache: STORED for query: ${query.slice(0, 50)}... (expires in ${this.ttlMinutes}min)`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    maxSize: number;
    ttlMinutes: number;
    oldestEntryAgeMinutes: number;
    newestEntryAgeMinutes: number;
  } {
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const cachedResult of Array.from(this.cache.values())) {
      oldestTimestamp = Math.min(oldestTimestamp, cachedResult.timestamp);
      newestTimestamp = Math.max(newestTimestamp, cachedResult.timestamp);
    }

    const now = Date.now();
    return {
      totalEntries: this.cache.size,
      maxSize: this.maxCacheSize,
      ttlMinutes: this.ttlMinutes,
      oldestEntryAgeMinutes: this.cache.size > 0 ? Math.round((now - oldestTimestamp) / 60000) : 0,
      newestEntryAgeMinutes: this.cache.size > 0 ? Math.round((now - newestTimestamp) / 60000) : 0
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    
    if (this.enableLogging) {
      console.log('WebDataCache: All entries cleared');
    }
  }

  /**
   * Remove specific cache entry
   */
  delete(query: string): boolean {
    const key = this.generateCacheKey(query);
    const existed = this.cache.has(key);
    
    this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (this.enableLogging && existed) {
      console.log(`WebDataCache: Deleted entry for query: ${query.slice(0, 50)}...`);
    }
    
    return existed;
  }
}

// Create singleton instance with market-data optimized settings
export const webDataCache = new WebDataCache({
  ttlMinutes: 15,        // 15 minutes TTL for market data freshness
  maxCacheSize: 1000,    // Up to 1000 cached queries
  enableLogging: false   // Enable for debugging if needed
});