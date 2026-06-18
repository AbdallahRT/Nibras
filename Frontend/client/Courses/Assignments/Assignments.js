window.NibrasReact.run(() => {
  const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
  if (!selectedCourse) return;
  const courseId = selectedCourse.id;
  const backendCourseId =
    selectedCourse?.adminCourseId || selectedCourse?.backendCourseId || null;
  let assignmentData = JSON.parse(JSON.stringify(selectedCourse.assignments));
  let activeFilter = 'all';
  const assignmentsNotice = document.getElementById('assignments-api-notice');
  const sharedUiStates = window.NibrasShared?.uiStates || null;
  var isInstructor = window.NibrasCourseSidebar?.isInstructor?.() || false;

  window.NibrasCourseSidebar?.initCoursePageChrome?.({
    activeKey: 'assignments',
    pageRoot: 'assignments',
    deferProgress: true,
  });

  function resolveUiStateFromError(error, fallbackMessage) {
    if (sharedUiStates?.fromError) {
      return sharedUiStates.fromError(error, fallbackMessage);
    }
    return {
      state: 'error',
      message: error?.message || fallbackMessage || 'Request failed',
    };
  }

  function setAssignmentsNotice(message, type = 'info') {
    if (!assignmentsNotice) return;
    const state = sharedUiStates?.normalize
      ? sharedUiStates.normalize(type)
      : type || 'info';
    if (sharedUiStates?.render) {
      sharedUiStates.render(assignmentsNotice, {
        state,
        message,
        mode: 'notice',
      });
      return;
    }
    if (!message) {
      assignmentsNotice.hidden = true;
      assignmentsNotice.textContent = '';
      return;
    }
    assignmentsNotice.hidden = false;
    assignmentsNotice.textContent = message;
    if (
      state === 'error' ||
      state === 'unauthorized' ||
      state === 'forbidden'
    ) {
      assignmentsNotice.style.color = '#ef4444';
      assignmentsNotice.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      assignmentsNotice.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
      return;
    }
    assignmentsNotice.style.color = 'var(--text-secondary)';
    assignmentsNotice.style.borderColor = 'var(--border-color)';
    assignmentsNotice.style.backgroundColor = 'var(--bg-secondary)';
  }

  // --- 1. SIDEBAR NAVIGATION LOGIC (New Addition) ---
  const sidebarNavLinks = document.querySelectorAll('.nav-link');

  sidebarNavLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      // Remove 'active' class from all links
      sidebarNavLinks.forEach((nav) => nav.classList.remove('active'));

      // Add 'active' class to the clicked link
      link.classList.add('active');

      console.log(`Switched tab to: ${link.textContent.trim()}`);
    });
  });

  // --- 2. TOGGLE THEME LOGIC ---
  // Ensure theme is set on page load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  const themeText = themeBtn ? themeBtn.querySelector('span') : null;
  const appLogo = document.getElementById('app-logo');

  function updateThemeBtn(theme) {
    if (!themeIcon || !themeText) return;
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeText.textContent = 'Dark Mode';
    }
  }

  function updateLogo(theme) {
    if (!appLogo) return;
    appLogo.src =
      theme === 'dark'
        ? '/Assets/images/logo-dark.png'
        : '/Assets/images/logo-light.png';
  }

  // Check initial theme logic
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeBtn(currentTheme);
  updateLogo(currentTheme);

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeBtn(newTheme);
      updateLogo(newTheme);
      themeBtn.classList.add('rotating');
      setTimeout(() => {
        themeBtn.classList.remove('rotating');
      }, 500);
    });
  }

  // Update data-nav-link elements — handled by course-sidebar

  // --- 4. RENDER UI ---

  // Render List
  const container = document.getElementById('assignments-container');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const syncStats = () => {
    const completedCountEl = document.getElementById('completed-count');
    const pointsCountEl = document.getElementById('points-count');
    const progressEl = document.getElementById('overall-progress');
    if (completedCountEl)
      completedCountEl.textContent = `${assignmentData.stats.completed} of ${assignmentData.stats.total} completed`;
    if (pointsCountEl)
      pointsCountEl.textContent = `${assignmentData.stats.pointsEarned} / ${assignmentData.stats.pointsTotal} points earned`;
    if (progressEl) {
      const progress = Number(assignmentData.stats.progressPercent || 0);
      progressEl.style.width = `${progress}%`;
      progressEl.setAttribute('aria-valuenow', String(progress));
      progressEl.setAttribute('aria-valuetext', `${progress}% complete`);
    }
  };

  // Initial Render (All)
  syncStats();
  renderAssignments(activeFilter);
  hydrateAssignments();
  window.NibrasCourseSidebar?.hydrateSidebarProgress?.(selectedCourse);

  // Filter Click Logic
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      filterBtns.forEach((b) => b.classList.remove('active'));
      // Add active to clicked
      btn.classList.add('active');
      filterBtns.forEach((button) => {
        button.setAttribute(
          'aria-pressed',
          button.classList.contains('active') ? 'true' : 'false',
        );
      });
      activeFilter = btn.getAttribute('data-filter');
      // Render
      renderAssignments(activeFilter);
    });
  });

  container?.addEventListener('click', (event) => {
    const link = event.target.closest('.action-btn[data-item-id]');
    if (!link) return;
    const itemId = link.getAttribute('data-item-id');
    const item = assignmentData.items.find(
      (entry) => String(entry.id) === String(itemId),
    );
    if (!item || !item.page) return;

    const detailPayload = {
      courseId,
      ...buildAssignmentDetail(item),
    };
    localStorage.setItem(
      'selectedAssignmentDetail',
      JSON.stringify(detailPayload),
    );
  });

  function renderAssignments(filter) {
    if (!container) return;
    container.innerHTML = '';

    assignmentData.items.forEach((item) => {
      // Filter Logic
      if (filter !== 'all') {
        if (
          filter === 'pending' &&
          (item.status === 'graded' || item.status === 'submitted')
        )
          return;
        if (filter === 'submitted' && item.status !== 'submitted') return;
        if (filter === 'graded' && item.status !== 'graded') return;
      }

      // Determine Badge Class & Icon
      let badgeClass = 'badge-default';
      let badgeIcon = 'fa-regular fa-clock'; // default icon

      if (item.status === 'graded') {
        badgeClass = 'badge-graded';
        badgeIcon = 'fa-solid fa-check';
      } else if (item.status === 'submitted') {
        badgeClass = 'badge-submitted';
        badgeIcon = 'fa-solid fa-check-double';
      } else if (item.status === 'late') {
        badgeClass = 'badge-late';
        badgeIcon = 'fa-regular fa-clock';
      }

      // Points Display Logic
      let pointsHtml = `<span class="points-label">${item.points} pts</span>`;
      if (item.score !== null) {
        pointsHtml = `
                    <span class="points-label">${item.points} pts</span>
                    <span class="score-earned">${item.score}/${item.points}</span>
                `;
      }

      // Type Icon Logic
      const typeIcon =
        item.type === 'File Upload'
          ? 'fa-solid fa-upload'
          : 'fa-regular fa-file-lines';

      const itemHref = item.page
        ? window.NibrasCourses.withCourseId(item.page, courseId)
        : '#';
      const actionDisabled = !item.page;
      var actionLabel = isInstructor ? 'Grade Assignment' : 'Submit';
      const actionText = actionDisabled ? 'Unavailable' : actionLabel;
      const actionAriaLabel = actionDisabled
        ? `Assignment details unavailable for ${item.title}`
        : `${actionLabel} for ${item.title}`;
      const actionAttributes = actionDisabled
        ? 'aria-disabled="true" tabindex="-1"'
        : '';

      const html = `
                <article class="assignment-card">
                    <div class="card-header">
                        <div class="card-title-group">
                            <h3>${item.title}</h3>
                            <span class="status-badge ${badgeClass}">
                                <i class="${badgeIcon}"></i> ${item.statusLabel}
                            </span>
                        </div>
                        <div class="card-points">
                            ${pointsHtml}
                        </div>
                    </div>
                    
                    <p class="card-desc">${item.description}</p>
                    
                    <div class="card-footer">
                        <div class="meta-info">
                            <div class="meta-item">
                                <i class="fa-regular fa-calendar"></i> Due: ${item.dueDate}
                            </div>
                            <div class="meta-item">
                                <i class="fa-regular fa-clock"></i> ${item.dueTime}
                            </div>
                            <div class="meta-item">
                                <i class="${typeIcon}"></i> ${item.type}
                            </div>
                        </div>
                        <a href="${itemHref}" class="action-btn" aria-label="${actionAriaLabel}" data-item-id="${item.id}" ${actionAttributes}>${actionText}</a>
                    </div>
                </article>
            `;
      container.innerHTML += html;
    });

    // Empty State
    if (container.innerHTML === '') {
      if (sharedUiStates?.render) {
        sharedUiStates.render(container, {
          state: 'empty',
          message:
            'No assignments match this filter yet. Try another filter to see your work.',
        });
      } else {
        container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No assignments match this filter yet. Try another filter to see your work.</div>`;
      }
    }
  }

  function buildAssignmentDetail(item) {
    const hasScore = item.score != null;
    return {
      source: item.source || 'static',
      assignmentId: item.id || null,
      trackingAssignmentId: item.trackingAssignmentId || null,
      backendAssignmentId: item.backendAssignmentId || null,
      backendCourseId:
        selectedCourse.adminCourseId || selectedCourse.backendCourseId || null,
      assignmentType: item.assignmentType || null,
      title: item.title,
      points: item.points,
      scoreEarned: hasScore ? item.score : 0,
      description: item.description,
      dueDate: item.dueDate,
      dueTime: item.dueTime,
      submissionType: item.type,
      status: item.rawStatus || item.status || 'not_started',
      milestoneId: item.milestoneId || item.id || `ms-${item.title}`,
      projectKey: item.projectKey || `${courseId}-project-1`,
      instructions: {
        intro: item.description || '',
        points: [],
      },
      files: item.files || [],
      rubric: item.rubric || [],
      feedback: hasScore
        ? {
            comment: item.feedbackComment || '',
            grader: item.grader || selectedCourse.instructor,
            date: item.feedbackDate || '',
          }
        : null,
    };
  }

  async function hydrateAssignments() {
    var mappers = window.NibrasCourseMappers;
    var trackingSvc = window.NibrasServices?.trackingCourseService;
    var trackingId =
      window.NibrasCourseSidebar?.resolveTrackingId?.(selectedCourse);
    var lists = [];

    if (!assignmentData.items?.length) {
      setAssignmentsNotice('Loading assignments...', 'loading');
    }

    if (trackingSvc && trackingId && trackingSvc.listAssignments) {
      try {
        var trackingRes = await trackingSvc.listAssignments(trackingId);
        var trackingItems = Array.isArray(trackingRes)
          ? trackingRes
          : trackingRes?.data || trackingRes?.items || [];
        if (trackingItems.length && mappers?.mapTrackingAssignmentToCard) {
          lists.push(
            trackingItems.map(function (item) {
              return mappers.mapTrackingAssignmentToCard(item, courseId);
            }),
          );
        }
      } catch (error) {
        console.warn(
          '[ASSIGNMENTS.JS] Tracking hydrate failed:',
          error?.message || error,
        );
      }
    }

    var loadAdmin = window.NibrasCourses?.getAdminAssignmentsByCourseId;
    if (typeof loadAdmin === 'function') {
      try {
        var adminData = await loadAdmin(courseId);
        if (adminData?.items?.length) {
          lists.push(
            adminData.items.map(function (item) {
              return Object.assign({}, item, {
                source: item.source || 'nestjs',
                page:
                  item.page || './Assignments Content/AssignmentContent.html',
              });
            }),
          );
        }
      } catch (error) {
        console.warn(
          '[ASSIGNMENTS.JS] Admin hydrate failed:',
          error?.message || error,
        );
      }
    }

    var assignmentsService = window.NibrasServices?.backendCoursesService;
    var backendId = backendCourseId;
    if (!backendId) {
      var resolveAsync = window.NibrasCourses?.resolveCourseIdentifiersAsync;
      var identifiers =
        typeof resolveAsync === 'function'
          ? await resolveAsync(courseId, { loadRemote: true })
          : null;
      backendId =
        identifiers?.adminCourseId || identifiers?.backendCourseId || null;
    }
    if (
      assignmentsService &&
      typeof assignmentsService.getAssignments === 'function' &&
      backendId
    ) {
      try {
        var response = await assignmentsService.getAssignments(backendId);
        var nestItems = Array.isArray(response?.data) ? response.data : [];
        if (nestItems.length && mappers?.mapNestjsAssignmentToCard) {
          lists.push(
            nestItems.map(function (item) {
              return mappers.mapNestjsAssignmentToCard(item, courseId);
            }),
          );
        }
      } catch (error) {
        console.warn(
          '[ASSIGNMENTS.JS] NestJS hydrate failed:',
          error?.message || error,
        );
      }
    }

    if (selectedCourse.assignments?.items?.length) {
      lists.push(
        selectedCourse.assignments.items.map(function (item) {
          return Object.assign({}, item, {
            source: item.source || 'static',
            page: item.page || './Assignments Content/AssignmentContent.html',
          });
        }),
      );
    }

    var merged = mappers?.mergeAssignmentLists
      ? mappers.mergeAssignmentLists(lists)
      : lists.flat();

    if (merged.length) {
      assignmentData = {
        items: merged,
        stats: mappers?.computeAssignmentStats
          ? mappers.computeAssignmentStats(merged)
          : assignmentData.stats,
      };
      syncStats();
      renderAssignments(activeFilter);
    }

    setAssignmentsNotice('');
  }
});
