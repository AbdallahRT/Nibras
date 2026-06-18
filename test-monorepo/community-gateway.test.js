'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');

test('community questions list route responds', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/community/questions?page=1&limit=5',
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.ok(Array.isArray(body.questions) || Array.isArray(body));
  } finally {
    await app.close();
  }
});

test('community reports route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/community/reports',
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});
