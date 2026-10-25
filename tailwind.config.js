/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca'
                }
            },
            boxShadow: {
                glass: '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }
        }
    },
    plugins: []
};