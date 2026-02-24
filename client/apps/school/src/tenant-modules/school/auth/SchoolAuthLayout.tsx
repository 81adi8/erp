// School-specific Auth Layout - Premium school branding
import { type ReactNode } from 'react';
import { useTenant } from '../../../core/tenant';
import { ThemeToggle } from '@/common/components/auth';

interface SchoolAuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
}

export function SchoolAuthLayout({ children, title, subtitle }: SchoolAuthLayoutProps) {
    const { tenant } = useTenant();

    return (
        <div className="min-h-screen flex bg-background">
            {/* Left Panel - School Image & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200')`,
                    }}
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/85 to-purple-900/80" />

                {/* Floating Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
                    <div className="absolute bottom-40 right-20 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/3 right-10 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🏫</span>
                        </div>
                        <div>
                            <span className="text-2xl font-bold block">
                                {tenant?.name || 'School ERP'}
                            </span>
                            <span className="text-sm text-white/70">Education Management System</span>
                        </div>
                    </div>

                    {/* Center Content */}
                    <div className="space-y-0">
                        <div className="max-w-lg">
                            <h2 className="text-5xl font-bold mb-6 leading-tight">
                                Empower Your <span className="text-yellow-400">Education</span> Journey
                            </h2>
                            <p className="text-xl text-white/80 leading-relaxed">
                                A complete solution for managing students, teachers, attendance,
                                fees, exams, and all aspects of your educational institution.
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <div className="text-3xl font-bold text-yellow-400">500+</div>
                                <div className="text-sm text-white/70">Schools</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <div className="text-3xl font-bold text-cyan-400">50K+</div>
                                <div className="text-sm text-white/70">Students</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <div className="text-3xl font-bold text-pink-400">99%</div>
                                <div className="text-sm text-white/70">Satisfaction</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Testimonial */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                        <p className="text-lg italic text-white/90 mb-4">
                            "This system has transformed how we manage our school.
                            Everything is so much easier now!"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full" />
                            <div>
                                <div className="font-semibold">Principal John Doe</div>
                                <div className="text-sm text-white/70">ABC International School</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/30">
                {/* Top Bar */}
                <div className="flex justify-between items-center p-6">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <span className="text-lg">🏫</span>
                        </div>
                        <span className="font-bold text-foreground">{tenant?.name || 'School ERP'}</span>
                    </div>
                    <div className="lg:ml-auto" />
                    <ThemeToggle />
                </div>

                {/* Form Content */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-md space-y-8">
                        {/* Title */}
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                            {subtitle && (
                                <p className="mt-3 text-muted-foreground">{subtitle}</p>
                            )}
                        </div>

                        {/* Form Content */}
                        <div className="bg-card rounded-2xl shadow-xl border p-8">
                            {children}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} {tenant?.name || 'School ERP'}. All rights reserved.</p>
                    <div className="flex justify-center gap-4 mt-2">
                        <a href="#" className="hover:text-primary">Terms</a>
                        <a href="#" className="hover:text-primary">Privacy</a>
                        <a href="#" className="hover:text-primary">Support</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
