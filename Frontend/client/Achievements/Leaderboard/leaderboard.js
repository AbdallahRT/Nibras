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

  var TYPE_LABELS = {
    overall: 'Overall',
    academic: 'Academic',
    competitive: 'Competitive',
    community: 'Community',
  };

  var currentState = {
    type: 'overall',
    period: 'all-time',
    scope: 'global',
    page: 1,
  };
  var userContainer = document.getElementById('user-rank-container');
  var listContainer = document.getElementById('leaderboard-container');
  var typeLabelEl = document.getElementById('lb-type-label');

  var services = window.NibrasServices;

  function getStoredUserId() {
    try {
      var raw = localStorage.getItem('user');
      if (!raw) return null;
      var user = JSON.parse(raw);
      return user._id || user.id || null;
    } catch (_) {
      return null;
    }
  }

  function getStoredUserName() {
    try {
      var raw = localStorage.getItem('user');
      if (!raw) return 'You';
      var user = JSON.parse(raw);
      return user.name || user.username || 'You';
    } catch (_) {
      return 'You';
    }
  }

  function buildFilters() {
    return {
      type: currentState.type,
      period: currentState.period,
      scope: currentState.scope,
      page: currentState.page,
      limit: 20,
    };
  }

  function loadLeaderboard() {
    if (!services || !services.gamificationService) return;

    if (typeLabelEl) {
      typeLabelEl.textContent = TYPE_LABELS[currentState.type] || 'Overall';
    }

    var filters = buildFilters();

    Promise.all([
      services.gamificationService.getLeaderboard(filters).catch(function (err) {
        console.error('[Leaderboard] Error fetching:', err?.message || err);
        return { entries: [], total: 0, page: 1, limit: 20 };
      }),
      services.gamificationService.getMyLeaderboardRank(filters).catch(function () {
        return null;
      }),
    ]).then(function (results) {
      var lbData = results[0] || { entries: [], total: 0, page: 1, limit: 20 };
      var myData = results[1] || null;

      var entries = lbData.entries || [];
      var total = lbData.total || 0;
      var page = lbData.page || 1;
      var limit = lbData.limit || 20;
      var totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

      var currentUserId = getStoredUserId();
      var userName = getStoredUserName();
      var userInitials = userName
        .split(' ')
        .map(function (w) {
          return w.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);

      var displayScore =
        myData && myData.lifetimeScore != null
          ? myData.lifetimeScore
          : myData && myData.score != null
            ? myData.score
            : 0;
      if (currentState.period !== 'all-time' && myData && myData.score != null) {
        displayScore = myData.score;
      }

      if (userContainer) {
        var uRank = myData && myData.rank != null ? myData.rank : '-';
        userContainer.innerHTML = [
          '<div class="ur-left">',
          '<div class="ur-avatar">' + escapeHtml(userInitials) + '</div>',
          '<div class="ur-rank">#' + uRank + '</div>',
          '<div class="ur-info"><h3>' +
            escapeHtml(userName) +
            ' <span class="ur-badge">student</span></h3></div>',
          '</div>',
          '<div class="ur-right">',
          '<div class="ur-points">' + displayScore + '</div>',
          '<span class="ur-sub">reputation points</span>',
          '</div>',
        ].join('');
      }

      if (listContainer) {
        listContainer.innerHTML = '';
        if (!entries.length) {
          listContainer.innerHTML =
            '<p style="color:var(--text-secondary);padding:1rem;text-align:center;">No leaderboard entries yet. Start earning points!</p>';
          return;
        }

        entries.forEach(function (item) {
          var rank = item.rank || 0;
          var entryName = item.username || item.user?.name || item.name || 'User';
          var initials = entryName
            .split(' ')
            .map(function (w) {
              return w.charAt(0);
            })
            .join('')
            .toUpperCase()
            .slice(0, 2);
          var repScore = item.score != null ? item.score : 0;
          var meta = '';
          if (
            currentState.period !== 'all-time' &&
            item.lifetimeScore != null &&
            item.lifetimeScore !== repScore
          ) {
            meta = 'Lifetime: ' + item.lifetimeScore;
          }
          if (item.badges) {
            meta =
              (meta ? meta + ' \u2022 ' : '') + item.badges + ' badges';
          }
          if (item.level) {
            meta = (meta ? meta + ' \u2022 ' : '') + 'Level ' + item.level;
          }

          var rankHtml = '<div class="rank-box">#' + rank + '</div>';
          if (rank === 1)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-crown rank-icon gold"></i></div>';
          else if (rank === 2)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-shield rank-icon silver"></i></div>';
          else if (rank === 3)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-gem rank-icon bronze"></i></div>';

          var avatarHtml = item.avatarUrl
            ? '<img src="' +
              escapeHtml(item.avatarUrl) +
              '" alt="" class="lb-avatar" style="object-fit:cover;">'
            : '<div class="lb-avatar">' + escapeHtml(initials) + '</div>';

          var isMe =
            currentUserId && item.userId === currentUserId
              ? 'style="border: 2px solid var(--accent-blue);"'
              : '';

          listContainer.innerHTML += [
            '<div class="lb-row" ' + isMe + '>',
            '<div class="lb-left">',
            rankHtml,
            avatarHtml,
            '<div class="lb-user-info">',
            '<h4>' +
              escapeHtml(entryName) +
              ' <span class="ur-badge" style="font-size:0.7rem">student</span></h4>',
            '<span class="lb-meta">' + escapeHtml(meta) + '</span>',
            '</div>',
            '</div>',
            '<div class="lb-right">',
            '<div class="lb-points">' + repScore + '</div>',
            '<span class="lb-meta">reputation points</span>',
            '</div>',
            '</div>',
          ].join('');
        });

        if (totalPages > 1) {
          var pagHtml =
            '<div class="pagination" style="display:flex;justify-content:center;gap:0.5rem;padding:1rem;">';
          if (page > 1) {
            pagHtml +=
              '<button class="pill-btn active" data-page="' +
              (page - 1) +
              '">Prev</button>';
          }
          pagHtml +=
            '<span style="padding:0.5rem;color:var(--text-secondary)">Page ' +
            page +
            ' of ' +
            totalPages +
            '</span>';
          if (page < totalPages) {
            pagHtml +=
              '<button class="pill-btn active" data-page="' +
              (page + 1) +
              '">Next</button>';
          }
          pagHtml += '</div>';
          listContainer.innerHTML += pagHtml;

          listContainer.querySelectorAll('[data-page]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              currentState.page = parseInt(this.getAttribute('data-page'), 10);
              loadLeaderboard();
            });
          });
        }
      }
    });
  }

  loadLeaderboard();

  var pills = document.querySelectorAll('.pill-btn:not(.type-btn)');
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      var text = this.textContent.trim().toLowerCase();
      if (
        text === 'overall' ||
        text === 'all time' ||
        this.id === 'overall-btn'
      ) {
        currentState.period = 'all-time';
      } else if (
        text === 'this week' ||
        text === 'weekly' ||
        this.id === 'week-btn'
      ) {
        currentState.period = 'weekly';
      } else if (
        text === 'this month' ||
        text === 'monthly' ||
        this.id === 'month-btn'
      ) {
        currentState.period = 'monthly';
      }

      pills.forEach(function (btn) {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  var typeTabs = document.querySelectorAll('.type-btn');
  typeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var type = this.dataset.type || 'overall';
      currentState.type = type;

      typeTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      this.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  var segTabs = document.querySelectorAll('.seg-btn');
  segTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var scope = this.dataset.scope || 'global';
      currentState.scope = scope;

      segTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
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
});
