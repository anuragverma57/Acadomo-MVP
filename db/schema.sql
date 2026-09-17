-- AcaDomo — schema
-- Applied by `npm run db:reset`. Idempotent: drops and recreates public schema.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- citext gives case-insensitive email equality at the column level, so we can
-- never accidentally create two accounts differing only by case.
CREATE EXTENSION IF NOT EXISTS citext;


-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
CREATE TABLE properties (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  city            text        NOT NULL,
  country         text        NOT NULL,
  university      text        NOT NULL,
  -- Money as integer minor units (pence/cents). Never float: 0.1 + 0.2 != 0.3.
  price_per_week  integer     NOT NULL CHECK (price_per_week > 0),
  currency        char(3)     NOT NULL DEFAULT 'GBP',
  room_type       text        NOT NULL CHECK (room_type IN ('studio', 'ensuite', 'shared', 'apartment')),
  description     text        NOT NULL,
  amenities       text[]      NOT NULL DEFAULT '{}',
  image_url       text        NOT NULL,
  -- Soft disable: hides a property from students without deleting it, so its
  -- enquiry history survives for analytics.
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX properties_city_idx       ON properties (city);
CREATE INDEX properties_university_idx ON properties (university);
CREATE INDEX properties_price_idx      ON properties (price_per_week);
CREATE INDEX properties_room_type_idx  ON properties (room_type);
-- Public listings always filter on is_active, so it leads the composite.
CREATE INDEX properties_active_idx     ON properties (is_active, created_at DESC);


-- ---------------------------------------------------------------------------
-- students  (passwordless — identity is a verified email, Phase 5.5)
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             citext      NOT NULL UNIQUE,
  name              text,
  -- Optional profile. Every column is nullable by design: identity is the
  -- verified email, so a student can use the whole product without telling us
  -- anything else. Gender is free text within an allowlist that includes
  -- "prefer not to say" rather than a two-value enum.
  phone             text,
  gender            text        CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  university        text,
  course            text,
  year_of_study     smallint    CHECK (year_of_study BETWEEN 1 AND 8),
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- otp_codes  (Phase 5.5)
-- ---------------------------------------------------------------------------
CREATE TABLE otp_codes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       citext      NOT NULL,
  -- bcrypt hash of the 6-digit code. Codes are credentials: never stored plain.
  code_hash   text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    smallint    NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Serves the hot lookup: newest live code for an email.
CREATE INDEX otp_codes_email_expires_idx ON otp_codes (email, expires_at DESC);


-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
CREATE TABLE admin_users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         citext      NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'admin'
                            CHECK (role IN ('super_admin', 'admin', 'moderator')),
  created_at    timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE enquiries (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id bigint      NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  -- Set when a signed-in student submits; enquiry stays open to guests.
  student_id  bigint      REFERENCES students (id) ON DELETE SET NULL,
  name        text        NOT NULL,
  email       citext      NOT NULL,
  phone       text        NOT NULL,
  message     text        NOT NULL,
  status      text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Admin dashboard's default view: filter by status, newest first.
CREATE INDEX enquiries_status_created_idx ON enquiries (status, created_at DESC);
CREATE INDEX enquiries_property_idx       ON enquiries (property_id);
CREATE INDEX enquiries_student_idx        ON enquiries (student_id);


-- ---------------------------------------------------------------------------
-- saved_properties  (student shortlist)
-- ---------------------------------------------------------------------------
CREATE TABLE saved_properties (
  student_id  bigint      NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  property_id bigint      NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Composite PK makes a duplicate save impossible at the database level,
  -- so the API can be idempotent without a read-then-write race.
  PRIMARY KEY (student_id, property_id)
);

CREATE INDEX saved_properties_student_idx
  ON saved_properties (student_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- property_views  (Phase 9 — analytics)
-- ---------------------------------------------------------------------------
-- One row per property detail view. Deliberately NOT a counter column on
-- properties: a counter can answer "how many", but analytics needs "when",
-- which requires the individual events.
CREATE TABLE property_views (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id  bigint      NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  -- Salted SHA-256 of (ip + user agent). We need to distinguish visitors well
  -- enough to deduplicate refreshes, but storing a raw IP would make this table
  -- personal data under GDPR for no analytical gain. The hash is one-way and
  -- the salt is a server secret, so it cannot be reversed or rainbow-tabled.
  visitor_hash char(64)    NOT NULL,
  viewed_at    timestamptz NOT NULL DEFAULT now()
);

-- Serves the time-series aggregate: range scan on viewed_at, grouped by property.
CREATE INDEX property_views_viewed_at_idx ON property_views (viewed_at DESC);
CREATE INDEX property_views_property_idx  ON property_views (property_id, viewed_at DESC);
-- Deduplication looks up (property, visitor) pairs within a recent window.
CREATE INDEX property_views_dedupe_idx    ON property_views (property_id, visitor_hash, viewed_at DESC);
