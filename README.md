# Link Transfer — Chat y transferencia de archivos entre celular y PC

Sistema en red local (LAN) para enviar mensajes y archivos entre una PC (navegador web) y un celular
(app móvil), con emparejamiento por PIN o código QR.

## 1. Estructura de carpetas

```
link-transfer/
├── backend/                    # Servidor Node.js + Express + Socket.io
│   ├── server.js                # Punto de entrada: HTTP + WebSockets
│   ├── package.json
│   ├── db/
│   │   ├── database.js          # SQLite (better-sqlite3): mensajes, archivos, emparejamiento
│   │   └── link_transfer.db     # (se crea automáticamente al arrancar)
│   ├── middleware/
│   │   └── auth.js              # Verifica el token de emparejamiento en cada request
│   ├── routes/
│   │   ├── pairing.js           # Generar/verificar PIN, token y QR
│   │   ├── files.js             # Subida, listado y descarga de archivos
│   │   └── messages.js          # Historial de chat vía HTTP
│   ├── utils/
│   │   └── network.js           # Detección automática de la IP local (192.168.x.x)
│   ├── uploads/                 # Archivos subidos (se crea automáticamente)
│   └── public/                  # Interfaz web para la PC
│       ├── index.html
│       ├── style.css
│       └── app.js
│
├── mobile/                      # App móvil (React Native + Expo)
│   ├── App.js                   # Navegación por pestañas: Chat / Archivos / Ajustes
│   ├── app.json
│   ├── package.json
│   ├── services/
│   │   ├── connection.js        # Socket.io client + almacenamiento del emparejamiento
│   │   └── notifications.js     # Notificaciones locales
│   └── screens/
│       ├── ChatScreen.js
│       ├── FilesScreen.js
│       └── SettingsScreen.js    # PIN manual o escaneo de QR
│
└── README.md
```

## 2. Cómo funciona el emparejamiento

1. Al arrancar, el servidor genera un **token** (secreto, usado en todas las llamadas API/WebSocket)
   y un **PIN de 4 dígitos** (para que un humano lo escriba fácilmente).
2. La web de la PC pide directamente el token vigente (`/api/pairing/current`) porque corre en la
   propia máquina del servidor — se asume confiable.
3. El celular **no conoce el token de entrada**: solo tiene dos formas de obtenerlo:
   - Escaneando el **código QR** que muestra la web (contiene IP + puerto + token).
   - Escribiendo el **PIN** en la app; el servidor valida el PIN y le entrega el token
     (`POST /api/pairing/verify-pin`).
4. Con el token, la app guarda la conexión (`AsyncStorage`) y la reutiliza en cada arranque,
   hasta que el usuario pulse "Olvidar este servidor" o regeneres el código desde la web.

## 3. Requisitos previos

- Node.js 18+ instalado en la PC.
- Un celular con la app **Expo Go** instalada (Android/iOS) — o un emulador.
- PC y celular conectados **a la misma red Wi-Fi**.

## 4. Ejecutar el backend (PC)

```bash
cd backend
npm install
npm start
```

Verás en consola algo como:

```
Web (PC):     http://192.168.1.10:4000
IP local:     192.168.1.10
Puerto:       4000
PIN emparej.: 4821
```

Abre `http://192.168.1.10:4000` en el navegador de la PC (usa la IP que muestre tu consola).
Ahí verás el QR y el PIN para emparejar el celular.

> Si el firewall de Windows pregunta, permite el acceso a Node.js en redes privadas.

## 5. Ejecutar la app móvil (celular)

```bash
cd mobile
npm install
npx expo start
```

- Escanea el QR de **Expo** (el de la terminal/navegador de Expo, distinto al QR de emparejamiento)
  con la app **Expo Go** para abrir la app en tu celular.
- Dentro de la app, ve a la pestaña **Ajustes** y:
  - Toca "Escanear código QR de la PC" y apunta al QR mostrado en la web, **o**
  - Ingresa manualmente la IP, el puerto y el PIN de 4 dígitos.
- Al conectar, verás "Conectado" en verde y podrás usar las pestañas **Chat** y **Archivos**.

## 6. Probar el flujo completo

1. Escribe un mensaje en la web → debe aparecer al instante en la pestaña Chat del celular.
2. Escribe un mensaje en el celular → debe aparecer al instante en el chat de la web.
3. Sube una imagen/PDF/ZIP desde la web → aparece en "Archivos" del celular, descárgalo ahí.
4. Sube un archivo desde el celular → aparece en la lista de archivos de la web, descárgalo ahí.
5. Si la app móvil está en segundo plano o en otra pestaña y llega un mensaje/archivo desde la PC,
   debe mostrarse una notificación local.

## 7. Notas y siguientes pasos sugeridos

- **Producción/nube**: si el servidor se despliega fuera de la LAN, cambia `http://` por `https://`
  y agrega HTTPS (ej. con un reverse proxy como Nginx o Caddy) — los navegadores y `expo-camera`
  suelen exigirlo para ciertas funciones.
- **Expiración de token**: actualmente el token vive hasta que se regenere manualmente o se reinicie
  el servidor; para mayor seguridad se puede añadir expiración por tiempo.
- **Multi-dispositivo**: el modelo actual asume un único celular emparejado a la vez; para varios
  dispositivos, se recomienda generar un token por dispositivo en vez de uno global.
- **Build de la app**: para instalar la app sin Expo Go, usa `eas build` (Expo Application Services)
  y genera un APK/IPA firmado.
