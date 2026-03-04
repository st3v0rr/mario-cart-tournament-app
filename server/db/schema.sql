CREATE TABLE IF NOT EXISTS ticket_list (
  id TEXT PRIMARY KEY,
  nick_name TEXT NOT NULL UNIQUE,
  ticket_number TEXT NOT NULL UNIQUE,
  is_walk_up INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  ticket_list_id TEXT NOT NULL REFERENCES ticket_list(id),
  nick_name TEXT NOT NULL,
  ticket_number TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'booked', 'completed')),
  participant_id TEXT REFERENCES participants(id),
  race_time TEXT
);

CREATE TABLE IF NOT EXISTS bracket_entries (
  id TEXT PRIMARY KEY,
  round TEXT NOT NULL CHECK(round IN ('semifinal', 'final')),
  group_number INTEGER,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  position INTEGER
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  time_from TEXT NOT NULL,
  time_to TEXT,
  event TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
