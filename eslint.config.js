import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
    rules: {
      // Lot 6.6 : règle React 19 v5+ détecte cascading renders
      // (performance suboptimale, pas bug fonctionnel). 68
      // occurrences sur Dialog/Combobox/Drawer idiomatiques React 18.
      // Refactor tracé pour Lot 7+ :
      //  - Pattern 1 : hydratation setState(props.X) ~30 cas
      //    -> key parent + useState(() => init)
      //  - Pattern 2 : fetch + loading dans useEffect ~35 cas
      //    -> Suspense + use() ou react-query (data-layer)
      // exhaustive-deps reste actif (vrais bugs deps React).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
