// services/connection.js
// Maneja la conexión al servidor: guarda IP/puerto/token en AsyncStorage,
// expone el socket compartido y helpers de API REST.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const STORAGE_KEY = 'link-transfer-connection';

let socket = null;
let listeners = new Set();

export async function saveConnection({ ip, port, token }) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ip, port, token }));
}

export async function loadConnection() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearConnection() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  if (socket) socket.disconnect();
  socket = null;
}

export function getBaseUrl(conn) {
  return `http://${conn.ip}:${conn.port}`;
}

// Verifica el PIN contra el servidor y obtiene el token de emparejamiento.
export async function verifyPin(ip, port, pin) {
  const res = await fetch(`http://${ip}:${port}/api/pairing/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'PIN inválido');
  return res.json(); // { token }
}

export function connectSocket(conn, { onStatusChange } = {}) {
  if (socket) socket.disconnect();

  socket = io(getBaseUrl(conn), {
    auth: { token: conn.token, clientType: 'mobile' },
    transports: ['websocket'],
  });

  socket.on('connect', () => onStatusChange && onStatusChange(true));
  socket.on('disconnect', () => onStatusChange && onStatusChange(false));
  socket.on('connect_error', () => onStatusChange && onStatusChange(false));

  return socket;
}

export function getSocket() {
  return socket;
}

export async function apiRequest(conn, path, options = {}) {
  const headers = options.headers || {};
  headers['x-pairing-token'] = conn.token;
  const res = await fetch(`${getBaseUrl(conn)}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error de red');
  }
  return res.json();
}
