import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf7f1',
        parchment: '#f3ecdf',
        ink: '#20212C',
        inkSoft: '#6B7280',
        gold: '#b08d4f',
        goldLight: '#d4b97f',
        goldDeep: '#8a6d38',
        sage: '#7a8b6f',
        rust: '#a4583c',
        line: '#E6E9F2',
        // ---- Cruz Family Archive design system ----
        primary: '#5B4BDB',
        primaryHover: '#4938C7',
        appBg: '#F6F8FC',
        subtext: '#6B7280',
        accentTeal: '#00B8A9',
        accentMint: '#D9F7F2',
        accentCoral: '#FF7A59',
        accentCoralSoft: '#FFE5DE',
        accentBlue: '#4D9FFF',
        accentBlueSoft: '#E5F1FF',
        accentGreen: '#35B779',
        accentGreenSoft: '#E3F8EE',
        accentGold: '#F6C85F',
        accentGoldSoft: '#FFF4D6',
        accentPurpleSoft: '#EFEBFF',
        // Sidebar / heritage palette
        navy: '#17182F',
        navyDeep: '#111426',
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
        // Heritage headings keep a refined serif; UI text stays modern and readable.
        // Inter is used when available locally, otherwise the platform UI font.
        display: ['Georgia', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', 'serif'],
        body: [
          'Inter',
          'Plus Jakarta Sans',
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 4px 20px rgba(20, 25, 50, 0.06)',
        lift: '0 8px 30px rgba(20, 25, 50, 0.12)',
        float: '0 18px 48px rgba(20, 25, 50, 0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;