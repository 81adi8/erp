import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider, FeedbackProvider } from '@erp/common';
import { TenantProvider } from './core/tenant/TenantProvider';
import { FeatureFlagProvider } from './core/featureFlags';
import { PermissionProvider } from './core/rbac';
import { KeycloakAuthProvider } from './core/auth/KeycloakAuthContext';
import { AppRouter } from './core/router/AppRouter';
import { CookieConsentBanner, CookieSettingsButton } from './core/components';
import { GlobalStyleWrapper } from './GlobalStyleWrapper';
import './styles/index.css';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <FeedbackProvider>
          <TenantProvider>
            <GlobalStyleWrapper>
              <KeycloakAuthProvider>
                <FeatureFlagProvider>
                  <PermissionProvider>
                    <AppRouter />
                    {/* Cookie Consent Banner - GDPR Compliance */}
                    <CookieConsentBanner position="bottom" />
                    <CookieSettingsButton />
                  </PermissionProvider>
                </FeatureFlagProvider>
              </KeycloakAuthProvider>
            </GlobalStyleWrapper>
          </TenantProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
