const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// GET /api/me
router.get('/', requireAuth, (req, res) => {
  if (req.user.role !== 'participant') {
    return res.status(403).json({ error: 'Participants only' });
  }

  const participantId = req.user.sub;

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);

  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const slot = db.prepare('SELECT * FROM slots WHERE participant_id = ?').get(participantId);

  // Leaderboard rank
  let rank = null;
  if (slot && slot.status === 'completed' && slot.race_time) {
    const rankRow = db
      .prepare(
        `SELECT COUNT(*) + 1 AS rank FROM slots
         WHERE status = 'completed' AND race_time IS NOT NULL AND race_time < ?`
      )
      .get(slot.race_time);
    rank = rankRow?.rank ?? null;
  }

  // Bracket
  const bracketEntries = db
    .prepare(
      `SELECT be.round, be.group_number, be.position
       FROM bracket_entries be
       WHERE be.participant_id = ?`
    )
    .all(participantId);

  res.json({
    nick_name: participant.nick_name,
    ticket_number: participant.ticket_number,
    slot: slot || null,
    rank,
    bracket: bracketEntries,
  });
});

module.exports = router;
