import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** 程式碼檢查：Next.js 建議的規則（含 React Hooks、效能）＋ TypeScript。排版交給 Prettier。 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.next-live/**', '.next-test/**', 'out/**', 'build/**', 'shots/**', 'next-env.d.ts']),
]);
