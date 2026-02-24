import { useGlobalStyle } from './core/hooks/useGlobalStyle';

export function GlobalStyleWrapper({ children }: { children: React.ReactNode }) {
    useGlobalStyle();
    return <>{children}</>;
}
