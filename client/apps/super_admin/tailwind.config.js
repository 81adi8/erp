/** @type {import('tailwindcss').Config} */

import scrollbarHide from 'tailwind-scrollbar-hide'

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/common/src/**/*.{js,ts,jsx,tsx}",
        "../node_modules/@erp/common/src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Positioning & Padding utilities
        { pattern: /^(left|right|top|bottom|inset)-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|px|auto)$/ },
        { pattern: /^(pl|pr|pt|pb|px|py)-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20)$/ },
        
        // Modal Size & Height Safelist (Production Guard)
        { pattern: /^max-w-(sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|full)$/ },
        { pattern: /^sm:max-w-(sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|full)$/ },
        { pattern: /^max-h-\[.*\]$/ },
        { pattern: /^sm:max-h-\[.*\]$/ },
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--color-primary)',
                    light: 'var(--color-primary-light)',
                    dark: 'var(--color-primary-dark)',
                },

            },
        },
    },
    plugins: [
       scrollbarHide,
    ],
}
