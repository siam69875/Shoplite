// Starts the API (port 4000) and the web client (port 5173) together. Ctrl+C stops both.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['api', '\x1b[32m', ['run', 'dev', '-w', 'server']],
  ['web', '\x1b[36m', ['run', 'dev', '-w', 'client']],
].map(([name, color, args]) => {
  const child = spawn(npm, args, { stdio: ['inherit', 'pipe', 'pipe'] });
  const prefix = (chunk) => chunk.toString().split('\n').filter(Boolean).map((l) => `${color}[${name}]\x1b[0m ${l}`).join('\n') + '\n';
  child.stdout.on('data', (c) => process.stdout.write(prefix(c)));
  child.stderr.on('data', (c) => process.stderr.write(prefix(c)));
  child.on('exit', (code) => { console.log(`[${name}] exited with code ${code}`); shutdown(); });
  return child;
});

function shutdown() {
  for (const p of procs) if (p.exitCode === null) p.kill('SIGTERM');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
