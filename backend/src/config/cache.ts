import { createClient, RedisClientType } from 'redis';

/**
 * Redis-backed cache with automatic fallback to in-memory if Redis is unavailable.
 * This lets the app work locally without Redis while using Redis in production.
 */

// ─── In-Memory Fallback ───

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flushPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ─── Redis Cache ───

class RedisCache {
  private client: RedisClientType;
  private connected = false;

  constructor(url: string) {
    this.client = createClient({ url });

    this.client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      this.connected = true;
    });

    this.client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (err: any) {
      console.error('[Redis] Failed to connect:', err.message);
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, { EX: ttlSeconds });
    } catch {
      // Silently fail — cache is non-critical
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Silently fail
    }
  }

  async flushPattern(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      for await (const batch of this.client.scanIterator({ MATCH: pattern })) {
        if (Array.isArray(batch)) {
          keys.push(...batch);
        } else {
          keys.push(batch);
        }
      }
      if (keys.length > 0) {
        await Promise.all(keys.map(k => this.client.del(k)));
      }
    } catch {
      // Silently fail
    }
  }

  destroy(): void {
    this.client.quit().catch(() => {});
  }
}

// ─── Cache Interface ───

interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flushPattern(pattern: string): Promise<void>;
  destroy(): void;
}

// ─── Factory: Redis if available, else in-memory ───

let cache: CacheInterface;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  const redisCache = new RedisCache(REDIS_URL);
  redisCache.connect().then(() => {
    if (redisCache.isConnected()) {
      console.log('[Cache] Using Redis');
    } else {
      console.log('[Cache] Redis unavailable, falling back to in-memory');
    }
  });
  cache = redisCache;
} else {
  console.log('[Cache] No REDIS_URL set, using in-memory cache');
  cache = new MemoryCache();
}

export default cache;
