// railway-build.js
import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function copyPublic() {
  try {
    await cp(join(__dirname, 'public'), join(__dirname, 'dist/public'), { recursive: true, force: true });
    console.log('[Railway] Copied public → dist/public');
  } catch (err) {
    console.error('[Railway] Copy failed:', err);
    process.exit(1);
  }
}

await copyPublic();
