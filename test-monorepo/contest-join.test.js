'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { getJoinUrl } = require('../Frontend/client/Competitions/Contests/contest-join');

test('getJoinUrl builds Codeforces registration URL', () => {
  assert.equal(
    getJoinUrl({
      platform: 'codeforces',
      contestIdOnPlatform: '2237',
    }),
    'https://codeforces.com/contestRegistration/2237',
  );
});

test('getJoinUrl builds LeetCode contest URL', () => {
  assert.equal(
    getJoinUrl({
      platform: 'leetcode',
      platformContestId: 'weekly-contest-506',
    }),
    'https://leetcode.com/contest/weekly-contest-506',
  );
});

test('getJoinUrl builds AtCoder contest URL', () => {
  assert.equal(
    getJoinUrl({
      host: 'atcoder',
      contestIdOnPlatform: 'abc300',
    }),
    'https://atcoder.jp/contests/abc300',
  );
});

test('getJoinUrl falls back to contest.url for ctftime and codechef', () => {
  assert.equal(
    getJoinUrl({
      platform: 'ctftime',
      url: 'https://boroctf.com/',
    }),
    'https://boroctf.com/',
  );
  assert.equal(
    getJoinUrl({
      platform: 'codechef',
      url: 'https://www.codechef.com/DEVWEEKEND54',
    }),
    'https://www.codechef.com/DEVWEEKEND54',
  );
});

test('getJoinUrl prefers explicit joinUrl', () => {
  assert.equal(
    getJoinUrl({
      platform: 'codeforces',
      contestIdOnPlatform: '2237',
      joinUrl: 'https://example.com/register',
    }),
    'https://example.com/register',
  );
});

test('getJoinUrl returns empty when no URL sources exist', () => {
  assert.equal(getJoinUrl(null), '');
  assert.equal(getJoinUrl({}), '');
  assert.equal(getJoinUrl({ platform: 'ctftime' }), '');
});
