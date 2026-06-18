window.NibrasReact.run(() => {
  const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
  if (!selectedCourse) return;
  const courseId = selectedCourse.id;

  window.NibrasCourseSidebar?.initCoursePageChrome?.({
    activeKey: 'grades',
    pageRoot: 'grades',
    deferProgress: true,
  });

  // --- THEME TOGGLE ---
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

  let gradesData = selectedCourse.grades;
  renderUI(gradesData);
  hydrateGradesFromTracking();
  window.NibrasCourseSidebar?.hydrateSidebarProgress?.(selectedCourse);

  async function hydrateGradesFromTracking() {
    var trackingSvc = window.NibrasServices?.trackingCourseService;
    var trackingId =
      window.NibrasCourseSidebar?.resolveTrackingId?.(selectedCourse);
    if (!trackingSvc || !trackingId || !trackingSvc.getMyGrades) return;

    try {
      var payload = await trackingSvc.getMyGrades(trackingId);
      var rollup = payload?.data || payload;
      if (
        !rollup ||
        (!rollup.assignments?.length && !rollup.projects?.length)
      ) {
        return;
      }
      var mapped = window.NibrasCourseMappers?.mapTrackingGradesToUi?.(
        rollup,
        selectedCourse,
        courseId,
      );
      if (mapped) {
        gradesData = mapped;
        renderUI(gradesData);
      }
    } catch (error) {
      console.warn(
        '[GRADES.JS] Failed to hydrate from tracking API:',
        error?.message || error,
      );
    }
  }

  function renderUI(data) {
    if (!data) return;

    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = '';
      (data.stats || []).forEach((stat) => {
        const isPrimary = stat.type === 'primary' ? 'primary-blue' : '';
        const textColor =
          stat.color === 'red'
            ? 'style="color: #ef4444;"'
            : stat.color === 'green'
              ? 'style="color: #10b981;"'
              : '';
        const extraHtml = stat.extra
          ? `<span class="grade-f">${stat.extra}</span>`
          : '';

        statsContainer.innerHTML += `
                <div class="stat-box ${isPrimary}">
                    <div class="stat-label"><i class="${stat.icon}"></i> ${stat.label}</div>
                    <div class="stat-value" ${textColor}>${stat.value} ${extraHtml}</div>
                    <div class="stat-sub">${stat.sub}</div>
                </div>
            `;
      });
    }

    const bdContainer = document.getElementById('breakdown-container');
    if (bdContainer) {
      bdContainer.innerHTML = '';
      (data.breakdown || []).forEach((item) => {
        bdContainer.innerHTML += `
                <div class="bd-item">
                    <div class="bd-header">
                        <div>
                            <div class="bd-title">${item.category}</div>
                            <div class="bd-sub">${item.score} points • ${item.weight}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="bd-percent">${item.percent}</div>
                            <div class="bd-sub">${item.change || ''}</div>
                        </div>
                    </div>
                    <div class="bd-bar-track">
                        <div class="bd-bar-fill" style="width: ${parseFloat(item.percent)}%; background-color: ${item.color};"></div>
                    </div>
                </div>
            `;
      });
    }

    const gradesContainer = document.getElementById('grades-list-container');
    if (gradesContainer) {
      gradesContainer.innerHTML = '';
      (data.grades || []).forEach((grade) => {
        let scoreHtml = '';
        let statusHtml = '';
        let viewHtml = '';

        if (grade.status === 'Pending') {
          scoreHtml = `<div class="g-points" style="font-size: 0.9rem; color: var(--text-secondary);"><i class="fa-regular fa-clock"></i> Pending</div>`;
          if (grade.detailHref) {
            viewHtml = `<a class="view-link" href="${grade.detailHref}">View Details</a>`;
          }
        } else {
          scoreHtml = `
                    <span class="g-points">${grade.score}</span>
                    <span class="g-pct" style="color: ${parseFloat(grade.percent) < 60 ? 'var(--grade-f)' : 'var(--grade-a)'};">${grade.percent}</span>
                `;

          let badgeClass = 'g-status';
          if (grade.status === 'Late Submission') badgeClass += ' status-late';

          statusHtml = `<span class="${badgeClass}">${grade.status === 'Late Submission' ? 'Late Submission' : 'Graded'}</span>`;
          if (grade.detailHref) {
            viewHtml = `<a class="view-link" href="${grade.detailHref}">View Details</a>`;
          }
        }

        gradesContainer.innerHTML += `
                <div class="grade-row">
                    <div class="g-info">
                        <h4>${grade.title}</h4>
                        <span class="g-meta">${grade.type} • ${grade.date}</span>
                        <div style="margin-top:0.5rem;">${statusHtml}</div>
                    </div>
                    <div class="g-score">
                        ${scoreHtml}
                        ${viewHtml}
                    </div>
                </div>
            `;
      });
    }

    const scaleContainer = document.getElementById('scale-container');
    const scaleSection = document.getElementById('grading-scale-section');
    if (scaleContainer) {
      scaleContainer.innerHTML = '';
      const scaleItems = data.scale || [];
      if (!scaleItems.length) {
        if (scaleSection) scaleSection.style.display = 'none';
      } else {
        if (scaleSection) scaleSection.style.display = '';
        scaleItems.forEach((s) => {
        let bgVar = `var(--scale-${s.color}-bg)`;
        let textVar = `var(--scale-${s.color}-text)`;

        scaleContainer.innerHTML += `
                <div class="scale-row">
                    <div class="scale-badge" style="background-color: ${bgVar}; color: ${textVar};">${s.grade}</div>
                    <span>${s.range}</span>
                </div>
            `;
      });
      }
    }

    const wContainer = document.getElementById('weights-container');
    const weightsSection = document.getElementById('grade-weights-section');
    if (wContainer) {
      wContainer.innerHTML = '';
      const weightItems = data.weights || [];
      if (!weightItems.length) {
        if (weightsSection) weightsSection.style.display = 'none';
      } else {
        if (weightsSection) weightsSection.style.display = '';
        weightItems.forEach((w) => {
        wContainer.innerHTML += `
                <div class="info-row">
                    <span>${w.cat}</span>
                    <span>${w.pct}</span>
                </div>
            `;
      });
      }
    }
  }
});
