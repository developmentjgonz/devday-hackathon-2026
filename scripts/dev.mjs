import { spawn } from 'node:child_process';

const spawnOptions = { stdio: 'inherit', detached: process.platform !== 'win32' };
const setup = spawn('npm', ['run', 'local:setup'], spawnOptions);
let children = [setup];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else if (child.pid) process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
setup.on('error', (error) => { console.error(error.message); stop(1); });
setup.on('exit', (code) => {
  if (stopping) return;
  if (code !== 0) return stop(code ?? 1);
  children = ['dev:api', 'dev:web'].map((script) => {
    const child = spawn('npm', ['run', script], spawnOptions);
    child.on('error', (error) => { console.error(error.message); stop(1); });
    child.on('exit', (exitCode) => stop(exitCode ?? 1));
    return child;
  });
});
