// Leonida Atlas — checklist tracker for the 55 GTA VI trophies.
// Loads app/data/trophies.json, renders the checklist, saves earned trophies
// in localStorage, and offers export / import of that progress. No network
// requests beyond the local data file; no external scripts or fonts.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-atlas-progress-v1';

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

let trophies = [];
let earned = new Set();
let selectedId = null;
let activeKind = 'all';
let activeGrade = 'all';
let hideSpoilers = true;
let query = '';

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) earned = new Set(saved.earned.filter((n) => typeof n === 'number'));
    if (typeof saved.hideSpoilers === 'boolean') hideSpoilers = saved.hideSpoilers;
  } catch {
    earned = new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), hideSpoilers }));
  } catch {
    // Private mode or full storage: progress just does not persist.
  }
}

function trophyById(id) {
  return trophies.find((t) => t.id === id) ?? null;
}

function isMasked(trophy) {
  return hideSpoilers && trophy.hidden && !earned.has(trophy.id);
}

function badgeHtml(trophy) {
  const bits = [`<span class="badge ${trophy.grade}">${GRADE_LABEL[trophy.grade]}</span>`];
  if (trophy.hidden) bits.push('<span class="badge hidden">Hidden</span>');
  if (trophy.missable) bits.push('<span class="badge warn">Missable</span>');
  if (trophy.unconfirmed) bits.push('<span class="badge unconfirmed">Unconfirmed</span>');
  return bits.join('');
}

function matchesFilters(trophy) {
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && trophy.kind !== activeKind) return false;
  if (activeGrade !== 'all' && trophy.grade !== activeGrade) return false;
  if (query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderChecklist() {
  const list = $('trophyList');
  const shown = trophies.filter(matchesFilters);
  $('shownCount').textContent = `(${shown.length} of ${trophies.length} shown)`;
  $('emptyState').hidden = shown.length > 0;
  if (activeKind === 'online' && shown.length === 0) {
    $('emptyState').hidden = false;
    $('emptyState').textContent = 'No online trophies in this list — every GTA VI trophy can be earned offline, in single player.';
  } else if (shown.length === 0) {
    $('emptyState').textContent = 'No trophies match these filters.';
  }

  list.innerHTML = shown.map((trophy) => {
    const isEarned = earned.has(trophy.id);
    const masked = isMasked(trophy);
    const name = masked ? 'Hidden trophy — earn it to reveal' : escapeHtml(trophy.name);
    const desc = masked ? 'Its name and description are hidden until you earn it.' : escapeHtml(trophy.description);
    const count = trophy.count != null ? ` <span class="count">(${formatCount(trophy.count)})</span>` : '';
    return `<li class="trophy-row${isEarned ? ' earned' : ''}${selectedId === trophy.id ? ' selected' : ''}" data-id="${trophy.id}" role="button" tabindex="0">
      <input type="checkbox" data-check="${trophy.id}" ${isEarned ? 'checked' : ''} aria-label="Earned: ${masked ? 'hidden trophy' : escapeHtml(trophy.name)}">
      <div><div class="trophy-name">${name}${masked ? '' : count}</div><div class="trophy-desc">${desc}</div></div>
      <div class="badges">${badgeHtml(trophy)}</div>
    </li>`;
  }).join('');
}

function formatCount(n) {
  return n >= 1000 ? n.toLocaleString('en-US') : String(n);
}

function updateProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('progressText').textContent = `${done} of ${total} earned · ${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(done));
  $('progressBar').setAttribute('aria-valuemax', String(total));
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const have = trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
    const of = trophies.filter((t) => t.grade === grade).length;
    return `${GRADE_LABEL[grade]} ${have}/${of}`;
  });
  $('gradeCounts').textContent = parts.join(' · ');
}

function renderDetailPanel() {
  const body = $('detailBody');
  const trophy = selectedId == null ? null : trophyById(selectedId);
  if (!trophy) {
    body.innerHTML = '<p class="detail-empty">Pick a trophy from the checklist and its guide, steps and sources appear here.</p>';
    return;
  }
  const masked = isMasked(trophy);
  const name = masked ? 'Hidden trophy' : escapeHtml(trophy.name);
  const desc = masked ? 'Its name and description are hidden until you earn it.' : escapeHtml(trophy.description);
  const steps = (trophy.steps ?? []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const sources = (trophy.sources ?? []).map((s) => s.url
    ? `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a></li>`
    : `<li>${escapeHtml(s.name)}</li>`).join('');
  const metaBits = [];
  if (trophy.count != null) metaBits.push(`<strong>Target:</strong> ${formatCount(trophy.count)} total`);
  metaBits.push(`Stage ${trophy.stage} — ${escapeHtml(stageName(trophy.stage))}`);
  const metaLine = `<p class="compact">${metaBits.join(' &middot; ')}</p>`;
  const missableLine = trophy.missable
    ? `<p class="missable-note"><strong>Missable:</strong> ${escapeHtml(trophy.missable_note ?? 'Can be missed — see the guide below.')}</p>` : '';
  const unconfirmedLine = trophy.unconfirmed
    ? `<p class="missable-note"><strong>Unconfirmed:</strong> no published guide has confirmed this trigger yet — the steps below are the best reading of the official description.</p>` : '';
  body.innerHTML = `
    <div class="badges">${badgeHtml(trophy)}</div>
    <h3>${name}</h3>
    <p class="trophy-desc">${desc}</p>
    ${metaLine}${missableLine}${unconfirmedLine}
    <p class="label">Guide</p>
    <p>${masked ? 'Earn this trophy to reveal its guide.' : escapeHtml(trophy.guide)}</p>
    ${masked ? '' : `<p class="label">Sources</p><ul class="sources">${sources}</ul>`}
    ${masked ? '' : `<p class="label">Steps</p><ol>${steps}</ol>`}
    <div class="detail-actions">
      <button type="button" id="detailToggle">${earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned'}</button>
    </div>`;
  $('detailToggle').addEventListener('click', () => toggleEarned(trophy.id));
}

function stageName(stage) {
  return { 1: 'Play the story', 2: 'Strangers & side strands', 3: 'Activities & combat', 4: 'Collectibles & 100%' }[stage] ?? '';
}

function buildRoadmapStages() {
  for (const stage of [1, 2, 3, 4]) {
    const slot = document.querySelector(`.stage-trophies[data-stage="${stage}"]`);
    if (!slot) continue;
    const names = trophies.filter((t) => t.stage === stage).map((t) => t.name);
    slot.innerHTML = `<b>${names.length} trophies:</b> ${names.map(escapeHtml).join(' · ')}`;
  }
}

function buildMissableList() {
  const box = $('missableList');
  const flagged = trophies.filter((t) => t.missable);
  if (flagged.length === 0) {
    box.innerHTML = '<p>No trophy in this list is flagged as missable.</p>';
    return;
  }
  box.innerHTML = flagged.map((t) => `
    <article class="missable-card">
      <h3>${escapeHtml(t.name)} <span class="badge ${t.grade}">${GRADE_LABEL[t.grade]}</span> <span class="badge warn">Missable?</span></h3>
      <p>${escapeHtml(t.description)}</p>
      <p>${escapeHtml(t.missable_note ?? '')}</p>
      <p><strong>Guide:</strong> ${escapeHtml(t.guide)}</p>
      <p class="sources">Sources: ${(t.sources ?? []).map((s) => s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>` : escapeHtml(s.name)).join(' · ')}</p>
    </article>`).join('');
}

function renderAll() {
  renderChecklist();
  renderDetailPanel();
  updateProgress();
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id); else earned.add(id);
  saveProgress();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderChecklist();
  renderDetailPanel();
}

function exportProgress() {
  const payload = {
    app: 'Leonida Atlas',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    total: trophies.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importProgressFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((n) => typeof n === 'number' && valid.has(n)));
      saveProgress();
      renderAll();
    } catch {
      alert('That file is not a Leonida Atlas progress export.');
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm('Clear all earned trophies? This cannot be undone.')) return;
  earned = new Set();
  saveProgress();
  renderAll();
}

function wireControls() {
  $('searchInput').addEventListener('input', (event) => {
    query = event.target.value.trim().toLowerCase();
    renderChecklist();
  });
  $('kindFilters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    activeKind = button.dataset.kind;
    document.querySelectorAll('.kind-btn').forEach((b) => b.classList.toggle('active', b === button));
    renderChecklist();
  });
  $('gradeFilter').addEventListener('change', (event) => {
    activeGrade = event.target.value;
    renderChecklist();
  });
  $('spoilerToggle').addEventListener('change', (event) => {
    hideSpoilers = event.target.checked;
    saveProgress();
    renderAll();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (event) => {
    if (event.target.files?.[0]) importProgressFile(event.target.files[0]);
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', resetProgress);

  $('trophyList').addEventListener('click', (event) => {
    const checkbox = event.target.closest('[data-check]');
    if (checkbox) {
      toggleEarned(Number(checkbox.dataset.check));
      return;
    }
    const row = event.target.closest('.trophy-row');
    if (row) selectTrophy(Number(row.dataset.id));
  });
  $('trophyList').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('.trophy-row');
    if (row) {
      event.preventDefault();
      selectTrophy(Number(row.dataset.id));
    }
  });
}

function readHashSelection() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const id = Number(hash.get('trophy'));
  if (Number.isInteger(id) && trophyById(id)) selectedId = id;
}

async function loadTrophies() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`could not load ${DATA_URL}`);
  const data = await response.json();
  trophies = data.trophies ?? data;
  if (!Array.isArray(trophies)) throw new Error('trophies.json has no trophies array');
}

async function init() {
  loadSavedProgress();
  $('spoilerToggle').checked = hideSpoilers;
  await loadTrophies();
  readHashSelection();
  buildRoadmapStages();
  buildMissableList();
  wireControls();
  renderAll();
}

init().catch((error) => {
  $('detailBody').innerHTML = `<p class="detail-empty">Could not load the trophy list: ${escapeHtml(error.message)}</p>`;
});
