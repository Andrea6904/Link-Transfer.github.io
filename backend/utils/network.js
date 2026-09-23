// utils/network.js
const os = require('os');

/**
 * Devuelve la primera IPv4 no interna (ej. 192.168.1.X) de la máquina.
 * Sirve para que la app móvil sepa a qué IP conectarse en la red local.
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

module.exports = { getLocalIp };
