window.NibrasReact.run(() => {
  const service = window.NibrasServices?.competitionsService;
  const statsEl = document.getElementById('stats-line');
  const listEl = document.getElementById('topics-list');

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function flattenTopics(node, depth = 0, acc = []) {
    if (!node) return acc;
    if (Array.isArray(node)) {
      node.forEach((entry) => flattenTopics(entry, depth, acc));
      return acc;
    }
    acc.push({
      title: node.title || node.name || node.slug || 'Topic',
      solved: Number(node.solved || node.solvedCount || 0),
      total: Number(node.total || node.problemCount || node.count || 0),
      depth,
    });
    const children = node.children || node.topics || node.subtopics || [];
    if (Array.isArray(children)) children.forEach((child) => flattenTopics(child, depth + 1, acc));
    return acc;
  }

  async function load() {
    if (!service) {
      listEl.innerHTML = '<div class="feature-card">Competitions service unavailable.</div>';
      return;
    }
    listEl.innerHTML = '<div class="feature-card">Loading CP Roadmap...</div>';
    try {
      const [roadmap, stats] = await Promise.all([
        service.getRoadmap(),
        service.getProgress().catch(() => ({})),
      ]);
      const solved = Number(stats.solved || stats.solvedCount || 0);
      const total = Number(stats.total || stats.problemCount || 0);
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      statsEl.innerHTML = `<strong>${solved} / ${total || '—'} problems solved</strong><div class="progress-bar"><span style="width:${pct}%"></span></div>`;
      const topics = flattenTopics(roadmap.categories || roadmap.topics || roadmap);
      if (!topics.length) {
        listEl.innerHTML = '<div class="feature-card">No roadmap topics available.</div>';
        return;
      }
      listEl.innerHTML = topics
        .map((topic) => {
          const progress = topic.total > 0 ? `${topic.solved}/${topic.total}` : `${topic.solved}`;
          return `<article class="feature-card" style="margin-left:${topic.depth * 16}px"><strong>${esc(topic.title)}</strong><span class="status-pill">${esc(progress)}</span></article>`;
        })
        .join('');
    } catch (error) {
      listEl.innerHTML = `<div class="feature-card">Failed to load CP Roadmap: ${esc(error.message || 'Unknown error')}</div>`;
    }
  }

  load();
});
