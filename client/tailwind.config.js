/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Dynamic voice agent card colors (amber for Maya)
    'hover:border-amber-500/50',
    'bg-amber-500/20',
    'border-amber-400/30',
    'text-amber-300',
    'group-hover:text-amber-300',
    'bg-amber-500/10',
    'text-amber-400',
    'border-amber-500/20',
    'from-amber-600/30',
    'to-orange-600/20',
    'border-amber-500/30',
    // Existing colors also used dynamically
    'hover:border-blue-500/50',
    'bg-blue-500/20',
    'border-blue-400/30',
    'text-blue-300',
    'group-hover:text-blue-300',
    'hover:border-purple-500/50',
    'bg-purple-500/20',
    'border-purple-400/30',
    'text-purple-300',
    'group-hover:text-purple-300',
    'hover:border-emerald-500/50',
    'bg-emerald-500/20',
    'border-emerald-400/30',
    'text-emerald-300',
    'group-hover:text-emerald-300',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040810',
          900: '#070e1c',
          850: '#0b1528',
          800: '#0f1d36',
          750: '#152644',
          700: '#1c3053',
          600: '#2a4470',
          500: '#3c5d94',
        },
        khaki: {
          300: '#d6cbba',
          400: '#c5b8a3',
          500: '#b7a990',
          600: '#9e9077',
          700: '#84815e',
          800: '#696748',
        },
        bone: {
          50: '#faf9f5',
          100: '#f3f1e8',
          200: '#e2e0cc',
          300: '#d2d0b8',
          400: '#bab89e',
        }
      },
      fontFamily: {
        serif: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
