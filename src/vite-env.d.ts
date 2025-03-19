/// <reference types="vite/client" />

/**
 * Type declarations for environment variables
 */
interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'development' | 'production' | 'test';
  readonly VITE_APP_DEBUG: string;
  readonly VITE_APP_API_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
