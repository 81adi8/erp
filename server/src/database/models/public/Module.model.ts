import { Table, Column, Model, DataType, Default, BelongsToMany, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';

@Table({ tableName: 'modules', schema: 'public', timestamps: true, underscored: true })
export class Module extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false, defaultValue: 'module_default_slug' })
    slug!: string;

    @Column({ type: DataType.TEXT, allowNull: false, defaultValue: 'Module Name' })
    name!: string;

    @Column({ type: DataType.TEXT })
    icon?: string;

    @Column({ type: DataType.TEXT })
    description?: string;

    @Column({ type: DataType.TEXT })
    institution_type!: string;

    @Column({ type: DataType.TEXT })
    route_name?: string; // e.g., "/admin/academics"

    // Self-referencing for nested sub-modules
    @ForeignKey(() => Module)
    @Column({ type: DataType.UUID, allowNull: true })
    parent_id?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_default!: boolean;

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

    // Parent module association
    @BelongsTo(() => Module, { foreignKey: 'parent_id', as: 'parent' })
    parent?: Module;

    // Child modules (sub-modules)
    @HasMany(() => Module, { foreignKey: 'parent_id', as: 'children' })
    children?: Module[];

    @BelongsToMany(() => require('./Plan.model').Plan, () => require('./PlanModule.model').PlanModule)
    plans!: import('./Plan.model').Plan[];

    @HasMany(() => require('./Feature.model').Feature)
    features!: import('./Feature.model').Feature[];
}

export default Module;

