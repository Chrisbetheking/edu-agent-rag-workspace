-- EduAgent full Supabase schema
-- Run this once in Supabase SQL Editor or with: psql "$DATABASE_URL" -f docs/supabase-full-schema.sql

create extension if not exists "pgcrypto";

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  source text not null default 'upload',
  status text not null default 'parsed' check (status in ('pending', 'parsed', 'failed')),
  chunk_count integer not null default 0,
  owner_id text not null default 'u_chris',
  visibility text not null default 'public',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  document_title text not null,
  content text not null,
  chunk_index integer not null default 0,
  keywords text[] not null default '{}',
  owner_id text not null default 'u_chris',
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'u_chris',
  title text not null default '新的咨询',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  sources jsonb not null default '[]'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  user_id text,
  conversation_id uuid,
  question text not null default '',
  model text not null default 'unknown',
  success boolean not null default true,
  duration_ms integer not null default 0,
  retrieval_latency_ms integer not null default 0,
  llm_latency_ms integer not null default 0,
  rag_hit_count integer not null default 0,
  rag_scores jsonb not null default '[]'::jsonb,
  cache_hit boolean not null default false,
  fallback_triggered boolean not null default false,
  fallback_reason text,
  tool_names text[] not null default '{}',
  error_type text,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scene text not null default 'custom',
  content text not null default '',
  variables text[] not null default '{}',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists eval_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  expected_source text not null,
  expected_answer text,
  created_at timestamptz not null default now()
);

create table if not exists eval_results (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  expected_source text not null,
  hit boolean not null default false,
  recall_at_k numeric not null default 0,
  latency integer not null default 0,
  retrieved jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_document_id on chunks(document_id);
create index if not exists idx_chunks_created_at on chunks(created_at desc);
create index if not exists idx_chunks_owner_id on chunks(owner_id);
create index if not exists idx_documents_created_at on documents(created_at desc);
create index if not exists idx_documents_owner_visibility on documents(owner_id, visibility);
create index if not exists idx_conversations_user_updated on conversations(user_id, updated_at desc);
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at asc);
create index if not exists idx_call_logs_created_at on call_logs(created_at desc);
create index if not exists idx_call_logs_success on call_logs(success);
create index if not exists idx_call_logs_cache_hit on call_logs(cache_hit);
create index if not exists idx_call_logs_fallback on call_logs(fallback_triggered);
