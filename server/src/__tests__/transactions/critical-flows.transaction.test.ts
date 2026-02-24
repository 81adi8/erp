import { sequelize } from '../../database/sequelize';
import { FeePaymentMode } from '../../database/models/school/fees/FeePayment.model';
import { feeRepository } from '../../modules/school/fees/repositories/fee.repository';
import { FeeService } from '../../modules/school/fees/services/fee.service';
import { EnrollmentRepository } from '../../modules/school/student/repositories/enrollment.repository';
import { StudentRepository } from '../../modules/school/student/repositories/student.repository';
import StudentService from '../../modules/school/student/services/student.service';
import { UserRepository } from '../../modules/shared/repositories/user.repository';

describe('Critical Flow Transaction Safety', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('collectFee rolls back managed transaction when payment persistence fails', async () => {
        const feeService = new FeeService();
        let rollbackObserved = false;

        const transactionSpy = jest.spyOn(sequelize, 'transaction').mockImplementation(async (arg1: unknown, arg2?: unknown) => {
            const callback = typeof arg1 === 'function' ? arg1 : arg2;
            if (typeof callback !== 'function') {
                throw new Error('Managed transaction callback is required');
            }

            try {
                return await callback({ LOCK: { UPDATE: 'UPDATE' } });
            } catch (error) {
                rollbackObserved = true;
                throw error;
            }
        });

        const institutionId = '11111111-1111-4111-8111-111111111111';
        const studentId = '22222222-2222-4222-8222-222222222222';
        const academicYearId = '33333333-3333-4333-8333-333333333333';
        const feeStructureId = '44444444-4444-4444-8444-444444444444';

        jest.spyOn(feeRepository, 'findStudentById').mockResolvedValue({
            id: studentId,
            institution_id: institutionId,
        } as never);

        jest.spyOn(feeRepository, 'findStructureById').mockResolvedValue({
            id: feeStructureId,
            institution_id: institutionId,
            academic_year_id: academicYearId,
            late_fee_per_day: '0.00',
            due_day: null,
        } as never);

        jest.spyOn(feeRepository, 'findAssignment').mockResolvedValue({
            id: '55555555-5555-4555-8555-555555555555',
        } as never);

        jest.spyOn(feeRepository, 'getStudentDues').mockResolvedValue({
            totalAssigned: 1000,
            totalPaid: 0,
            outstanding: 1000,
            breakdown: [],
        });

        jest.spyOn(feeRepository, 'generateReceiptNumber').mockResolvedValue('RCP-2026-00001');
        const createPaymentSpy = jest
            .spyOn(feeRepository, 'createPayment')
            .mockRejectedValue(new Error('PAYMENT_PERSISTENCE_FAILED'));

        await expect(
            feeService.collectFee(
                {
                    institutionId,
                    studentId,
                    academicYearId,
                    feeStructureId,
                    amountPaid: 250,
                    paymentMode: FeePaymentMode.CASH,
                },
                'test_schema_jest',
            ),
        ).rejects.toThrow('PAYMENT_PERSISTENCE_FAILED');

        expect(transactionSpy).toHaveBeenCalledTimes(1);
        expect(createPaymentSpy).toHaveBeenCalledTimes(1);
        expect(rollbackObserved).toBe(true);
    });

    test('admitStudent rolls back managed transaction when enrollment creation fails', async () => {
        const tenantIdentity = {
            id: '66666666-6666-4666-8666-666666666666',
            db_schema: 'test_schema_jest',
            slug: 'test-school',
            status: 'active' as const,
        };

        const tenantContext = {
            ...tenantIdentity,
            institutionName: 'Test School',
        };

        const studentService = new StudentService(tenantIdentity);
        let rollbackObserved = false;

        const transactionSpy = jest.spyOn(sequelize, 'transaction').mockImplementation(async (arg1: unknown, arg2?: unknown) => {
            const callback = typeof arg1 === 'function' ? arg1 : arg2;
            if (typeof callback !== 'function') {
                throw new Error('Managed transaction callback is required');
            }

            try {
                return await callback({});
            } catch (error) {
                rollbackObserved = true;
                throw error;
            }
        });

        const createUserSpy = jest.spyOn(UserRepository.prototype, 'create').mockResolvedValue({
            id: '77777777-7777-4777-8777-777777777777',
            email: 'rollback-student@test.com',
            first_name: 'Rollback',
            last_name: 'Student',
        } as never);

        const createStudentSpy = jest.spyOn(StudentRepository.prototype, 'create').mockResolvedValue({
            id: '88888888-8888-4888-8888-888888888888',
        } as never);

        const createEnrollmentSpy = jest
            .spyOn(EnrollmentRepository.prototype, 'create')
            .mockRejectedValue(new Error('ENROLLMENT_INSERT_FAILED'));

        await expect(
            studentService.admitStudent(
                tenantContext,
                '99999999-9999-4999-8999-999999999999',
                {
                    userId: '00000000-0000-4000-8000-000000000000',
                    institutionId: tenantIdentity.id,
                    email: 'rollback-student@test.com',
                    firstName: 'Rollback',
                    lastName: 'Student',
                    academicYearId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    classId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                    sectionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                },
            ),
        ).rejects.toThrow('ENROLLMENT_INSERT_FAILED');

        expect(transactionSpy).toHaveBeenCalledTimes(1);
        expect(createUserSpy).toHaveBeenCalledTimes(1);
        expect(createStudentSpy).toHaveBeenCalledTimes(1);
        expect(createEnrollmentSpy).toHaveBeenCalledTimes(1);
        expect(rollbackObserved).toBe(true);
    });
});
