import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';

@Table({ tableName: 'plan_modules', schema: 'public', timestamps: true, underscored: true })
export class PlanModule extends Model {
    @ForeignKey(() => require('./Plan.model').Plan)
    @Column({ type: DataType.UUID, allowNull: false })
    plan_id!: string;

    @ForeignKey(() => require('./Module.model').Module)
    @Column({ type: DataType.UUID, allowNull: false })
    module_id!: string;
}


export default PlanModule;
