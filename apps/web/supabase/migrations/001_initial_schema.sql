-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('admin', 'editor', 'viewer');
create type project_status as enum ('draft', 'in_progress', 'review', 'completed', 'archived');
create type book_type as enum ('novel', 'non_fiction', 'children', 'academic', 'poetry', 'comic', 'other');
create type page_size as enum ('A4', 'A5', 'US_Letter', 'US_Trade', 'Digest', 'Custom');
create type chat_role as enum ('user', 'assistant', 'system');
create type share_permission as enum ('view', 'comment');
create type activity_action as enum (
  'project_created', 'project_updated', 'project_deleted',
  'style_applied', 'style_updated', 'content_imported',
  'export_generated', 'template_created', 'template_updated',
  'share_link_created', 'comment_added', 'comment_resolved',
  'user_invited', 'user_role_changed'
);

-- ============================================================
-- USERS
-- ============================================================

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  avatar_url    text,
  role          user_role not null default 'viewer',
  google_id     text unique,
  google_refresh_token text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_users_email on users (email);
create index idx_users_google_id on users (google_id) where google_id is not null;
create index idx_users_role on users (role);

-- ============================================================
-- PROJECTS
-- ============================================================

create table projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  book_type     book_type not null default 'other',
  status        project_status not null default 'draft',
  page_size     page_size not null default 'A5',
  page_count    integer,
  assigned_to   uuid references users (id) on delete set null,
  created_by    uuid not null references users (id) on delete restrict,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_status on projects (status);
create index idx_projects_book_type on projects (book_type);
create index idx_projects_assigned_to on projects (assigned_to) where assigned_to is not null;
create index idx_projects_created_by on projects (created_by);
create index idx_projects_due_date on projects (due_date) where due_date is not null;

-- ============================================================
-- PROJECT CONTENT
-- ============================================================

create table project_content (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  content_tree  jsonb not null default '{}',
  source        text not null default 'manual',
  source_id     text,
  version       integer not null default 1,
  created_at    timestamptz not null default now()
);

create index idx_project_content_project_id on project_content (project_id);
create index idx_project_content_version on project_content (project_id, version desc);

-- ============================================================
-- PROJECT STYLES
-- ============================================================

create table project_styles (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  css_content   text not null default '',
  version       integer not null default 1,
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_project_styles_project_id on project_styles (project_id);
create index idx_project_styles_version on project_styles (project_id, version desc);

-- ============================================================
-- TEMPLATES
-- ============================================================

create table templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  book_type     book_type not null default 'other',
  css_content   text not null default '',
  thumbnail_url text,
  is_system     boolean not null default false,
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_templates_book_type on templates (book_type);
create index idx_templates_is_system on templates (is_system);
create index idx_templates_created_by on templates (created_by) where created_by is not null;

-- ============================================================
-- CHAT
-- ============================================================

create table chat_conversations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  user_id       uuid not null references users (id) on delete cascade,
  title         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_chat_conversations_project_id on chat_conversations (project_id);
create index idx_chat_conversations_user_id on chat_conversations (user_id);

create table chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  role            chat_role not null,
  content         text not null,
  token_count     integer,
  created_at      timestamptz not null default now()
);

create index idx_chat_messages_conversation_id on chat_messages (conversation_id);

-- ============================================================
-- STYLE CHANGES (undo/redo audit)
-- ============================================================

create table style_changes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects (id) on delete cascade,
  conversation_id uuid references chat_conversations (id) on delete set null,
  css_before      text not null,
  css_after       text not null,
  description     text,
  created_by      uuid references users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_style_changes_project_id on style_changes (project_id);

-- ============================================================
-- SHARE LINKS
-- ============================================================

create table share_links (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(24), 'base64url'),
  password_hash text,
  expires_at    timestamptz,
  permissions   share_permission not null default 'view',
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_share_links_project_id on share_links (project_id);
create index idx_share_links_token on share_links (token);
create index idx_share_links_expires_at on share_links (expires_at) where expires_at is not null;

-- ============================================================
-- COMMENTS
-- ============================================================

create table comments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  page_number   integer not null,
  x_position    numeric(6, 2) not null,
  y_position    numeric(6, 2) not null,
  content       text not null,
  author_name   text not null,
  author_id     uuid references users (id) on delete set null,
  share_link_id uuid references share_links (id) on delete set null,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_comments_project_id on comments (project_id);
create index idx_comments_page_number on comments (project_id, page_number);
create index idx_comments_resolved on comments (project_id, resolved);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

create table activity_log (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects (id) on delete cascade,
  user_id       uuid references users (id) on delete set null,
  action        activity_action not null,
  details       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index idx_activity_log_project_id on activity_log (project_id) where project_id is not null;
create index idx_activity_log_user_id on activity_log (user_id) where user_id is not null;
create index idx_activity_log_action on activity_log (action);
create index idx_activity_log_created_at on activity_log (created_at desc);

-- ============================================================
-- PROJECT ASSETS
-- ============================================================

create table project_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  filename      text not null,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid references users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_project_assets_project_id on project_assets (project_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_templates_updated_at
  before update on templates
  for each row execute function set_updated_at();

create trigger trg_chat_conversations_updated_at
  before update on chat_conversations
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table projects enable row level security;
alter table project_content enable row level security;
alter table project_styles enable row level security;
alter table templates enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table style_changes enable row level security;
alter table share_links enable row level security;
alter table comments enable row level security;
alter table activity_log enable row level security;
alter table project_assets enable row level security;

-- Service role bypasses RLS (used by server-side API routes)
-- Application enforces authorization in API layer
