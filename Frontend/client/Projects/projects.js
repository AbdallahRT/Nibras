var projectsPage = {
  courseId: '',
  trackingCourseId: '',
  activeProjectKey: '',
  courseByLocalId: {},
  activeCourse: null,
  activeOverview: null,
  flatMilestones: [],
  pendingSubmit: { projectId: '', milestoneId: '', title: '' },
  webhookEvents: [],
  maxWebhookEvents: 50,
};

var projectsApiClient =
  window.NibrasProjectsApi?.createClient?.({
    baseUrl:
      window.NibrasShared?.resolveServiceUrl?.('tracking') ||
      window.NIBRAS_TRACKING_API_URL,
    getAuthToken: function () {
      return (
        window.NibrasShared?.auth?.getToken?.() ||
        localStorage.getItem('token') ||
        null
      );
    },
  }) || null;

var DROPDOWN_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error(label || 'Request timed out'));
      }, ms);
    }),
  ]);
}

function getUserLevel() {
  try {
    var u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.selectedLevel || 'Beginner';
  } catch (_) {
    return 'Beginner';
  }
}

function getLocalCoursesForLevel(level) {
  var nc = window.NibrasCourses;
  if (!nc) return [];
  if (level === 'Intermediate' && nc.getIntermediateCoursesList) {
    return nc.getIntermediateCoursesList();
  }
  if (level === 'Advanced' && nc.getAdvancedCoursesList) {
    return nc.getAdvancedCoursesList();
  }
  if (level === 'Expert' && nc.getExpertCoursesList) {
    return nc.getExpertCoursesList();
  }
  return nc.getCoursesList ? nc.getCoursesList() : [];
}

function updateSidebarUser() {
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (!u || !u.name) return;
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = u.name;
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) {
      var r = u.role;
      roleEl.textContent =
        typeof r === 'object' && r
          ? r.name || r.title || 'student'
          : r || 'student';
    }
    var initials = u.name
      .split(' ')
      .map(function (n) {
        return n.charAt(0);
      })
      .join('')
      .toUpperCase()
      .slice(0, 2);
    var avatarEl = document.querySelector('.avatar-circle');
    if (avatarEl) avatarEl.textContent = initials || 'U';
    var smallAvatar = document.querySelector('.profile-circle-small');
    if (smallAvatar) smallAvatar.textContent = initials || 'U';
  } catch (_) {}
}

window.NibrasReact.run(function () {
  initStandaloneProjectsCliHelp();
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    updateUI(themeIcon, saved);
    themeToggle.classList.remove('rotating');
    void themeToggle.offsetWidth;
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateUI(themeIcon, next);
      themeToggle.classList.add('rotating');
      setTimeout(function () {
        themeToggle.classList.remove('rotating');
      }, 500);
    });
  }
  function updateUI(el, theme) {
    if (!el) return;
    el.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    var logo = document.querySelector('.sidebar-logo');
    if (logo) {
      logo.src =
        theme === 'dark'
          ? '../Assets/images/logo-dark.png'
          : '../Assets/images/logo-light.png';
    }
  }

  var sel = document.getElementById('course-select');
  if (sel) {
    sel.addEventListener('change', function () {
      if (this.value) void loadCourse(this.value);
      else showEmpty();
    });
  }

  void loadDropdown();
});

function setMsg(msg, type) {
  var el = document.getElementById('projects-api-notice');
  if (!el) return;
  el.style.display = msg ? '' : 'none';
  el.textContent = msg || '';
  if (type === 'error') el.style.color = '#ef4444';
  else if (type === 'loading') el.style.color = '';
  else el.style.color = '';
}

function showEmpty() {
  document.getElementById('projects-hero').style.display = 'none';
  document.getElementById('progress-container').style.display = 'none';
  document.getElementById('project-grid').style.display = 'none';
  document.getElementById('projects-empty').style.display = '';
  var cliCard = document.getElementById('cli-quickstart-card');
  if (cliCard) {
    cliCard.style.display = 'none';
    cliCard.innerHTML = '';
  }
  projectsPage.activeProjectKey = '';
}

function showContent() {
  document.getElementById('projects-empty').style.display = 'none';
  document.getElementById('projects-hero').style.display = '';
  document.getElementById('progress-container').style.display = '';
  document.getElementById('project-grid').style.display = '';
}

function normalizeMatchToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function indexCourseEntry(entry) {
  if (!entry) return;
  if (entry.localCourseId) {
    projectsPage.courseByLocalId[entry.localCourseId] = entry;
  }
  if (entry.trackingCourseId) {
    projectsPage.courseByLocalId[entry.trackingCourseId] = entry;
  }
}

function findCourseEntry(courseId) {
  if (!courseId) return null;
  if (projectsPage.courseByLocalId[courseId]) {
    return projectsPage.courseByLocalId[courseId];
  }
  return (
    Object.values(projectsPage.courseByLocalId).find(function (entry) {
      return (
        entry.localCourseId === courseId ||
        entry.trackingCourseId === courseId
      );
    }) || null
  );
}

async function listEnrolledTrackingCourses() {
  var trackingService = window.NibrasServices?.trackingCourseService;
  if (!trackingService || typeof trackingService.list !== 'function') {
    return [];
  }
  try {
    var remote = await trackingService.list();
    return Array.isArray(remote)
      ? remote
      : Array.isArray(remote?.data)
        ? remote.data
        : Array.isArray(remote?.items)
          ? remote.items
          : [];
  } catch (_) {
    return [];
  }
}

function matchEnrolledTrackingCourse(catalogCourse, enrolledCourses) {
  if (!catalogCourse || !Array.isArray(enrolledCourses)) return null;
  var codeToken = normalizeMatchToken(catalogCourse.code);
  var titleToken = normalizeMatchToken(catalogCourse.title);

  for (var i = 0; i < enrolledCourses.length; i += 1) {
    var enrolled = enrolledCourses[i];
    var enrolledId = enrolled?.id || enrolled?._id || '';
    if (!enrolledId) continue;
    var enrolledCode = normalizeMatchToken(
      enrolled.courseCode || enrolled.code,
    );
    var enrolledTitle = normalizeMatchToken(enrolled.title);
    if (
      (codeToken && enrolledCode && codeToken === enrolledCode) ||
      (titleToken && enrolledTitle && titleToken === enrolledTitle)
    ) {
      return enrolled;
    }
  }
  return null;
}

async function resolveTrackingCourseIdForLoad(localCourseId, entry, catalogCourse) {
  var selectedOption = document.getElementById('course-select')?.selectedOptions?.[0];
  var optionTrackingId = selectedOption?.getAttribute('data-tracking-id') || '';

  if (
    optionTrackingId &&
    (!localCourseId || optionTrackingId !== localCourseId)
  ) {
    return optionTrackingId;
  }

  if (
    entry?.trackingCourseId &&
    (!entry.localCourseId || entry.trackingCourseId !== entry.localCourseId)
  ) {
    return entry.trackingCourseId;
  }

  var nc = window.NibrasCourses;
  if (localCourseId && typeof nc?.resolveCourseIdentifiersAsync === 'function') {
    try {
      var ids = await nc.resolveCourseIdentifiersAsync(localCourseId, {
        loadRemote: true,
        warnOnMissing: false,
      });
      if (ids?.trackingCourseId) return ids.trackingCourseId;
    } catch (_) {}
  } else if (localCourseId && typeof nc?.resolveCourseIdentifiers === 'function') {
    var syncIds = nc.resolveCourseIdentifiers(localCourseId, {
      warnOnMissing: false,
    });
    if (syncIds?.trackingCourseId) return syncIds.trackingCourseId;
  }

  var enrolledCourses = await listEnrolledTrackingCourses();
  var matched = matchEnrolledTrackingCourse(
    catalogCourse || entry,
    enrolledCourses,
  );
  if (matched) return matched.id || matched._id || '';

  return entry?.trackingCourseId || '';
}

async function collectDropdownCourses() {
  var nc = window.NibrasCourses;
  if (!nc) return [];

  var userLevel = getUserLevel();
  var localCourses = getLocalCoursesForLevel(userLevel).filter(function (c) {
    return c && c.type !== 'practice_lab';
  });
  var enrolledCourses = await listEnrolledTrackingCourses();

  var mapped = [];
  var resolveAsync = nc.resolveCourseIdentifiersAsync;

  if (typeof resolveAsync === 'function') {
    await Promise.all(
      localCourses.map(async function (course) {
        try {
          var ids = await resolveAsync(course.id, { loadRemote: true });
          var trackingId = ids?.trackingCourseId || '';
          if (!trackingId) {
            var matched = matchEnrolledTrackingCourse(course, enrolledCourses);
            trackingId = matched?.id || matched?._id || '';
          }
          if (!trackingId) return;
          mapped.push({
            localCourseId: course.id,
            trackingCourseId: trackingId,
            title: course.title || course.code || course.id,
            code: course.code || '',
            level: course.level || userLevel,
            category: course.category || '',
            description: course.description || '',
          });
        } catch (_) {}
      }),
    );
  } else {
    localCourses.forEach(function (course) {
      var ids =
        typeof nc.resolveCourseIdentifiers === 'function'
          ? nc.resolveCourseIdentifiers(course.id)
          : null;
      var trackingId = ids?.trackingCourseId || '';
      if (!trackingId) {
        var matched = matchEnrolledTrackingCourse(course, enrolledCourses);
        trackingId = matched?.id || matched?._id || '';
      }
      if (!trackingId) return;
      mapped.push({
        localCourseId: course.id,
        trackingCourseId: trackingId,
        title: course.title || course.code || course.id,
        code: course.code || '',
        level: course.level || userLevel,
        category: course.category || '',
        description: course.description || '',
      });
    });
  }

  enrolledCourses.forEach(function (course) {
    var remoteId = course.id || course._id || '';
    if (!remoteId) return;
    if (
      mapped.some(function (entry) {
        return entry.trackingCourseId === remoteId;
      })
    ) {
      return;
    }
    mapped.push({
      localCourseId: '',
      trackingCourseId: remoteId,
      title: course.title || course.courseCode || 'Course',
      code: course.courseCode || course.code || '',
      level: course.termLabel || userLevel,
      category: '',
      description: course.description || '',
    });
  });

  mapped.sort(function (a, b) {
    return String(a.title).localeCompare(String(b.title));
  });

  return mapped;
}

async function loadDropdown() {
  var sel = document.getElementById('course-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading courses...</option>';
  var urlId = new URLSearchParams(window.location.search).get('courseId') || '';

  if (!window.NibrasCourses) {
    sel.innerHTML = '<option value="">Catalog unavailable</option>';
    setMsg('Course catalog failed to load. Hard-refresh the page.', 'error');
    showEmpty();
    return;
  }

  try {
    var courses = await withTimeout(
      collectDropdownCourses(),
      DROPDOWN_TIMEOUT_MS,
      'Course list timed out',
    );

    projectsPage.courseByLocalId = {};
    courses.forEach(function (entry) {
      indexCourseEntry(entry);
    });

    if (!courses.length) {
      sel.innerHTML = '<option value="">No mapped courses</option>';
      setMsg(
        'No courses with backend mapping found for your level. Enroll or contact an admin.',
        'error',
      );
      showEmpty();
      return;
    }

    sel.innerHTML = '<option value="">Select a course...</option>';
    courses.forEach(function (entry) {
      var value = entry.localCourseId || entry.trackingCourseId;
      var label = entry.title + (entry.code ? ' (' + entry.code + ')' : '');
      sel.innerHTML +=
        '<option value="' +
        esc(value) +
        '" data-tracking-id="' +
        esc(entry.trackingCourseId) +
        '">' +
        esc(label) +
        '</option>';
    });

    var countEl = document.getElementById('available-count');
    if (countEl) countEl.textContent = courses.length + ' available';

    var target = '';
    if (urlId && projectsPage.courseByLocalId[urlId]) {
      target = urlId;
    } else if (urlId) {
      var byTracking = courses.find(function (c) {
        return c.trackingCourseId === urlId;
      });
      if (byTracking) target = byTracking.localCourseId || byTracking.trackingCourseId;
    }
    if (!target && courses.length === 1) {
      target = courses[0].localCourseId || courses[0].trackingCourseId;
    }

    if (target) {
      sel.value = target;
      await loadCourse(target);
    } else {
      showEmpty();
    }
  } catch (error) {
    sel.innerHTML = '<option value="">Failed to load</option>';
    setMsg(error?.message || 'Failed to load courses.', 'error');
    showEmpty();
  }
}

async function loadCourse(courseId) {
  if (!courseId) {
    showEmpty();
    return;
  }

  projectsPage.courseId = courseId;
  var entry = findCourseEntry(courseId);

  setMsg('Loading projects...', 'loading');

  if (!projectsApiClient) {
    setMsg('Projects API is not configured.', 'error');
    showEmpty();
    return;
  }

  var nc = window.NibrasCourses;
  var localCourseId = entry?.localCourseId || courseId;
  var catalogCourse =
    typeof nc?.getCourseById === 'function'
      ? nc.getCourseById(localCourseId)
      : null;

  try {
    var trackingCourseId = await resolveTrackingCourseIdForLoad(
      localCourseId,
      entry,
      catalogCourse,
    );

    if (!trackingCourseId) {
      setMsg(
        'Projects require a backend course mapping. Enroll in this course or contact an admin.',
        'error',
      );
      showEmpty();
      return;
    }

    projectsPage.trackingCourseId = trackingCourseId;

    var overviewResult = await projectsApiClient.getProjectsOverview({
      courseId: trackingCourseId,
    });

    var overview = overviewResult?.data || {};
    if (overview.pageError) {
      setMsg(overview.pageError, 'error');
    } else {
      setMsg('');
    }

    projectsPage.activeOverview = overview;
    projectsPage.activeCourse = catalogCourse || entry || null;

    var performance = null;
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      var userId = u._id || u.id;
      if (userId && window.NibrasServices?.backendAnalyticsService) {
        performance = await window.NibrasServices.backendAnalyticsService
          .getStudentPerformance(userId)
          .catch(function () {
            return null;
          });
      }
    } catch (_) {}

    showContent();
    renderFromOverview(catalogCourse || entry, overview, performance);
    renderWebhookPlaceholder();
  } catch (error) {
    setMsg(error?.message || 'Failed to load projects.', 'error');
    showEmpty();
  }
}

function flattenMilestones(projects) {
  var flat = [];
  (projects || []).forEach(function (project) {
    (project.milestones || []).forEach(function (milestone) {
      flat.push({
        apiMilestoneId: milestone.apiMilestoneId,
        apiProjectId: milestone.apiProjectId || project.projectId,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        projectTitle: project.title,
      });
    });
  });
  return flat;
}

function countMilestoneStates(milestones) {
  var approved = 0;
  var inReview = 0;
  var open = 0;
  milestones.forEach(function (m) {
    var status = String(m.status || 'pending');
    if (status === 'approved' || status === 'complete') approved += 1;
    else if (status === 'in_review' || status === 'needs_changes') inReview += 1;
    else open += 1;
  });
  return { approved: approved, inReview: inReview, open: open, total: milestones.length };
}

function renderFromOverview(courseMeta, overview, performance) {
  var projects = overview?.projects || [];
  var flat = flattenMilestones(projects);
  projectsPage.flatMilestones = flat;
  var counts = countMilestoneStates(flat);
  var pct =
    counts.total > 0 ? Math.round((counts.approved / counts.total) * 100) : 0;

  var title =
    courseMeta?.title ||
    projects[0]?.title ||
    overview?.course?.title ||
    'Course';
  var code = courseMeta?.code || overview?.course?.courseCode || '';
  var level = courseMeta?.level || '';
  var category = courseMeta?.category || '';
  var desc =
    projects[0]?.description ||
    courseMeta?.description ||
    'Track milestones, submit work, and monitor your progress.';

  var courseGrade = '';
  var gradeSummary =
    (performance && (performance.data || performance).coursesGradeSummary) ||
    performance?.coursesGradeSummary ||
    [];
  if (Array.isArray(gradeSummary) && gradeSummary.length) {
    var match = gradeSummary.find(function (g) {
      return (
        g.courseId === projectsPage.trackingCourseId ||
        g.title === title
      );
    });
    if (match) {
      courseGrade = match.weightedGrade
        ? match.weightedGrade + '%'
        : match.percentage
          ? match.percentage + '%'
          : '';
    }
  }

  document.getElementById('hero-course-code').textContent =
    (code ? code + ' · ' : '') + (level || 'Course');
  document.getElementById('hero-title').textContent = title;
  document.getElementById('hero-subtitle').textContent =
    projects.length === 1
      ? projects[0].title
      : projects.length > 1
        ? projects.length + ' projects in this course'
        : category || 'Track your course progress and milestones.';

  document.getElementById('stat-sections').textContent = counts.total;
  document.getElementById('stat-completed').textContent = counts.approved;
  document.getElementById('stat-complete').textContent = pct + '%';

  document.getElementById('progress-title').textContent =
    (code ? code + ' — ' : '') + title;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-level').textContent = level || 'Active';
  document.getElementById('progress-status').textContent =
    counts.total > 0 ? 'In progress' : 'No milestones';

  document.getElementById('progress-pct-large').textContent = pct + '%';
  document.getElementById('legend-approved').textContent = counts.approved;
  document.getElementById('legend-review').textContent = counts.inReview;
  document.getElementById('legend-open').textContent = counts.open;

  document.getElementById('stat-approved-val').textContent =
    counts.approved + ' / ' + counts.total;
  document.getElementById('stat-review-val').textContent = String(counts.inReview);
  document.getElementById('stat-open-val').textContent = String(counts.open);

  document.getElementById('milestone-count').textContent =
    counts.approved + ' / ' + counts.total + ' complete';

  var milestoneList = document.getElementById('milestone-list');
  milestoneList.innerHTML = '';

  if (!flat.length) {
    milestoneList.innerHTML =
      '<div class="milestone-item"><div class="milestone-left"><div class="milestone-circle"><i class="far fa-circle"></i></div><div><h4>No milestones yet</h4><p>Project milestones will appear here once configured.</p></div></div></div>';
  } else {
    flat.forEach(function (milestone) {
      var status = String(milestone.status || 'pending');
      var isDone = status === 'approved' || status === 'complete';
      var isReview = status === 'in_review' || status === 'needs_changes';
      var icon = isDone
        ? 'fa-regular fa-circle-check'
        : isReview
          ? 'fa-regular fa-clock'
          : 'far fa-circle';
      var iconColor = isDone
        ? 'color:#22c55e;'
        : isReview
          ? 'color:#f59e0b;'
          : '';
      var label = status.replace(/_/g, ' ');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      var subtitle = milestone.projectTitle
        ? esc(milestone.projectTitle)
        : '';

      milestoneList.innerHTML += [
        '<div class="milestone-item" data-milestone-id="' +
          esc(milestone.apiMilestoneId) +
          '" data-project-id="' +
          esc(milestone.apiProjectId) +
          '" data-milestone-title="' +
          esc(milestone.title) +
          '">',
        '<div class="milestone-left">',
        '<div class="milestone-circle" style="' +
          iconColor +
          '"><i class="' +
          icon +
          '"></i></div>',
        '<div>',
        '<h4>' +
          esc(milestone.title) +
          ' <span class="status-open">' +
          esc(label) +
          '</span></h4>',
        '<p>' +
          (subtitle ? subtitle + ' · ' : '') +
          esc(milestone.description || '') +
          '</p>',
        '</div>',
        '</div>',
        '<i class="fas fa-chevron-right arrow"></i>',
        '</div>',
      ].join('');
    });

    milestoneList.querySelectorAll('.milestone-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var existing = this.querySelector('.milestone-submit-area');
        if (existing) {
          existing.remove();
          return;
        }
        var milestoneId = this.getAttribute('data-milestone-id') || '';
        var projectId = this.getAttribute('data-project-id') || '';
        var milestoneTitle = this.getAttribute('data-milestone-title') || 'Milestone';
        var btn = document.createElement('div');
        btn.className = 'milestone-submit-area';
        btn.innerHTML =
          '<button type="button" class="btn-submit-gradient" style="padding:0.6rem 1.2rem;font-size:0.85rem;width:auto;display:inline-flex;align-items:center;gap:0.5rem;"><i class="fas fa-upload"></i> Submit ' +
          esc(milestoneTitle) +
          '</button>';
        btn.querySelector('button').addEventListener('click', function (event) {
          event.stopPropagation();
          openMilestoneSubmit(milestoneId, projectId, milestoneTitle);
        });
        this.appendChild(btn);
      });
    });
  }

  document.getElementById('project-desc').textContent = desc;
  var badge = document.getElementById('project-badge');
  if (badge) badge.textContent = level ? level.toUpperCase() : 'ACTIVE';

  var metaWeight = document.getElementById('meta-weight');
  var metaType = document.getElementById('meta-type');
  if (metaWeight) metaWeight.textContent = courseGrade || 'Graded';
  if (metaType) {
    metaType.textContent =
      projects[0]?.cardMeta || (projects.length ? 'Project' : 'Course');
  }

  document.getElementById('standing-label').textContent = level || 'Year 1';
  var hint = document.getElementById('standing-hint');
  if (hint) hint.textContent = 'Complete milestones to advance.';
  document.getElementById('final-desc').textContent =
    'Submit your work for ' + esc(title) + '.';
  document.getElementById('stat-time').textContent =
    counts.total > 0 ? 'Active' : 'Not started';

  var finalStatus = document.getElementById('final-status');
  if (finalStatus) {
    finalStatus.textContent = counts.open > 0 ? 'Open' : 'Complete';
  }

  renderCliQuickstart(projects);
}

function findActiveProjectKey(projects) {
  var list = projects || [];
  for (var i = 0; i < list.length; i += 1) {
    if (list[i].projectKey) return list[i].projectKey;
  }
  return '';
}

function renderCliQuickstart(projects) {
  var container = document.getElementById('cli-quickstart-card');
  if (!container) return;

  var projectKey = findActiveProjectKey(projects);
  projectsPage.activeProjectKey = projectKey;

  if (!projectKey) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  var setupCmd =
    window.NibrasCli?.buildSetupCommand?.(projectKey) ||
    'nibras setup --project ' + projectKey;

  container.style.display = '';
  container.innerHTML = [
    '<div class="card-header-row"><h3>CLI Quickstart</h3></div>',
    '<p class="section-desc">Use the Nibras CLI to setup, test, and submit this project from your terminal.</p>',
    '<div class="cli-command-box"><code class="cli-command">',
    esc(setupCmd),
    '</code></div>',
    '<div class="cli-actions">',
    '<button class="btn btn-outline btn-sm" type="button" onclick="copyActiveCliSetupCommand()">Copy setup command</button> ',
    '<button class="btn btn-primary btn-sm" type="button" onclick="openCliHelpModal()">Open CLI Guide</button>',
    '</div>',
  ].join('');
}

function initStandaloneProjectsCliHelp() {
  if (!window.NibrasCli?.initHelpModal) return;
  window.NibrasCli.initHelpModal({
    getCliBaseUrl: function () {
      return projectsApiClient?.getCliBaseUrl?.() || null;
    },
    getActiveProjectKey: function () {
      return projectsPage.activeProjectKey || '';
    },
    getTrackingCourseId: function () {
      return projectsPage.trackingCourseId || '';
    },
  });
}

function copyActiveCliSetupCommand() {
  var command =
    window.NibrasCli?.buildSetupCommand?.(projectsPage.activeProjectKey) ||
    'nibras setup --project your-course/project-key';
  navigator.clipboard.writeText(command).then(function () {
    setMsg('CLI setup command copied.', 'info');
  });
}

function openCliHelpModal() {
  var modal = document.getElementById('cliHelpModal');
  if (!modal) return;
  modal.style.display = 'block';
  if (typeof window.loadCliGuide === 'function') window.loadCliGuide();
}

function closeCliHelpModal() {
  var modal = document.getElementById('cliHelpModal');
  if (modal) modal.style.display = 'none';
}

function copyCliModalText(text) {
  navigator.clipboard.writeText(text || '').then(function () {
    var result = document.getElementById('cli-verify-result');
    if (result) {
      result.textContent = 'Copied!';
      setTimeout(function () {
        result.textContent = '';
      }, 1500);
    }
  });
}

function renderWebhookPlaceholder() {
  var feed = document.getElementById('webhook-feed');
  var badge = document.getElementById('webhook-badge');
  if (badge) {
    badge.innerHTML = '<i class="fa-solid fa-circle"></i> Offline';
    badge.style.background = '';
    badge.style.color = '';
  }
  if (feed) {
    feed.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-code-branch"></i><p>Webhook activity is unavailable on this deployment.</p><p class="empty-state-sub">Connect GitHub in Integrations when live webhook support is enabled.</p></div>';
  }
}

function esc(str) {
  if (!str && str !== 0) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function ensureHiddenInput(id, name) {
  var input = document.getElementById(id);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.id = id;
    input.name = name;
    document.getElementById('milestone-form-content').appendChild(input);
  }
  return input;
}

function openMilestoneSubmit(milestoneId, projectId, sectionTitle) {
  projectsPage.pendingSubmit = {
    milestoneId: milestoneId || '',
    projectId: projectId || '',
    title: sectionTitle || 'Milestone',
  };

  var modal = document.getElementById('submissionModal');
  if (!modal) return;
  var titleEl = modal.querySelector('.modal-header h2');
  if (titleEl) {
    titleEl.textContent = 'Submit: ' + (sectionTitle || 'Milestone');
  }

  ensureHiddenInput('milestone-id-input', 'milestone_id').value =
    milestoneId || '';
  ensureHiddenInput('project-id-input', 'project_id').value = projectId || '';

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('finalSubmitForm').onsubmit = handleSubmit;
  document.getElementById('submission-status-message').textContent = '';
  document.getElementById('milestone-form-content').style.display = '';
  document.getElementById('submit-final-btn').style.display = '';
}

function openSubmissionModal() {
  var target = projectsPage.flatMilestones.find(function (m) {
    var status = String(m.status || '');
    return status !== 'approved' && status !== 'complete';
  });
  if (!target && projectsPage.flatMilestones.length) {
    target = projectsPage.flatMilestones[projectsPage.flatMilestones.length - 1];
  }
  if (!target) {
    alert('No milestones available to submit.');
    return;
  }
  openMilestoneSubmit(
    target.apiMilestoneId,
    target.apiProjectId,
    target.title,
  );
}

function closeSubmissionModal() {
  var modal = document.getElementById('submissionModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('submission-status-message').textContent = '';
}

async function handleSubmit(event) {
  event.preventDefault();
  var fd = new FormData(document.getElementById('finalSubmitForm'));
  var repoUrl = String(fd.get('resource_link') || '').trim();
  if (!repoUrl) {
    alert('Please enter a submission URL.');
    return;
  }

  var submitBtn = document.getElementById('submit-final-btn');
  var msg = document.getElementById('submission-status-message');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  msg.textContent = '';

  try {
    if (!projectsApiClient) {
      throw new Error('Projects API is not configured.');
    }

    var milestoneId =
      String(fd.get('milestone_id') || projectsPage.pendingSubmit.milestoneId || '').trim();
    var projectId =
      String(fd.get('project_id') || projectsPage.pendingSubmit.projectId || '').trim();

    if (!milestoneId) {
      throw new Error('Select a milestone before submitting.');
    }

    await projectsApiClient.submitMilestone({
      courseId: projectsPage.trackingCourseId,
      projectId: projectId,
      milestoneId: milestoneId,
      submissionType: String(fd.get('submission_type') || 'github'),
      resourceLink: repoUrl,
      notes: String(fd.get('notes') || ''),
    });

    msg.textContent = 'Submitted successfully!';
    msg.style.color = '#22c55e';
    document.getElementById('milestone-form-content').style.display = 'none';
    submitBtn.style.display = 'none';

    if (projectsPage.courseId) {
      setTimeout(function () {
        closeSubmissionModal();
        void loadCourse(projectsPage.courseId);
      }, 1200);
    }
  } catch (err) {
    msg.textContent = 'Error: ' + (err.message || 'Submission failed');
    msg.style.color = '#ef4444';
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Project';
}

document.addEventListener('click', function (event) {
  var modal = document.getElementById('submissionModal');
  if (modal && modal.classList.contains('active') && event.target === modal) {
    closeSubmissionModal();
  }
  var cliModal = document.getElementById('cliHelpModal');
  if (cliModal && cliModal.style.display === 'block' && event.target === cliModal) {
    closeCliHelpModal();
  }
});

window.openMilestoneSubmit = openMilestoneSubmit;
window.openSubmissionModal = openSubmissionModal;
window.closeSubmissionModal = closeSubmissionModal;
window.openCliHelpModal = openCliHelpModal;
window.closeCliHelpModal = closeCliHelpModal;
window.copyActiveCliSetupCommand = copyActiveCliSetupCommand;
window.copyCliModalText = copyCliModalText;
