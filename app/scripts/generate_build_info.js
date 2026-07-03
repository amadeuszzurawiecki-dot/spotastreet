import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');

function readGit(command, fallback = '') {
  try {
    return execSync(command, {
      cwd: appRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

const commitMessage =
  process.env.VERCEL_GIT_COMMIT_MESSAGE ||
  readGit('git log -1 --pretty=%s', 'local-dev');

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  readGit('git rev-parse HEAD', '');

const versionMatch = commitMessage.match(/\bv?\d+(?:\.\d+){1,3}(?:[-+][a-z0-9.-]+)?\b/i);

const buildInfo = {
  version: versionMatch?.[0] || commitMessage,
  commitMessage,
  commitSha,
  shortSha: commitSha ? commitSha.slice(0, 7) : '',
  branch: process.env.VERCEL_GIT_COMMIT_REF || readGit('git branch --show-current', ''),
  builtAt: new Date().toISOString(),
};

mkdirSync(join(appRoot, 'public'), { recursive: true });
writeFileSync(
  join(appRoot, 'public', 'build-info.json'),
  `${JSON.stringify(buildInfo, null, 2)}\n`
);

console.log(`Generated build-info.json: ${buildInfo.version}`);
