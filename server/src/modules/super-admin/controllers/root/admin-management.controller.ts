import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../../services/admin.service';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import { ApiError } from '../../../../core/http/ApiError';

export class AdminManagementController {
    private service = new AdminService();

    createSubAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const admin = await this.service.create(req.body);
            res.status(HttpStatus.CREATED).json({
                success: true,
                data: admin
            });
        } catch (error) {
            next(error);
        }
    };

    updateSubAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const admin = await this.service.update(id as string, req.body);
            res.status(HttpStatus.OK).json({
                success: true,
                data: admin
            });
        } catch (error) {
            next(error);
        }
    };

    deleteSubAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await this.service.delete(id as string);
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Admin deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    listSubAdmins = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = (page - 1) * limit;

            const result = await this.service.list(limit, offset);

            res.status(HttpStatus.OK).json({
                success: true,
                data: result.rows,
                total: result.count,
                page,
                limit
            });
        } catch (error) {
            next(error);
        }
    };
}
