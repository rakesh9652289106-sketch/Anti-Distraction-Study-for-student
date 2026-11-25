-- FocusFlow PostgreSQL / Supabase Database Schema
-- Matches all entities in backend/src/db.ts

-- 1. Student Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  focus_score INTEGER NOT NULL DEFAULT 90,
  focus_coins INTEGER NOT NULL DEFAULT 120,
  current_streak INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'offline')),
  last_active TEXT NOT NULL DEFAULT 'Just now',
  chat_muted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. Staff Members (Room Heads)
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  subject TEXT NOT NULL,
  estimated_pomodoros INTEGER NOT NULL DEFAULT 1,
  actual_pomodoros INTEGER NOT NULL DEFAULT 0,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Study Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  task_title TEXT NOT NULL,
  distractions_blocked INTEGER NOT NULL DEFAULT 0,
  focus_score INTEGER NOT NULL DEFAULT 90,
  timeline JSONB DEFAULT '[]'::jsonb,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Daily Analytics Summary
CREATE TABLE IF NOT EXISTS analytics_summary (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  distractions_blocked INTEGER NOT NULL DEFAULT 0,
  focus_score INTEGER NOT NULL DEFAULT 90
);

-- 5. Rewards Store Items
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'star',
  purchased BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Study Rooms
CREATE TABLE IF NOT EXISTS study_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active_users INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT ARRAY['Study'],
  ambient_sound TEXT NOT NULL DEFAULT 'Silence',
  host_name TEXT NOT NULL DEFAULT 'Prof. Alex Rivera',
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  allowed_apps TEXT[] NOT NULL DEFAULT ARRAY['notion', 'gdocs'],
  focus_mode TEXT NOT NULL DEFAULT 'Standard Lock',
  session_duration_format TEXT NOT NULL DEFAULT '90m Focus / 15m Insight Exchange',
  allow_screen_share BOOLEAN NOT NULL DEFAULT TRUE,
  video_stream_required BOOLEAN NOT NULL DEFAULT FALSE,
  chat_moderation_filter BOOLEAN NOT NULL DEFAULT TRUE,
  censor_words TEXT[] NOT NULL DEFAULT ARRAY['spam', 'cheat', 'abuse', 'slack', 'tiktok'],
  coins_limit INTEGER NOT NULL DEFAULT 0,
  bonus_coins INTEGER NOT NULL DEFAULT 0,
  allow_material_downloads BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Study Room Chat Messages
CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Global Settings (Singleton row id = 1)
CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  study_mode BOOLEAN NOT NULL DEFAULT FALSE,
  distraction_shield BOOLEAN NOT NULL DEFAULT TRUE,
  blocked_websites TEXT[] NOT NULL DEFAULT ARRAY['instagram.com', 'facebook.com', 'youtube.com', 'twitter.com', 'tiktok.com'],
  focus_score INTEGER NOT NULL DEFAULT 92,
  pomodoro_work_time INTEGER NOT NULL DEFAULT 25,
  pomodoro_break_time INTEGER NOT NULL DEFAULT 5,
  current_streak INTEGER NOT NULL DEFAULT 5,
  focus_coins INTEGER NOT NULL DEFAULT 120,
  camera_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ui_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  group_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Support Tickets & Replies
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Admin Alerts
CREATE TABLE IF NOT EXISTS admin_alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'GLOBAL',
  source TEXT NOT NULL DEFAULT 'SYSTEM',
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('error', 'warning', 'info')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Classroom Groups
CREATE TABLE IF NOT EXISTS classroom_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  room TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  students TEXT[] NOT NULL DEFAULT '{}',
  active_session_id TEXT
);

-- 12. Shared Resources (Admin / Teacher / Student Uploaded Files)
CREATE TABLE IF NOT EXISTS shared_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'video', 'note', 'paper', 'link')),
  url TEXT NOT NULL,
  size TEXT DEFAULT 'Unknown Size',
  owner_id TEXT NOT NULL,
  relevance_score INTEGER NOT NULL DEFAULT 90,
  ai_summary_snippet TEXT DEFAULT '',
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',
  views_count INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Room / Group Resource Permissions (Maps Admin-Uploaded Files to Study Rooms)
CREATE TABLE IF NOT EXISTS resource_room_shares (
  id SERIAL PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES shared_resources(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL, -- matches study_rooms.id or 'all'
  view_only BOOLEAN NOT NULL DEFAULT FALSE,
  can_download BOOLEAN NOT NULL DEFAULT TRUE,
  allow_ai_summarization BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (resource_id, room_id)
);

-- 14. Weekly Timetable Events
CREATE TABLE IF NOT EXISTS timetable_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  time TEXT NOT NULL,
  subject TEXT NOT NULL,
  pomodoros INTEGER NOT NULL DEFAULT 1,
  is_ai_suggested BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for fast room & resource lookups
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_resource_room_shares_room_id ON resource_room_shares(room_id);
CREATE INDEX IF NOT EXISTS idx_resource_room_shares_resource_id ON resource_room_shares(resource_id);
CREATE INDEX IF NOT EXISTS idx_shared_resources_archived ON shared_resources(archived);

-- Seed Default Rooms
INSERT INTO study_rooms (id, name, active_users, tags, ambient_sound, host_name, is_verified, max_capacity, allowed_apps, focus_mode, session_duration_format)
VALUES
  ('room-1', 'Silent Library', 14, ARRAY['No Chat', 'Silent', 'Intense'], 'Soft Rain', 'Admin Library', TRUE, 50, ARRAY['notion', 'gdocs'], 'Standard Lock', '50m Focus / 10m Break'),
  ('room-2', 'AI Study Guild', 8, ARRAY['Coding', 'Discussion', 'Lofi'], 'Lofi Beats', 'Tutor Bot', TRUE, 30, ARRAY['notion', 'terminal'], 'AI Active Nudge', '25m Focus / 5m Discussion'),
  ('room-3', 'STEM Prep Hall', 5, ARRAY['Science', 'Calculus', 'Exam prep'], 'Library Ambient', 'Prof. Alex Rivera', TRUE, 20, ARRAY['gdocs', 'youtube'], 'Hard Lock', '90m Focus / 15m Insight Exchange')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Global Settings
INSERT INTO global_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
