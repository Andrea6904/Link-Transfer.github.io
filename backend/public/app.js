// public/app.js
// Lógica de la interfaz web para PC: emparejamiento, chat en tiempo real y archivos.

const SENDER = 'pc';
let TOKEN = null;
let socket = null;

const el = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (TOKEN) headers['x-pairing-token'] = TOKEN;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Error de red');
  return res.json();
}

// --- Emparejamiento ---
// La web corre en la propia PC, así que puede pedir directamente el token vigente
// (endpoint pensado para uso local/confiable; el celular en cambio usa el PIN + QR).
async function loadPairing() {
  let pairing;
  try {
    pairing = await fetch('/api/pairing/current').then((r) => r.json());
  } catch {
    pairing = null;
  }
  if (!pairing || !pairing.token) {
    pairing = await fetch('/api/pairing/generate', { method: 'POST' }).then((r) => r.json());
  }
  TOKEN = pairing.token;
  el('pinValue').textContent = pairing.pin;

  const qr = await fetch('/api/pairing/qr').then((r) => r.json());
  el('qrImage').src = qr.dataUrl;

  connectSocket();
  loadHistory();
}

el('regenBtn').addEventListener('click', async () => {
  const pairing = await fetch('/api/pairing/generate', { method: 'POST' }).then((r) => r.json());
  TOKEN = pairing.token;
  el('pinValue').textContent = pairing.pin;
  const qr = await fetch('/api/pairing/qr').then((r) => r.json());
  el('qrImage').src = qr.dataUrl;
  if (socket) socket.disconnect();
  connectSocket();
});

// --- Socket.io ---
function connectSocket() {
  socket = io({ auth: { token: TOKEN, clientType: SENDER } });

  socket.on('connect', () => setStatus(true));
  socket.on('disconnect', () => setStatus(false));
  socket.on('connect_error', () => setStatus(false));

  socket.on('chat:message', renderMessage);
  socket.on('file:new', (file) => {
    renderFile(file);
  });
}

function setStatus(connected) {
  const badge = el('connStatus');
  badge.textContent = connected ? 'Conectado' : 'Desconectado';
  badge.className = `status ${connected ? 'connected' : 'disconnected'}`;
}

// --- Chat ---
el('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = el('chatInput');
  const content = input.value.trim();
  if (!content) return;
  socket.emit('chat:message', { sender: SENDER, content });
  input.value = '';
});

function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = `msg ${msg.sender}`;
  div.innerHTML = `${escapeHtml(msg.content)}<span class="meta">${msg.sender} · ${msg.created_at}</span>`;
  el('chatMessages').appendChild(div);
  el('chatMessages').scrollTop = el('chatMessages').scrollHeight;
}

async function loadHistory() {
  const [messages, files] = await Promise.all([api('/api/messages'), api('/api/files')]);
  el('chatMessages').innerHTML = '';
  messages.forEach(renderMessage);
  el('filesList').innerHTML = '';
  files.forEach(renderFile);
}

// --- Archivos ---
el('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = el('fileInput').files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sender', SENDER);

  await fetch('/api/files/upload', {
    method: 'POST',
    headers: { 'x-pairing-token': TOKEN },
    body: formData,
  });
  el('fileInput').value = '';
});

function renderFile(file) {
  const li = document.createElement('li');
  li.className = 'file-item';
  li.innerHTML = `
    <span>${escapeHtml(file.original_name)}</span>
    <span class="tag">${file.sender}</span>
    <a href="/api/files/download/${file.stored_name}?x-pairing-token=${TOKEN}" download>
      Descargar
    </a>
  `;
  // Nota: para que el header de descarga funcione sin JS extra, se podría usar fetch+blob;
  // aquí se simplifica añadiendo el token como query param si el backend lo acepta (ver README).
  el('filesList').prepend(li);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadPairing();
