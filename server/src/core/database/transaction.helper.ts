/**
 * Transaction Helper — Production Hardening
 *
 * Provides transaction management utilities for atomic operations.
 * Ensures data consistency across multi-step database operations.
 *
 * USAGE:
 *   await withTransaction(schemaName, async (transaction) => {
 *     await User.create({...}, { transaction });
 *     await Student.create({...}, { transaction });
 *   });
 */

import { Sequelize, Transaction } from 'sequelize';
import { sequelize } from '../../database/sequelize';
import { validateSchemaName } from './schema-name.util';
import { logger } from '../utils/logger';

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Isolation level (default: READ COMMITTED) */
  isolationLevel?: Transaction.ISOLATION_LEVELS;
  /** Auto-rollback on error (default: true) */
  autoRollback?: boolean;
  /** Transaction timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Execute operations within a database transaction.
 * Automatically commits on success, rolls back on failure.
 *
 * @param schemaName - Tenant schema name
 * @param fn - Function to execute within transaction
 * @param options - Transaction options
 * @returns Result of the function
 */
export async function withTransaction<T>(
  schemaName: string,
  fn: (transaction: Transaction) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { isolationLevel, timeout = 30000 } = options;

  const transaction = await sequelize.transaction({
    isolationLevel: isolationLevel || Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    // Set schema context for the transaction
    if (schemaName) {
      const safeSchemaName = validateSchemaName(schemaName);
      await sequelize.query(`SET search_path TO "${safeSchemaName}"`, { transaction });
    }

    // Execute the function with timeout
    const result = await executeWithTimeout(
      fn(transaction),
      timeout,
      `Transaction timed out after ${timeout}ms`
    );

    await transaction.commit();
    return result;
  } catch (error) {
    // Ensure rollback happens
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error('[Transaction] Rollback failed', rollbackError);
    }

    // Re-throw the original error
    throw error;
  }
}

/**
 * Execute a promise with a timeout
 */
async function executeWithTimeout<T>(
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
 * Execute operations in a transaction with automatic retry on deadlock.
 * Useful for high-concurrency scenarios.
 *
 * @param schemaName - Tenant schema name
 * @param fn - Function to execute within transaction
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param options - Transaction options
 */
export async function withTransactionRetry<T>(
  schemaName: string,
  fn: (transaction: Transaction) => Promise<T>,
  maxRetries: number = 3,
  options: TransactionOptions = {}
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(schemaName, fn, options);
    } catch (error: any) {
      lastError = error;

      // Check if error is a deadlock or serialization failure
      const isRetryable = isDeadlockError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff before retry
      const delayMs = Math.min(100 * Math.pow(2, attempt - 1), 2000);
      logger.warn(
        `[Transaction] Deadlock detected, retrying (attempt ${attempt}/${maxRetries}) after ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Check if an error indicates a deadlock
 */
function isDeadlockError(error: any): boolean {
  const deadlockCodes = ['40P01', '40001', '40002']; // PostgreSQL deadlock codes
  return (
    error?.parent?.code && deadlockCodes.includes(error.parent.code) ||
    error?.original?.code && deadlockCodes.includes(error.original.code) ||
    error?.message?.toLowerCase().includes('deadlock')
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a transaction context for multiple operations.
 * Use when you need to share a transaction across multiple service calls.
 *
 * @param schemaName - Tenant schema name
 * @returns Transaction context with commit/rollback methods
 */
export async function createTransactionContext(schemaName: string): Promise<{
  transaction: Transaction;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}> {
  const transaction = await sequelize.transaction();

  // Set schema context
  if (schemaName) {
    const safeSchemaName = validateSchemaName(schemaName);
    await sequelize.query(`SET search_path TO "${safeSchemaName}"`, { transaction });
  }

  return {
    transaction,
    commit: async () => {
      await transaction.commit();
    },
    rollback: async () => {
      await transaction.rollback();
    },
  };
}

/**
 * Transaction-aware repository base class.
 * Extends BaseRepository with transaction support.
 */
export class TransactionAwareRepository {
  /**
   * Execute a query within an existing transaction or create a new one.
   */
  protected async executeInTransaction<T>(
    schemaName: string,
    existingTransaction: Transaction | undefined,
    fn: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    if (existingTransaction) {
      return fn(existingTransaction);
    }
    return withTransaction(schemaName, fn);
  }
}

export default {
  withTransaction,
  withTransactionRetry,
  createTransactionContext,
  TransactionAwareRepository,
};
