(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseArrayPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.announcements)) return payload.announcements;
    return [];
  }

  function formatAnnouncementDate(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (_) {
      return '';
    }
  }

  function sortAnnouncements(items) {
    return items.slice().sort(function (a, b) {
      var aTime = new Date(a?.publishedAt || a?.createdAt || 0).getTime();
      var bTime = new Date(b?.publishedAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  function withCourseId(path, courseId) {
    if (window.NibrasCourseSidebar?.withCourseId) {
      return window.NibrasCourseSidebar.withCourseId(path, courseId);
    }
    if (!path || !courseId) return path || '#';
    var sep = path.includes('?') ? '&' : '?';
    return path + sep + 'courseId=' + encodeURIComponent(courseId);
  }

  function overviewPath(courseId) {
    var pathname = window.location.pathname || '';
    if (pathname.includes('/Course Description/')) {
      return './courseContent.html';
    }
    if (pathname.includes('/Assignments/Assignments Content/')) {
      return '../../Course Description/courseContent.html';
    }
    return '../Course Description/courseContent.html';
  }

  function ensureUi() {
    if (!document.getElementById('course-announcement-banner')) {
      var banner = document.createElement('section');
      banner.id = 'course-announcement-banner';
      banner.className = 'course-announcement-banner';
      banner.hidden = true;
      banner.innerHTML =
        '<i class="fa-regular fa-bell" aria-hidden="true"></i>' +
        '<div class="course-announcement-banner-body">' +
        '<span class="course-announcement-banner-title" id="course-announcement-banner-title"></span>' +
        '<p class="course-announcement-banner-message" id="course-announcement-banner-message"></p>' +
        '<div class="course-announcement-banner-meta" id="course-announcement-banner-meta"></div>' +
        '</div>';
      var main = document.querySelector('.main-content');
      if (main) {
        main.insertBefore(banner, main.firstChild);
      }
    }

    if (!document.getElementById('course-announcement-view-modal')) {
      var overlay = document.createElement('div');
      overlay.id = 'course-announcement-view-modal';
      overlay.className = 'course-announcement-view-overlay';
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="course-announcement-view-modal" role="dialog" aria-labelledby="course-announcement-view-title">' +
        '<div class="course-announcement-view-header">' +
        '<h3 id="course-announcement-view-title">Course Announcement</h3>' +
        '<button type="button" class="modal-close-btn" id="course-announcement-view-close" aria-label="Close">' +
        '<i class="fa-solid fa-xmark"></i>' +
        '</button>' +
        '</div>' +
        '<div class="course-announcement-view-date" id="course-announcement-view-date"></div>' +
        '<div class="course-announcement-view-body" id="course-announcement-view-body"></div>' +
        '<div class="course-announcement-view-actions">' +
        '<button type="button" class="btn-primary" id="course-announcement-view-dismiss">Got it</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeViewModal();
      });
      document
        .getElementById('course-announcement-view-close')
        ?.addEventListener('click', closeViewModal);
      document
        .getElementById('course-announcement-view-dismiss')
        ?.addEventListener('click', closeViewModal);
    }
  }

  function closeViewModal() {
    var modal = document.getElementById('course-announcement-view-modal');
    if (modal) modal.hidden = true;
  }

  function renderBanner(announcement, courseId, totalCount) {
    var banner = document.getElementById('course-announcement-banner');
    if (!banner || !announcement) return;

    var title = announcement.title || 'Announcement';
    var body = announcement.body || announcement.content || '';
    var date = formatAnnouncementDate(
      announcement.publishedAt || announcement.createdAt,
    );
    var titleEl = document.getElementById('course-announcement-banner-title');
    var messageEl = document.getElementById('course-announcement-banner-message');
    var metaEl = document.getElementById('course-announcement-banner-meta');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = body;
    if (metaEl) {
      var metaParts = [];
      if (date) metaParts.push('Posted ' + date);
      if (totalCount > 1) {
        metaParts.push(
          totalCount + ' announcements • ' +
            '<a href="' +
            escapeHtml(withCourseId(overviewPath(courseId), courseId)) +
            '">View all</a>',
        );
      }
      metaEl.innerHTML = metaParts.join(' • ');
    }
    banner.hidden = false;
  }

  function showViewModal(announcement) {
    if (!announcement) return;
    ensureUi();
    var modal = document.getElementById('course-announcement-view-modal');
    var titleEl = document.getElementById('course-announcement-view-title');
    var dateEl = document.getElementById('course-announcement-view-date');
    var bodyEl = document.getElementById('course-announcement-view-body');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = announcement.title || 'Course Announcement';
    dateEl.textContent = formatAnnouncementDate(
      announcement.publishedAt || announcement.createdAt,
    );
    bodyEl.textContent = announcement.body || announcement.content || '';
    modal.hidden = false;
  }

  async function displayOnCourseOpen(selectedCourse) {
    if (!selectedCourse) return;

    var trackingId =
      window.NibrasCourseSidebar?.resolveTrackingId?.(selectedCourse);
    var trackingSvc = window.NibrasServices?.trackingCourseService;
    if (!trackingId || !trackingSvc || typeof trackingSvc.listAnnouncements !== 'function') {
      return;
    }

    ensureUi();

    try {
      var payload = await trackingSvc.listAnnouncements(trackingId);
      var items = sortAnnouncements(parseArrayPayload(payload));
      if (!items.length) {
        var banner = document.getElementById('course-announcement-banner');
        if (banner) banner.hidden = true;
        return;
      }

      var latest = items[0];
      renderBanner(latest, selectedCourse.id, items.length);
    } catch (error) {
      console.warn(
        '[course-announcements] Failed to load announcements:',
        error?.message || error,
      );
    }
  }

  window.NibrasCourseAnnouncements = {
    displayOnCourseOpen: displayOnCourseOpen,
    closeViewModal: closeViewModal,
  };
})();
