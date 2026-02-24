import { Chapter } from '../../../../../database/models/school/academics/curriculum/Chapter.model';
import { Topic } from '../../../../../database/models/school/academics/curriculum/Topic.model';
import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreateChapterDto, UpdateChapterDto, CreateTopicDto, UpdateTopicDto } from '../../dto';
import { subjectService } from './subject.service';

export class CurriculumService {
    // ==================== Chapters ====================

    /**
     * Get all chapters for a subject
     */
    async getChapters(schemaName: string, institutionId: string, subjectId: string): Promise<Chapter[]> {
        return await Chapter.schema(schemaName).findAll({
            where: { subject_id: subjectId, institution_id: institutionId },
            include: [{
                model: Topic.schema(schemaName),
                as: 'topics',
                where: { institution_id: institutionId },
                required: false,
            }],
            order: [['display_order', 'ASC']]
        });
    }

    /**
     * Get chapter by ID
     */
    async getChapterById(schemaName: string, institutionId: string, id: string): Promise<Chapter> {
        const chapter = await Chapter.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [
                {
                    model: Subject.schema(schemaName),
                    as: 'subject',
                    where: { institution_id: institutionId },
                    required: true,
                },
                {
                    model: Topic.schema(schemaName),
                    as: 'topics',
                    where: { institution_id: institutionId },
                    required: false,
                }
            ]
        });

        if (!chapter) {
            throw new AcademicError('Chapter not found', ErrorCodes.CHAPTER_NOT_FOUND, 404);
        }

        return chapter;
    }

    /**
     * Create new chapter
     */
    async createChapter(schemaName: string, institutionId: string, data: CreateChapterDto): Promise<Chapter> {
        // Verify subject exists
        await subjectService.getById(schemaName, institutionId, data.subject_id);

        // Auto-assign display order
        const maxOrder = await Chapter.schema(schemaName).max('display_order', {
            where: { subject_id: data.subject_id, institution_id: institutionId }
        }) as number || 0;

        return await Chapter.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            display_order: maxOrder + 1
        });
    }

    /**
     * Update chapter
     */
    async updateChapter(schemaName: string, institutionId: string, id: string, data: UpdateChapterDto): Promise<Chapter> {
        const chapter = await this.getChapterById(schemaName, institutionId, id);
        await chapter.update(data);
        return chapter;
    }

    /**
     * Delete chapter
     */
    async deleteChapter(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const chapter = await this.getChapterById(schemaName, institutionId, id);

        const topicCount = await Topic.schema(schemaName).count({
            where: { chapter_id: id, institution_id: institutionId },
        });
        if (topicCount > 0) {
            throw new AcademicError(
                `Cannot delete chapter with ${topicCount} topic(s). Delete topics first.`,
                ErrorCodes.CHAPTER_HAS_TOPICS
            );
        }

        await chapter.destroy();
        return { success: true, message: 'Chapter deleted successfully' };
    }

    // ==================== Topics ====================

    /**
     * Get all topics for a chapter
     */
    async getTopics(schemaName: string, institutionId: string, chapterId: string): Promise<Topic[]> {
        return await Topic.schema(schemaName).findAll({
            where: { chapter_id: chapterId, institution_id: institutionId },
            order: [['display_order', 'ASC']]
        });
    }

    /**
     * Get topic by ID
     */
    async getTopicById(schemaName: string, institutionId: string, id: string): Promise<Topic> {
        const topic = await Topic.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [{
                model: Chapter.schema(schemaName),
                as: 'chapter',
                where: { institution_id: institutionId },
                required: true,
                include: [{
                    model: Subject.schema(schemaName),
                    as: 'subject',
                    where: { institution_id: institutionId },
                    required: true,
                }]
            }]
        });

        if (!topic) {
            throw new AcademicError('Topic not found', ErrorCodes.TOPIC_NOT_FOUND, 404);
        }

        return topic;
    }

    /**
     * Create new topic
     */
    async createTopic(schemaName: string, institutionId: string, data: CreateTopicDto): Promise<Topic> {
        // Verify chapter exists
        await this.getChapterById(schemaName, institutionId, data.chapter_id);

        // Auto-assign display order
        const maxOrder = await Topic.schema(schemaName).max('display_order', {
            where: { chapter_id: data.chapter_id, institution_id: institutionId }
        }) as number || 0;

        return await Topic.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            display_order: maxOrder + 1
        });
    }

    /**
     * Update topic
     */
    async updateTopic(schemaName: string, institutionId: string, id: string, data: UpdateTopicDto): Promise<Topic> {
        const topic = await this.getTopicById(schemaName, institutionId, id);
        await topic.update(data);
        return topic;
    }

    /**
     * Delete topic
     */
    async deleteTopic(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const topic = await this.getTopicById(schemaName, institutionId, id);
        await topic.destroy();
        return { success: true, message: 'Topic deleted successfully' };
    }

    /**
     * Mark topic as completed
     */
    async markTopicCompleted(schemaName: string, institutionId: string, id: string, completed: boolean = true): Promise<Topic> {
        const topic = await this.getTopicById(schemaName, institutionId, id);
        await topic.update({ is_completed: completed });
        return topic;
    }
}

export const curriculumService = new CurriculumService();
