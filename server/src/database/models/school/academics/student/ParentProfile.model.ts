import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
} from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { User } from '../../../shared/core/User.model';
import { Student } from './Student.model';
import { StudentParentLink } from './StudentParent.model';

export enum ParentRelationType {
    FATHER = 'father',
    MOTHER = 'mother',
    GUARDIAN = 'guardian',
}

@Table({
    tableName: 'parents',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            fields: ['institution_id', 'phone'],
            name: 'parents_institution_phone_idx',
        },
    ],
})
export class ParentProfile extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    user_id?: string;

    @BelongsTo(() => User)
    user?: User;

    @Column({ type: DataType.STRING(100), allowNull: false })
    first_name!: string;

    @Column({ type: DataType.STRING(100), allowNull: false })
    last_name!: string;

    @Column({ type: DataType.STRING(20), allowNull: false })
    phone!: string;

    @Column({ type: DataType.STRING(20), allowNull: true })
    alternate_phone?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    email?: string;

    @Column({ type: DataType.STRING(150), allowNull: true })
    occupation?: string;

    @Column({
        type: DataType.ENUM(...Object.values(ParentRelationType)),
        allowNull: false,
    })
    relation!: ParentRelationType;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @BelongsToMany(() => Student, () => StudentParentLink)
    students?: Student[];
}

export default ParentProfile;