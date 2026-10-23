import { defineConfig, loadEnv } from 'vite';

// Toma `Sheet` y `APPS_SCRIPT_URL` del entorno (o de .env) y los inyecta
// como valores por defecto. Cada vendedor puede cambiarlos en Ajustes.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    base: './',
    define: {
      __SHEET_URL__: JSON.stringify(env.Sheet || env.SHEET_URL || ''),
      __APPS_SCRIPT_URL__: JSON.stringify(env.APPS_SCRIPT_URL || ''),
    },
  };
});
