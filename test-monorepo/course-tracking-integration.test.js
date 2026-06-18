'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');
const {
  CourseGradesRollupSchema,
  CourseAssignmentSchema,
  TrackingCourseDetailSchema,
} = require('@nibras/contracts');

test('GET /v1/tracking/courses/:courseId/grades/me requires authentication', async (t) => {
  const app = buildApp();
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

  const prisma = getSharedPrisma();
  const store = new PrismaStore(prisma);
  const app = buildApp(store);

  const slug = `courses-tab-${Date.now()}`;
  let courseId;
  let sectionId;
  let videoId;
  let assignmentId;
  let instructorToken;
  let studentToken;

  async function ensureUser(id, username, email) {
    return prisma.user.upsert({
      where: { id },
      create: { id, username, email, emailVerified: true },
      update: {},
    });
  }

  try {
    await ensureUser(
      'user_instructor',
      'instructor_tab',
      'instructor-tab@test.dev',
    );
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

    const instructorSession = await store.createSessionForUser('user_instructor');
    const studentSession = await store.createSessionForUser('user_demo');
    instructorToken = instructorSession.accessToken;
    studentToken = studentSession.accessToken;

    const sectionRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections`,
      headers: { authorization: `Bearer ${instructorToken}` },
      payload: { title: 'Lecture 1', sortOrder: 0 },
    });
    assert.equal(sectionRes.statusCode, 200);
    sectionId = sectionRes.json().id;

    const videoRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections/${sectionId}/videos`,
      headers: { authorization: `Bearer ${instructorToken}` },
      payload: {
        title: 'Intro Video',
        provider: 'youtube',
        externalId: 'dQw4w9WgXcQ',
        sortOrder: 0,
      },
    });
    assert.equal(videoRes.statusCode, 200);
    videoId = videoRes.json().id;

    const assignRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/assignments`,
      headers: { authorization: `Bearer ${instructorToken}` },
      payload: {
        title: 'Tab Test Assignment',
        assignmentType: 'text',
        content: 'Write hello world.',
        pointsPossible: 10,
        published: true,
      },
    });
    assert.ok([200, 201].includes(assignRes.statusCode));
    assignmentId = assignRes.json().id;
    CourseAssignmentSchema.parse(assignRes.json());

    const listRes = await app.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/assignments`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    const listed = Array.isArray(listRes.json())
      ? listRes.json()
      : listRes.json().data || [];
    assert.ok(
      listed.some((item) => item.id === assignmentId),
      'assignment appears in student list',
    );

    const submitRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/assignments/${assignmentId}/submit`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { content: 'hello world response' },
    });
    assert.ok([200, 201].includes(submitRes.statusCode));

    const progressRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/videos/${videoId}/progress`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { watched: true, watchedProgress: 1 },
    });
    assert.equal(progressRes.statusCode, 200);

    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/detail`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    assert.equal(detailRes.statusCode, 200);
    const detail = TrackingCourseDetailSchema.parse(detailRes.json());
    assert.ok(
      Number(detail.videoProgressPercent) > 0,
      'detail reflects video progress',
    );

    const gradesRes = await app.inject({
      method: 'GET',
      url: `/v1/tracking/courses/${courseId}/grades/me`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    assert.equal(gradesRes.statusCode, 200);
    const rollup = CourseGradesRollupSchema.parse(gradesRes.json());
    assert.equal(rollup.courseId, courseId);
    assert.ok(
      rollup.assignments.some((a) => a.assignmentId === assignmentId),
      'grades rollup includes submitted assignment',
    );
  } finally {
    await app.close();
    if (courseId) {
      await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    }
  }
});
