window.NibrasReact.run(() => {
  const service = window.NibrasServices?.competitionsService;
  const cardEl = document.getElementById('daily-card');
  const feedbackEl = document.getElementById('daily-feedback');
  const verifyBtn = document.getElementById('verify-btn');
  const solveBtn = document.getElementById('solve-btn');

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function setFeedback(message, isError) {
    feedbackEl.textContent = message || '';
    feedbackEl.style.color = isError ? '#dc2626' : 'var(--text-secondary,#6b7280)';
  }

  function renderAssignment(payload) {
    const problem = payload?.problem || payload?.assignment?.problem || payload;
    if (!problem) {
      cardEl.innerHTML = 'No daily problem assigned for today.';
      return;
    }
    const title = problem.title || problem.name || 'Daily Problem';
    const platform = problem.platform || payload.platform || 'platform';
    const url = problem.url || '#';
    const status = payload.status || payload.assignment?.status || 'pending';
    cardEl.innerHTML = `
      <h2 style="margin:0 0 8px;">${esc(title)}</h2>
      <div><span class="status-pill">${esc(platform)}</span>
        <span class="status-pill">${esc(status)}</span></div>
      <div class="feature-actions">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="tab-btn" style="display:inline-block;">Open Problem</a>
      </div>
    `;
  }

  async function load() {
    if (!service) {
      cardEl.textContent = 'Competitions service unavailable.';
      return;
    }
    try {
      const payload = await service.getDailyProblemToday();
      renderAssignment(payload);
    } catch (error) {
      cardEl.textContent = error.message || 'Failed to load daily problem.';
    }
  }

  verifyBtn?.addEventListener('click', async () => {
    setFeedback('Verifying submission...');
    try {
      const result = await service.verifyDailyProblem();
      setFeedback(result?.message || 'Verification successful.');
      await load();
    } catch (error) {
      setFeedback(error.message || 'Verification failed.', true);
    }
  });

  solveBtn?.addEventListener('click', async () => {
    setFeedback('Marking as solved...');
    try {
      const result = await service.solveDailyProblem();
      setFeedback(result?.message || 'Marked as solved.');
      await load();
    } catch (error) {
      setFeedback(error.message || 'Could not mark as solved.', true);
    }
  });

  load();
});
