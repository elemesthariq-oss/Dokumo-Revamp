import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './composables/**/*.{js,ts}',
    './stores/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f8fafc',
        surface: '#ffffff',
        surface2: '#fafbff',
        border: '#eceef4',
        borderStrong: '#e2e6ef',
        ink: '#0f172a',
        ink2: '#475569',
        ink3: '#8a93a6',
        brand: '#6d5efc',
        brandStrong: '#5b4ce0',
        brandTint: '#f1efff',
        brandTint2: '#e9e6ff',
        action: '#3b82f6',
        danger: '#ef4444',
        success: '#047857',
        cat: {
          admin: '#2563eb',
          adminBg: '#eff5ff',
          legal: '#b45309',
          legalBg: '#fff7ed',
          payroll: '#047857',
          payrollBg: '#ecfdf5',
          training: '#7c3aed',
          trainingBg: '#f5f1ff',
          finance: '#0891b2',
          financeBg: '#ecfeff',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        ctl: '12px',
        btn: '10px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(16,24,40,.05)',
        cta: '0 6px 16px rgba(99,82,255,.26)',
        modal: '0 24px 60px rgba(20,18,56,.40)',
      },
    },
  },
}
