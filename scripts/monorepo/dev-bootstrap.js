#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
const dockerComposeArgs = ['compose'];

function fail(message) {
  console.error(`[dev-bootstrap] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[dev-bootstrap] ${message}`);
}

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    fail(`${label} failed: ${result.error.message}`);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    fail(`${label} exited with code ${result.status}.`);
  }
}

function parseDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\//, '');
    if (!database) {
      fail('DATABASE_URL is missing a database name.');
    }
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username || 'nibras'),
      password: decodeURIComponent(parsed.password || ''),
      database,
    };
  } catch (error) {
    fail(`DATABASE_URL is invalid: ${error.message}`);
  }
}

function waitForPostgres(config) {
  const deadline = Date.now() + 60_000;
  const pgReadyArgs = [
    '-h',
    config.host,
    '-p',
    config.port,
    '-U',
    config.user,
    '-d',
    config.database,
  ];

  while (Date.now() < deadline) {
    const result = spawnSync('pg_isready', pgReadyArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || config.password,
      },
    });

    if (result.status === 0) {
      return;
    }

    if (result.error) {
      fail(`Postgres readiness check failed: ${result.error.message}`);
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  }

  fail('Timed out waiting for Postgres to become ready.');
}

function isValidEncryptionKey(value) {
  const raw = value?.trim();
  if (!raw) return false;
  try {
    return Buffer.from(raw, 'hex').length === 32;
  } catch {
    return false;
  }
}

function persistEncryptionKey(key) {
  const line = `NIBRAS_ENCRYPTION_KEY=${key}`;
  let contents = fs.readFileSync(envPath, 'utf8');
  if (/^NIBRAS_ENCRYPTION_KEY=.*$/m.test(contents)) {
    contents = contents.replace(/^NIBRAS_ENCRYPTION_KEY=.*$/m, line);
  } else {
    contents = contents.endsWith('\n')
      ? `${contents}${line}\n`
      : `${contents}\n${line}\n`;
  }
  fs.writeFileSync(envPath, contents, 'utf8');
}

function ensureEncryptionKey() {
  if (isValidEncryptionKey(process.env.NIBRAS_ENCRYPTION_KEY)) {
    return;
  }
  const key = crypto.randomBytes(32).toString('hex');
  persistEncryptionKey(key);
  process.env.NIBRAS_ENCRYPTION_KEY = key;
  log('Generated local NIBRAS_ENCRYPTION_KEY (persisted to .env).');
}

if (!fs.existsSync(envPath)) {
  fail('Missing .env. Copy .env.example first: cp .env.example .env');
}

dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  fail('Missing DATABASE_URL in .env.');
}

ensureEncryptionKey();

const databaseConfig = parseDatabaseUrl(process.env.DATABASE_URL);
const hostDevAppServices = ['nestjs-api', 'fastify-api', 'worker', 'gateway'];
const infraServices = ['postgres', 'mongodb', 'redis'];

function tryDocker(args, label) {
  const result = spawnSync('docker', args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.error) {
    log(`${label} failed: ${result.error.message}`);
    return false;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    log(`${label} exited with code ${result.status}.`);
    return false;
  }

  return true;
}

log(
  'Stopping Docker app services (dev:full runs NestJS, Fastify, worker, and gateway on the host).',
);
tryDocker(
  [...dockerComposeArgs, 'stop', ...hostDevAppServices],
  'docker compose stop app services',
);

log('Starting local infrastructure (postgres, mongodb, redis, tutor).');
const infraStarted = tryDocker(
  [...dockerComposeArgs, 'up', '-d', ...infraServices],
  'docker compose up infrastructure',
);
if (!infraStarted) {
  log(
    'Infrastructure compose failed; continuing because DATABASE_URL may already be backed by running services.',
  );
}

tryDocker(
  [...dockerComposeArgs, '--profile', 'tutor', 'up', '-d', 'tutor'],
  'docker compose up tutor',
);

log('Starting Judge0 IDE sandbox (optional).');
const judge0Started = tryDocker(
  ['compose', '-f', 'docker-compose.judge0.yml', 'up', '-d'],
  'docker compose up judge0',
);
if (!judge0Started) {
  log('Judge0 unavailable — in-browser IDE sandbox will be disabled.');
}

log('Waiting for Postgres readiness.');
waitForPostgres(databaseConfig);
log('Applying Prisma migrations.');
run('npx', ['prisma', 'migrate', 'deploy'], 'prisma migrate deploy');
log('Building workspace packages and services.');
run('npm', ['run', 'build:platform'], 'npm run build:platform');

log('');
log('Local infrastructure ready.');
log('  Gateway:  http://localhost:8080');
log('  Login:    http://localhost:8080/Login/loginPage/login.html');
log('  Tutor:    http://localhost:5000/api/health');
if (judge0Started) {
  log('  Judge0:   http://localhost:2358');
}
log('');
