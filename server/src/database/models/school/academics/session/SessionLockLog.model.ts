import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicSession } from './AcademicSession.model';
import { AcademicTerm } from './AcademicTerm.model';
import { User } from '../../../shared/core/User.model';

/**
 * SessionLockLog - Audit trail for all session/term locking operations
 * Tracks who locked/unlocked what and when
 */
export enum LockAction {
    LOCK = 'LOCK',
    UNLOCK = 'UNLOCK',
    PARTIAL_LOCK = 'PARTIAL_LOCK',    // Locked specific module (attendance, marks, etc.)
    PARTIAL_UNLOCK = 'PARTIAL_UNLOCK',
    AUTO_LOCK = 'AUTO_LOCK'           // System auto-lock after end date
}

export enum LockTarget {
    SESSION = 'SESSION',
    TERM = 'TERM',
    ATTENDANCE = 'ATTENDANCE',
    MARKS = 'MARKS',
    FEES = 'FEES',
    ENROLLMENT = 'ENROLLMENT'
}

@Table({ tableName: 'session_lock_logs', timestamps: true, underscored: true })
export class SessionLockLog extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    session_id!: string;

    @BelongsTo(() => AcademicSession)
    session!: AcademicSession;

    // Optional term reference (for term-level locking)
    @ForeignKey(() => AcademicTerm)
    @Column(DataType.UUID)
    term_id?: string;

    @BelongsTo(() => AcademicTerm)
    term?: AcademicTerm;

    @Column({
        type: DataType.ENUM(...Object.values(LockAction)),
        allowNull: false
    })
    action!: LockAction;

    @Column({
        type: DataType.ENUM(...Object.values(LockTarget)),
        allowNull: false
    })
    target!: LockTarget;

    @Column({ type: DataType.DATE, allowNull: false })
    action_at!: Date;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    performed_by?: string; // Null for auto-lock

    @BelongsTo(() => User)
    user?: User;

    @Column(DataType.TEXT)
    reason?: string;

    @Column(DataType.TEXT)
    ip_address?: string;

    @Column(DataType.TEXT)
    user_agent?: string;

    // Previous state before this action
    @Default({})
    @Column(DataType.JSONB)
    previous_state!: any;

    // New state after this action
    @Default({})
    @Column(DataType.JSONB)
    new_state!: any;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default SessionLockLog;
