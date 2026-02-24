import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';
import { Feature } from './Feature.model';

/**
 * Permission Model (PUBLIC Schema) - Centralized permission storage
 * Format: feature.action (e.g., "students.view", "attendance.mark")
 */
@Table({ tableName: 'permissions', schema: 'public', timestamps: true, underscored: true })
export class Permission extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Feature)
    @Column({ type: DataType.UUID, allowNull: false })
    feature_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    action!: string; // view, create, edit, delete, manage

    @Column({ type: DataType.TEXT, allowNull: false, unique: true })
    key!: string; // e.g., "academics.students.view" (module.feature.action)

    @Column({ type: DataType.TEXT })
    icon?: string;

    @Column({ type: DataType.TEXT })
    description?: string;

    @Column({ type: DataType.TEXT })
    route_name?: string; // e.g., "/admin/academics/students/view"

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(true)
    @Column(DataType.BOOLEAN)
    route_active!: boolean;

    @Column({ type: DataType.TEXT })
    route_title?: string;

    // Associations
    @BelongsTo(() => Feature)
    feature?: Feature;

    @BelongsToMany(() => require('./Plan.model').Plan, () => require('./PlanPermission.model').PlanPermission)
    plans?: import('./Plan.model').Plan[];
}

export default Permission;
