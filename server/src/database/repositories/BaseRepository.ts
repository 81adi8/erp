import { Model, ModelStatic, FindOptions, CreateOptions, UpdateOptions, DestroyOptions, WhereOptions } from 'sequelize';

/**
 * BaseRepository — Generic Sequelize Repository
 *
 * Provides standard CRUD operations for any Sequelize model.
 * All methods are schema-aware for multi-tenant isolation.
 *
 * Usage:
 *   class StudentRepository extends BaseRepository<Student> {
 *     constructor(schemaName: string) {
 *       super(Student, schemaName);
 *     }
 *   }
 */
export class BaseRepository<T extends Model> {
    protected model: ModelStatic<T>;
    protected schemaName: string;

    constructor(model: ModelStatic<T>, schemaName: string) {
        this.model = model;
        this.schemaName = schemaName;
    }

    /**
     * Get the schema-bound model class
     */
    protected get scopedModel(): ModelStatic<T> {
        return (this.model as any).schema(this.schemaName) as ModelStatic<T>;
    }

    /**
     * Find all records matching options
     */
    async findAll(options?: FindOptions): Promise<T[]> {
        return this.scopedModel.findAll(options);
    }

    /**
     * Find a single record by primary key
     */
    async findById(id: string, options?: FindOptions): Promise<T | null> {
        return this.scopedModel.findByPk(id, options);
    }

    /**
     * Find one record matching conditions
     */
    async findOne(options: FindOptions): Promise<T | null> {
        return this.scopedModel.findOne(options);
    }

    /**
     * Find and count records (for pagination)
     */
    async findAndCountAll(options?: FindOptions): Promise<{ rows: T[]; count: number }> {
        return this.scopedModel.findAndCountAll(options);
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T['_creationAttributes']>, options?: CreateOptions): Promise<T> {
        return this.scopedModel.create(data as any, options);
    }

    /**
     * Update records matching conditions
     * Returns number of affected rows
     */
    async update(
        data: Partial<T['_creationAttributes']>,
        where: WhereOptions,
        options?: Omit<UpdateOptions, 'where'>
    ): Promise<[number]> {
        return this.scopedModel.update(data as any, { where, ...options });
    }

    /**
     * Soft delete (sets deletedAt) — requires paranoid: true on model
     */
    async softDelete(where: WhereOptions): Promise<number> {
        return this.scopedModel.destroy({ where });
    }

    /**
     * Hard delete — use with caution
     */
    async hardDelete(where: WhereOptions, options?: DestroyOptions): Promise<number> {
        return this.scopedModel.destroy({ where, force: true, ...options });
    }

    /**
     * Count records matching conditions
     */
    async count(options?: FindOptions): Promise<number> {
        return this.scopedModel.count(options);
    }

    /**
     * Check if a record exists
     */
    async exists(where: WhereOptions): Promise<boolean> {
        const count = await this.scopedModel.count({ where });
        return count > 0;
    }

    /**
     * Upsert — insert or update on conflict
     */
    async upsert(data: Partial<T['_creationAttributes']>): Promise<[T, boolean | null]> {
        return this.scopedModel.upsert(data as any);
    }

    /**
     * Bulk create records
     */
    async bulkCreate(
        records: Partial<T['_creationAttributes']>[],
        options?: { ignoreDuplicates?: boolean; updateOnDuplicate?: string[] }
    ): Promise<T[]> {
        return this.scopedModel.bulkCreate(records as any[], options);
    }
}
