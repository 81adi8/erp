import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { store } from './store';
import { RootLayout } from './layouts/RootLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingSpinner, FeedbackProvider } from '@erp/common';
import GlobalStyleWrapper from './components/GlobalStyleWrapper';

// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage').then(m => ({ default: m.InstitutionsPage })));
const InstitutionCreatePage = lazy(() => import('./pages/InstitutionCreatePage').then(m => ({ default: m.InstitutionCreatePage })));
const SubAdminsPage = lazy(() => import('./pages/SubAdminsPage').then(m => ({ default: m.SubAdminsPage })));
const PlansPage = lazy(() => import('./pages/PlansPage').then(m => ({ default: m.PlansPage })));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage').then(m => ({ default: m.PermissionsPage })));
const AccessBundlesPage = lazy(() => import('./pages/AccessBundlesPage').then(m => ({ default: m.AccessBundlesPage })));
const RoleTemplatesPage = lazy(() => import('./pages/RoleTemplatesPage').then(m => ({ default: m.RoleTemplatesPage })));
const GlobalHolidaysPage = lazy(() => import('./pages/GlobalHolidaysPage').then(m => ({ default: m.GlobalHolidaysPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const SuspenseLayout = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex-1 flex items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  }>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspenseLayout>
        <LoginPage />
      </SuspenseLayout>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseLayout>
            <DashboardPage />
          </SuspenseLayout>
        ),
      },
      {
        path: 'institutions',
        element: (
          <SuspenseLayout>
            <InstitutionsPage />
          </SuspenseLayout>
        ),
      },
      {
        path: 'institutions/new',
        element: (
          <SuspenseLayout>
            <InstitutionCreatePage />
          </SuspenseLayout>
        ),
      },
      {
        path: 'plans',
        element: (
          <ProtectedRoute requiredPermission="manage_plans">
            <SuspenseLayout>
              <PlansPage />
            </SuspenseLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-bundles',
        element: (
          <ProtectedRoute requiredPermission="manage_plans">
            <SuspenseLayout>
              <AccessBundlesPage />
            </SuspenseLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'role-templates',
        element: (
          <ProtectedRoute requiredPermission="manage_plans">
            <SuspenseLayout>
              <RoleTemplatesPage />
            </SuspenseLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'global-holidays',
        element: (
          <ProtectedRoute requiredPermission="manage_plans">
            <SuspenseLayout>
              <GlobalHolidaysPage />
            </SuspenseLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'permissions',
        element: (
          <ProtectedRoute requiredPermission="manage_permissions">
            <SuspenseLayout>
              <PermissionsPage />
            </SuspenseLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admins',
        element: (
          <SuspenseLayout>
            <SubAdminsPage />
          </SuspenseLayout>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseLayout>
            <SettingsPage />
          </SuspenseLayout>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export const App = () => {
  return (
    <Provider store={store}>
      <FeedbackProvider>
        <GlobalStyleWrapper>
          <RouterProvider router={router} />
        </GlobalStyleWrapper>
      </FeedbackProvider>
    </Provider>
  );
};