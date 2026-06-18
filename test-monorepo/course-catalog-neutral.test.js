'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBrowserModule(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  const context = {
    window: {},
    console,
    localStorage: {
      _data: {},
      getItem(key) {
        return this._data[key] ?? null;
      },
      setItem(key, value) {
        this._data[key] = String(value);
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window;
}

test('catalog fallback assignments are neutral (not_started, no scores)', () => {
  const win = loadBrowserModule('Frontend/client/Courses/courseData.js');
  const selected = win.NibrasCourses.getCourseById('cs106a-programming-methodology');
  assert.ok(selected?.assignments?.items?.length, 'expected assignment items');

  for (const item of selected.assignments.items) {
    assert.equal(item.status, 'not_started');
    assert.equal(item.score, null);
  }

  assert.equal(selected.grades.scale.length, 0);
  assert.ok(
    selected.grades.weights.every((w) => w.pct === '—'),
    'catalog weights should use neutral placeholders',
  );
  assert.equal(selected.overview.progress.avgScore, '—');
});

test('mapTrackingGradesToUi returns empty scale and weights without catalog defaults', () => {
  const win = loadBrowserModule('Frontend/client/Courses/course-mappers.js');
  const mapped = win.NibrasCourseMappers.mapTrackingGradesToUi(
    { assignments: [], projects: [] },
    { id: 'demo-course', grades: { scale: [], weights: [] } },
    'demo-course',
  );

  assert.equal(mapped.scale.length, 0);
  assert.equal(mapped.weights.length, 0);
});
