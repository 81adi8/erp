import { logger } from '../utils/logger';
/**
 * Retry Helper — Production Hardening
 *
 * Provides retry utilities for transient failure handling.
 * Implements exponential backoff with jitter for distributed systems.
 *
 * USAGE:
 *   const result = await retryWithBackoff(
 *     () => User.findOne({ where: { id } }),
 *     { maxRetries: 3, initialDelayMs: 100 }
 *   );
 */

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 100) */
  initialDelayMs?: number;
  /** Maximum delay in ms (default: 5000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Timeout for each attempt in ms (default: 5000) */
  timeoutMs?: number;
  /** Custom error detector function */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Default retryable error patterns
 */
const DEFAULT_RETRYABLE_PATTERNS = [
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /EAI_AGAIN/i,
  /connection.*timeout/i,
  /connection.*refused/i,
  /connection.*reset/i,
  /network.*error/i,
  /temporary.*unavailable/i,
  /too many connections/i,
  /connection pool.*exhausted/i,
];

/**
 * Check if an error is retryable (transient)
 */
function isTransientError(error: Error): boolean {
  const message = error.message || '';
  const name = error.name || '';

  // Check for common transient error patterns
  for (const pattern of DEFAULT_RETRYABLE_PATTERNS) {
    if (pattern.test(message) || pattern.test(name)) {
      return true;
    }
  }

  // Check for PostgreSQL error codes
  const pgError = error as any;
  if (pgError?.code) {
    // Connection errors, serialization failures, deadlocks
    const retryableCodes = [
      '08000', '08003', '08006', '08001', '08004', // Connection errors
      '40001', // Serialization failure
      '40P01', // Deadlock detected
      '53000', // Insufficient resources
      '53200', // Out of memory
      '53300', // Too many connections
      '57P03', // Cannot connect now
    ];
    if (retryableCodes.includes(pgError.code)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  
  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);
  
  // Add jitter (random factor between 0.5 and 1.5)
  if (jitter) {
    delay = delay * (0.5 + Math.random());
  }
  
  return Math.floor(delay);
}

/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff.
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    jitter = true,
    timeoutMs = 5000,
    isRetryable = isTransientError,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Execute with optional timeout
      const result = await withTimeout(
        fn(),
        timeoutMs,
        `Operation timed out after ${timeoutMs}ms`
      );
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt <= maxRetries && isRetryable(error);
      
      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay
      const delayMs = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitter
      );

      logger.warn(
        `[Retry] Attempt ${attempt}/${maxRetries + 1} failed: ${error.message}. ` +
        `Retrying in ${delayMs}ms...`
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Execute a function with retry for database operations.
 * Pre-configured for common database transient errors.
 */
export async function retryDbOperation<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'isRetryable'> = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 50,
    maxDelayMs: 2000,
    timeoutMs: 10000,
    ...options,
  });
}

/**
 * Execute a function with retry for Redis operations.
 * Pre-configured for Redis transient errors.
 */
export async function retryRedisOperation<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'isRetryable'> = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 3000,
    timeoutMs: 5000,
    jitter: true,
    ...options,
    isRetryable: (error: Error) => {
      const message = error.message?.toLowerCase() || '';
      return (
        message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('connection') ||
        message.includes('max retries') ||
        isTransientError(error)
      );
    },
  });
}

/**
 * Circuit breaker pattern for external service calls.
 * Prevents cascading failures by failing fast when a service is down.
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 30000,
    private readonly halfOpenMaxCalls: number = 1
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(
  failureThreshold?: number,
  resetTimeoutMs?: number
): CircuitBreaker {
  return new CircuitBreaker(failureThreshold, resetTimeoutMs);
}

export default {
  retryWithBackoff,
  retryDbOperation,
  retryRedisOperation,
  CircuitBreaker,
  createCircuitBreaker,
};