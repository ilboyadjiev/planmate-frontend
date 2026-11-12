import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This project keeps JSX in plain .js files (a legacy of Create React App), so esbuild is told to treat every
// src/*.js as JSX — both for dependency pre-bundling and for the build.
const jsxInJs = /src\/.*\.js$/;

export default defineConfig({
    plugins: [react()],
    server: { port: 3000 },
    // nginx (Dockerfile) serves /app/build, so keep CRA's output directory name.
    build: { outDir: 'build' },
    // Expose the existing REACT_APP_* build variables as well as Vite's own VITE_*, so the Docker build args,
    // CI secrets and .env stay exactly as they were.
    envPrefix: ['VITE_', 'REACT_APP_'],
    esbuild: { loader: 'jsx', include: jsxInJs, exclude: [] },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
        // Stylesheets are imported for the app, not the assertions; skip them so jsdom tests stay fast.
        css: false,
    },
});
