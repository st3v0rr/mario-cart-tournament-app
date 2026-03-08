const express = require('express');
const db = require('../db');

const router = express.Router();

const SUPPORTED_LANGS = ['de', 'en'];

// GET /api/rules?lang=de — public
router.get('/', (req, res) => {
  const lang = SUPPORTED_LANGS.includes(req.query.lang) ? req.query.lang : 'de';
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(`rules_${lang}`);
  res.json({ content: row?.value ?? '' });
});

module.exports = router;
