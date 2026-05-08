-- =====================================================
-- CutRight — Barber Booking Platform
-- Full Database Schema
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- Enable PostGIS for geolocation queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── TABLES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','barber','admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  avatar_url       TEXT,
  lat              DOUBLE PRECISION NOT NULL DEFAULT 28.6139,
  lng              DOUBLE PRECISION NOT NULL DEFAULT 77.2090,
  address          TEXT NOT NULL DEFAULT '',
  rating           NUMERIC(3,2) DEFAULT 0,
  total_reviews    INTEGER DEFAULT 0,
  is_available     BOOLEAN DEFAULT false,
  experience_years INTEGER DEFAULT 0,
  bio              TEXT,
  location         GEOGRAPHY(POINT, 4326),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  price            NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  icon             TEXT NOT NULL DEFAULT '✂️',
  category         TEXT NOT NULL DEFAULT 'hair' CHECK (category IN ('hair','beard','combo','other')),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  barber_id         UUID REFERENCES barbers(id) ON DELETE SET NULL,
  service_id        UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','in_progress','completed','cancelled','rejected')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  address           TEXT NOT NULL DEFAULT '',
  lat               DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng               DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL,
  payment_status    TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_id        TEXT,
  razorpay_order_id TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  barber_id  UUID REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  barber_id  UUID REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bookings_user    ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber  ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status  ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_notifs_barber    ON notifications(barber_id, read);
CREATE INDEX IF NOT EXISTS idx_barbers_location ON barbers USING GIST(location);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_barbers_updated  BEFORE UPDATE ON barbers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── BARBER LOCATION TRIGGER ─────────────────────────

CREATE OR REPLACE FUNCTION sync_barber_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_barber_location
  BEFORE INSERT OR UPDATE OF lat, lng ON barbers
  FOR EACH ROW EXECUTE FUNCTION sync_barber_location();

-- ─── NEARBY BARBERS FUNCTION ─────────────────────────

CREATE OR REPLACE FUNCTION get_nearby_barbers(
  user_lat   DOUBLE PRECISION,
  user_lng   DOUBLE PRECISION,
  radius_km  DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id               UUID,
  user_id          UUID,
  name             TEXT,
  phone            TEXT,
  avatar_url       TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  address          TEXT,
  rating           NUMERIC,
  total_reviews    INTEGER,
  is_available     BOOLEAN,
  experience_years INTEGER,
  bio              TEXT,
  distance_km      DOUBLE PRECISION,
  created_at       TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.user_id, b.name, b.phone, b.avatar_url,
    b.lat, b.lng, b.address, b.rating, b.total_reviews,
    b.is_available, b.experience_years, b.bio,
    ST_Distance(b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    b.created_at
  FROM barbers b
  WHERE
    b.location IS NOT NULL AND
    ST_DWithin(b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ─── ROW LEVEL SECURITY ──────────────────────────────

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_self_read"   ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_self_insert" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_self_update" ON users FOR UPDATE USING (auth.uid() = id);

-- Barbers (public read)
CREATE POLICY "barbers_public_read"  ON barbers FOR SELECT USING (true);
CREATE POLICY "barbers_service_role" ON barbers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "barbers_owner_update" ON barbers FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE id = user_id)
);

-- Services (public read)
CREATE POLICY "services_public_read" ON services FOR SELECT USING (true);

-- Bookings
CREATE POLICY "bookings_read" ON bookings FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT u.id FROM users u JOIN barbers b ON b.user_id = u.id WHERE b.id = bookings.barber_id)
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_service" ON bookings FOR ALL USING (auth.role() = 'service_role');

-- Ratings (public read)
CREATE POLICY "ratings_public_read" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_user_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifs_barber_read" ON notifications FOR SELECT USING (
  auth.uid() IN (SELECT u.id FROM users u JOIN barbers b ON b.user_id = u.id WHERE b.id = notifications.barber_id)
);
CREATE POLICY "notifs_service" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- ─── REALTIME ────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── SEED DATA ───────────────────────────────────────

INSERT INTO services (name, description, price, duration_minutes, icon, category) VALUES
  ('Haircut',        'Classic haircut with styling',              299, 30, '✂️', 'hair'),
  ('Beard Trim',     'Professional beard shaping and trim',       149, 20, '🪒', 'beard'),
  ('Hair + Beard',   'Complete grooming combo package',           399, 45, '💈', 'combo'),
  ('Wash & Style',   'Shampoo, condition and blow-dry',           199, 25, '🚿', 'hair'),
  ('Hot Towel Shave','Traditional straight-razor hot towel shave',249, 30, '🔥', 'beard'),
  ('Kids Haircut',   'Haircut for kids under 12',                 199, 25, '👦', 'hair'),
  ('Hair Color',     'Professional full hair coloring',           799, 60, '🎨', 'other'),
  ('Head Massage',   'Relaxing scalp and head massage',           199, 20, '💆', 'other')
ON CONFLICT DO NOTHING;
