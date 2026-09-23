// routes/messages.js
const express = require('express');
const { getMessages } = require('../db/database');
const { requireToken } = require('../middleware/auth');

const router = express.Router();

// Historial de chat (se usa al abrir la web o la app para "ponerse al día").
router.get('/', requireToken, (req, res) => {
  res.json(getMessages());
});

module.exports = router;
