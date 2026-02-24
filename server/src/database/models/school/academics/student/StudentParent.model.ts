import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Student } from './Student.model';
import { ParentProfile } from './ParentProfile.model';

@Table({
    tableName: 'student_parents',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['student_id', 'parent_id'],
            name: 'student_parents_student_parent_unique',
        },
    ],
})
export class StudentParentLink extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student!: Student;

    @ForeignKey(() => ParentProfile)
    @Column({ type: DataType.UUID, allowNull: false })
    parent_id!: string;

    @BelongsTo(() => ParentProfile, { foreignKey: 'parent_id', as: 'parent_profile' })
    parent_profile!: ParentProfile;

    @Column({ type: DataType.STRING(50), allowNull: false })
    relation!: string;

    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_primary!: boolean;
}

export { StudentParentLink as StudentParent };
export default StudentParentLink;