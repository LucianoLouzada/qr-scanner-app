// eslint.config.ts

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint'; // Importa o plugin do TS
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // 1. Ignora o diretório de build
  globalIgnores(['dist']),

  // 2. Configurações gerais para arquivos JS/JSX (mantidas do seu original)
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Regras existentes
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // 3. Configurações específicas para arquivos TS/TSX
  ...tseslint.configs.recommendedTypeChecked, // Aplica regras recomendadas de tipagem
  ...tseslint.configs.stylisticTypeChecked, // Aplica regras de estilo
  {
    files: ['**/*.{ts,tsx}'],
    // O parser do TypeScript
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
            project: './tsconfig.json', // Necessário para linting baseado em tipagem
            tsconfigRootDir: import.meta.dirname,
            sourceType: 'module',
            ecmaFeatures: {
                jsx: true,
            },
        },
        globals: globals.browser,
    },
    // Adiciona as regras do React Hooks e Refresh para arquivos TSX
    extends: [
        reactHooks.configs['recommended-latest'],
        reactRefresh.configs.vite,
    ],
    rules: {
        // Regras adicionais ou sobrescritas para TypeScript
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
        // Sobrescreve a regra JS original para evitar conflito
        'no-unused-vars': 'off', 
    }
  },
]);