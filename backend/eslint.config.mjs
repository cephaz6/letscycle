// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';

// Keep in sync with src/services/* (backend-prd.md "Modules").
const modules = [
  'auth',
  'users',
  'listings',
  'wishlists',
  'matching',
  'messaging',
  'transactions',
  'trust',
  'safety',
  'notifications',
  'system',
  'ops',
  'external',
];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Module boundary rule: nothing may import a module's internals — only its
    // index.ts public interface (see backend-prd.md). import-x resolves each
    // specifier to a real file, so relative paths can't slip through.
    files: ['src/**/*.ts'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: modules.map((mod) => ({
            target: [
              './src/api',
              './src/workers',
              './src/shared',
              './src/server.ts',
              ...modules.filter((m) => m !== mod).map((m) => `./src/services/${m}`),
            ],
            from: `./src/services/${mod}`,
            except: ['index.ts'],
            message: `Import the ${mod} module only through its index.ts public interface.`,
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
