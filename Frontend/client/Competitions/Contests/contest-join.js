(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ContestJoin = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getJoinUrl(contest) {
    if (!contest || typeof contest !== 'object') return '';
    var url = contest.joinUrl || '';
    var platformId =
      contest.contestIdOnPlatform || contest.platformContestId || '';
    if (!url && platformId) {
      var platform = String(contest.platform || contest.host || '').toLowerCase();
      if (platform === 'codeforces') {
        url =
          'https://codeforces.com/contestRegistration/' +
          encodeURIComponent(String(platformId));
      } else if (platform === 'leetcode') {
        url =
          'https://leetcode.com/contest/' + encodeURIComponent(String(platformId));
      } else if (platform === 'atcoder') {
        url =
          'https://atcoder.jp/contests/' + encodeURIComponent(String(platformId));
      }
    }
    if (!url && contest.url) {
      url = String(contest.url).trim();
    }
    return url || '';
  }

  return { getJoinUrl };
});
