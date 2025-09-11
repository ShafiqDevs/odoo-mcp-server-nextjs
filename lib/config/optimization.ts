/**
 * Optimization Configuration
 * Based on performance testing results
 */

export const OPTIMIZATION_CONFIG = {
  // Chunking configuration
  chunking: {
    // Optimal chunk size based on testing
    chunkSize: 1500, // Reduced from 2000 for better granularity
    overlapSize: 200, // Increased overlap for better context
    minChunkLength: 100, // Minimum viable chunk
    maxChunkLength: 2000, // Maximum chunk size
  },

  // Search configuration
  search: {
    // Default search parameters
    defaultLimit: 5,
    maxLimit: 20,
    defaultThreshold: 0.75, // Slightly higher for better relevance
    minThreshold: 0.5,
    
    // Performance optimizations
    vectorSearchLimit: 10, // Fetch more candidates for filtering
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes cache
  },

  // Embedding configuration
  embedding: {
    model: "text-embedding-ada-002",
    dimensions: 1536,
    
    // Batch processing
    batchSize: 20, // Process embeddings in batches
    maxConcurrent: 5, // Max concurrent embedding requests
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // API rate limiting
  rateLimiting: {
    enabled: true,
    
    // Per-endpoint limits (requests per minute)
    endpoints: {
      create: 30,
      update: 30,
      delete: 30,
      list: 60,
      search: 100,
    },
    
    // Global limits
    globalMaxRequests: 200, // Per minute
    globalMaxBandwidth: 10 * 1024 * 1024, // 10MB per minute
  },

  // Database optimization
  database: {
    // Connection pooling
    maxConnections: 10,
    connectionTimeout: 5000,
    
    // Query optimization
    usePreparedStatements: true,
    queryTimeout: 30000,
    
    // Indexing hints
    indexedFields: ["resource_id", "created_at"],
  },

  // Caching strategy
  caching: {
    // In-memory cache for frequent searches
    searchCache: {
      enabled: true,
      maxSize: 100, // Max cached queries
      ttl: 300, // 5 minutes
    },
    
    // Resource cache
    resourceCache: {
      enabled: true,
      maxSize: 50,
      ttl: 600, // 10 minutes
    },
  },

  // Error handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreaker: {
      enabled: true,
      threshold: 5, // Failures before opening
      timeout: 60000, // Reset after 1 minute
    },
  },

  // Monitoring
  monitoring: {
    enabled: true,
    logLevel: process.env.NODE_ENV === "production" ? "error" : "debug",
    metrics: {
      trackLatency: true,
      trackThroughput: true,
      trackErrors: true,
      trackCacheHits: true,
    },
  },
};

// Helper function to get config value with fallback
export function getConfigValue<T>(
  path: string,
  defaultValue: T
): T {
  const keys = path.split(".");
  let value: any = OPTIMIZATION_CONFIG;
  
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value as T;
}

// Export specific configurations for easy access
export const CHUNK_CONFIG = OPTIMIZATION_CONFIG.chunking;
export const SEARCH_CONFIG = OPTIMIZATION_CONFIG.search;
export const EMBEDDING_CONFIG = OPTIMIZATION_CONFIG.embedding;
export const RATE_LIMIT_CONFIG = OPTIMIZATION_CONFIG.rateLimiting;
export const CACHE_CONFIG = OPTIMIZATION_CONFIG.caching;