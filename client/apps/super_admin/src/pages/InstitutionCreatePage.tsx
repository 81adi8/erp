import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Mail,
    Globe,
    Phone,
    MapPin,
    User,
    Lock,
    CreditCard,
    Check,
    ChevronRight,
    ChevronLeft,
    Loader2,
} from 'lucide-react';
import { Button, Input, Select, Card, Badge } from '@erp/common';
import { useCreateInstitutionMutation } from '../services';

const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN || 'erpsaas.in';

interface FormData {
    // Step 1 - Basic Info
    name: string;
    subdomain: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    // Step 2 - Plan
    planId: string;
    // Step 3 - Admin
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}

const initialFormData: FormData = {
    name: '',
    subdomain: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    planId: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
}

const steps = [
    { id: 1, name: 'Basic Info', icon: Building2 },
    { id: 2, name: 'Select Plan', icon: CreditCard },
    { id: 3, name: 'Admin Account', icon: User },
    { id: 4, name: 'Review', icon: Check },
];

const planOptions = [
    { value: 'basic', label: 'Basic - Free', description: 'Up to 100 students, basic features' },
    { value: 'standard', label: 'Standard - $49/mo', description: 'Up to 500 students, all core features' },
    { value: 'premium', label: 'Premium - $99/mo', description: 'Up to 2000 students, advanced features' },
    { value: 'enterprise', label: 'Enterprise - Custom', description: 'Unlimited students, dedicated support' },
];

interface InstitutionCreateError {
    data?: {
        message?: string;
    };
}

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
    <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                        <div
                            className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                transition-all duration-300
                                ${isCompleted
                                    ? 'bg-success text-white'
                                    : isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-surface-hover text-text-muted'
                                }
                            `}
                        >
                            {isCompleted ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <Icon className="w-5 h-5" />
                            )}
                        </div>
                        <span className={`text-xs mt-2 ${isActive ? 'text-primary font-medium' : 'text-text-muted'}`}>
                            {step.name}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`w-16 h-0.5 mx-2 transition-colors duration-300 ${isCompleted ? 'bg-success' : 'bg-border'
                                }`}
                        />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

export const InstitutionCreatePage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<FormData>>({});

    const [createInstitution, { isLoading }] = useCreateInstitutionMutation();

    const updateFormData = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Partial<FormData> = {};

        if (step === 1) {
            if (!formData.name.trim()) newErrors.name = 'Institution name is required';
            if (!formData.subdomain.trim()) newErrors.subdomain = 'Subdomain is required';
            else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
                newErrors.subdomain = 'Only lowercase letters, numbers, and hyphens allowed';
            }
            if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
                newErrors.contactEmail = 'Invalid email format';
            }
        }

        if (step === 2) {
            if (!formData.planId) newErrors.planId = 'Please select a plan';
        }

        if (step === 3) {
            if (!formData.adminName.trim()) newErrors.adminName = 'Admin name is required';
            if (!formData.adminEmail.trim()) newErrors.adminEmail = 'Admin email is required';
            if (!formData.adminPassword) newErrors.adminPassword = 'Password is required';
            else if (formData.adminPassword.length < 8) {
                newErrors.adminPassword = 'Password must be at least 8 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        try {
            await createInstitution({
                name: formData.name,
                subdomain: formData.subdomain,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone || undefined,
                address: formData.address || undefined,
                planId: formData.planId || undefined,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
            }).unwrap();

            navigate('/institutions', {
                state: { message: 'Institution created successfully!' }
            });
        } catch (err: unknown) {
            const createError = err as InstitutionCreateError;
            console.error('Failed to create institution:', err);
            setErrors({ name: createError?.data?.message || 'Failed to create institution' });
        }
    };

    const selectedPlan = planOptions.find(p => p.value === formData.planId);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text">Create New Institution</h1>
                <p className="text-text-muted">Set up a new tenant on the platform</p>
            </div>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} />

            {/* Form Card */}
            <Card variant="default" className="mb-6">
                <AnimatePresence mode="wait">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            <h2 className="text-lg font-semibold text-text mb-4">Basic Information</h2>

                            <Input
                                label="Institution Name"
                                placeholder="e.g., Delhi Public School"
                                value={formData.name}
                                onChange={(e) => updateFormData('name', e.target.value)}
                                error={errors.name}
                                leftIcon={<Building2 className="w-4 h-4" />}
                            />

                            <Input
                                label="Subdomain"
                                placeholder="e.g., dps"
                                value={formData.subdomain}
                                onChange={(e) => updateFormData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                error={errors.subdomain}
                                hint={formData.subdomain ? `URL: ${formData.subdomain}.${MAIN_DOMAIN}` : ''}
                                leftIcon={<Globe className="w-4 h-4" />}
                            />

                            <Input
                                label="Contact Email"
                                type="email"
                                placeholder="admin@institution.edu"
                                value={formData.contactEmail}
                                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                                error={errors.contactEmail}
                                leftIcon={<Mail className="w-4 h-4" />}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Phone (Optional)"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={formData.contactPhone}
                                    onChange={(e) => updateFormData('contactPhone', e.target.value)}
                                    leftIcon={<Phone className="w-4 h-4" />}
                                />
                                <Input
                                    label="Address (Optional)"
                                    placeholder="City, State"
                                    value={formData.address}
                                    onChange={(e) => updateFormData('address', e.target.value)}
                                    leftIcon={<MapPin className="w-4 h-4" />}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Plan Selection */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-lg font-semibold text-text mb-4">Select a Plan</h2>
                            {errors.planId && (
                                <p className="text-error text-sm mb-4">{errors.planId}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {planOptions.map((plan) => (
                                    <motion.div
                                        key={plan.value}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateFormData('planId', plan.value)}
                                        className={`
                                            p-4 rounded-xl border-2 cursor-pointer transition-all
                                            ${formData.planId === plan.value
                                                ? 'border-primary bg-primary/5 shadow-md'
                                                : 'border-border hover:border-primary/50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-text">{plan.label}</span>
                                            {formData.planId === plan.value && (
                                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-muted">{plan.description}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Admin Account */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            <h2 className="text-lg font-semibold text-text mb-4">Create Admin Account</h2>
                            <p className="text-text-muted text-sm mb-4">
                                This will be the first administrator for the institution.
                            </p>

                            <Input
                                label="Admin Name"
                                placeholder="Full name"
                                value={formData.adminName}
                                onChange={(e) => updateFormData('adminName', e.target.value)}
                                error={errors.adminName}
                                leftIcon={<User className="w-4 h-4" />}
                            />

                            <Input
                                label="Admin Email"
                                type="email"
                                placeholder="admin@institution.edu"
                                value={formData.adminEmail}
                                onChange={(e) => updateFormData('adminEmail', e.target.value)}
                                error={errors.adminEmail}
                                leftIcon={<Mail className="w-4 h-4" />}
                            />

                            <Input
                                label="Password"
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={formData.adminPassword}
                                onChange={(e) => updateFormData('adminPassword', e.target.value)}
                                error={errors.adminPassword}
                                leftIcon={<Lock className="w-4 h-4" />}
                            />
                        </motion.div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-lg font-semibold text-text mb-4">Review & Confirm</h2>

                            <div className="space-y-6">
                                {/* Institution Details */}
                                <div className="p-4 rounded-lg bg-surface-hover">
                                    <h3 className="text-sm font-medium text-text-secondary mb-3">Institution</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Name</span>
                                            <span className="text-text font-medium">{formData.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">URL</span>
                                            <span className="text-text">{formData.subdomain}.{MAIN_DOMAIN}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Contact</span>
                                            <span className="text-text">{formData.contactEmail}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Plan */}
                                <div className="p-4 rounded-lg bg-surface-hover">
                                    <h3 className="text-sm font-medium text-text-secondary mb-3">Plan</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-text font-medium">{selectedPlan?.label}</span>
                                        <Badge variant="info">Selected</Badge>
                                    </div>
                                </div>

                                {/* Admin */}
                                <div className="p-4 rounded-lg bg-surface-hover">
                                    <h3 className="text-sm font-medium text-text-secondary mb-3">Admin Account</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Name</span>
                                            <span className="text-text">{formData.adminName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Email</span>
                                            <span className="text-text">{formData.adminEmail}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {errors.name && (
                                <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                                    {errors.name}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => currentStep === 1 ? navigate('/institutions') : handleBack()}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                </Button>

                {currentStep < 4 ? (
                    <Button
                        onClick={handleNext}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                        Continue
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        leftIcon={!isLoading && <Check className="w-4 h-4" />}
                    >
                        Create Institution
                    </Button>
                )}
            </div>
        </div>
    );
};
