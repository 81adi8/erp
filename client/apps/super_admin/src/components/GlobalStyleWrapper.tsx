import React from 'react';
import { useGlobalStyle } from '../hooks/useGlobalStyle';

interface GlobalStyleWrapperProps {
    children: React.ReactNode;
}

/**
 * GlobalStyleWrapper
 * 
 * Component that initializes the global style synchronization 
 * between the common ThemeProvider and the local app state.
 */
const GlobalStyleWrapper: React.FC<GlobalStyleWrapperProps> = ({ children }) => {
    // This hook ensures theme preferences are applied to the DOM and synced with Redux
    useGlobalStyle();

    return <>{children}</>;
};

export default GlobalStyleWrapper;
