/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#edeff2',
        card: '#121518',
        popover: '#1a1e23',
        primary: '#ff8a00',
        secondary: '#1a1e23',
        muted: '#161a1e',
        accent: '#1a1e23',
        destructive: '#ff3b30',
        border: '#394047',
        input: '#30373e',
        ring: '#ff8a00',
        verified: '#00b35d',
        mint: '#00ff87',
        pending: '#00e5ff',
        failure: '#a4161a',
        gold: '#ffd700',
      },
      fontFamily: {
        sans: ['Inter', 'system'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
