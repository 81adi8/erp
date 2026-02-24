# Queue Management & Event System

## Overview

The School ERP now includes a comprehensive queue management and event controlling system to handle high-concurrency operations and prevent database locking. This system is built on top of Redis Bull queues and event-driven architecture.

## Features

### Queue Management
- **Multi-queue support**: Separate queues for different operations (attendance, notifications, reports, etc.)
- **Configurable concurrency**: Different concurrency levels based on operation type
- **Retry mechanisms**: Exponential backoff for failed jobs
- **Job prioritization**: Critical jobs get higher priority
- **Queue monitoring**: Real-time statistics and health monitoring
- **Graceful shutdown**: Clean shutdown of all queues and workers

### Event System
- **Pub/Sub pattern**: Redis-based event publishing and subscription
- **Event types**: Predefined event types for different operations
- **Tenant isolation**: Events scoped to specific tenants
- **Event filtering**: Subscribe to specific event types or tenants
- **Correlation tracking**: Track related events across the system

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client API    │    │   Queue Manager │    │   Event System  │
│                 │    │                 │    │                 │
│ - Attendance    │───▶│ - Bull Queues   │───▶│ - Redis Pub/Sub │
│ - Reports       │    │ - Workers       │    │ - Subscribers   │
│ - Notifications │    │ - Monitoring    │    │ - Publishing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │     Redis       │    │   Workers/      │
│                 │    │                 │    │   Processors    │
│ - Attendance    │◀───│ - Job Storage   │◀───│ - Background    │
│ - Reports       │    │ - Event Store   │    │   Processing    │
│ - Audit Logs    │    │ - State        │    │ - Event Handlers│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Queue Types

### 1. Attendance Queue (`attendance`)
- **Purpose**: Handle attendance marking operations
- **Concurrency**: 50 workers
- **Retry**: 3 attempts with exponential backoff
- **Job Types**:
  - `mark-attendance`: Individual attendance marking
  - `process-batch-attendance`: Bulk attendance processing
  - `generate-attendance-report`: Report generation

### 2. Notifications Queue (`notifications`)
- **Purpose**: Handle notification sending
- **Concurrency**: 20 workers
- **Retry**: 5 attempts with exponential backoff
- **Priority**: Normal

### 3. Reports Queue (`reports`)
- **Purpose**: Handle report generation
- **Concurrency**: 5 workers
- **Retry**: 2 attempts with fixed backoff
- **Priority**: Low

### 4. Academic Queue (`academic`)
- **Purpose**: Handle academic operations
- **Concurrency**: 10 workers
- **Retry**: 3 attempts with exponential backoff
- **Priority**: Normal

## Event Types

### Academic Events
- `student:enrolled` - New student enrollment
- `student:withdrawn` - Student withdrawal
- `class:created` - New class creation
- `subject:assigned` - Subject assignment to class

### Attendance Events
- `attendance:marked` - Individual attendance marked
- `attendance:batch_marked` - Batch attendance completed
- `attendance:corrected` - Attendance correction
- `attendance:report_generated` - Report generation completed

### Examination Events
- `exam:created` - New exam created
- `exam:results_published` - Exam results published
- `grade:updated` - Student grade updated

### System Events
- `tenant:created` - New tenant created
- `system:error_occurred` - System error
- `notification:sent` - Notification sent

## Usage Examples

### Queue a Job

```typescript
import { queueManager, QueueType, JobPriority } from '../core/queue/QueueManager';

// Queue individual attendance marking
const jobId = await queueManager.addJob(
    QueueType.ATTENDANCE,
    'mark-attendance',
    {
        tenantId: 'tenant123',
        institutionId: 'inst456',
        studentId: 'student789',
        date: new Date(),
        status: 'present'
    },
    {
        priority: JobPriority.HIGH,
        delay: 0
    }
);
```

### Subscribe to Events

```typescript
import { eventController, EventType } from '../core/events/EventController';

// Subscribe to attendance events
eventController.subscribe(
    EventType.ATTENDANCE_MARKED,
    async (event) => {
        console.log(`Attendance marked for student ${event.data.studentId}`);
        // Trigger notifications, analytics, etc.
    },
    {
        tenantId: 'tenant123' // Optional: filter by tenant
    }
);
```

### Publish Events

```typescript
import { eventController, EventType } from '../core/events/EventController';

await eventController.publish({
    type: EventType.ATTENDANCE_MARKED,
    tenantId: 'tenant123',
    institutionId: 'inst456',
    userId: 'teacher123',
    data: {
        studentId: 'student789',
        status: 'present',
        date: new Date()
    }
});
```

## API Endpoints

### Queue Management

- `GET /api/v1/queues/stats` - Get all queue statistics
- `GET /api/v1/queues/stats/:queueType` - Get specific queue stats
- `POST /api/v1/queues/:queueType/pause` - Pause a queue
- `POST /api/v1/queues/:queueType/resume` - Resume a queue
- `POST /api/v1/queues/:queueType/clear` - Clear a queue
- `GET /api/v1/queues/health` - Get system health

### Attendance Queue

- `POST /api/v2/api/school/attendance/mark` - Queue attendance marking
- `POST /api/v2/api/school/attendance/bulk-mark` - Queue bulk attendance
- `POST /api/v2/api/school/attendance/reports/generate` - Queue report generation
- `GET /api/v2/api/school/attendance/job/:jobId` - Get job status
- `GET /api/v2/api/school/attendance/queue/status` - Get queue status

## Configuration

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Queue Configuration

Queue configurations are defined in `QueueManager.ts` and can be customized:

```typescript
const defaultConfigs = {
    [QueueType.ATTENDANCE]: {
        concurrency: 50,        // Number of concurrent workers
        maxRetries: 3,         // Maximum retry attempts
        backoffStrategy: 'exponential', // Backoff strategy
        backoffDelay: 2000,    // Initial delay in ms
        removeOnComplete: 1000, // Jobs to keep after completion
        removeOnFail: 500,     // Jobs to keep after failure
        defaultJobOptions: {
            priority: JobPriority.HIGH,
            // Additional job options
        }
    }
};
```

## Monitoring

### Queue Statistics

Each queue provides real-time statistics:

```typescript
const stats = await queueManager.getQueueStats(QueueType.ATTENDANCE);
// Returns: { waiting, active, completed, failed, delayed, paused }
```

### Health Check

System health endpoint aggregates queue status:

```typescript
const health = await fetch('/api/v1/queues/health');
// Returns: { status: 'healthy' | 'degraded' | 'unhealthy', queues, events }
```

## Error Handling

### Job Failures

- Jobs are automatically retried based on configuration
- Failed jobs are stored with error details
- Dead letter queue for manually failed jobs
- Event notifications for critical failures

### Event Failures

- Event subscribers are isolated from each other
- Failed subscriptions don't affect other subscribers
- Error logging and monitoring
- Circuit breaker patterns for resilience

## Performance Considerations

### Database Locking Prevention

- **Batch processing**: Group related operations
- **Transaction management**: Proper transaction boundaries
- **Connection pooling**: Efficient database connections
- **Caching**: Reduce database load

### Memory Management

- **Job cleanup**: Automatic removal of completed/failed jobs
- **Event subscription cleanup**: Proper unsubscribe mechanisms
- **Memory monitoring**: Track queue sizes and worker memory

## Security

### Access Control

- Queue management endpoints require `system.queues.manage` permission
- Tenant isolation for all operations
- Event filtering by tenant/institution
- Audit logging for all queue operations

### Data Protection

- Sensitive data encryption in job payloads
- Event data sanitization
- Access logging for monitoring

## Troubleshooting

### Common Issues

1. **Jobs not processing**: Check Redis connection and worker status
2. **High memory usage**: Check queue sizes and cleanup settings
3. **Event not received**: Verify subscription and event publishing
4. **Performance issues**: Monitor concurrency settings and database load

### Debugging

- Enable debug logging
- Check queue statistics
- Monitor Redis performance
- Review job failure reasons

## Best Practices

1. **Job Design**
   - Keep jobs small and focused
   - Include proper error handling
   - Use appropriate priority levels
   - Add correlation IDs for tracking

2. **Event Design**
   - Use descriptive event names
   - Include sufficient context
   - Handle events idempotently
   - Filter events appropriately

3. **Performance**
   - Monitor queue sizes
   - Adjust concurrency based on load
   - Use proper batching
   - Implement proper cleanup

4. **Reliability**
   - Configure proper retry strategies
   - Monitor for stuck jobs
   - Implement health checks
   - Set up alerts for failures