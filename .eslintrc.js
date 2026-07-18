module.exports = {
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'prettier/prettier': 'error',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        curly: ['error', 'all'],
        'no-var': 'error',
        'prefer-const': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
    },
    overrides: [
        {
            files: ['public/**/*.js'],
            env: {
                browser: true,
                es2022: true,
            },
            parserOptions: {
                // Classic scripts loaded via <script> tags — they share one
                // global scope, so cross-file identifiers can't be resolved
                // per-file by ESLint.
                sourceType: 'script',
            },
            rules: {
                'no-undef': 'off',
                // Functions/vars here are consumed by other <script> files —
                // per-file "unused" analysis produces false positives.
                'no-unused-vars': 'off',
                // Shared globals (player, gameMode, timerInterval, …) are
                // reassigned from OTHER <script> files; per-file analysis
                // would wrongly convert them to const and break at runtime.
                'prefer-const': 'off',
            },
            globals: {
                io: 'readonly',
                document: 'readonly',
                window: 'readonly',
                localStorage: 'readonly',
                AudioContext: 'readonly',
                webkitAudioContext: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                addEventListener: 'readonly',
                removeEventListener: 'readonly',
                fetch: 'readonly',
                navigator: 'readonly',
                canvas: 'readonly',
                SVGElement: 'readonly',
            },
        },
    ],
};
