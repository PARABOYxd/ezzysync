import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const reportPath = path.resolve('reports/index.html');
if (!fs.existsSync(reportPath)) {
  console.error('Report not found at:', reportPath);
  console.log('Run `npm run qa` first to generate reports.');
  process.exit(1);
}

console.log('Opening Visual QA Report in browser:', reportPath);

// Windows launch
exec(`start "" "${reportPath}"`);
