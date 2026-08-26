import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignore build artifacts
  {
    ignores: ['.next/**', 'node_modules/**'],
  },

  // Next.js recommended rules
  nextPlugin.configs['core-web-vitals'],

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // React hooks rules
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // TypeScript/React overrides
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  // Test files: allow unused vars (Playwright fixtures, error params)
  {
    files: ['tests/**/*.{ts,tsx}', 'playwright.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
