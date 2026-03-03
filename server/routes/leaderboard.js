const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/leaderboard — public
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.first_name, s.race_time, s.start_time
       FROM slots s
       JOIN participants p ON s.participant_id = p.id
       WHERE s.status = 'completed' AND s.race_time IS NOT NULL
       ORDER BY s.race_time ASC
       ${req.query.all === 'true' ? '' : 'LIMIT 10'}`
    )
    .all();

  res.json(rows);
});

module.exports = router;
