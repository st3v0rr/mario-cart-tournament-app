const express = require('express');
const { param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Per-user rate limit on booking/cancellation to prevent abuse
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.sub || req.ip,
  message: { error: 'Too many booking attempts, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/slots — public
router.get('/', (req, res) => {
  const slots = db
    .prepare(
      `SELECT s.id, s.start_time, s.status, s.race_time,
              p.nick_name AS participant_name, p.id AS participant_id
       FROM slots s
       LEFT JOIN participants p ON s.participant_id = p.id
       ORDER BY s.start_time ASC`
    )
    .all();
  res.json(slots);
});

// POST /api/slots/:id/book
router.post('/:id/book', requireAuth, bookingLimiter, [param('id').isUUID().withMessage('Invalid slot ID')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  if (req.user.role !== 'participant') {
    return res.status(403).json({ error: 'Only participants can book slots' });
  }

  const participantId = req.user.sub;
  const slotId = req.params.id;

  const bookSlot = db.transaction(() => {
    // Check participant has no existing booking
    const existing = db
      .prepare(
        "SELECT id FROM slots WHERE participant_id = ? AND status IN ('booked')"
      )
      .get(participantId);
    if (existing) {
      return { error: 'You already have a booked slot', status: 409 };
    }

    // Check slot availability and time constraint
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId);
    if (!slot) return { error: 'Slot not found', status: 404 };
    if (slot.status !== 'available') {
      return { error: 'Slot is not available', status: 409 };
    }

    const slotTime = new Date(slot.start_time);
    const minBookingTime = new Date(Date.now() + 10 * 60 * 1000);
    if (slotTime <= minBookingTime) {
      return { error: 'Slot starts too soon or has already passed', status: 409 };
    }

    db.prepare(
      "UPDATE slots SET status = 'booked', participant_id = ? WHERE id = ? AND status = 'available'"
    ).run(participantId, slotId);

    return { ok: true };
  });

  const result = bookSlot();
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json(result);
});

// DELETE /api/slots/:id/book
router.delete('/:id/book', requireAuth, bookingLimiter, [param('id').isUUID().withMessage('Invalid slot ID')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  if (req.user.role !== 'participant') {
    return res.status(403).json({ error: 'Only participants can cancel slots' });
  }

  const participantId = req.user.sub;
  const slotId = req.params.id;

  const cancelSlot = db.transaction(() => {
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId);
    if (!slot) return { error: 'Slot not found', status: 404 };
    if (slot.participant_id !== participantId) {
      return { error: 'This is not your booking', status: 403 };
    }
    if (slot.status !== 'booked') {
      return { error: 'Slot cannot be cancelled', status: 409 };
    }

    const slotTime = new Date(slot.start_time);
    const minCancelTime = new Date(Date.now() + 10 * 60 * 1000);
    if (slotTime <= minCancelTime) {
      return { error: 'Cannot cancel less than 10 minutes before start', status: 409 };
    }

    db.prepare(
      "UPDATE slots SET status = 'available', participant_id = NULL WHERE id = ?"
    ).run(slotId);

    return { ok: true };
  });

  const result = cancelSlot();
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
