// middleware/auth.js
// Verifica que las peticiones HTTP incluyan el token de emparejamiento vigente.
// El token se envía en el header "x-pairing-token".

const { getPairing } = require('../db/database');

function requireToken(req, res, next) {
  // Acepta el token por header (uso normal, fetch/axios) o por query string
  // (necesario para enlaces <a href="..."> de descarga directa en el navegador).
  const token = req.header('x-pairing-token') || req.query['x-pairing-token'];
  const pairing = getPairing();

  if (!pairing) {
    return res.status(503).json({ error: 'El servidor aún no generó un token de emparejamiento.' });
  }

  if (!token || token !== pairing.token) {
    return res.status(401).json({ error: 'Token de emparejamiento inválido o ausente.' });
  }

  next();
}

module.exports = { requireToken };
