-- EduAgent Supabase pgvector setup
-- Run this in Supabase SQL Editor after the normal tables are created.

create extension if not exists vector;

alter table if exists documents
  add column if not exists owner_id text not null default 'u_chris',
  add column if not exists visibility text not null default 'public',
  add column if not exists tags text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

alter table if exists chunks
  add column if not exists owner_id text not null default 'u_chris',
  add column if not exists embedding vector(1536);

create index if not exists chunks_owner_idx on chunks(owner_id);
create index if not exists documents_owner_visibility_idx on documents(owner_id, visibility);

-- Choose vector_cosine_ops when using cosine similarity embeddings.
create index if not exists chunks_embedding_ivfflat_idx
  on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  requester_id text default 'u_chris',
  requester_role text default 'admin'
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.document_title,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  left join documents d on d.id = c.document_id
  where c.embedding is not null
    and (requester_role = 'admin' or coalesce(d.visibility, 'public') = 'public' or coalesce(c.owner_id, d.owner_id, 'u_chris') = requester_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
