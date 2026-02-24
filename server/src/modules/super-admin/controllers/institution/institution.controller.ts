import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../../../core/types/CustomRequest';
import { InstitutionService } from '../../services/institution.service';
import { ApiResponse } from '../../../../core/http/ApiResponse';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import { ApiError } from '../../../../core/http/ApiError';

export class InstitutionController {
    private service = new InstitutionService();

    create = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            let { name, subdomain
                , adminEmail, adminPassword, plan_id } = req.body;
            if (!name || !subdomain || !adminEmail || !adminPassword) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Missing required fields: name, slug, adminEmail, adminPassword');
            }
            const result = await this.service.create(req.body);
            res.status(HttpStatus.CREATED).json(ApiResponse.created(result, 'Institution created'));
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.findAll();
            res.status(HttpStatus.OK).json(ApiResponse.success(result, 'Institutions fetched'));
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.findById(req.params.id as string);
            if (!result) return next(new ApiError(HttpStatus.NOT_FOUND, 'Institution not found'));
            res.status(HttpStatus.OK).json(ApiResponse.success(result, 'Institution fetched'));
        } catch (error) {
            next(error);
        }
    };

    // FIXED: Added update — frontend calls PATCH /institutions/:id
    update = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.update(req.params.id as string, req.body);
            res.status(HttpStatus.OK).json(ApiResponse.success(result, 'Institution updated'));
        } catch (error) {
            next(error);
        }
    };

    // FIXED: Added updateStatus — frontend calls PATCH /institutions/:id/status
    updateStatus = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const { status } = req.body;
            if (!status) return next(new ApiError(HttpStatus.BAD_REQUEST, 'status is required'));
            const result = await this.service.updateStatus(req.params.id as string, status);
            res.status(HttpStatus.OK).json(ApiResponse.success(result, 'Institution status updated'));
        } catch (error) {
            next(error);
        }
    };

    // FIXED: Added delete — frontend calls DELETE /institutions/:id
    delete = async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.delete(req.params.id as string);
            res.status(HttpStatus.OK).json(ApiResponse.success(result, 'Institution deleted'));
        } catch (error) {
            next(error);
        }
    };
}
