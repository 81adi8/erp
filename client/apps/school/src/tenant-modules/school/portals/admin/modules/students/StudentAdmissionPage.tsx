import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    UserPlus,
    ChevronRight,
    ChevronLeft,
    Save,
    X,
    User,
    MapPin,
    Activity,
    AlertCircle,
    CheckCircle2,
    FileText,
    ShieldCheck,
    Check,
} from 'lucide-react';
import {
    Card,
    Button,
    Input,
    LoadingSpinner,
} from '@erp/common';
import { useAdmitStudentMutation, type AdmitStudentData } from '@core/api/endpoints/studentsApi';
import { useNavigate } from 'react-router-dom';
import { formatApiError } from '@/common/services/apiHelpers';
import { admitStudentSchema, type AdmitStudentFormData } from '@/core/validation/schemas';

const STEPS = [
    { id: 'personal', title: 'Personal Details', icon: User },
    { id: 'guardian', title: 'Parent/Guardian info', icon: ShieldCheck },
    { id: 'address', title: 'Address & Contact', icon: MapPin },
    { id: 'documents', title: 'Additional Info', icon: FileText },
];

const STEP_FIELDS: Array<Array<keyof AdmitStudentFormData>> = [
    ['firstName', 'lastName', 'email', 'gender', 'dateOfBirth', 'admissionNumber'],
    ['parentName', 'parentPhone'],
    ['currentAddress'],
    [],
];

export default function StudentAdmissionPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [successData, setSuccessData] = useState<{ studentId?: string } | null>(null);

    const [admitStudent, { isLoading: isSubmittingAdmission }] = useAdmitStudentMutation();

    const {
        register,
        handleSubmit,
        watch,
        trigger,
        formState: { errors, isSubmitting },
    } = useForm<AdmitStudentFormData>({
        resolver: zodResolver(admitStudentSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            gender: undefined,
            bloodGroup: '',
            aadharNumber: '',
            admissionNumber: '',
            admissionDate: new Date().toISOString().split('T')[0],
            parentName: '',
            parentPhone: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            currentAddress: '',
            permanentAddress: '',
            religion: '',
            caste: '',
            category: '',
            medicalHistory: '',
            remarks: '',
        },
    });

    const emailValue = watch('email');

    const onSubmit = async (formData: AdmitStudentFormData) => {
        try {
            const payload: AdmitStudentData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                ...(formData.phone ? { phone: formData.phone } : {}),
                ...(formData.dateOfBirth ? { dateOfBirth: formData.dateOfBirth } : {}),
                ...(formData.gender ? { gender: formData.gender } : {}),
                ...(formData.bloodGroup ? { bloodGroup: formData.bloodGroup } : {}),
                ...(formData.aadharNumber ? { aadharNumber: formData.aadharNumber } : {}),
                ...(formData.admissionNumber ? { admissionNumber: formData.admissionNumber } : {}),
                ...(formData.admissionDate ? { admissionDate: formData.admissionDate } : {}),
                ...(formData.parentName ? { parentName: formData.parentName } : {}),
                ...(formData.parentPhone ? { parentPhone: formData.parentPhone } : {}),
                ...(formData.emergencyContactName ? { emergencyContactName: formData.emergencyContactName } : {}),
                ...(formData.emergencyContactPhone ? { emergencyContactPhone: formData.emergencyContactPhone } : {}),
                ...(formData.currentAddress ? { currentAddress: formData.currentAddress } : {}),
                ...(formData.permanentAddress ? { permanentAddress: formData.permanentAddress } : {}),
                ...(formData.religion ? { religion: formData.religion } : {}),
                ...(formData.caste ? { caste: formData.caste } : {}),
                ...(formData.category ? { category: formData.category } : {}),
                ...(formData.medicalHistory ? { medicalHistory: formData.medicalHistory } : {}),
                ...(formData.remarks ? { remarks: formData.remarks } : {}),
            };

            const result = await admitStudent(payload).unwrap();
            setSuccessData({ studentId: result.data.studentId });
        } catch (error) {
            console.error('Registration failed:', error);
            alert(formatApiError(error));
        }
    };

    const nextStep = async () => {
        const stepFields = STEP_FIELDS[currentStep];
        if (stepFields.length > 0) {
            const valid = await trigger(stepFields);
            if (!valid) {
                return;
            }
        }
        setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
    };

    const prevStep = () => setCurrentStep((prev) => Math.max(0, prev - 1));

    if (successData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center"
                >
                    <CheckCircle2 className="text-emerald-500 w-12 h-12" />
                </motion.div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Student Registered Successfully!</h2>
                    <p className="text-muted-foreground">The student master record has been created.</p>
                </div>
                <Card className="p-6 w-full max-w-md space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase font-semibold">Student Access</label>
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                            <p><strong>Email:</strong> {emailValue}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Credentials are managed through secure identity flow and are not shown in UI responses.
                        </p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-xs text-amber-800 flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5" />
                            To start the student's academic journey, proceed to the <strong>Enrollment Page</strong> to assign a class and section.
                        </p>
                    </div>
                </Card>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => navigate('/admin/students')}>Student Master List</Button>
                    <Button onClick={() => navigate('/admin/students/enroll')}>Enroll Now</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">New Student Registration</h1>
                        <p className="text-sm text-text-muted">Create a master profile for a new student</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/students')}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
            </div>

            <div className="flex items-center justify-between px-4 max-w-3xl mx-auto relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 -z-10" />
                {STEPS.map((step, idx) => (
                    <div key={step.id} className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => idx <= currentStep && setCurrentStep(idx)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > idx
                                ? 'bg-success text-white'
                                : currentStep === idx
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-background border-2 border-border text-muted-foreground'
                                }`}
                        >
                            {currentStep > idx ? <Check size={18} /> : <step.icon className="w-5 h-5" />}
                        </button>
                        <span className={`text-[10px] mt-2 font-semibold uppercase tracking-wider ${currentStep >= idx ? 'text-primary' : 'text-muted-foreground'}`}>
                            {step.title}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="p-6 overflow-hidden min-h-[400px]">
                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    {currentStep === 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User size={18} className="text-primary" /> Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input label="First Name *" placeholder="Enter first name" {...register('firstName')} error={errors.firstName?.message} />
                                <Input label="Last Name *" placeholder="Enter last name" {...register('lastName')} error={errors.lastName?.message} />
                                <Input label="Email Address *" type="email" placeholder="student@example.com" {...register('email')} error={errors.email?.message} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Gender *</label>
                                    <select
                                        {...register('gender')}
                                        className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.gender ? 'border-error' : 'border-input'}`}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.gender && <p className="text-sm text-error">{errors.gender.message}</p>}
                                </div>
                                <Input label="Date of Birth *" type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
                                <Input label="Admission Number *" placeholder="ADM/2024/001" {...register('admissionNumber')} error={errors.admissionNumber?.message} />
                                <Input label="Admission Date" type="date" {...register('admissionDate')} error={errors.admissionDate?.message} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Blood Group</label>
                                    <select
                                        {...register('bloodGroup')}
                                        className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.bloodGroup ? 'border-error' : 'border-input'}`}
                                    >
                                        <option value="">Select Blood Group</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                    {errors.bloodGroup && <p className="text-sm text-error">{errors.bloodGroup.message}</p>}
                                </div>
                                <Input label="Aadhar Number" placeholder="12-digit UIDAI number" {...register('aadharNumber')} error={errors.aadharNumber?.message} />
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <ShieldCheck size={18} className="text-primary" /> Guardian Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Father/Mother/Guardian Name *" placeholder="Enter full name" {...register('parentName')} error={errors.parentName?.message} />
                                <Input label="Parent Phone Number *" placeholder="Enter mobile number" {...register('parentPhone')} error={errors.parentPhone?.message} />
                                <Input label="Emergency Contact Name" placeholder="Emergency contact person" {...register('emergencyContactName')} error={errors.emergencyContactName?.message} />
                                <Input label="Emergency Contact Phone" placeholder="Emergency phone" {...register('emergencyContactPhone')} error={errors.emergencyContactPhone?.message} />
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <MapPin size={18} className="text-primary" /> Contact Information
                            </h3>
                            <Input label="Personal Phone (if any)" placeholder="Student's phone number" {...register('phone')} error={errors.phone?.message} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Current Address *</label>
                                    <textarea
                                        {...register('currentAddress')}
                                        className={`w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all ${errors.currentAddress ? 'border-error' : 'border-input'}`}
                                        placeholder="Flat no, Street, Area, City, Pin"
                                    />
                                    {errors.currentAddress && <p className="text-sm text-error">{errors.currentAddress.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Permanent Address</label>
                                    <textarea
                                        {...register('permanentAddress')}
                                        className={`w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all ${errors.permanentAddress ? 'border-error' : 'border-input'}`}
                                        placeholder="Leave empty if same as current"
                                    />
                                    {errors.permanentAddress && <p className="text-sm text-error">{errors.permanentAddress.message}</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Activity size={18} className="text-primary" /> Additional Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input label="Religion" placeholder="e.g. Hindu, Muslim, etc." {...register('religion')} error={errors.religion?.message} />
                                <Input label="Caste" placeholder="Enter caste" {...register('caste')} error={errors.caste?.message} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        {...register('category')}
                                        className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.category ? 'border-error' : 'border-input'}`}
                                    >
                                        <option value="">Select Category</option>
                                        <option value="General">General</option>
                                        <option value="OBC">OBC</option>
                                        <option value="SC">SC</option>
                                        <option value="ST">ST</option>
                                        <option value="EWS">EWS</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.category && <p className="text-sm text-error">{errors.category.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Medical History / Allergies</label>
                                <textarea
                                    {...register('medicalHistory')}
                                    className={`w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 ${errors.medicalHistory ? 'border-error' : 'border-input'}`}
                                    placeholder="Enter any chronic medical conditions or allergies"
                                />
                                {errors.medicalHistory && <p className="text-sm text-error">{errors.medicalHistory.message}</p>}
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-slate-500" /> Documents Upload
                                </h4>
                                <p className="text-xs text-slate-500 mb-4">Upload Birth Certificate, Aadhar Copy, previous marksheets, etc.</p>
                                <div className="flex justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                                    <div className="text-center">
                                        <FileText className="mx-auto h-8 w-8 text-slate-400" />
                                        <p className="mt-1 text-xs text-slate-500">Drag and drop or click to upload</p>
                                        <button type="button" className="mt-2 text-xs font-semibold text-primary">Upload Files</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Internal Remarks</label>
                                <textarea
                                    {...register('remarks')}
                                    className={`w-full min-h-[60px] p-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 ${errors.remarks ? 'border-error' : 'border-input'}`}
                                    placeholder="Any additional notes for school records"
                                />
                                {errors.remarks && <p className="text-sm text-error">{errors.remarks.message}</p>}
                            </div>
                        </motion.div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft size={16} className="mr-2" />
                            Back
                        </Button>

                        <div className="flex gap-3">
                            {currentStep < STEPS.length - 1 ? (
                                <Button type="button" onClick={() => void nextStep()}>
                                    Next Step
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isSubmittingAdmission || isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
                                >
                                    {isSubmittingAdmission || isSubmitting ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Saving Record...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Complete Registration
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Card>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs leading-relaxed">
                    <strong>Note:</strong> Registering the student creates their permanent identity in the system.
                    This record is used for academic history, fee tracking, and alumni records.
                    Ensure the email is valid as it will be used for the student's portal access.
                </p>
            </div>
        </div>
    );
}
