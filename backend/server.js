// server.js
// Servidor principal: sirve la web estática, expone la API REST y gestiona
// el chat en tiempo real por WebSockets (Socket.io).

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const { insertMessage, setPairing, getPairing } = require('./db/database');
const { getLocalIp } = require('./utils/network');
const { requireToken } = require('./middleware/auth');

const messagesRouter = require('./routes/messages');
const pairingRouter = require('./routes/pairing');
const createFilesRouter = require('./routes/files');

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // Red local: se permite cualquier origen por simplicidad.
});

app.use(cors());
app.use(express.json());

// --- Rutas API ---
app.use('/api/pairing', pairingRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/files', createFilesRouter(io));

// Descargas requieren el token, pero la carpeta se sirve a través de la ruta /api/files/download/:name
// (no se expone /uploads directamente para forzar el chequeo de token).

// --- Web estática (interfaz de PC) ---
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint simple de salud, útil para que la app móvil detecte si el server está vivo.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- WebSockets (chat en tiempo real) ---
// Autenticación del socket vía token enviado en el "handshake" (auth: { token }).
io.use((socket, next) => {
  const { token } = socket.handshake.auth || {};
  const pairing = getPairing();
  if (!pairing || token !== pairing.token) {
    return next(new Error('Token de emparejamiento inválido.'));
  }
  next();
});

io.on('connection', (socket) => {
  const clientType = socket.handshake.auth.clientType === 'mobile' ? 'mobile' : 'pc';
  console.log(`[socket] Conectado: ${clientType} (${socket.id})`);

  io.emit('presence', { clientType, status: 'connected' });

  socket.on('chat:message', (payload) => {
    // payload: { sender: 'pc' | 'mobile', content: string }
    const sender = payload.sender === 'mobile' ? 'mobile' : 'pc';
    const saved = insertMessage(sender, String(payload.content || '').slice(0, 5000));
    io.emit('chat:message', saved); // Se reenvía a ambos lados (incluye eco al emisor, útil para confirmar guardado).
  });

  socket.on('disconnect', () => {
    console.log(`[socket] Desconectado: ${clientType} (${socket.id})`);
    io.emit('presence', { clientType, status: 'disconnected' });
  });
});

// --- Arranque ---
server.listen(PORT, '0.0.0.0', () => {
  // Genera un token/PIN nuevos cada vez que arranca el servidor.
  const crypto = require('crypto');
  const token = crypto.randomBytes(16).toString('hex');
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  setPairing(token, pin);

  const ip = getLocalIp();
  console.log('========================================');
  console.log(' Link Transfer - Servidor iniciado');
  console.log(`  Web (PC):     http://${ip}:${PORT}`);
  console.log(`  IP local:     ${ip}`);
  console.log(`  Puerto:       ${PORT}`);
  console.log(`  PIN emparej.: ${pin}`);
  console.log(`  Token:        ${token}`);
  console.log('  (La app móvil puede usar el PIN o escanear el QR desde la web)');
  console.log('========================================');
});
