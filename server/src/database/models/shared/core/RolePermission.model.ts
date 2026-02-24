import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Role } from './Role.model';
import { Permission } from '../../public/Permission.model';

@Table({
    tableName: 'role_permissions',
    timestamps: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['role_id', 'permission_id'], name: 'role_permissions_unique' }
    ]
})
export class RolePermission extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @ForeignKey(() => Role)
    @Column({ type: DataType.UUID, allowNull: false })
    role_id!: string;

    @BelongsTo(() => Role)
    role?: Role;

    @Index
    @ForeignKey(() => Permission)
    @Column({ type: DataType.UUID, allowNull: false })
    permission_id!: string;

    @BelongsTo(() => Permission)
    permission?: Permission;
}

export default RolePermission;
