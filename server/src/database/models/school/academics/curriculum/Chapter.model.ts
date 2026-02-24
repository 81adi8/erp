import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Subject } from './Subject.model';
import { Topic } from './Topic.model';
import { Institution } from '../../../public/Institution.model';
import { Op } from 'sequelize';

/**
 * Chapter model - Represents a unit or chapter within a subject
 */
@Table({
    tableName: 'chapters',
    timestamps: true,
    underscored: true,
    defaultScope: {
        where: {
            institution_id: { [Op.not]: null },
        },
    },
})
export class Chapter extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column(DataType.TEXT)
    description?: string;

    @Default(0)
    @Column(DataType.INTEGER)
    display_order!: number;

    @Column(DataType.DECIMAL(5, 2))
    estimated_hours?: number;

    @Default({})
    @Column(DataType.JSONB)
    learning_outcomes!: string[];

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;

    @HasMany(() => Topic)
    topics!: Topic[];
}

export default Chapter;
