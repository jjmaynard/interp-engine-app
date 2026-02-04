import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Earth Tones
        earth: {
          50: 'var(--color-earth-50)',
          100: 'var(--color-earth-100)',
          200: 'var(--color-earth-200)',
          300: 'var(--color-earth-300)',
          400: 'var(--color-earth-400)',
          500: 'var(--color-earth-500)',
          600: 'var(--color-earth-600)',
          700: 'var(--color-earth-700)',
          800: 'var(--color-earth-800)',
          900: 'var(--color-earth-900)',
        },
        // Ocean Blue
        ocean: {
          50: 'var(--color-ocean-50)',
          100: 'var(--color-ocean-100)',
          200: 'var(--color-ocean-200)',
          300: 'var(--color-ocean-300)',
          400: 'var(--color-ocean-400)',
          500: 'var(--color-ocean-500)',
          600: 'var(--color-ocean-600)',
          700: 'var(--color-ocean-700)',
          800: 'var(--color-ocean-800)',
          900: 'var(--color-ocean-900)',
        },
        // Sky Blue
        sky: {
          50: 'var(--color-sky-50)',
          100: 'var(--color-sky-100)',
          200: 'var(--color-sky-200)',
          300: 'var(--color-sky-300)',
          400: 'var(--color-sky-400)',
          500: 'var(--color-sky-500)',
          600: 'var(--color-sky-600)',
          700: 'var(--color-sky-700)',
          800: 'var(--color-sky-800)',
          900: 'var(--color-sky-900)',
        },
        // Forest Green
        forest: {
          50: 'var(--color-forest-50)',
          100: 'var(--color-forest-100)',
          200: 'var(--color-forest-200)',
          300: 'var(--color-forest-300)',
          400: 'var(--color-forest-400)',
          500: 'var(--color-forest-500)',
          600: 'var(--color-forest-600)',
          700: 'var(--color-forest-700)',
          800: 'var(--color-forest-800)',
          900: 'var(--color-forest-900)',
        },
        // Moss Green
        moss: {
          50: 'var(--color-moss-50)',
          100: 'var(--color-moss-100)',
          200: 'var(--color-moss-200)',
          300: 'var(--color-moss-300)',
          400: 'var(--color-moss-400)',
          500: 'var(--color-moss-500)',
          600: 'var(--color-moss-600)',
          700: 'var(--color-moss-700)',
          800: 'var(--color-moss-800)',
          900: 'var(--color-moss-900)',
        },
        // Sunset Orange
        sunset: {
          50: 'var(--color-sunset-50)',
          100: 'var(--color-sunset-100)',
          200: 'var(--color-sunset-200)',
          300: 'var(--color-sunset-300)',
          400: 'var(--color-sunset-400)',
          500: 'var(--color-sunset-500)',
          600: 'var(--color-sunset-600)',
          700: 'var(--color-sunset-700)',
          800: 'var(--color-sunset-800)',
          900: 'var(--color-sunset-900)',
        },
        // Lavender Purple
        lavender: {
          50: 'var(--color-lavender-50)',
          100: 'var(--color-lavender-100)',
          200: 'var(--color-lavender-200)',
          300: 'var(--color-lavender-300)',
          400: 'var(--color-lavender-400)',
          500: 'var(--color-lavender-500)',
          600: 'var(--color-lavender-600)',
          700: 'var(--color-lavender-700)',
          800: 'var(--color-lavender-800)',
          900: 'var(--color-lavender-900)',
        },
        // Sage Green
        sage: {
          50: 'var(--color-sage-50)',
          100: 'var(--color-sage-100)',
          200: 'var(--color-sage-200)',
          300: 'var(--color-sage-300)',
          400: 'var(--color-sage-400)',
          500: 'var(--color-sage-500)',
          600: 'var(--color-sage-600)',
          700: 'var(--color-sage-700)',
          800: 'var(--color-sage-800)',
          900: 'var(--color-sage-900)',
        },
        // Slate Gray
        slate: {
          50: 'var(--color-slate-50)',
          100: 'var(--color-slate-100)',
          200: 'var(--color-slate-200)',
          300: 'var(--color-slate-300)',
          400: 'var(--color-slate-400)',
          500: 'var(--color-slate-500)',
          600: 'var(--color-slate-600)',
          700: 'var(--color-slate-700)',
          800: 'var(--color-slate-800)',
          900: 'var(--color-slate-900)',
        },
        // Charcoal
        charcoal: {
          50: 'var(--color-charcoal-50)',
          100: 'var(--color-charcoal-100)',
          200: 'var(--color-charcoal-200)',
          300: 'var(--color-charcoal-300)',
          400: 'var(--color-charcoal-400)',
          500: 'var(--color-charcoal-500)',
          600: 'var(--color-charcoal-600)',
          700: 'var(--color-charcoal-700)',
          800: 'var(--color-charcoal-800)',
          900: 'var(--color-charcoal-900)',
        },
        // Cream
        cream: {
          50: 'var(--color-cream-50)',
          100: 'var(--color-cream-100)',
          200: 'var(--color-cream-200)',
          300: 'var(--color-cream-300)',
          400: 'var(--color-cream-400)',
          500: 'var(--color-cream-500)',
          600: 'var(--color-cream-600)',
          700: 'var(--color-cream-700)',
          800: 'var(--color-cream-800)',
          900: 'var(--color-cream-900)',
        },
        // Clay Red
        clay: {
          50: 'var(--color-clay-50)',
          100: 'var(--color-clay-100)',
          200: 'var(--color-clay-200)',
          300: 'var(--color-clay-300)',
          400: 'var(--color-clay-400)',
          500: 'var(--color-clay-500)',
          600: 'var(--color-clay-600)',
          700: 'var(--color-clay-700)',
          800: 'var(--color-clay-800)',
          900: 'var(--color-clay-900)',
        },
        // Amber
        amber: {
          50: 'var(--color-amber-50)',
          100: 'var(--color-amber-100)',
          200: 'var(--color-amber-200)',
          300: 'var(--color-amber-300)',
          400: 'var(--color-amber-400)',
          500: 'var(--color-amber-500)',
          600: 'var(--color-amber-600)',
          700: 'var(--color-amber-700)',
          800: 'var(--color-amber-800)',
          900: 'var(--color-amber-900)',
        },
        // Semantic colors
        conservation: 'var(--color-conservation)',
        'soil-health': 'var(--color-soil-health)',
        environmental: 'var(--color-environmental)',
        assessment: 'var(--color-assessment)',
        mapping: 'var(--color-mapping)',
      },
      fontSize: {
        base: ['18px', '24px'],
      },
      fontFamily: {
        sans: ['var(--font-catamaran)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
