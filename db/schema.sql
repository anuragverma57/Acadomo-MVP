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
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX properties_city_idx       ON properties (city);
CREATE INDEX properties_university_idx ON properties (university);
CREATE INDEX properties_price_idx      ON properties (price_per_week);
CREATE INDEX properties_room_type_idx  ON properties (room_type);


-- ---------------------------------------------------------------------------
-- students  (passwordless — identity is a verified email, Phase 5.5)
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             citext      NOT NULL UNIQUE,
  name              text,
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
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
