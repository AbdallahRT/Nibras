window.NibrasReact.run(function () {
  var navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.forEach(function (n) {
        n.classList.remove('active');
      });
      link.classList.add('active');
    });
  });

  var constants = window.NibrasGamificationConstants || {};
  var levelNames = constants.REPUTATION_LEVEL_NAMES || ['Beginner'];
  var levelColors = constants.REPUTATION_LEVEL_COLORS || ['#94a3b8'];
  var getLevelIndex = constants.getLevelIndex || function () {
    return 0;
  };
  var getLevelProgress = constants.getLevelProgress || function (score) {
    return {
      progressToNext: 0,
      nextThreshold: 0,
      nextName: 'Max',
      currentName: 'Beginner',
    };
  };
  var formatLevelRange = constants.formatLevelRange || function () {
    return '';
  };

  var bdContainer = document.getElementById('breakdown-container');
  var lvContainer = document.getElementById('levels-container');
  var posContainer = document.getElementById('rules-pos-container');
  var actContainer = document.getElementById('activity-container');

  var rulesPos = [
    { action: 'Solve a beginner problem', points: '+10' },
    { action: 'Solve a newbie problem', points: '+20' },
    { action: 'Solve an intermediate problem', points: '+35' },
    { action: 'Solve an advanced problem', points: '+50' },
    { action: 'Join a contest', points: '+15' },
    { action: 'Top 25% in contest', points: '+25' },
    { action: 'Top 10% in contest', points: '+50' },
    {
      action: 'Contest rating gain (per +10 Elo)',
      points: '+1',
      note: 'cap 30',
    },
    { action: 'Create a question', points: '+5' },
    { action: 'Create an answer', points: '+15' },
    { action: 'Have answer accepted', points: '+25' },
    { action: 'Receive question upvote', points: '+2', note: '20 pts/day max' },
    { action: 'Receive answer upvote', points: '+3', note: '30 pts/day max' },
    { action: 'Create a discussion thread', points: '+5' },
    { action: 'Earn a badge', points: '+15' },
  ];

  var BREAKDOWN_CATEGORIES = [
    {
      key: 'course',
      label: 'Academic Performance',
      color: 'blue',
      icon: 'fa-solid fa-book',
    },
    {
      key: 'community',
      label: 'Community Contribution',
      color: 'green',
      icon: 'fa-solid fa-users',
    },
    {
      key: 'problem',
      label: 'Challenge Solutions',
      color: 'purple',
      icon: 'fa-regular fa-lightbulb',
    },
    {
      key: 'contest',
      label: 'Competition Results',
      color: 'orange',
      icon: 'fa-solid fa-trophy',
    },
  ];

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function breakdownArrayToMap(breakdown) {
    var map = { course: 0, community: 0, problem: 0, contest: 0 };
    if (!Array.isArray(breakdown)) {
      if (breakdown && typeof breakdown === 'object') {
        map.course = breakdown.course || 0;
        map.community = breakdown.community || 0;
        map.problem = breakdown.problem || 0;
        map.contest = breakdown.contest || 0;
      }
      return map;
    }
    breakdown.forEach(function (item) {
      var key = item.category;
      if (key && Object.prototype.hasOwnProperty.call(map, key)) {
        map[key] = item.total || 0;
      }
    });
    return map;
  }

  function renderLevels(score) {
    if (!lvContainer) return;
    lvContainer.innerHTML = '';
    var activeIdx = getLevelIndex(score);

    levelNames.forEach(function (name, i) {
      var status = 'locked';
      if (i < activeIdx) status = 'passed';
      else if (i === activeIdx) status = 'active';
      var activeClass = status === 'active' ? 'active' : '';
      var liveBadge =
        status === 'active' ? '<span class="live-badge">LIVE</span>' : '';
      var dotColor = levelColors[i] || '#94a3b8';

      lvContainer.innerHTML += [
        '<div class="lvl-card ' + activeClass + '">',
        '<div class="lvl-header">',
        '<div class="lvl-title"><div class="status-dot" style="background-color:' +
          dotColor +
          '"></div>' +
          escapeHtml(name) +
          ' ' +
          liveBadge +
          '</div>',
        '<span class="lvl-points">' + escapeHtml(formatLevelRange(i)) + '</span>',
        '</div>',
        '</div>',
      ].join('');
    });
  }

  function renderRules() {
    if (posContainer) {
      posContainer.innerHTML =
        '<p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.75rem;">Point values are approximate and may vary by activity.</p>';
      rulesPos.forEach(function (r) {
        var noteHtml = r.note
          ? ' <span style="color:var(--text-muted);font-size:0.7rem;">(' +
            r.note +
            ')</span>'
          : '';
        posContainer.innerHTML +=
          '<div class="rule-row"><span>' +
          r.action +
          noteHtml +
          '</span><span class="rule-pts pos">' +
          r.points +
          '</span></div>';
      });
    }
  }

  function renderActivity(activities) {
    if (!actContainer) return;

    if (!activities || activities.length === 0) {
      actContainer.innerHTML =
        '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">No recent activity. Start earning points!</p></div>';
      return;
    }

    actContainer.innerHTML = '';
    activities.forEach(function (act) {
      var desc = act.reason || act.description || act.activityType || 'Activity';
      if (act.detail) desc += ' — ' + act.detail;
      var pts = act.delta != null ? act.delta : act.points;
      var ptsHtml =
        pts != null
          ? '<span class="rule-pts ' +
            (pts > 0 ? 'pos' : 'neg') +
            '">' +
            (pts > 0 ? '+' : '') +
            pts +
            '</span>'
          : '';
      var timeHtml = '';
      if (act.createdAt) {
        var d = new Date(act.createdAt);
        var now = new Date();
        var diff = now - d;
        var mins = Math.floor(diff / 60000);
        var hours = Math.floor(diff / 3600000);
        var days = Math.floor(diff / 86400000);
        if (mins < 1) timeHtml = 'Just now';
        else if (mins < 60) timeHtml = mins + 'm ago';
        else if (hours < 24) timeHtml = hours + 'h ago';
        else if (days < 7) timeHtml = days + 'd ago';
        else timeHtml = d.toLocaleDateString();
      }

      actContainer.innerHTML +=
        '<div class="act-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border-color);">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<span style="font-size:0.9rem;">' +
        escapeHtml(desc) +
        '</span>' +
        (timeHtml
          ? '<span style="font-size:0.75rem;color:var(--text-muted);">' +
            timeHtml +
            '</span>'
          : '') +
        '</div>' +
        (ptsHtml || '') +
        '</div>';
    });
  }

  function renderBreakdown(breakdown) {
    if (!bdContainer) return;
    bdContainer.innerHTML = '';
    var map = breakdownArrayToMap(breakdown);

    BREAKDOWN_CATEGORIES.forEach(function (cat) {
      var score = map[cat.key] || 0;
      var max = Math.max(score * 2, 500);
      var pct = Math.min((score / max) * 100, 100);
      var colorVar = 'var(--bar-' + cat.color + ')';

      bdContainer.innerHTML += [
        '<div class="bd-item">',
        '<div class="bd-head">',
        '<span><i class="' +
          cat.icon +
          '" style="color:' +
          colorVar +
          '"></i> ' +
          cat.label +
          '</span>',
        '<span class="bd-val">' +
          score +
          ' <span class="bd-sub">/ ' +
          max +
          '</span></span>',
        '</div>',
        '<div class="bd-track"><div class="bd-fill" style="width:' +
          pct +
          '%;background-color:' +
          colorVar +
          '"></div></div>',
        '</div>',
      ].join('');
    });
  }

  function renderCurrentRepCard(data) {
    var total = data.total || 0;
    var progress = getLevelProgress(total);
    var currentRepCard = document.querySelector('.current-rep-card');
    if (!currentRepCard) return;

    var fill = currentRepCard.querySelector('.cr-fill');
    var info = currentRepCard.querySelector('.cr-info');
    var val = currentRepCard.querySelector('.cr-val');
    var status = currentRepCard.querySelector('.cr-status');

    if (fill) fill.style.width = progress.progressToNext + '%';
    if (val) val.textContent = total;
    if (status) {
      status.textContent = data.levelLabel || 'Progress to ' + progress.nextName;
    }
    if (info) {
      var rankText =
        data.rank != null
          ? 'Rank #' + data.rank + (data.percentile != null ? ' (top ' + data.percentile + '%)' : '')
          : '';
      var deltaText = [];
      if (data.weeklyDelta) deltaText.push('+' + data.weeklyDelta + ' this week');
      if (data.monthlyDelta) deltaText.push('+' + data.monthlyDelta + ' this month');
      info.innerHTML =
        '<strong>' +
        total +
        '</strong> / ' +
        progress.nextThreshold +
        ' points to ' +
        progress.nextName +
        (rankText ? '<br><span style="font-size:0.85rem;color:var(--text-muted);">' + escapeHtml(rankText) + '</span>' : '') +
        (deltaText.length
          ? '<br><span style="font-size:0.85rem;color:var(--text-muted);">' +
            escapeHtml(deltaText.join(' \u2022 ')) +
            '</span>'
          : '');
    }
  }

  var services = window.NibrasServices;
  if (!services || !services.reputationService) {
    renderLevels(0);
    renderRules();
    if (actContainer)
      actContainer.innerHTML =
        '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">Reputation service unavailable.</p></div>';
  } else {
    services.reputationService
      .getMyReputation({ sync: true })
      .then(function (data) {
        renderCurrentRepCard(data);
        renderBreakdown(data.breakdown);
        renderLevels(data.total || 0);
        renderRules();
        renderActivity(data.history || []);
      })
      .catch(function () {
        renderLevels(0);
        renderRules();
        if (actContainer)
          actContainer.innerHTML =
            '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">Could not load reputation data.</p></div>';
      });
  }

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  var appLogo = document.getElementById('app-logo');

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);

  var currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (themeIcon)
        themeIcon.className =
          next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      if (appLogo)
        appLogo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
    });
  }

  var segTabs = document.querySelectorAll('.seg-btn');
  segTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      segTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
    });
  });
});
