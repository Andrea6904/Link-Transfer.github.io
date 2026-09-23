// routes/files.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { insertFile, getFiles } = require('../db/database');
const { requireToken } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Tipos permitidos: imágenes, PDF, documentos comunes y ZIP.
const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip', 'application/x-zip-compressed',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido.'));
  },
});

// Middleware que inyecta io (se agrega en server.js) para emitir eventos en tiempo real.
module.exports = function createFilesRouter(io) {
  // Subida de archivo. El campo "sender" indica el origen: 'pc' o 'mobile'.
  router.post('/upload', requireToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const sender = req.body.sender === 'mobile' ? 'mobile' : 'pc';

    const record = insertFile({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      sender,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    // Notifica en tiempo real al otro extremo (chat + notificaciones push locales en la app).
    io.emit('file:new', record);

    res.status(201).json(record);
  });

  // Lista el historial de archivos.
  router.get('/', requireToken, (req, res) => {
    res.json(getFiles());
  });

  // Descarga de un archivo por su nombre almacenado.
  router.get('/download/:storedName', requireToken, (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }
    res.download(filePath);
  });

  return router;
};
