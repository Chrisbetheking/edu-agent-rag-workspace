create extension if not exists "pgcrypto";

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  source text not null default 'upload',
  status text not null default 'parsed' check (status in ('pending', 'parsed', 'failed')),
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  document_title text not null,
  content text not null,
  chunk_index integer not null default 0,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_document_id on chunks(document_id);
create index if not exists idx_chunks_created_at on chunks(created_at desc);
create index if not exists idx_documents_created_at on documents(created_at desc);
