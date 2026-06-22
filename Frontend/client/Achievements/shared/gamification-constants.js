(function () {
  'use strict';

  // Keep in sync with packages/contracts/src/gamification.ts
  var REPUTATION_LEVEL_THRESHOLDS = [0, 250, 750, 1500, 3000, 6000, 10000, 15000];
  var REPUTATION_LEVEL_NAMES = [
    'Beginner',
    'Apprentice',
    'Practitioner',
    'Specialist',
    'Expert',
    'Master',
    'Grandmaster',
    'Legend',
  ];
  var REPUTATION_LEVEL_COLORS = [
    '#94a3b8',
    '#22c55e',
    '#38bdf8',
    '#a78bfa',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#eab308',
  ];

  function getLevelIndex(score) {
    for (var i = REPUTATION_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score >= REPUTATION_LEVEL_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  function getLevelProgress(score) {
    var idx = getLevelIndex(score);
    var nextIdx = idx + 1;
    var prevThreshold = REPUTATION_LEVEL_THRESHOLDS[idx] || 0;
    var nextThreshold =
      nextIdx < REPUTATION_LEVEL_THRESHOLDS.length
        ? REPUTATION_LEVEL_THRESHOLDS[nextIdx]
        : score;
    var progressToNext =
      nextThreshold > prevThreshold
        ? Math.round(((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
        : 100;
    return {
      levelIndex: idx,
      nextLevelIndex: nextIdx,
      prevThreshold: prevThreshold,
      nextThreshold: nextThreshold,
      progressToNext: Math.min(progressToNext, 100),
      currentName: REPUTATION_LEVEL_NAMES[idx] || 'Beginner',
      nextName:
        nextIdx < REPUTATION_LEVEL_NAMES.length
          ? REPUTATION_LEVEL_NAMES[nextIdx]
          : 'Max',
    };
  }

  function formatLevelRange(index) {
    var start = REPUTATION_LEVEL_THRESHOLDS[index] || 0;
    var end = REPUTATION_LEVEL_THRESHOLDS[index + 1];
    if (end == null) return start + '+ points';
    return start + ' - ' + end + ' points';
  }

  window.NibrasGamificationConstants = {
    REPUTATION_LEVEL_THRESHOLDS: REPUTATION_LEVEL_THRESHOLDS,
    REPUTATION_LEVEL_NAMES: REPUTATION_LEVEL_NAMES,
    REPUTATION_LEVEL_COLORS: REPUTATION_LEVEL_COLORS,
    getLevelIndex: getLevelIndex,
    getLevelProgress: getLevelProgress,
    formatLevelRange: formatLevelRange,
  };
})();
