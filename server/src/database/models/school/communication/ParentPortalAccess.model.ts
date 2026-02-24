/**
 * ParentPortalAccess Model
 * Links parent users to students with access permissions
 * DB table: parent_portal_access (created in migration: 20260219_missing_modules_fees_notices_institution_id.sql)
 */
import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../shared/core/User.model';
import { Student } from '../academics/student/Student.model';

export enum RelationshipType {
    PARENT = 'parent',
    GUARDIAN = 'guardian',
    SIBLING = 'sibling',
}

@Table({
    tableName: 'parent_portal_access',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['parent_user_id', 'student_id'],
            name: 'parent_portal_access_parent_student_unique',
        },
    ],
})
export class ParentPortalAccess extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    parent_user_id!: string;

    @BelongsTo(() => User)
    parent?: User;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student?: Student;

    @Default(RelationshipType.PARENT)
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    relationship!: RelationshipType;

    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_primary!: boolean;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    can_view_fees!: boolean;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    can_view_marks!: boolean;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    can_view_attendance!: boolean;

    @CreatedAt
    @Column({ type: DataType.DATE })
    created_at!: Date;

    @UpdatedAt
    @Column({ type: DataType.DATE })
    updated_at!: Date;
}

export default ParentPortalAccess;