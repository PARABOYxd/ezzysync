import fs from 'fs';
import path from 'path';

const dirs = ['reports/screenshots', 'reports/traces', 'reports'];

for (const d of dirs) {
  if (fs.existsSync(d)) {
    const files = fs.readdirSync(d);
    for (const f of files) {
      const fullPath = path.join(d, f);
      if (fs.lstatSync(fullPath).isFile()) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}
console.log('✅ Cleaned previous QA reports, screenshots, and traces.');
