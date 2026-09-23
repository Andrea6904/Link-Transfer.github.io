// routes/pairing.js
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { setPairing, getPairing } = require('../db/database');
const { getLocalIp } = require('../utils/network');

const router = express.Router();
const PORT = process.env.PORT || 4000;

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 dígitos
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Genera (o regenera) el PIN/token de emparejamiento vigente.
// Se llama automáticamente al iniciar el servidor y puede repetirse desde la web ("Regenerar código").
router.post('/generate', (req, res) => {
  const token = generateToken();
  const pin = generatePin();
  setPairing(token, pin);
  res.json({ token, pin });
});

// Devuelve el PIN/token vigentes (solo debe usarse desde la propia PC/servidor, ej. la web local).
router.get('/current', (req, res) => {
  const pairing = getPairing();
  if (!pairing) return res.status(404).json({ error: 'No hay emparejamiento generado aún.' });
  res.json({ token: pairing.token, pin: pairing.pin });
});

// El celular confirma el PIN para obtener el token (evita mostrar el token "en claro" salvo por QR).
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  const pairing = getPairing();
  if (!pairing) return res.status(404).json({ error: 'No hay emparejamiento generado aún.' });
  if (pin !== pairing.pin) {
    return res.status(401).json({ error: 'PIN incorrecto.' });
  }
  res.json({ token: pairing.token });
});

// Genera un QR (imagen PNG en base64/dataURL) con la IP, puerto y token del servidor.
router.get('/qr', async (req, res) => {
  const pairing = getPairing();
  if (!pairing) return res.status(404).json({ error: 'No hay emparejamiento generado aún.' });

  const payload = JSON.stringify({
    ip: getLocalIp(),
    port: PORT,
    token: pairing.token,
  });

  try {
    const dataUrl = await QRCode.toDataURL(payload);
    res.json({ dataUrl, payload });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar el QR.' });
  }
});

module.exports = router;
