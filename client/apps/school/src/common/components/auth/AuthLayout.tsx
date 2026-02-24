// Beautiful Auth Layout - Split design with image left, form right
import { type ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useTenant } from '../../../core/tenant';
import {ThemeSwitcher} from '@erp/common'
interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    imageAlt?: string;
}

// Beautiful gradient patterns for the left panel
const gradientPatterns = [
    'from-indigo-600 via-purple-600 to-pink-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-orange-500 via-red-500 to-pink-500',
    'from-blue-600 via-indigo-600 to-purple-600',
];

export function AuthLayout({
    children,
    title,
    subtitle,
    imageUrl,
    imageAlt = 'Authentication',
}: AuthLayoutProps) {
    const { tenant } = useTenant();
    
    // Use tenant-based gradient or random
    const gradientIndex = tenant?.name ? tenant.name.length % gradientPatterns.length : 0;
    const gradient = gradientPatterns[gradientIndex];

    return (
        <div className="min-h-screen flex bg-background">
            {/* Left Panel - Image/Branding */}
            <div className={`hidden lg:flex lg:w-1/2 relative bg-gradient-to-br ${gradient}`}>
                {/* Overlay Pattern */}
                <div className="absolute inset-0 bg-black/10" />
                
                {/* Decorative Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-2xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <span className="text-xl font-bold">
                                {tenant?.name?.[0] || 'E'}
                            </span>
                        </div>
                        <span className="text-xl font-bold">
                            {tenant?.name || 'EduManage'}
                        </span>
                    </div>

                    {/* Center Content */}
                    <div className="space-y-6">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={imageAlt}
                                className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
                            />
                        ) : (
                            <div className="max-w-md">
                                <h2 className="text-4xl font-bold mb-4">
                                    Manage Your Institution Effortlessly
                                </h2>
                                <p className="text-lg text-white/80">
                                    A modern platform for managing students, teachers, attendance, 
                                    fees, and everything your institution needs.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Features List */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                                ✓
                            </div>
                            <span>Student Management</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                                ✓
                            </div>
                            <span>Attendance Tracking</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                                ✓
                            </div>
                            <span>Fee Management</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                                ✓
                            </div>
                            <span>Reports & Analytics</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar with Theme Toggle */}
                <div className="flex justify-end p-4">
                    {/* <ThemeToggle /> */}
                    <ThemeSwitcher/>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-md space-y-8">
                        {/* Mobile Logo (hidden on desktop) */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="inline-flex items-center gap-3">
                                <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white`}>
                                    <span className="text-xl font-bold">
                                        {tenant?.name?.[0] || 'E'}
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-foreground">
                                    {tenant?.name || 'EduManage'}
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center lg:text-left">
                            <h1 className="text-3xl font-bold text-foreground">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-2 text-muted-foreground">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {/* Form Content */}
                        {children}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} {tenant?.name || 'EduManage'}. All rights reserved.
                </div>
            </div>
        </div>
    );
}
