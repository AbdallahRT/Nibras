window.NibrasReact.run(() => {
  const service = window.NibrasServices?.competitionsService;
  const statsEl = document.getElementById('stats-line');
  const listEl = document.getElementById('problems-list');

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function load() {
    if (!service) {
      listEl.innerHTML = '<div class="feature-card">Competitions service unavailable.</div>';
      return;
    }
    listEl.innerHTML = '<div class="feature-card">Loading Nibras 75...</div>';
    try {
      const [stats, problemsPayload] = await Promise.all([
        service.getNibras75Stats().catch(() => ({})),
        service.listNibras75Problems({ limit: 100 }),
      ]);
      const solved = Number(stats.solved || stats.solvedCount || 0);
      const total = Number(stats.total || stats.totalCount || 75);
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      statsEl.innerHTML = `
        <strong>${solved} / ${total} solved</strong>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
      `;
      const problems = Array.isArray(problemsPayload?.problems)
        ? problemsPayload.problems
        : Array.isArray(problemsPayload)
          ? problemsPayload
          : [];
      if (!problems.length) {
        listEl.innerHTML = '<div class="feature-card">No problems found.</div>';
        return;
      }
      listEl.innerHTML = problems
        .map((problem) => {
          const status = problem.solved || problem.isSolved ? 'Solved' : 'Unsolved';
          const url = problem.url || '#';
          return `<article class="feature-card">
            <div><strong>${esc(problem.title || problem.name || 'Problem')}</strong>
              <span class="status-pill">${esc(status)}</span></div>
            <div style="margin-top:8px;color:var(--text-secondary,#6b7280);">
              ${esc((problem.tags || []).join(', '))}
            </div>
            <div class="feature-actions">
              <a href="${esc(url)}" target="_blank" rel="noopener" class="tab-btn" style="display:inline-block;">Open</a>
            </div>
          </article>`;
        })
        .join('');
    } catch (error) {
      listEl.innerHTML = `<div class="feature-card">Failed to load Nibras 75: ${esc(error.message || 'Unknown error')}</div>`;
    }
  }

  load();
});
