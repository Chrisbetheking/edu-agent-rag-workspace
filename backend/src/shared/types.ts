export type Role = 'admin' | 'consultant' | 'viewer' | 'guest' | 'user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  quotaLimit?: number;
  quotaRemaining?: number;
}

export interface RequestUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  quotaLimit?: number;
  quotaRemaining?: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  source: string;
  status: 'pending' | 'parsed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  chunkCount: number;
  ownerId?: string;
  visibility?: 'public' | 'private' | 'guest';
  tags?: string[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  score?: number;
  keywords: string[];
  ownerId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  toolCalls?: any[];
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  scene: string;
  content: string;
  variables: string[];
  enabled: boolean;
  updatedAt: string;
}

export interface ToolCallLog {
  id: string;
  toolName: string;
  input: any;
  output: any;
  duration: number;
  status: 'success' | 'failed';
  createdAt: string;
}

export interface EvalQuestion {
  id: string;
  question: string;
  expectedSource: string;
  expectedAnswer?: string;
  createdAt: string;
}

export interface EvalResult {
  id: string;
  question: string;
  expectedSource: string;
  hit: boolean;
  recallAtK: number;
  latency: number;
  retrieved: any[];
  createdAt: string;
}
