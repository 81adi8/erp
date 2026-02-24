import { Request, Response } from 'express';
import { PlanService } from '../services/plan.service';

export class PlanController {
    private planService = new PlanService();

    findAll = async (req: Request, res: Response) => {
        try {
            const plans = await this.planService.findAll();
            res.status(200).json({ success: true, data: plans });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({ success: false, message: errorMessage });
        }
    };

    findById = async (req: Request, res: Response) => {
        try {
            const plan = await this.planService.findById(req.params.id as string);
            res.status(200).json({ success: true, data: plan });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({ success: false, message: errorMessage });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const plan = await this.planService.create(req.body);
            res.status(201).json({ success: true, data: plan });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({ success: false, message: errorMessage });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const plan = await this.planService.update(req.params.id as string, req.body);
            res.status(200).json({ success: true, data: plan });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({ success: false, message: errorMessage });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const result = await this.planService.delete(req.params.id as string);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
            res.status(statusCode).json({ success: false, message: errorMessage });
        }
    };
}
