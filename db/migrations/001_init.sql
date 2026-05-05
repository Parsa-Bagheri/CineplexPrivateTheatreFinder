CREATE TABLE theatres (
  id SERIAL PRIMARY KEY,
  cineplex_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TABLE showtimes (
  id SERIAL PRIMARY KEY,
  theatre_id INTEGER REFERENCES theatres(id),
  cineplex_showtime_id TEXT UNIQUE,
  movie_title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  format TEXT,
  ticket_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE seat_snapshots (
  id SERIAL PRIMARY KEY,
  showtime_id INTEGER REFERENCES showtimes(id),
  checked_at TIMESTAMPTZ DEFAULT now(),
  total_seats INTEGER,
  sellable_seats INTEGER,
  available_count INTEGER,
  occupied_estimate INTEGER,
  blocked_count INTEGER,
  accessibility_count INTEGER,
  unknown_count INTEGER,
  confidence TEXT,
  raw_snapshot JSONB
);

CREATE INDEX idx_showtimes_theatre_starts_at ON showtimes(theatre_id, starts_at);
CREATE INDEX idx_showtimes_movie_title ON showtimes USING gin(to_tsvector('english', movie_title));
CREATE INDEX idx_seat_snapshots_showtime_checked_at ON seat_snapshots(showtime_id, checked_at DESC);
