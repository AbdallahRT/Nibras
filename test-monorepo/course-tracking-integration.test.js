'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');
const {
  CourseGradesRollupSchema,
  CourseAssignmentSchema,
  TrackingCourseDetailSchema,
} = require('@nibras/contracts');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-courses-tab-'));
  return path.join(dir, 'store.json');
}

function buildTestApp(storePath, options = {}) {
  const store = new FileStore(storePath);
  const data = store.read('http://127.0.0.1');
  data.sessions.push({
    accessToken: options.token || 'student-token',
    refreshToken: 'refresh',
    userId: options.userId || 'user_demo',
    createdAt: new Date().toISOString(),
  });
  const user = data.users.find((u) => u.id === (options.userId || 'user_demo'));
  if (user && options.systemRole) user.systemRole = options.systemRole;
  store.write(data);
  return buildApp(new FileStore(storePath));
}

test('GET /v1/tracking/courses/:courseId/grades/me requires authentication', async (t) => {
  const app = buildApp(new FileStore(makeStorePath()));
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tracking/courses/course_cs161/grades/me',
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('Grades routes require DATABASE_URL');
      return;
    }
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('course detail progress and grades rollup with Prisma', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  t.after(async () => prisma.$disconnect());

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Database unavailable');
    return;
  }

  const storePath = makeStorePath();
  const instructorApp = buildTestApp(storePath, {
    userId: 'user_instructor',
    token: 'instructor-token',
    systemRole: 'admin',
  });
  const studentApp = buildTestApp(storePath, {
    userId: 'user_demo',
    token: 'student-token',
  });

  const slug = `courses-tab-${Date.now()}`;
  let courseId;
  let sectionId;
  let videoId;
  let assignmentId;

  async function ensureUser(id, username, email) {
    await prisma.user.upsert({
      where: { id },
      create: { id, username, email, emailVerified: true },
      update: {},
    });
  }

  try {
    await ensureUser('user_instructor', 'instructor_tab', 'instructor-tab@test.dev');
    await ensureUser('user_demo', 'demo_tab', 'demo-tab@test.dev');

    const course = await prisma.course.create({
      data: {
        slug,
        title: 'Courses Tab Integration',
        termLabel: 'Test',
        courseCode: 'TAB101',
        memberships: {
          create: [
            { userId: 'user_instructor', role: 'instructor' },
            { userId: 'user_demo', role: 'student' },
          ],
        },
      },
    });
    courseId = course.id;

    const sectionRes = await instructorApp.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: { title: 'Lecture 1', sortOrder: 0 },
    });
    assert.equal(sectionRes.statusCode, 200);
    sectionId = sectionRes.json().id;

    const videoRes = await instructorApp.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections/${sectionId}/videos`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: {
        title: 'Intro Video',
        provider: 'youtube',
        externalId: 'dQw4w9WgXcQ',
        sortOrder: 0,
      },
    });
    assert.equal(videoRes.statusCode, 200);
    videoId = videoRes.json().id;

    const assignRes = await instructorApp.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/assignments`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: {
        title: 'Tab Test Assignment',
        assignmentType: 'text',
        content: 'Write hello world.',
        pointsPossible: 10,
        published: true,
      },
    });
    assert.equal(assignRes.statusCode, 200);
    assignmentId = assignRes.json().id;
    CourseAssignmentSchema.parse(assignRes.json());

    const listRes = await studentApp.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/assignments`,
      headers: { authorization: 'Bearer student-token' },
    });
    assert.equal(listRes.statusCode, 200);
    const listed = Array.isArray(listRes.json())
      ? listRes.json()
      : listRes.json().data || [];
    assert.ok(
      listed.some((item) => item.id === assignmentId),
      'assignment appears in student list',
    );

    const submitRes = await studentApp.inject({
      method: 'POST',
      url: `/v1/tracking/assignments/${assignmentId}/submit`,
      headers: { authorization: 'Bearer student-token' },
      payload: { content: 'hello world response' },
    });
    assert.equal(submitRes.statusCode, 200);

    const progressRes = await studentApp.inject({
      method: 'POST',
      url: `/v1/tracking/videos/${videoId}/progress`,
      headers: { authorization: 'Bearer student-token' },
      payload: { watched: true, watchedProgress: 1 },
    });
    assert.equal(progressRes.statusCode, 200);

    const detailRes = await studentApp.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/detail`,
      headers: { authorization: 'Bearer student-token' },
    });
    assert.equal(detailRes.statusCode, 200);
    const detail = TrackingCourseDetailSchema.parse(detailRes.json());
    assert.ok(
      Number(detail.videoProgressPercent) > 0,
      'detail reflects video progress',
    );

    const gradesRes = await studentApp.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/grades/me`,
      headers: { authorization: 'Bearer student-token' },
    });
    assert.equal(gradesRes.statusCode, 200);
    const rollup = CourseGradesRollupSchema.parse(gradesRes.json());
    assert.equal(rollup.courseId, courseId);
    assert.ok(
      rollup.assignments.some((a) => a.assignmentId === assignmentId),
      'grades rollup includes submitted assignment',
    );
  } finally {
    await instructorApp.close();
    await studentApp.close();
    if (courseId) {
      await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    }
  }
});
