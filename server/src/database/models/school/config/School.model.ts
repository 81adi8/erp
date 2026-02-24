import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({ tableName: 'schools', timestamps: true, underscored: true })
export class SchoolModel extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.TEXT })
    address?: string;

    @Column({ type: DataType.TEXT })
    contact_email?: string;
}

export default SchoolModel;
