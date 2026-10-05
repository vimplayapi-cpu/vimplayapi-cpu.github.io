-- Live Miracle — initial schema.
--
-- Conventions:
--   * ids are INTEGER PRIMARY KEY (rowid aliases) unless a natural key fits.
--   * every timestamp is unix epoch seconds (INTEGER) in UTC.
--   * booleans are INTEGER 0/1 with CHECK constraints.
--   * every foreign key is declared; PRAGMA foreign_keys is ON in the client.
--   * media references use ON DELETE SET NULL so deleting an asset never
--     cascades into losing editorial content.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- JSON array of permission strings; authorization resolves against this.
  permissions TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  email          TEXT NOT NULL,
  -- Lowercased email; the uniqueness constraint lives here so casing can never
  -- be used to register a duplicate account.
  email_key      TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  must_change_pw INTEGER NOT NULL DEFAULT 0 CHECK (must_change_pw IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until   INTEGER,
  last_login_at  INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,          -- opaque public session id
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Only the hash of the session secret is stored; the plaintext lives in the
  -- cookie alone, so a database read cannot mint a valid session.
  token_hash  TEXT NOT NULL,
  csrf_secret TEXT NOT NULL,
  ip_hash     TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE audit_logs (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,                      -- denormalised so history survives deletion
  action     TEXT NOT NULL,              -- e.g. 'studio.update'
  entity     TEXT,                       -- e.g. 'studios'
  entity_id  TEXT,
  meta       TEXT NOT NULL DEFAULT '{}', -- JSON
  ip_hash    TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- Persistent rate limiting (survives restarts, unlike an in-memory bucket).
CREATE TABLE rate_limits (
  bucket       TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  blocked_until INTEGER
);
CREATE INDEX idx_rate_window ON rate_limits(window_start);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

CREATE TABLE media (
  id            INTEGER PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  -- Storage key relative to the media root; never a client-supplied path.
  storage_key   TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime          TEXT NOT NULL,
  bytes         INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  duration_s    REAL,
  alt           TEXT NOT NULL DEFAULT '',
  caption       TEXT NOT NULL DEFAULT '',
  -- JSON: { avif: {480: url,…}, webp: {…}, srcset: {...} } for images,
  -- { sources: [{src,type}], poster } for video.
  variants      TEXT NOT NULL DEFAULT '{}',
  lqip          TEXT NOT NULL DEFAULT '',
  dominant      TEXT NOT NULL DEFAULT '',
  -- Marks assets shipped with the build (read-only in the media library).
  is_managed    INTEGER NOT NULL DEFAULT 0 CHECK (is_managed IN (0, 1)),
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_media_kind ON media(kind);
CREATE INDEX idx_media_created ON media(created_at DESC);
CREATE INDEX idx_media_managed ON media(is_managed);

-- ---------------------------------------------------------------------------
-- Editorial content
-- ---------------------------------------------------------------------------

-- Free-form CMS blocks keyed by page + key. Everything the designer hard-codes
-- elsewhere lives here instead, so copy changes never need a deploy.
CREATE TABLE content_blocks (
  id         INTEGER PRIMARY KEY,
  page       TEXT NOT NULL,              -- 'home' | 'about' | 'global' | …
  block_key  TEXT NOT NULL,              -- 'hero.headline'
  value      TEXT NOT NULL DEFAULT '',
  -- 'text' renders as-is; 'richtext' allows a constrained tag set; 'json' is
  -- parsed by the consuming component.
  value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'richtext', 'json')),
  label      TEXT NOT NULL DEFAULT '',   -- human label in the admin UI
  hint       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (page, block_key)
);
CREATE INDEX idx_blocks_page ON content_blocks(page, sort_order);

CREATE TABLE pages (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,  -- route path without leading slash
  title           TEXT NOT NULL,
  nav_label       TEXT NOT NULL DEFAULT '',
  show_in_nav     INTEGER NOT NULL DEFAULT 0 CHECK (show_in_nav IN (0, 1)),
  is_published    INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE seo_metadata (
  id              INTEGER PRIMARY KEY,
  route           TEXT NOT NULL UNIQUE,  -- '/', '/studios', '/studios/neon-noir'
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  canonical       TEXT NOT NULL DEFAULT '',
  og_image_id     INTEGER REFERENCES media(id) ON DELETE SET NULL,
  robots          TEXT NOT NULL DEFAULT 'index,follow',
  updated_at      INTEGER NOT NULL
);

CREATE TABLE services (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  code         TEXT NOT NULL,            -- 'SERVICE 01'
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  -- JSON array of { title, description } capability rows.
  inclusions   TEXT NOT NULL DEFAULT '[]',
  icon         TEXT NOT NULL DEFAULT '',  -- icon key resolved client-side
  hero_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  cta_label    TEXT NOT NULL DEFAULT 'REQUEST A DEMO',
  seo_title    TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_services_published ON services(is_published, sort_order);

CREATE TABLE locations (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  country       TEXT NOT NULL,
  country_code  TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',   -- intentionally blank until supplied
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  studio_availability TEXT NOT NULL DEFAULT '',
  services      TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  -- Normalised 0–100 coordinates on the site's own map illustration, so the
  -- map never depends on a third-party tile service.
  map_x         REAL NOT NULL DEFAULT 50,
  map_y         REAL NOT NULL DEFAULT 50,
  is_published  INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_locations_published ON locations(is_published, sort_order);

CREATE TABLE studios (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  code          TEXT NOT NULL,             -- 'STUDIO 01'
  name          TEXT NOT NULL,
  tagline       TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  environment   TEXT NOT NULL DEFAULT '',  -- environment description
  capacity      TEXT NOT NULL DEFAULT '',  -- free text; blank until supplied
  production_characteristics TEXT NOT NULL DEFAULT '[]', -- JSON array
  technical_capabilities     TEXT NOT NULL DEFAULT '[]', -- JSON array of {label,value}
  location_id   INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'limited', 'in_production', 'unavailable')),
  availability_note TEXT NOT NULL DEFAULT '',
  accent        TEXT NOT NULL DEFAULT '#3DDCE8',
  cta_label     TEXT NOT NULL DEFAULT 'REQUEST INFORMATION',
  seo_title     TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  is_published  INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_studios_published ON studios(is_published, sort_order);
CREATE INDEX idx_studios_location ON studios(location_id);
CREATE INDEX idx_studios_status ON studios(status);

CREATE TABLE studio_images (
  id         INTEGER PRIMARY KEY,
  studio_id  INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  media_id   INTEGER REFERENCES media(id) ON DELETE SET NULL,
  role       TEXT NOT NULL CHECK (role IN ('wide', 'alt', 'detail', 'tech')),
  position   INTEGER NOT NULL,           -- 1–4, drives the IMAGE 0n label
  alt        TEXT NOT NULL DEFAULT '',
  caption    TEXT NOT NULL DEFAULT '',
  UNIQUE (studio_id, position)
);
CREATE INDEX idx_studio_images_studio ON studio_images(studio_id, position);

CREATE TABLE studio_videos (
  id              INTEGER PRIMARY KEY,
  studio_id       INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  media_id        INTEGER REFERENCES media(id) ON DELETE SET NULL,
  poster_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  title           TEXT NOT NULL DEFAULT '',
  caption         TEXT NOT NULL DEFAULT '',
  UNIQUE (studio_id)
);

CREATE TABLE gallery_categories (
  id         INTEGER PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE gallery (
  id          INTEGER PRIMARY KEY,
  media_id    INTEGER REFERENCES media(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES gallery_categories(id) ON DELETE SET NULL,
  studio_id   INTEGER REFERENCES studios(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT '',
  caption     TEXT NOT NULL DEFAULT '',
  alt         TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_gallery_category ON gallery(category_id, sort_order);
CREATE INDEX idx_gallery_published ON gallery(is_published, sort_order);

CREATE TABLE timeline_events (
  id           INTEGER PRIMARY KEY,
  year         TEXT NOT NULL DEFAULT '',
  event        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  media_id     INTEGER REFERENCES media(id) ON DELETE SET NULL,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_timeline_order ON timeline_events(is_published, sort_order);

CREATE TABLE social_posts (
  id           INTEGER PRIMARY KEY,
  platform     TEXT NOT NULL DEFAULT 'instagram',
  url          TEXT NOT NULL DEFAULT '',
  media_id     INTEGER REFERENCES media(id) ON DELETE SET NULL,
  caption      TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_social_order ON social_posts(is_published, sort_order);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'json', 'bool', 'number')),
  label      TEXT NOT NULL DEFAULT '',
  hint       TEXT NOT NULL DEFAULT '',
  group_key  TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_settings_group ON site_settings(group_key, sort_order);

-- ---------------------------------------------------------------------------
-- Lead capture
-- ---------------------------------------------------------------------------

CREATE TABLE inquiries (
  id               INTEGER PRIMARY KEY,
  full_name        TEXT NOT NULL,
  company          TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL DEFAULT '',
  country          TEXT NOT NULL DEFAULT '',
  service_interest TEXT NOT NULL DEFAULT '',
  project_type     TEXT NOT NULL DEFAULT '',
  message          TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'in_review', 'contacted', 'closed', 'spam')),
  internal_notes   TEXT NOT NULL DEFAULT '',
  -- Salted hash only; the raw IP is never persisted.
  ip_hash          TEXT NOT NULL DEFAULT '',
  user_agent       TEXT NOT NULL DEFAULT '',
  handled_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  handled_at       INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_inquiries_created ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_status ON inquiries(status, created_at DESC);

CREATE TABLE demo_requests (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  company           TEXT NOT NULL DEFAULT '',
  business_email    TEXT NOT NULL,
  phone             TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT '',
  studio_id         INTEGER REFERENCES studios(id) ON DELETE SET NULL,
  studio_label      TEXT NOT NULL DEFAULT '',  -- retained if the studio is deleted
  operators         TEXT NOT NULL DEFAULT '',
  project_type      TEXT NOT NULL DEFAULT '',
  launch_period     TEXT NOT NULL DEFAULT '',
  required_services TEXT NOT NULL DEFAULT '[]', -- JSON array
  message           TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'in_review', 'contacted', 'closed', 'spam')),
  internal_notes    TEXT NOT NULL DEFAULT '',
  ip_hash           TEXT NOT NULL DEFAULT '',
  user_agent        TEXT NOT NULL DEFAULT '',
  handled_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  handled_at        INTEGER,
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_demo_created ON demo_requests(created_at DESC);
CREATE INDEX idx_demo_status ON demo_requests(status, created_at DESC);
CREATE INDEX idx_demo_studio ON demo_requests(studio_id);

-- ---------------------------------------------------------------------------
-- Privacy-conscious analytics
--
-- No cookies, no cross-site identifiers, no raw IPs. visitor_hash is a daily
-- rotating salted digest, so a visitor cannot be tracked across days and the
-- table cannot be reversed into a list of people.
-- ---------------------------------------------------------------------------

CREATE TABLE analytics_events (
  id            INTEGER PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('pageview', 'studio_view', 'gallery_view', 'inquiry', 'demo_request')),
  path          TEXT NOT NULL,
  entity_id     INTEGER,                 -- studio id for studio_view, etc.
  referrer_host TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  device        TEXT NOT NULL DEFAULT '' CHECK (device IN ('', 'mobile', 'tablet', 'desktop')),
  visitor_hash  TEXT NOT NULL DEFAULT '',
  day           TEXT NOT NULL,           -- 'YYYY-MM-DD' for cheap grouping
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_analytics_day ON analytics_events(day, type);
CREATE INDEX idx_analytics_type_created ON analytics_events(type, created_at DESC);
CREATE INDEX idx_analytics_path ON analytics_events(path, day);
CREATE INDEX idx_analytics_visitor ON analytics_events(visitor_hash, day);
