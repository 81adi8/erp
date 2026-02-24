import { Request, Response } from 'express';
import { INSTITUTION_ROLES, RoleType } from '../../../core/constants/roles';
import { InstitutionType } from '../../../core/constants/tenant';

export class SystemConfigController {
    /**
     * GET /config/institution-types - Get all supported institution types
     */
    getInstitutionTypes = async (req: Request, res: Response) => {
        try {
            const types = Object.values(InstitutionType);
            res.status(200).json({ success: true, data: types });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, message: errorMessage });
        }
    };

    /**
     * GET /config/role-types - Get all supported role types
     */
    getRoleTypes = async (req: Request, res: Response) => {
        try {
            const types = Object.values(RoleType);
            res.status(200).json({ success: true, data: types });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, message: errorMessage });
        }
    };

    /**
     * GET /config/institution-roles - Get the role mapping for each institution type
     */
    getInstitutionRoles = async (req: Request, res: Response) => {
        try {
            res.status(200).json({ success: true, data: INSTITUTION_ROLES });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, message: errorMessage });
        }
    };

    /**
     * GET /config/all - Get all system configurations in one call
     */
    getAllConfig = async (req: Request, res: Response) => {
        try {
            res.status(200).json({
                success: true,
                data: {
                    institutionTypes: Object.values(InstitutionType),
                    roleTypes: Object.values(RoleType),
                    institutionRoles: INSTITUTION_ROLES
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ success: false, message: errorMessage });
        }
    };
}
