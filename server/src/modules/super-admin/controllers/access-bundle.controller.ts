import { Request, Response } from 'express';
import { AccessBundleService } from '../services/access-bundle.service';

export class AccessBundleController {
    private service = new AccessBundleService();

    /**
     * GET /access-bundles - Get all access bundles
     * Supports query params: target_model, target_id
     */
    findAll = async (req: Request, res: Response) => {
        try {
            const { target_model, target_id, tenant_type, asset_type } = req.query;
            const bundles = await this.service.findAll({
                target_model: target_model as string,
                target_id: target_id as string,
                tenant_type: tenant_type as string,
                asset_type: asset_type as string
            });
            res.status(200).json({ success: true, data: bundles });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    };

    /**
     * GET /access-bundles/:id - Get single access bundle
     */
    findById = async (req: Request, res: Response) => {
        try {
            const bundle = await this.service.findById(req.params.id as string);
            res.status(200).json({ success: true, data: bundle });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    };

    /**
     * POST /access-bundles - Create a new access bundle
     */
    create = async (req: Request, res: Response) => {
        try {
            const bundle = await this.service.create(req.body);
            res.status(201).json({ success: true, data: bundle });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    };

    /**
     * PUT /access-bundles/:id - Update an access bundle
     */
    update = async (req: Request, res: Response) => {
        try {
            const bundle = await this.service.update(req.params.id as string, req.body);
            res.status(200).json({ success: true, data: bundle });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    };

    /**
     * DELETE /access-bundles/:id - Delete an access bundle
     */
    delete = async (req: Request, res: Response) => {
        try {
            const result = await this.service.delete(req.params.id as string);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    };
}
