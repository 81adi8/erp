import { Request, Response } from 'express';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { logger } from '../../../core/utils/logger';
import { NavigationService } from '../services/navigation.service';

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = HttpStatus.OK,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

const sendError = (
    res: Response,
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
    errors: string[] = [message]
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

/**
 * Navigation Controller
 * Thin HTTP layer that delegates navigation/permission resolution to service.
 */
export class NavigationController {
    static async getPermissionsAndNavigation(req: Request, res: Response) {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;
            const institutionId = req.tenant?.id;

            if (!schemaName || !userId) {
                return sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED);
            }

            const data = await NavigationService.getPermissionsAndNavigation(
                schemaName,
                userId,
                institutionId
            );

            return sendSuccess(res, data, 'Permissions and navigation fetched successfully');
        } catch (error) {
            logger.error('[NavigationController.getPermissionsAndNavigation] Error:', error);
            return sendError(
                res,
                'Failed to fetch permissions and navigation',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async getUserPermissions(req: Request, res: Response) {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;
            const institutionId = req.tenant?.id;

            if (!schemaName || !userId) {
                return sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED);
            }

            const data = await NavigationService.getUserPermissionsPayload(
                schemaName,
                userId,
                institutionId
            );

            return sendSuccess(res, data, 'User permissions fetched successfully');
        } catch (error) {
            logger.error('[NavigationController.getUserPermissions] Error:', error);
            return sendError(
                res,
                'Failed to fetch user permissions',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async getNavItems(req: Request, res: Response) {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;
            const institutionId = req.tenant?.id;

            if (!schemaName || !userId) {
                return sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED);
            }

            const data = await NavigationService.getNavItemsPayload(
                schemaName,
                userId,
                institutionId
            );

            return sendSuccess(res, data, 'Navigation items fetched successfully');
        } catch (error) {
            logger.error('[NavigationController.getNavItems] Error:', error);
            return sendError(
                res,
                'Failed to fetch navigation items',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

export default NavigationController;
