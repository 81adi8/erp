import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Module } from './Module.model';

/**
 * Feature Model - Represents features within a module
 * e.g., Module "academics" has features: "students", "teachers", "classes"
 */
@Table({ tableName: 'features', schema: 'public', timestamps: true, underscored: true })
export class Feature extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Module)
    @Column({ type: DataType.UUID, allowNull: false })
    module_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    slug!: string; // e.g., "students", "attendance_marking"

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Students", "Attendance Marking"

    @Column({ type: DataType.TEXT })
    description?: string;

    @Column({ type: DataType.TEXT })
    icon?: string; // Icon name for UI

    @Column({ type: DataType.TEXT })
    route_name?: string; // e.g., "/admin/academics/students"

    @Default(0)
    @Column(DataType.INTEGER)
    sort_order!: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(true)
    @Column(DataType.BOOLEAN)
    route_active!: boolean;

    @Column({ type: DataType.TEXT })
    route_title?: string;

    // Associations
    @BelongsTo(() => Module)
    module?: Module;

    @HasMany(() => require('./Permission.model').Permission)
    permissions?: import('./Permission.model').Permission[];
}

export default Feature;

