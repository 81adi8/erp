import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Plan } from './Plan.model';
import { Permission } from './Permission.model';

/**
 * PlanPermission Model - Links Plans to Permissions
 * Defines what permissions are included in each plan
 */
@Table({ tableName: 'plan_permissions', schema: 'public', timestamps: true, underscored: true })
export class PlanPermission extends Model {
    @ForeignKey(() => Plan)
    @Column({ type: DataType.UUID, allowNull: false, primaryKey: true })
    plan_id!: string;

    @ForeignKey(() => Permission)
    @Column({ type: DataType.UUID, allowNull: false, primaryKey: true })
    permission_id!: string;
}

export default PlanPermission;
