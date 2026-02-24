import { Table, Column, Model, DataType, Default, BelongsToMany, HasMany } from 'sequelize-typescript';

@Table({ tableName: 'plans', schema: 'public', timestamps: true, underscored: true })
export class Plan extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.TEXT, allowNull: false, unique: true })
    slug!: string;

    @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
    price_monthly!: number;

    @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
    price_yearly!: number;

    @Column({ type: DataType.TEXT })
    description!: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @BelongsToMany(() => require('./Module.model').Module, () => require('./PlanModule.model').PlanModule)
    modules!: import('./Module.model').Module[];

    @BelongsToMany(() => require('./Permission.model').Permission, () => require('./PlanPermission.model').PlanPermission)
    permissions!: import('./Permission.model').Permission[];

    @HasMany(() => require('./Institution.model').Institution, 'plan_id')
    institutions!: import('./Institution.model').Institution[];

    @HasMany(() => require('./AccessBundle.model').AccessBundle, {
        foreignKey: 'target_id',
        constraints: false,
        scope: {
            target_model: 'Plan'
        }
    })
    accessBundles!: import('./AccessBundle.model').AccessBundle[];
}

export default Plan;
