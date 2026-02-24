// Institute Layout
import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { LoadingFallback } from '../../../core/utils/moduleLoader';

export default function InstituteLayout() {
    return (
        <div className="institute-layout min-h-screen bg-background">
            <main className="flex-1">
                <Suspense fallback={<LoadingFallback message="Loading..." />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
}
