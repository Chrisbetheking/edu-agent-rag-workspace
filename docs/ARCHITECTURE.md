# EduAgent Architecture

## Current Stage

```txt
Browser
  ↓
React + TypeScript Frontend
  ↓ REST API
NestJS Backend
  ↓
PostgreSQL / Redis
```

## Target RAG / Agent Flow

```txt
User Question
  ↓
Frontend Chat Workspace
  ↓
Backend /chat endpoint
  ↓
Auth + Rate Limit + Log
  ↓
Intent Routing
  ├─ Tool Calling: CGPA / School Recommend / Copywriting
  └─ RAG: Query Rewrite → Vector Search → Top-K Chunks → LLM Answer
  ↓
Source Citation + Tool Trace
  ↓
SSE Streaming Response
```

## Core Tables

- users
- documents
- document_chunks
- conversations
- messages
- prompts
- tools
- tool_call_logs
- rag_eval_questions
- rag_eval_results
