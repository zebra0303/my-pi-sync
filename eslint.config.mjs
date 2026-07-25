import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // config/ is a verbatim mirror of ~/.pi and ~/.omp, not repository source.
    // Linting vendored agent skills fails on their own runtime assumptions.
    ignores: ['node_modules/**', 'config/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
);
