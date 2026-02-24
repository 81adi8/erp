import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({ tableName: 'failed_logins', timestamps: true, underscored: true, updatedAt: false })
export class FailedLogin extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column(DataType.TEXT)
    email?: string; // We might not have a user yet

    @Column(DataType.INET)
    ip?: string;

    @Default(1)
    @Column(DataType.INTEGER)
    attempts!: number;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    first_attempt_at!: Date;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    last_attempt_at!: Date;
}

export default FailedLogin;
