/**
 * Fees Module - Main Router
 * Handles all fee-related routes with RBAC protection
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@erp/common';

// Lazy load fee pages
const FeesDashboardPage = lazy(() => import('../../../../pages/fees/FeesDashboardPage'));
const FeeCategoriesPage = lazy(() => import('../../../../pages/fees/FeeCategoriesPage'));
const AssignFeesPage = lazy(() => import('../../../../pages/fees/AssignFeesPage'));
const CollectPaymentPage = lazy(() => import('../../../../pages/fees/CollectPaymentPage'));
const DueListPage = lazy(() => import('../../../../pages/fees/DueListPage'));

function FeesLoading() {
    return (
        <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
        </div>
    );
}

export default function FeesPage() {
    return (
        <Suspense fallback={<FeesLoading />}>
            <Routes>
                {/* Default redirect to dashboard */}
                <Route index element={<Navigate to="dashboard" replace />} />
                
                {/* Fee Dashboard */}
                <Route path="dashboard" element={<FeesDashboardPage />} />
                
                {/* Fee Categories */}
                <Route path="categories" element={<FeeCategoriesPage />} />
                
                {/* Assign Fees */}
                <Route path="assign" element={<AssignFeesPage />} />
                
                {/* Collect Payment */}
                <Route path="collect" element={<CollectPaymentPage />} />
                
                {/* Due List */}
                <Route path="dues" element={<DueListPage />} />
                
                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}