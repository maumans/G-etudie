import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, lazyPlugins } from 'vite-plus';

// Polices : importées depuis Fontsource dans app.css, pas par l'option `fonts`
// du plugin, qui déclare chaque graisse deux fois (WOFF2 puis WOFF) : la
// dernière déclaration l'emporte et le navigateur télécharge le WOFF, plus
// lourd (DESIGN.md § 13).
export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    // Dépendances importées seulement par des pages chargées à la demande :
    // les pré-optimiser évite que Vite les découvre en pleine navigation et
    // recharge l'onglet (CLAUDE.md § 4).
    optimizeDeps: {
        // Dépendances des seules pages chargées à la demande : sans elles, Vite
        // les découvre à la première visite et recharge l'onglet (CLAUDE.md § 4).
        include: [
            'katex',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extensions',
            '@tiptap/pm/state',
            '@tiptap/pm/view',
            '@tiptap/pm/model',
        ],
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/js/**/*.test.{ts,tsx}'],
    },
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            // Documents du projet et réglages des agents : rédigés à la main,
            // jamais reformatés (tableaux, retours à la ligne voulus).
            '*.md',
            '.claude/**',
            '.mcp.json',
            'boost.json',
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/app.css',
        },
    },
});
