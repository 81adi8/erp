import React, { useState } from 'react';
import { useTheme } from '../themes';
import type { Theme } from '../themes';

interface ThemeSwitcherProps {
    /** Show only light themes */
    lightOnly?: boolean;
    /** Show only dark themes */
    darkOnly?: boolean;
    /** Custom class name */
    className?: string;
    /** Show theme preview colors */
    showPreview?: boolean;
    /** Compact mode (dropdown) vs expanded (grid) */
    variant?: 'dropdown' | 'grid';
}

/**
 * Theme Switcher Component
 * 
 * Ready-to-use component for switching between themes.
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
    lightOnly = false,
    darkOnly = false,
    className = '',
    showPreview = true,
    variant = 'dropdown',
}) => {
    const { theme, themeId, availableThemes, setTheme, toggleDarkMode, isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    // Filter themes based on props
    let filteredThemes = availableThemes;
    if (lightOnly) {
        filteredThemes = availableThemes.filter(t => !t.isDark);
    } else if (darkOnly) {
        filteredThemes = availableThemes.filter(t => t.isDark);
    }

    const handleSelect = (selectedTheme: Theme) => {
        setTheme(selectedTheme.id);
        setIsOpen(false);
    };

    if (variant === 'grid') {
        return (
            <div className={`theme-switcher-grid ${className}`}>
                <div className="theme-grid">
                    {filteredThemes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleSelect(t)}
                            className={`theme-card ${t.id === themeId ? 'active' : ''}`}
                            style={{
                                backgroundColor: t.colors.surface,
                                borderColor: t.id === themeId ? t.colors.primary : t.colors.border,
                            }}
                        >
                            {showPreview && (
                                <div className="theme-preview">
                                    <div
                                        className="preview-primary"
                                        style={{ backgroundColor: t.colors.primary }}
                                    />
                                    <div
                                        className="preview-secondary"
                                        style={{ backgroundColor: t.colors.secondary }}
                                    />
                                </div>
                            )}
                            <span
                                className="theme-name"
                                style={{ color: t.colors.text }}
                            >
                                {t.name}
                            </span>
                            {t.isDark && <span className="dark-badge">Dark</span>}
                        </button>
                    ))}
                </div>
                <style>{`
                    .theme-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                        gap: 0.75rem;
                    }
                    .theme-card {
                        padding: 0.75rem;
                        border-radius: var(--radius-lg);
                        border: 2px solid;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .theme-card:hover {
                        transform: translateY(-2px);
                    }
                    .theme-card.active {
                        border-width: 2px;
                    }
                    .theme-preview {
                        display: flex;
                        gap: 0.25rem;
                    }
                    .preview-primary, .preview-secondary {
                        width: 24px;
                        height: 24px;
                        border-radius: var(--radius-sm);
                    }
                    .theme-name {
                        font-size: var(--font-size-sm);
                        font-weight: var(--font-weight-medium);
                    }
                    .dark-badge {
                        font-size: 0.625rem;
                        background: rgba(0,0,0,0.2);
                        padding: 0.125rem 0.375rem;
                        border-radius: var(--radius-full);
                        color: inherit;
                        opacity: 0.7;
                    }
                `}</style>
            </div>
        );
    }

    // Dropdown variant
    return (
        <div className={`theme-switcher-dropdown ${className}`}>
            <button
                className="theme-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                }}
            >
                {showPreview && (
                    <div
                        className="current-theme-preview"
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                )}
                <span>{theme.name}</span>
                <svg
                    className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div
                        className="dropdown-menu"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                        }}
                    >
                        {/* Dark mode toggle */}
                        <button
                            className="dropdown-item toggle-dark"
                            onClick={toggleDarkMode}
                            style={{ color: theme.colors.text }}
                        >
                            <span>{isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
                        </button>

                        <div className="dropdown-divider" style={{ backgroundColor: theme.colors.border }} />

                        {filteredThemes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleSelect(t)}
                                className={`dropdown-item ${t.id === themeId ? 'active' : ''}`}
                                style={{
                                    color: theme.colors.text,
                                    backgroundColor: t.id === themeId ? theme.colors.surfaceHover : 'transparent',
                                }}
                            >
                                {showPreview && (
                                    <div
                                        className="item-preview"
                                        style={{ backgroundColor: t.colors.primary }}
                                    />
                                )}
                                <span>{t.name}</span>
                                {t.isDark && <span className="dark-indicator">●</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <style>{`
                .theme-switcher-dropdown {
                    position: relative;
                    display: inline-block;
                }
                .theme-dropdown-trigger {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-md);
                    border: 1px solid;
                    cursor: pointer;
                    font-size: var(--font-size-sm);
                    transition: all 0.2s ease;
                }
                .theme-dropdown-trigger:hover {
                    opacity: 0.9;
                }
                .current-theme-preview {
                    width: 16px;
                    height: 16px;
                    border-radius: var(--radius-sm);
                }
                .dropdown-arrow {
                    transition: transform 0.2s ease;
                }
                .dropdown-arrow.open {
                    transform: rotate(180deg);
                }
                .dropdown-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                }
                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    right: 0;
                    min-width: 180px;
                    border-radius: var(--radius-md);
                    border: 1px solid;
                    box-shadow: var(--shadow-lg);
                    z-index: 50;
                    overflow: hidden;
                }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.625rem 1rem;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: var(--font-size-sm);
                    text-align: left;
                    transition: background 0.15s ease;
                }
                .dropdown-item:hover {
                    background: rgba(0,0,0,0.05);
                }
                .dropdown-item.active {
                    font-weight: var(--font-weight-medium);
                }
                .item-preview {
                    width: 12px;
                    height: 12px;
                    border-radius: var(--radius-sm);
                }
                .dropdown-divider {
                    height: 1px;
                    margin: 0.25rem 0;
                }
                .dark-indicator {
                    margin-left: auto;
                    opacity: 0.5;
                }
                .toggle-dark {
                    font-weight: var(--font-weight-medium);
                }
            `}</style>
        </div>
    );
};

export default ThemeSwitcher;
