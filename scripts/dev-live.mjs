// 開發伺服器直接連正式 Firebase 專案（lunch-stick），只聽本機 127.0.0.1:3000
import { spawn } from 'node:child_process';

const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '127.0.0.1'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_FIREBASE_MODE: 'live', NEXT_DIST_DIR: '.next-live' },
});
child.on('exit', (code) => process.exit(code ?? 0));
