const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Rate limit per IP+ticket_number so shared NAT (conference WiFi) doesn't
// block legitimate users: each credential gets its own bucket per IP.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.body?.ticket_number || ''}`,
  message: { error: 'Too many login attempts for this ticket, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login: rate limit per IP (only one admin account exists)
const adminAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many admin login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

// POST /api/auth/login — Participant login
router.post(
  '/login',
  authLimiter,
  [
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('ticket_number')
      .trim()
      .matches(/^\d{5}$/)
      .withMessage('Ticket number must be 5 digits'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { first_name, ticket_number } = req.body;

    const entry = db
      .prepare(
        'SELECT * FROM ticket_list WHERE ticket_number = ? AND LOWER(first_name) = LOWER(?)'
      )
      .get(ticket_number, first_name);

    if (!entry) {
      console.log('[AUDIT] participant_login_failed', { ip: req.ip, ts: new Date().toISOString() });
      return res.status(401).json({ error: 'Invalid name or ticket number' });
    }

    // Mark claimed
    db.prepare('UPDATE ticket_list SET claimed = 1 WHERE id = ?').run(entry.id);

    // Create participant if not yet exists
    let participant = db
      .prepare('SELECT * FROM participants WHERE ticket_list_id = ?')
      .get(entry.id);

    if (!participant) {
      const newId = uuidv4();
      db.prepare(
        'INSERT INTO participants (id, ticket_list_id, first_name, ticket_number) VALUES (?, ?, ?, ?)'
      ).run(newId, entry.id, entry.first_name, entry.ticket_number);
      participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(newId);
    }

    const token = jwt.sign(
      { sub: participant.id, role: 'participant', name: participant.first_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, cookieOpts);
    res.json({ ok: true, name: participant.first_name, role: 'participant' });
  }
);

// POST /api/auth/admin/login
router.post(
  '/admin/login',
  adminAuthLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH || '';

    // Always run bcrypt to prevent timing-based username enumeration
    const usernameMatch = username === expectedUsername;
    const valid = await bcrypt.compare(password, expectedHash);

    if (!usernameMatch || !valid) {
      console.log('[AUDIT] admin_login_failed', { ip: req.ip, ts: new Date().toISOString() });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[AUDIT] admin_login_success', { ip: req.ip, username, ts: new Date().toISOString() });

    const token = jwt.sign(
      { sub: 'admin', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, cookieOpts);
    res.json({ ok: true, role: 'admin' });
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ authenticated: false });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    res.json({ authenticated: true, role: payload.role, sub: payload.sub, name: payload.name });
  } catch {
    res.json({ authenticated: false });
  }
});

module.exports = router;
