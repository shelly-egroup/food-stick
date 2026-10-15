// 開發伺服器連雲端測試專案（food-stick-dev），只聽本機 127.0.0.1:3001
// 測試專案的設定放在 .env.test.local；先放進環境變數再啟動，Next 就不會再用 .env.local 的正式設定蓋掉
// （Groq 的 key 沒寫在 .env.test.local，會沿用 .env.local 的 GROQ_KEYS）
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const file = new URL('../.env.test.local', import.meta.url);
if (!existsSync(file)) {
  console.error('找不到 .env.test.local：照 .env.example 的說明，把測試專案的設定填進去');
  process.exit(1);
}
const test = parseEnv(readFileSync(file, 'utf8'));

const child = spawn('npx', ['next', 'dev', '-p', '3001', '-H', '127.0.0.1'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...test, NEXT_PUBLIC_FIREBASE_MODE: 'test', NEXT_DIST_DIR: '.next-test' },
});
child.on('exit', (code) => process.exit(code ?? 0));
