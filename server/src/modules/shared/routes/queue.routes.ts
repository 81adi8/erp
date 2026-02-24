import { Router } from 'express';
import {
    getAllQueueStats,
    getQueueStats,
    getAttendanceQueueStats,
    pauseQueue,
    resumeQueue,
    clearQueue,
    getEventStats,
    getSystemHealth,
    testQueue,
    testEvent,
} from '../controllers/queue.controller';
import { authorize } from '../../../core/middleware/authorize';
import { requireAuth } from '../../auth';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// STABILIZATION: Removed mock authentication - now uses real auth
// Queue management requires authenticated user with system.queues.manage permission
router.use(requireAuth);
router.use(authorize('system.queues.manage'));

// Rate limiting for queue operations
const queueOperationLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 requests per window
    message: { success: false, message: 'Too many queue operations, please try again later.' },
});

/**
 * @route   GET /api/v1/queues/stats
 * @desc    Get statistics for all queues
 * @access  Private (requires system.queues.manage permission)
 */
router.get('/stats', getAllQueueStats);

/**
 * @route   GET /api/v1/queues/stats/:queueType
 * @desc    Get statistics for a specific queue
 * @access  Private (requires system.queues.manage permission)
 */
router.get('/stats/:queueType', getQueueStats);

/**
 * @route   GET /api/v1/queues/attendance/stats
 * @desc    Get attendance queue specific statistics
 * @access  Private (requires system.queues.manage permission)
 */
router.get('/attendance/stats', getAttendanceQueueStats);

/**
 * @route   POST /api/v1/queues/:queueType/pause
 * @desc    Pause a specific queue
 * @access  Private (requires system.queues.manage permission)
 */
router.post('/:queueType/pause', queueOperationLimit, pauseQueue);

/**
 * @route   POST /api/v1/queues/:queueType/resume
 * @desc    Resume a specific queue
 * @access  Private (requires system.queues.manage permission)
 */
router.post('/:queueType/resume', queueOperationLimit, resumeQueue);

/**
 * @route   POST /api/v1/queues/:queueType/clear
 * @desc    Clear a specific queue
 * @access  Private (requires system.queues.manage permission)
 */
router.post('/:queueType/clear', queueOperationLimit, clearQueue);

/**
 * @route   GET /api/v1/queues/events/stats
 * @desc    Get event controller statistics
 * @access  Private (requires system.queues.manage permission)
 */
router.get('/events/stats', getEventStats);

/**
 * @route   GET /api/v1/queues/health
 * @desc    Get system health including queue and event status
 * @access  Private (requires system.queues.manage permission)
 */
router.get('/health', getSystemHealth);

/**
 * @route   POST /api/v1/queues/test
 * @desc    Test queue functionality by adding a test job
 * @access  Private (requires system.queues.manage permission)
 */
router.post('/test', queueOperationLimit, testQueue);

/**
 * @route   POST /api/v1/queues/events/test
 * @desc    Test event publishing
 * @access  Private (requires system.queues.manage permission)
 */
router.post('/events/test', queueOperationLimit, testEvent);

export default router;
