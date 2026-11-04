import type { Config } from 'tailwindcss';

/**
 * 设计令牌全部走 CSS 变量（定义在 globals.css），
 * 因此配色不需要 dark: 变体，主题切换只需换 :root / .dark 里的值。
 * 颜色用 rgb(var(--x) / <alpha-value>) 形式，保留 tailwind 的透明度语法（如 bg-up/20）。
 *
 * 动画统一由 globals.css 的 utilities 层提供，此处不再重复声明，
 * 避免同名 class 出现两套定义。
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        ink2: 'rgb(var(--c-ink-2) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        up: 'rgb(var(--c-up) / <alpha-value>)',
        degraded: 'rgb(var(--c-degraded) / <alpha-value>)',
        down: 'rgb(var(--c-down) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        signal: 'rgb(var(--c-signal) / <alpha-value>)',
      },
      /* 终端字体栈：拉丁字符与数字走等宽，中文回落到系统黑体。
         这正是参考场景在中文环境下的实际渲染方式。 */
      fontFamily: {
        sans: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'JetBrains Mono',
          'Cascadia Mono',
          'Menlo',
          'Consolas',
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'monospace',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'JetBrains Mono',
          'Cascadia Mono',
          'Menlo',
          'Consolas',
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'monospace',
        ],
      },
      /* 字号刻度：caption 11 / small 12 / body 13 / label 14 / title 28 / display 40 */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.05rem' }],
        xs: ['0.75rem', { lineHeight: '1.15rem' }],
        sm: ['0.8125rem', { lineHeight: '1.5rem' }],
        base: ['0.875rem', { lineHeight: '1.6rem' }],
        title: ['1.75rem', { lineHeight: '1.2' }],
        display: ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      /* 圆角刻意收小：面板是切角几何，控件是方角 */
      borderRadius: {
        none: '0',
        sm: '1px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        full: '9999px',
      },
      letterSpacing: {
        label: '0.14em',
      },
    },
  },
  plugins: [],
};

export default config;
