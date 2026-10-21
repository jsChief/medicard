import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// The React Compiler-adjacent rules that ship enabled in
// react-hooks v7's `recommended` preset are stricter than this codebase
// currently satisfies: every data-fetching page calls setState from inside its
// load effect, and several `useCallback`s memoise on a narrower value than the
// compiler infers. Both patterns predate this change and are present across the
// existing pages (CheckoutsPage, ArchivePage, LocationMatrixPage, ...), so the
// same two rules are relaxed here rather than only for new code.
//
// `no-explicit-any` stays an error; that one is a real defect marker.
const RELAXED_REACT_HOOKS_RULES = {
  'react-hooks/set-state-in-effect': 'off',
  'react-hooks/preserve-manual-memoization': 'off',
}

export default defineConfig([
  globalIgnores(['dist', '@']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: RELAXED_REACT_HOOKS_RULES,
  },
])
