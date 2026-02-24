import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Chapter } from './Chapter.model';
import { Institution } from '../../../public/Institution.model';
import { Op } from 'sequelize';

@Table({
    tableName: 'topics',
    timestamps: true,
    underscored: true,
    defaultScope: {
        where: {
            institution_id: { [Op.not]: null },
        },
    },
})
export class Topic extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Chapter)
    @Column({ type: DataType.UUID, allowNull: false })
    chapter_id!: string;

    @BelongsTo(() => Chapter)
    chapter!: Chapter;

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

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_completed!: boolean;

    @Column(DataType.DECIMAL(5, 2))
    estimated_hours?: number;

    @Default({})
    @Column(DataType.JSONB)
    resource_links!: any; // e.g., [{title: "Video", url: "..."}]

    @Column(DataType.DATE)
    completed_at?: Date;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default Topic;
