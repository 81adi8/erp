import { EventEmitter } from 'events';
import { getRedis } from '../../config/redis';
import { logger } from '../utils/logger';

// Event types for different system operations
export enum EventType {
    // Academic Events
    STUDENT_ENROLLED = 'student:enrolled',
    STUDENT_WITHDRAWN = 'student:withdrawn',
    CLASS_CREATED = 'class:created',
    CLASS_UPDATED = 'class:updated',
    SECTION_CREATED = 'section:created',
    SUBJECT_ASSIGNED = 'subject:assigned',
    
    // Attendance Events
    ATTENDANCE_MARKED = 'attendance:marked',
    ATTENDANCE_BATCH_MARKED = 'attendance:batch_marked',
    ATTENDANCE_CORRECTED = 'attendance:corrected',
    ATTENDANCE_REPORT_GENERATED = 'attendance:report_generated',
    
    // Examination Events
    EXAM_CREATED = 'exam:created',
    EXAM_UPDATED = 'exam:updated',
    EXAM_RESULTS_PUBLISHED = 'exam:results_published',
    GRADE_UPDATED = 'grade:updated',
    
    // Fee Events
    FEE_ASSIGNED = 'fee:assigned',
    PAYMENT_RECEIVED = 'payment:received',
    PAYMENT_FAILED = 'payment:failed',
    REFUND_PROCESSED = 'refund:processed',
    
    // User Events
    USER_CREATED = 'user:created',
    USER_UPDATED = 'user:updated',
    USER_ROLE_CHANGED = 'user:role_changed',
    PASSWORD_CHANGED = 'user:password_changed',
    
    // System Events
    TENANT_CREATED = 'tenant:created',
    TENANT_UPDATED = 'tenant:updated',
    BACKUP_COMPLETED = 'system:backup_completed',
    ERROR_OCCURRED = 'system:error_occurred',
    
    // Real-time Events
    NOTIFICATION_SENT = 'notification:sent',
    ALERT_TRIGGERED = 'alert:triggered',
    BROADCAST_MESSAGE = 'broadcast:message',
}

// Event data interface
export interface EventData {
    type: EventType;
    tenantId?: string;
    institutionId?: string;
    userId?: string;
    data: any;
    timestamp: Date;
    metadata?: {
        source?: string;
        version?: string;
        correlationId?: string;
        priority?: 'low' | 'normal' | 'high' | 'critical';
    };
}

// Event handler interface
export interface EventHandler {
    (event: EventData): Promise<void> | void;
}

// Event subscription options
export interface SubscriptionOptions {
    tenantId?: string;
    institutionId?: string;
    userId?: string;
    eventType?: EventType;
    once?: boolean;
}

class EventController extends EventEmitter {
    private get redis() {
        return getRedis();
    }
    private subscribers = new Map<string, Set<EventHandler>>();
    private isInitialized = false;

    /**
     * Initialize the event controller
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('EventController already initialized');
            return;
        }

        try {
            // Subscribe to Redis channels for cross-instance events
            // Note: Redis pub/sub setup would go here if needed for multi-instance communication
            // For now, we use local event emission only
            logger.info('EventController initialized (local mode)');

            // Set up error handling
            this.on('error', (error: Error) => {
                logger.error(`EventController error: ${error.message}`);
            });

            this.isInitialized = true;
            logger.info('EventController initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize EventController:', error);
            throw error;
        }
    }

    /**
     * Publish an event
     */
    async publish(event: Partial<EventData>): Promise<void> {
        const fullEvent: EventData = {
            type: event.type!,
            tenantId: event.tenantId,
            institutionId: event.institutionId,
            userId: event.userId,
            data: event.data || {},
            timestamp: event.timestamp || new Date(),
            metadata: {
                source: process.env.NODE_ENV || 'development',
                version: '1.0.0',
                correlationId: this.generateCorrelationId(),
                priority: event.metadata?.priority || 'normal',
                ...event.metadata,
            },
        };

        try {
            // Emit to local subscribers
            this.emitToSubscribers(fullEvent);

            // Publish to Redis for cross-instance communication
            await this.redis.publish('events:global', JSON.stringify(fullEvent));

            logger.debug(`Event published: ${fullEvent.type}`, {
                tenantId: fullEvent.tenantId,
                institutionId: fullEvent.institutionId,
                correlationId: fullEvent.metadata?.correlationId,
            });

        } catch (error) {
            logger.error(`Failed to publish event ${fullEvent.type}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to events
     */
    subscribe(eventType: EventType, handler: EventHandler, options?: SubscriptionOptions): string {
        const subscriptionId = this.generateSubscriptionId(eventType, options);
        
        // Create subscription key
        const key = this.createSubscriptionKey(eventType, options);
        
        // Store handler
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        
        const handlers = this.subscribers.get(key)!;
        
        // Wrap handler with options
        const wrappedHandler = async (event: EventData) => {
            // Check if event matches subscription criteria
            if (!this.matchesSubscription(event, options)) {
                return;
            }

            try {
                await handler(event);
            } catch (error) {
                logger.error(`Error in event handler for ${eventType}:`, error);
            }

            // Remove if it's a one-time subscription
            if (options?.once) {
                this.unsubscribe(subscriptionId);
            }
        };

        handlers.add(wrappedHandler);

        // Listen to the event type
        this.on(eventType, wrappedHandler);

        logger.debug(`Subscribed to event: ${eventType}`, { subscriptionId });
        return subscriptionId;
    }

    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriptionId: string): void {
        for (const [key, handlers] of Array.from(this.subscribers.entries())) {
            for (const handler of Array.from(handlers)) {
                if (this.getHandlerId(handler) === subscriptionId) {
                    handlers.delete(handler);
                    this.removeListener(key, handler);
                    
                    if (handlers.size === 0) {
                        this.subscribers.delete(key);
                    }
                    
                    logger.debug(`Unsubscribed: ${subscriptionId}`);
                    return;
                }
            }
        }
    }

    /**
     * Emit event to matching subscribers
     */
    private emitToSubscribers(event: EventData): void {
        this.emit(event.type, event);
        
        // Also emit to wildcard listeners
        this.emit('*', event);
    }

    /**
     * Check if event matches subscription criteria
     */
    private matchesSubscription(event: EventData, options?: SubscriptionOptions): boolean {
        if (!options) return true;

        if (options.tenantId && event.tenantId !== options.tenantId) {
            return false;
        }

        if (options.institutionId && event.institutionId !== options.institutionId) {
            return false;
        }

        if (options.userId && event.userId !== options.userId) {
            return false;
        }

        if (options.eventType && event.type !== options.eventType) {
            return false;
        }

        return true;
    }

    /**
     * Create subscription key
     */
    private createSubscriptionKey(eventType: EventType, options?: SubscriptionOptions): string {
        const parts: string[] = [eventType];
        
        if (options?.tenantId) parts.push(`tenant:${options.tenantId}`);
        if (options?.institutionId) parts.push(`inst:${options.institutionId}`);
        if (options?.userId) parts.push(`user:${options.userId}`);
        
        return parts.join(':');
    }

    /**
     * Generate subscription ID
     */
    private generateSubscriptionId(eventType: EventType, options?: SubscriptionOptions): string {
        const id = Math.random().toString(36).substr(2, 9);
        return `${eventType}_${id}`;
    }

    /**
     * Get handler identifier
     */
    private getHandlerId(handler: EventHandler): string {
        return (handler as any).subscriptionId || 'unknown';
    }

    /**
     * Generate correlation ID for events
     */
    private generateCorrelationId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get subscription statistics
     */
    getStats(): {
        totalSubscriptions: number;
        eventTypeStats: Record<string, number>;
        listenersCount: number;
    } {
        const eventTypeStats: Record<string, number> = {};
        let totalSubscriptions = 0;

        for (const [key, handlers] of Array.from(this.subscribers.entries())) {
            const eventType = key.split(':')[0] ?? key;
            const existingCount = eventTypeStats[eventType] || 0;
            eventTypeStats[eventType] = existingCount + handlers.size;
            totalSubscriptions += handlers.size;
        }

        return {
            totalSubscriptions,
            eventTypeStats,
            listenersCount: totalSubscriptions, // Same as totalSubscriptions since each handler is a listener
        };
    }

    /**
     * Clear all subscriptions
     */
    clearAllSubscriptions(): void {
        this.subscribers.clear();
        this.removeAllListeners();
        logger.info('All event subscriptions cleared');
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down EventController...');

        try {
            await this.redis.unsubscribe('events:global');
            this.clearAllSubscriptions();
            this.isInitialized = false;
            
            logger.info('EventController shutdown complete');
        } catch (error) {
            logger.error('Error during EventController shutdown:', error);
        }
    }
}

// Export singleton instance
logger.info(' criando singleton eventController...');
export const eventController = new EventController();
logger.info(' singleton eventController criado!');