window.NibrasReact.run(function () {
  var statsEl = document.getElementById('stats-container');
  var sectionsEl = document.getElementById('badge-sections');

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function rarityClass(rarity) {
    var map = {
      common: 'badge-card--common',
      rare: 'badge-card--rare',
      epic: 'badge-card--epic',
      legendary: 'badge-card--legendary',
    };
    return map[String(rarity || '').toLowerCase()] || 'badge-card--common';
  }

  function showLoading() {
    if (statsEl)
      statsEl.innerHTML =
        '<div class="loading-skeleton" aria-hidden="true"><div class="loading-skeleton-stats loading-shimmer"></div></div>';
    if (sectionsEl) sectionsEl.innerHTML = '';
  }

  function renderStatTile(o) {
    var captionHtml = o.caption
      ? '<span class="stat-tile-caption">' + escapeHtml(o.caption) + '</span>'
      : '';
    return [
      '<div class="stat-tile">',
      '<div class="stat-tile-head">',
      '<i class="' + o.icon + ' stat-tile-icon"></i>',
      '<span class="stat-tile-label">' + escapeHtml(o.label) + '</span>',
      '</div>',
      '<div class="stat-tile-value">' + escapeHtml(String(o.value)) + '</div>',
      '<div class="stat-tile-foot">' + captionHtml + '</div>',
      '</div>',
    ].join('');
  }

  function renderStats(repTotal, totalBadges, earnedCount, legendaryCount) {
    if (!statsEl) return;
    var completionPct =
      totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;
    statsEl.innerHTML = [
      renderStatTile({
        icon: 'fa-solid fa-trophy',
        value: earnedCount,
        caption: 'of ' + totalBadges,
        label: 'Badges Earned',
      }),
      renderStatTile({
        icon: 'fa-solid fa-star',
        value: repTotal,
        label: 'Reputation',
      }),
      renderStatTile({
        icon: 'fa-solid fa-ranking-star',
        value: completionPct + '%',
        label: 'Completion',
        caption: totalBadges + ' total',
      }),
      renderStatTile({
        icon: 'fa-solid fa-gem',
        value: legendaryCount,
        label: 'Legendary',
        caption: 'Rarest unlocks',
      }),
    ].join('');
  }

  function renderIcon(icon) {
    if (!icon) {
      return '<svg class="badge-icon-default" viewBox="0 0 32 32" fill="none"><path d="M16 4l3 7 7.5.7-5.7 5 1.7 7.5L16 20.7 9.5 24.2 11.2 16.7 5.5 11.7 13 11z" fill="currentColor" opacity=".85"/></svg>';
    }
    if (
      icon.startsWith('http') ||
      icon.startsWith('/') ||
      icon.startsWith('data:')
    ) {
      return '<img src="' + escapeHtml(icon) + '" alt="" class="badge-icon">';
    }
    return '<i class="' + escapeHtml(icon) + '" style="font-size:22px;"></i>';
  }

  function createBadgeBlock(title, meta) {
    var div = document.createElement('div');
    div.className = 'badge-block';
    div.innerHTML = [
      '<div class="badge-section-head">',
      '<h3 class="badge-section-title">' + escapeHtml(title) + '</h3>',
      '<span class="badge-section-meta">' + escapeHtml(meta) + '</span>',
      '</div>',
      '<div class="panel">',
      '<div class="badge-grid"></div>',
      '</div>',
    ].join('');
    return div;
  }

  function createBadgeCardElement(badge) {
    var isEarned = !!badge.earnedAt;
    var card = document.createElement('button');
    card.type = 'button';
    card.className =
      'badge-card ' +
      rarityClass(badge.rarity) +
      ' ' +
      (isEarned ? 'badge-card--earned' : 'badge-card--locked');
    card.setAttribute('aria-pressed', isEarned ? 'true' : 'false');

    var iconHolder = document.createElement('div');
    iconHolder.className = 'badge-icon-holder';
    iconHolder.innerHTML = renderIcon(badge.iconUrl);
    card.appendChild(iconHolder);

    var nameEl = document.createElement('strong');
    nameEl.className = 'badge-name';
    nameEl.textContent = badge.name || '';
    card.appendChild(nameEl);

    var descEl = document.createElement('span');
    descEl.className = 'badge-desc';
    descEl.textContent = badge.description || '';
    card.appendChild(descEl);

    if (isEarned) {
      var earnedLabel = document.createElement('span');
      earnedLabel.className = 'badge-progress-label badge-earned-label';
      earnedLabel.style.cssText =
        'margin-top:4px;color:var(--primary-strong);font-weight:600;';
      earnedLabel.textContent = 'Earned';
      card.appendChild(earnedLabel);
    } else if (badge.threshold && badge.progress != null) {
      var pct =
        badge.threshold > 0
          ? Math.min(100, Math.round((badge.progress / badge.threshold) * 100))
          : 0;
      var track = document.createElement('div');
      track.className = 'badge-progress-track';
      track.innerHTML =
        '<div class="badge-progress-fill" style="width:' + pct + '%"></div>';
      card.appendChild(track);
      var progressLabel = document.createElement('span');
      progressLabel.className = 'badge-progress-label';
      progressLabel.textContent = badge.progress + ' / ' + badge.threshold;
      card.appendChild(progressLabel);
    }

    return card;
  }

  function comingSoonHtml() {
    return [
      '<div class="badge-block badge-block-coming-soon">',
      '<div class="badge-section-head">',
      '<h3 class="badge-section-title">More Coming Soon</h3>',
      '<span class="badge-section-meta">Additional badges in development</span>',
      '</div>',
      '<div class="panel">',
      '<div style="padding:24px 20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">',
      '<p style="margin-bottom:6px;">More badges for courses, projects, contests, and community participation are being developed.</p>',
      '<p>Keep using Nibras to unlock future achievements!</p>',
      '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  function renderBadgeSections(allBadges) {
    if (!sectionsEl) return;

    var earned = allBadges.filter(function (b) {
      return !!b.earnedAt;
    });
    var locked = allBadges.filter(function (b) {
      return !b.earnedAt;
    });

    sectionsEl.innerHTML = '';

    if (earned.length > 0) {
      var earnedBlock = createBadgeBlock('Earned', earned.length + ' unlocked');
      var earnedGrid = earnedBlock.querySelector('.badge-grid');
      earned.forEach(function (badge) {
        earnedGrid.appendChild(createBadgeCardElement(badge));
      });
      sectionsEl.appendChild(earnedBlock);
    }

    if (locked.length > 0) {
      var lockedBlock = createBadgeBlock('Locked', locked.length + ' to go');
      var lockedGrid = lockedBlock.querySelector('.badge-grid');
      locked.forEach(function (badge) {
        lockedGrid.appendChild(createBadgeCardElement(badge));
      });
      sectionsEl.appendChild(lockedBlock);
    }

    if (earned.length === 0 && locked.length === 0) {
      sectionsEl.innerHTML =
        '<div class="panel" style="padding:2rem;text-align:center;color:var(--text-secondary);">No badges available yet.</div>';
    } else {
      sectionsEl.insertAdjacentHTML('beforeend', comingSoonHtml());
    }
  }

  function loadBadges() {
    showLoading();
    var services = window.NibrasServices;
    if (!services || !services.gamificationService) return;

    services.gamificationService
      .getAchievementsDashboard({ sync: true })
      .then(function (dashboard) {
        var allBadges = Array.isArray(dashboard?.badges) ? dashboard.badges : [];
        var repTotal = dashboard?.reputation?.total || 0;
        var earnedCount = allBadges.filter(function (b) {
          return !!b.earnedAt;
        }).length;
        var legendaryCount = allBadges.filter(function (b) {
          return b.rarity === 'legendary' && b.earnedAt;
        }).length;

        renderStats(repTotal, allBadges.length, earnedCount, legendaryCount);
        renderBadgeSections(allBadges);
      })
      .catch(function () {
        if (statsEl)
          statsEl.innerHTML =
            '<div class="stat-tile"><span class="stat-tile-label">Could not load achievements</span></div>';
        if (sectionsEl)
          sectionsEl.innerHTML =
            '<div class="panel" style="padding:2rem;text-align:center;color:var(--text-secondary);">Could not load badges. Please try again later.</div>';
      });
  }

  function initSocketBadgeListener() {
    if (
      typeof io === 'undefined' ||
      typeof window.NIBRAS_BACKEND_URL === 'undefined'
    )
      return;
    try {
      var backendUrl = window.NIBRAS_BACKEND_URL || window.NIBRAS_API_URL || '';
      var baseUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      if (!baseUrl) return;
      var socket = io(baseUrl, { transports: ['websocket', 'polling'] });
      socket.on('badge:earned', function (data) {
        var badgeName = data?.badge?.name || data?.name || 'New badge';
        var toast = document.createElement('div');
        toast.style.cssText =
          'position:fixed;bottom:24px;right:24px;z-index:99999;background:linear-gradient(135deg,#6c5ce7,#a855f7);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;display:flex;align-items:center;gap:12px;animation:slideIn 0.3s ease;max-width:380px;';
        toast.innerHTML =
          '<i class="fa-solid fa-trophy" style="font-size:1.5rem;"></i><div><strong style="font-size:1rem;display:block;">Badge Unlocked!</strong><span style="opacity:0.9;font-size:0.9rem;">' +
          escapeHtml(badgeName) +
          '</span></div>';
        document.body.appendChild(toast);
        setTimeout(function () {
          toast.style.transition = 'opacity 0.3s, transform 0.3s';
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100px)';
          setTimeout(function () {
            toast.remove();
          }, 300);
        }, 4000);
        loadBadges();
      });
      socket.on('connect_error', function () {});
    } catch (e) {}
  }

  loadBadges();
  initSocketBadgeListener();

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
