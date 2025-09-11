/**
 * Enhanced error handling utilities
 * Based on integration test findings
 */

import { OPTIMIZATION_CONFIG } from './config/optimization';

// Custom error types
export class KnowledgeBaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'KnowledgeBaseError';
  }
}

export class ValidationError extends KnowledgeBaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends KnowledgeBaseError {
  constructor(resourceId: string) {
    super(`Resource not found: ${resourceId}`, 'RESOURCE_NOT_FOUND', 404);
    this.name = 'ResourceNotFoundError';
  }
}

export class EmbeddingError extends KnowledgeBaseError {
  constructor(message: string, details?: any) {
    super(message, 'EMBEDDING_ERROR', 500, details);
    this.name = 'EmbeddingError';
  }
}

export class RateLimitError extends KnowledgeBaseError {
  constructor(endpoint: string, limit: number) {
    super(
      `Rate limit exceeded for ${endpoint}. Max ${limit} requests per minute.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
    this.name = 'RateLimitError';
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new KnowledgeBaseError(
          'Service temporarily unavailable',
          'CIRCUIT_BREAKER_OPEN',
          503
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}

// Global circuit breakers for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    const config = OPTIMIZATION_CONFIG.errorHandling.circuitBreaker;
    circuitBreakers.set(
      service,
      new CircuitBreaker(config.threshold, config.timeout)
    );
  }
  return circuitBreakers.get(service)!;
}

// Retry logic with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = OPTIMIZATION_CONFIG.errorHandling.maxRetries,
    retryDelay = OPTIMIZATION_CONFIG.errorHandling.retryDelay,
    exponentialBackoff = true,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Error logging and monitoring
export function logError(
  error: Error,
  context: {
    operation: string;
    userId?: string;
    requestId?: string;
    additionalData?: any;
  }
): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
    },
    context,
  };

  if (OPTIMIZATION_CONFIG.monitoring.enabled) {
    // In production, this would send to a monitoring service
    console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
  }
}

// Graceful error response formatting
export function formatErrorResponse(error: Error): {
  error: string;
  code?: string;
  details?: any;
} {
  if (error instanceof KnowledgeBaseError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // Hide internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
    };
  }

  return {
    error: error.message,
    code: 'UNKNOWN_ERROR',
  };
}

// Input validation helpers
export function validateContent(content: any): string {
  if (!content) {
    throw new ValidationError('Content is required');
  }
  
  if (typeof content !== 'string') {
    throw new ValidationError('Content must be a string');
  }
  
  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('Content cannot be empty');
  }
  
  if (trimmed.length > 50000) {
    throw new ValidationError('Content exceeds maximum length of 50000 characters');
  }
  
  return trimmed;
}

export function validateSearchQuery(query: any): string {
  if (!query) {
    throw new ValidationError('Search query is required');
  }
  
  if (typeof query !== 'string') {
    throw new ValidationError('Search query must be a string');
  }
  
  const trimmed = query.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('Search query cannot be empty');
  }
  
  if (trimmed.length > 500) {
    throw new ValidationError('Search query exceeds maximum length of 500 characters');
  }
  
  return trimmed;
}

export function validateLimit(limit: any): number {
  const parsed = parseInt(limit, 10);
  
  if (isNaN(parsed)) {
    throw new ValidationError('Limit must be a number');
  }
  
  if (parsed < 1) {
    throw new ValidationError('Limit must be at least 1');
  }
  
  if (parsed > OPTIMIZATION_CONFIG.search.maxLimit) {
    throw new ValidationError(`Limit cannot exceed ${OPTIMIZATION_CONFIG.search.maxLimit}`);
  }
  
  return parsed;
}

export function validateThreshold(threshold: any): number {
  const parsed = parseFloat(threshold);
  
  if (isNaN(parsed)) {
    throw new ValidationError('Threshold must be a number');
  }
  
  if (parsed < 0 || parsed > 1) {
    throw new ValidationError('Threshold must be between 0 and 1');
  }
  
  return parsed;
}