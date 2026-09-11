import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf7f1',
        parchment: '#f3ecdf',
        ink: '#2b241c',
        inkSoft: '#5c5244',
        gold: '#b08d4f',
        goldLight: '#d4b97f',
        goldDeep: '#8a6d38',
        sage: '#7a8b6f',
        rust: '#a4583c',
        line: '#e2e8f0',
        // Sidebar / heritage palette
        navy: '#17182F',
        navyLight: '#20264A',
        navyAccent: '#5B4BDB',
        heritageNavy: '#17182F',
        heritageDepth: '#20264A',
        heritageAccent: '#5B4BDB',
        heritageViolet: '#7C6FF2',
        heritageTeal: '#00B8A9',
        heritageGold: '#F6C85F',
        // Family tree canvas gradient (white -> lavender -> blue)
        canvasLavender: '#F8F8FF',
        canvasBlue: '#F1F4FF',
        // Stat card icon backgrounds
        blueSoft: '#eff6ff',
        greenSoft: '#f0fdf4',
        orangeSoft: '#fff7ed',
        purpleSoft: '#faf5ff',
        redSoft: '#fef2f2',
        // Photo viewer (dark "premium archive" surface)
        archiveDeep: '#0B0D12',
        archiveAccent: '#7C5CFC',
        archiveTeal: '#19C3B1',
        archiveGold: '#F6C85F',
        archiveMuted: '#A7A9B4',
        // Branch badge colors
        branchBlue: '#3b82f6',
        branchGreen: '#22c55e',
        branchPurple: '#a855f7',
        branchOrange: '#f97316',
      },
      fontFamily: {
        display: ['Georgia', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', 'serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(43,36,28,0.06), 0 4px 16px rgba(43,36,28,0.08)',
        lift: '0 4px 12px rgba(43,36,28,0.12), 0 12px 32px rgba(43,36,28,0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;