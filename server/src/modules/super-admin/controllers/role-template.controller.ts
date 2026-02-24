import { Request, Response } from 'express';
import roleTemplateService from '../services/role-template.service';

export class RoleTemplateController {
    /**
     * GET /role-templates - Get all role templates
     * Supports query params: tenant_type, plan_id, is_active
     */
    findAll = async (req: Request, res: Response) => {
        try {
            const { tenant_type, plan_id, is_active } = req.query;
            const templates = await roleTemplateService.findAll({
                tenant_type: tenant_type as string,
                plan_id: plan_id as string,
                is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            });
            res.status(200).json({ success: true, data: templates });
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
     * GET /role-templates/:id - Get single role template
     */
    findById = async (req: Request, res: Response) => {
        try {
            const template = await roleTemplateService.findById(req.params.id as string);
            res.status(200).json({ success: true, data: template });
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
     * POST /role-templates - Create a new role template
     */
    create = async (req: Request, res: Response) => {
        try {
            const template = await roleTemplateService.create(req.body);
            res.status(201).json({ success: true, data: template });
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
     * PUT /role-templates/:id - Update a role template
     */
    update = async (req: Request, res: Response) => {
        try {
            const template = await roleTemplateService.update(req.params.id as string, req.body);
            res.status(200).json({ success: true, data: template });
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
     * DELETE /role-templates/:id - Delete a role template
     */
    delete = async (req: Request, res: Response) => {
        try {
            const result = await roleTemplateService.delete(req.params.id as string);
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

    /**
     * POST /role-templates/:id/duplicate - Duplicate a role template
     */
    duplicate = async (req: Request, res: Response) => {
        try {
            const { newSlug } = req.body;
            if (!newSlug) {
                return res.status(400).json({
                    success: false,
                    message: 'newSlug is required'
                });
            }
            const template = await roleTemplateService.duplicate(req.params.id as string, newSlug);
            res.status(201).json({ success: true, data: template });
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
