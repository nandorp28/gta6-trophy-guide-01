// Leonida Legends — offline trophy tracker for GTA VI (55 PS5 trophies).
// Loads app/data/trophies.json, renders the checklist, and keeps earned
// ticks in localStorage. No network requests beyond the local data file.

const STORAGE_KEY = 'leonida-legends-earned-v1';
const SPOILER_KEY = 'leonida-legends-spoilers-v1';

const listEl = document.getElementById('trophyList');
const progressText = document.getElementById('progressText');
const gradeCounts = document.getElementById('gradeCounts');
const progressFill = document.getElementById('progressFill');
const progressBar = document.getElementById('progressBar');
const shownCount = document.getElementById('shownCount');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const spoilerToggle = document.getElementById('spoilerToggle');
const kindFilters = document.getElementById('kindFilters');

let trophies = [];
let earned = new Set(readStoredEarned());
let activeKind = 'all';
let openNames = new Set();

function readStoredEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function persistEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort()));
}

function spoilersHidden() {
  return spoilerToggle.checked;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isMasked(trophy) {
  return spoilersHidden() && trophy.hidden && !earned.has(trophy.name);
}

function trophyMatches(trophy) {
  if (activeKind === 'online') return false; // no online trophies exist
  if (activeKind !== 'all' && trophy.kind !== activeKind) return false;
  if (gradeFilter.value !== 'all' && trophy.grade !== gradeFilter.value) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return true;
  const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.kind}`.toLowerCase();
  return hay.includes(q);
}

function sourceLink(source) {
  const a = document.createElement('a');
  a.textContent = source.name;
  if (source.url) {
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

function buildDetail(trophy) {
  const detail = document.createElement('div');
  detail.className = 'trophy-detail';
  detail.hidden = !openNames.has(trophy.name);

  const guidePara = document.createElement('p');
  guidePara.textContent = trophy.guide;
  detail.append(guidePara);

  if (Array.isArray(trophy.steps) && trophy.steps.length > 0) {
    const h = document.createElement('h4');
    h.textContent = 'Steps';
    detail.append(h);
    const ol = document.createElement('ol');
    for (const step of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.append(li);
    }
    detail.append(ol);
  }

  if (trophy.missable) {
    const warn = document.createElement('p');
    warn.className = 'warning';
    warn.textContent = 'Missable warning: do the Chapter 1 balcony meditation at Jason\u2019s house on the morning after \u201cDown to Earth\u201d, before Chapter 1 ends.';
    detail.append(warn);
  }

  if (Array.isArray(trophy.sources) && trophy.sources.length > 0) {
    const src = document.createElement('p');
    src.className = 'sources';
    src.append(document.createTextNode('Sources: '));
    trophy.sources.forEach((s, i) => {
      if (i > 0) src.append(document.createTextNode(' \u00b7 '));
      src.append(sourceLink(s));
    });
    detail.append(src);
  }
  return detail;
}

function buildItem(trophy) {
  const li = document.createElement('li');
  li.className = 'trophy-item' + (earned.has(trophy.name) ? ' earned' : '');
  li.dataset.name = trophy.name;

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'trophy-head';
  head.setAttribute('aria-expanded', String(openNames.has(trophy.name)));

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.name);
  box.setAttribute('aria-label', `Earned: ${trophy.name}`);
  box.addEventListener('click', (event) => event.stopPropagation());
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.name);
    else earned.delete(trophy.name);
    persistEarned();
    render();
  });
  head.append(box);

  const main = document.createElement('div');
  main.className = 'trophy-main';
  const nameEl = document.createElement('div');
  nameEl.className = 'trophy-name';
  nameEl.textContent = isMasked(trophy) ? 'Hidden trophy \u2014 earn it to reveal' : trophy.name;
  const descEl = document.createElement('div');
  descEl.className = 'trophy-desc';
  descEl.textContent = isMasked(trophy) ? 'Hidden on PlayStation until earned.' : trophy.description;
  main.append(nameEl, descEl);

  const badges = document.createElement('div');
  badges.className = 'trophy-badges';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge ${trophy.grade}`;
  gradeBadge.textContent = gradeLabel(trophy.grade);
  badges.append(gradeBadge);
  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge kind';
  kindBadge.textContent = trophy.kind;
  badges.append(kindBadge);
  if (typeof trophy.count === 'number') {
    const countBadge = document.createElement('span');
    countBadge.className = 'badge count';
    countBadge.textContent = `target: ${trophy.count.toLocaleString('en-US')}`;
    badges.append(countBadge);
  }
  if (trophy.hidden) {
    const hiddenBadge = document.createElement('span');
    hiddenBadge.className = 'badge hidden-tag';
    hiddenBadge.textContent = 'Hidden';
    badges.append(hiddenBadge);
  }
  if (trophy.missable) {
    const missBadge = document.createElement('span');
    missBadge.className = 'badge warn';
    missBadge.textContent = 'Missable';
    badges.append(missBadge);
  }
  main.append(badges);
  head.append(main);

  const chevron = document.createElement('span');
  chevron.className = 'trophy-toggle';
  chevron.textContent = openNames.has(trophy.name) ? '\u25b2' : '\u25bc';
  chevron.setAttribute('aria-hidden', 'true');
  head.append(chevron);

  head.addEventListener('click', () => {
    if (openNames.has(trophy.name)) openNames.delete(trophy.name);
    else openNames.add(trophy.name);
    render();
  });

  li.append(head, buildDetail(trophy));
  return li;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressText.textContent = `${done} of ${total} earned \u00b7 ${pct}%`;
  progressFill.style.width = `${pct}%`;
  progressBar.setAttribute('aria-valuenow', String(done));
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  gradeCounts.textContent = grades
    .map((g) => `${trophies.filter((t) => t.grade === g && earned.has(t.name)).length}/${trophies.filter((t) => t.grade === g).length} ${g}`)
    .join(' \u00b7 ');
}

function render() {
  renderProgress();
  listEl.replaceChildren();
  let shown = 0;
  for (const trophy of trophies) {
    if (!trophyMatches(trophy)) continue;
    shown += 1;
    listEl.append(buildItem(trophy));
  }
  shownCount.textContent = `(${shown} shown)`;
  emptyState.hidden = shown > 0;
  if (activeKind === 'online') {
    emptyState.hidden = false;
    emptyState.textContent = 'No online trophies \u2014 all 55 are single-player.';
  } else if (shown === 0) {
    emptyState.textContent = 'No trophies match these filters.';
  }
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const data = JSON.parse(String(reader.result));
      const names = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(names)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.name));
      earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
      persistEarned();
      render();
    } catch {
      alert('That file is not a valid trophy-progress export.');
    }
  });
  reader.readAsText(file);
}

async function init() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  trophies = data.trophies ?? data;
  spoilerToggle.checked = localStorage.getItem(SPOILER_KEY) !== 'off';
  spoilerToggle.addEventListener('change', () => {
    localStorage.setItem(SPOILER_KEY, spoilerToggle.checked ? 'on' : 'off');
    render();
  });
  searchInput.addEventListener('input', render);
  gradeFilter.addEventListener('change', render);
  kindFilters.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-kind]');
    if (!btn) return;
    activeKind = btn.dataset.kind;
    kindFilters.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  const importFile = document.getElementById('importFile');
  document.getElementById('importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    if (importFile.files[0]) importProgress(importFile.files[0]);
    importFile.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned ticks?')) {
      earned = new Set();
      persistEarned();
      render();
    }
  });
  render();
}

init();
