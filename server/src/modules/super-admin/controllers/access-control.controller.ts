import { Request, Response, NextFunction } from 'express';
import { AccessControlService } from '../services/access-control.service';
import { HttpStatus } from '../../../core/http/HttpStatus';

export class AccessControlController {
    private service = new AccessControlService();

    // Modules
    getModules = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const modules = await this.service.findAllModules();
            res.status(HttpStatus.OK).json({ success: true, data: modules });
        } catch (error) {
            next(error);
        }
    };

    createModule = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const module = await this.service.createModule(req.body);
            res.status(HttpStatus.CREATED).json({ success: true, data: module });
        } catch (error) {
            next(error);
        }
    };

    updateModule = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const module = await this.service.updateModule(req.params.id as string, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: module });
        } catch (error) {
            next(error);
        }
    };

    deleteModule = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.deleteModule(req.params.id as string);
            res.status(HttpStatus.OK).json({ success: true, message: 'Module deleted' });
        } catch (error) {
            next(error);
        }
    };

    // Features
    getFeatures = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const features = await this.service.findAllFeatures();
            res.status(HttpStatus.OK).json({ success: true, data: features });
        } catch (error) {
            next(error);
        }
    };

    createFeature = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const feature = await this.service.createFeature(req.body);
            res.status(HttpStatus.CREATED).json({ success: true, data: feature });
        } catch (error) {
            next(error);
        }
    };

    updateFeature = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const feature = await this.service.updateFeature(req.params.id as string, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: feature });
        } catch (error) {
            next(error);
        }
    };

    deleteFeature = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.deleteFeature(req.params.id as string);
            res.status(HttpStatus.OK).json({ success: true, message: 'Feature deleted' });
        } catch (error) {
            next(error);
        }
    };

    // Permissions
    getPermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const permissions = await this.service.findAllPermissions();
            res.status(HttpStatus.OK).json({ success: true, data: permissions });
        } catch (error) {
            next(error);
        }
    };

    createPermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const permission = await this.service.createPermission(req.body);
            res.status(HttpStatus.CREATED).json({ success: true, data: permission });
        } catch (error) {
            next(error);
        }
    };

    updatePermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const permission = await this.service.updatePermission(req.params.id as string, req.body);
            res.status(HttpStatus.OK).json({ success: true, data: permission });
        } catch (error) {
            next(error);
        }
    };

    deletePermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.service.deletePermission(req.params.id as string);
            res.status(HttpStatus.OK).json({ success: true, message: 'Permission deleted' });
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // REFRESH & STATS
    // ============================================================================

    /**
     * Refresh all permissions from seeder definitions
     * POST /access-control/refresh
     */
    refreshPermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.refreshPermissions();
            res.status(HttpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get permission statistics
     * GET /access-control/stats
     */
    getStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.getStats();
            res.status(HttpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    };
}

