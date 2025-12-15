# Multi-Agent Orchestration Platform PRD

## Product Requirements Document

**Version**: 1.0.0  
**Date**: December 2025  
**Author**: Platform Architecture Team

---

## 1. Executive Summary

### 1.1 Overview

본 문서는 **Multi-Agent Orchestration Platform**의 기술 아키텍처 및 구현 명세를 정의합니다. 이 플랫폼은 다양한 AI Agent들을 등록, 관리하고 사용자 요청에 따라 동적으로 적절한 Agent를 선택하여 실행하는 시스템입니다.

### 1.2 Goals

- **Agent Registry**: 여러 AI Agent들을 중앙에서 등록 및 관리
- **Dynamic Orchestration**: 사용자 요청을 분석하여 적절한 Agent로 자동 라우팅
- **Generative UI**: Agent 실행 상태, Plan, TODO를 실시간으로 시각화
- **Scalability**: Agent 추가/수정이 런타임에 동적으로 반영

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Vercel AI SDK 5.0, Drizzle ORM |
| Backend | Python 3.11+, FastAPI, LangGraph, DeepAgents |
| Database | PostgreSQL 16 |
| LLM | Amazon Bedrock (Claude 3.5 Sonnet) |
| Observability | LangSmith |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-AGENT PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND (Next.js 15)                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ │   │
│  │  │ Agent        │  │ Workflow     │  │ Generative UI (AI Elements)   │ │   │
│  │  │ Dashboard    │  │ Monitor      │  │ - Plan/TODO Progress          │ │   │
│  │  │ (등록/관리)   │  │ (실행 현황)   │  │ - Agent 상태 표시             │ │   │
│  │  └──────────────┘  └──────────────┘  │ - Human-in-the-loop           │ │   │
│  │                                      └────────────────────────────────┘ │   │
│  │                         Vercel AI SDK 5.0                                │   │
│  │                    useChat() + streamUI + Tool Parts                     │   │
│  │                         Drizzle ORM (DB Access)                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │ SSE/WebSocket                            │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    API GATEWAY (Next.js API Routes)                      │   │
│  │                    - Authentication / Authorization                      │   │
│  │                    - Request Routing                                     │   │
│  │                    - Stream Transformation                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      PYTHON BACKEND (FastAPI)                            │   │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    ORCHESTRATOR AGENT                               │ │   │
│  │  │         (LangGraph Supervisor + DeepAgents Planning)               │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│ │   │
│  │  │  │ Router      │  │ Planner     │  │ Agent Selector              ││ │   │
│  │  │  │ (의도 분석)  │  │ (TODO 생성)  │  │ (Registry 조회)             ││ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘│ │   │
│  │  └────────────────────────────────────────────────────────────────────┘ │   │
│  │                                      │                                   │   │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      AGENT REGISTRY (PostgreSQL)                    │ │   │
│  │  │                   SQLAlchemy로 Agent 정보 조회                       │ │   │
│  │  │                   동적으로 Graph 인스턴스 생성                        │ │   │
│  │  └────────────────────────────────────────────────────────────────────┘ │   │
│  │                                      │                                   │   │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    SPECIALIZED AGENTS                               │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │ │   │
│  │  │  │ Data        │  │ Document    │  │ Customer    │  │ Custom    │  │ │   │
│  │  │  │ Analyst     │  │ Processor   │  │ Support     │  │ Agents... │  │ │   │
│  │  │  │ (LangGraph) │  │ (DeepAgent) │  │ (LangGraph) │  │           │  │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │ │   │
│  │  └────────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                              PostgreSQL                                  │   │
│  │         agents | agent_capabilities | agent_runs | agent_workflows      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         OBSERVABILITY                                    │   │
│  │               LangSmith (Tracing) + CloudWatch (Metrics)                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Request
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│  Next.js    │────►│  Next.js    │────►│  Python Backend     │
│  Frontend   │ SSE │  API Route  │ SSE │  (FastAPI)          │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Orchestrator │
                                        │   Agent     │
                                        └─────────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                    ┌───────────┐        ┌───────────┐        ┌───────────┐
                    │  Agent A  │        │  Agent B  │        │  Agent C  │
                    │(LangGraph)│        │(DeepAgent)│        │(LangGraph)│
                    └───────────┘        └───────────┘        └───────────┘
                          │                    │                    │
                          └────────────────────┼────────────────────┘
                                               ▼
                                        ┌─────────────┐
                                        │ Synthesizer │
                                        └─────────────┘
                                               │
                                               ▼
                                        Response (SSE Stream)
```

---

## 3. Database Schema

### 3.1 Overview

PostgreSQL을 사용하여 Agent 등록 정보, 실행 로그, 워크플로우 정의를 저장합니다.

### 3.2 Drizzle ORM Schema (Next.js)

```typescript
// src/db/schema.ts
import { 
  pgTable, 
  varchar, 
  text, 
  jsonb, 
  timestamp, 
  serial, 
  integer,
  uuid,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Agents Table - Agent 등록 정보
// ============================================
export const agents = pgTable('agents', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  
  // Agent 타입: 'langgraph' | 'deepagent' | 'custom'
  agentType: varchar('agent_type', { length: 50 }).default('langgraph').notNull(),
  
  // Agent 설정 (모델, 프롬프트, 도구 등)
  config: jsonb('config').default({}).notNull(),
  
  // 상태: 'active' | 'inactive' | 'error'
  status: varchar('status', { length: 20 }).default('active').notNull(),
  
  // 메타데이터
  version: varchar('version', { length: 20 }).default('1.0.0'),
  owner: varchar('owner', { length: 100 }),
  tags: text('tags').array(),
  
  // 타임스탬프
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('agents_status_idx').on(table.status),
  ownerIdx: index('agents_owner_idx').on(table.owner),
}));

// ============================================
// Agent Capabilities Table - Agent 능력 매핑
// ============================================
export const agentCapabilities = pgTable('agent_capabilities', {
  id: serial('id').primaryKey(),
  agentId: varchar('agent_id', { length: 50 })
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  capability: varchar('capability', { length: 100 }).notNull(),
}, (table) => ({
  capabilityIdx: index('capabilities_capability_idx').on(table.capability),
  uniqueAgentCapability: uniqueIndex('unique_agent_capability')
    .on(table.agentId, table.capability),
}));

// ============================================
// Agent Runs Table - 실행 로그
// ============================================
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: varchar('agent_id', { length: 50 })
    .references(() => agents.id),
  
  // 요청 정보
  sessionId: varchar('session_id', { length: 100 }),
  userId: varchar('user_id', { length: 100 }),
  
  // 실행 정보
  input: jsonb('input'),
  output: jsonb('output'),
  status: varchar('status', { length: 20 }), // 'pending' | 'running' | 'completed' | 'failed'
  
  // 성능 메트릭
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  tokenUsage: jsonb('token_usage'),
  
  // 에러 정보
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  
  // 타임스탬프
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  agentIdIdx: index('runs_agent_id_idx').on(table.agentId),
  sessionIdIdx: index('runs_session_id_idx').on(table.sessionId),
  statusIdx: index('runs_status_idx').on(table.status),
  createdAtIdx: index('runs_created_at_idx').on(table.createdAt),
}));

// ============================================
// Agent Workflows Table - 복합 워크플로우 정의
// ============================================
export const agentWorkflows = pgTable('agent_workflows', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  
  // 워크플로우 정의 (어떤 Agent들을 어떤 순서로)
  workflowDefinition: jsonb('workflow_definition').notNull(),
  
  // 상태
  status: varchar('status', { length: 20 }).default('active').notNull(),
  
  // 타임스탬프
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// Relations 정의
// ============================================
export const agentsRelations = relations(agents, ({ many }) => ({
  capabilities: many(agentCapabilities),
  runs: many(agentRuns),
}));

export const agentCapabilitiesRelations = relations(agentCapabilities, ({ one }) => ({
  agent: one(agents, {
    fields: [agentCapabilities.agentId],
    references: [agents.id],
  }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  agent: one(agents, {
    fields: [agentRuns.agentId],
    references: [agents.id],
  }),
}));

// ============================================
// Type Exports
// ============================================
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentCapability = typeof agentCapabilities.$inferSelect;
export type NewAgentCapability = typeof agentCapabilities.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type AgentWorkflow = typeof agentWorkflows.$inferSelect;
export type NewAgentWorkflow = typeof agentWorkflows.$inferInsert;
```

### 3.3 Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

### 3.4 Agent Config JSON Schema

```typescript
// src/types/agent-config.ts
export interface AgentConfig {
  // LLM 설정
  model: string;                    // e.g., "anthropic.claude-3-5-sonnet-20241022-v2:0"
  region?: string;                  // e.g., "us-west-2"
  temperature?: number;             // 0.0 - 1.0
  maxTokens?: number;
  
  // 프롬프트
  systemPrompt: string;
  
  // 도구 목록 (Python backend의 tools 모듈 이름)
  tools: string[];
  
  // Agent 특화 설정
  maxIterations?: number;           // LangGraph 최대 반복
  enablePlanning?: boolean;         // DeepAgents planning 활성화
  
  // Human-in-the-loop 설정
  requireApproval?: boolean;
  approvalTools?: string[];         // 승인 필요한 도구 목록
}

// 예시
const exampleConfig: AgentConfig = {
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  region: "us-west-2",
  temperature: 0.3,
  systemPrompt: "You are a data analysis expert...",
  tools: ["run_sql_query", "create_chart", "calculate_stats"],
  maxIterations: 10,
  enablePlanning: false,
  requireApproval: false,
};
```

---

## 4. Frontend Implementation (Next.js 15)

### 4.1 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── agents/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET, PUT, DELETE
│   │   ├── orchestrate/
│   │   │   └── stream/
│   │   │       └── route.ts          # POST (SSE streaming)
│   │   └── chat/
│   │       └── route.ts              # Vercel AI SDK chat
│   ├── (dashboard)/
│   │   ├── agents/
│   │   │   ├── page.tsx              # Agent 목록
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Agent 상세/편집
│   │   │   └── new/
│   │   │       └── page.tsx          # Agent 등록
│   │   └── chat/
│   │       └── page.tsx              # 채팅 인터페이스
│   └── layout.tsx
├── components/
│   ├── agent-ui/
│   │   ├── PlanProgress.tsx          # 실행 계획 표시
│   │   ├── TodoProgress.tsx          # DeepAgents TODO 표시
│   │   ├── AgentStatusCard.tsx       # Agent 상태 카드
│   │   └── AgentSelector.tsx         # Agent 선택 UI
│   └── ui/                           # shadcn/ui components
├── db/
│   ├── schema.ts                     # Drizzle schema
│   └── index.ts                      # DB connection
├── lib/
│   ├── agents.ts                     # Agent CRUD operations
│   └── utils.ts
└── types/
    └── agent.ts                      # Type definitions
```

### 4.2 Agent CRUD API (Drizzle)

```typescript
// src/lib/agents.ts
import { db } from '@/db';
import { agents, agentCapabilities, agentRuns } from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { AgentConfig } from '@/types/agent-config';

// 모든 활성 Agent 조회
export async function getAllAgents() {
  return await db.query.agents.findMany({
    where: eq(agents.status, 'active'),
    with: {
      capabilities: true,
    },
    orderBy: [desc(agents.createdAt)],
  });
}

// ID로 Agent 조회
export async function getAgentById(id: string) {
  return await db.query.agents.findFirst({
    where: eq(agents.id, id),
    with: {
      capabilities: true,
      runs: {
        limit: 10,
        orderBy: [desc(agentRuns.createdAt)],
      },
    },
  });
}

// 능력으로 Agent 검색
export async function findAgentsByCapability(capability: string) {
  const caps = await db.query.agentCapabilities.findMany({
    where: eq(agentCapabilities.capability, capability),
    with: {
      agent: true,
    },
  });
  
  return caps
    .filter(c => c.agent.status === 'active')
    .map(c => c.agent);
}

// Agent 생성
export async function createAgent(data: {
  id: string;
  name: string;
  description: string;
  agentType?: string;
  config: AgentConfig;
  capabilities: string[];
  owner?: string;
  tags?: string[];
}) {
  return await db.transaction(async (tx) => {
    // Agent 생성
    const [agent] = await tx.insert(agents).values({
      id: data.id,
      name: data.name,
      description: data.description,
      agentType: data.agentType || 'langgraph',
      config: data.config,
      owner: data.owner,
      tags: data.tags,
    }).returning();
    
    // Capabilities 생성
    if (data.capabilities.length > 0) {
      await tx.insert(agentCapabilities).values(
        data.capabilities.map(cap => ({
          agentId: agent.id,
          capability: cap,
        }))
      );
    }
    
    return agent;
  });
}

// Agent 수정
export async function updateAgent(id: string, data: {
  name?: string;
  description?: string;
  config?: AgentConfig;
  capabilities?: string[];
  tags?: string[];
}) {
  return await db.transaction(async (tx) => {
    // Agent 업데이트
    const [agent] = await tx.update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();
    
    // Capabilities 업데이트 (있으면)
    if (data.capabilities) {
      await tx.delete(agentCapabilities)
        .where(eq(agentCapabilities.agentId, id));
      
      if (data.capabilities.length > 0) {
        await tx.insert(agentCapabilities).values(
          data.capabilities.map(cap => ({
            agentId: id,
            capability: cap,
          }))
        );
      }
    }
    
    return agent;
  });
}

// Agent 비활성화 (Soft Delete)
export async function deactivateAgent(id: string) {
  return await db.update(agents)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(eq(agents.id, id))
    .returning();
}

// 실행 로그 기록
export async function logAgentRun(data: {
  agentId: string;
  sessionId?: string;
  userId?: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  tokenUsage?: any;
  errorMessage?: string;
}) {
  return await db.insert(agentRuns).values(data).returning();
}

// Orchestrator용: Agent 컨텍스트 문자열 생성
export async function getAgentContextForOrchestrator() {
  const allAgents = await getAllAgents();
  
  return allAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities.map(c => c.capability),
  }));
}
```

### 4.3 API Routes

```typescript
// src/app/api/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, createAgent } from '@/lib/agents';

export async function GET() {
  try {
    const agents = await getAllAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const agent = await createAgent({
      id: body.id,
      name: body.name,
      description: body.description,
      agentType: body.agentType,
      config: body.config,
      capabilities: body.capabilities || [],
      owner: body.owner,
      tags: body.tags,
    });
    
    // Python Backend에 캐시 무효화 알림
    await notifyPythonBackend(agent.id);
    
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

async function notifyPythonBackend(agentId: string) {
  try {
    await fetch(`${process.env.PYTHON_API_URL}/api/registry/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId }),
    });
  } catch (error) {
    console.error('Failed to notify Python backend:', error);
  }
}
```

```typescript
// src/app/api/agents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAgentById, updateAgent, deactivateAgent } from '@/lib/agents';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAgentById(params.id);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ agent });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const agent = await updateAgent(params.id, body);
    
    // Python Backend 캐시 무효화
    await fetch(`${process.env.PYTHON_API_URL}/api/registry/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: params.id }),
    });
    
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await deactivateAgent(params.id);
  
  // Python Backend 캐시 무효화
  await fetch(`${process.env.PYTHON_API_URL}/api/registry/invalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: params.id }),
  });
  
  return NextResponse.json({ success: true });
}
```

### 4.4 Orchestrate Stream API (Python Backend 프록시)

```typescript
// src/app/api/orchestrate/stream/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Python Backend로 요청 전달
  const response = await fetch(
    `${process.env.PYTHON_API_URL}/api/orchestrate/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 인증 헤더 전달
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    }
  );
  
  // SSE 스트림 전달
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 4.5 Generative UI Components

```typescript
// src/components/agent-ui/PlanProgress.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';

export interface PlanStep {
  step: number;
  agentId: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
}

interface PlanProgressProps {
  steps: PlanStep[];
}

export function PlanProgress({ steps }: PlanProgressProps) {
  if (steps.length === 0) return null;
  
  return (
    <div className="bg-slate-50 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
        🎯 Execution Plan
        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
          {steps.filter(s => s.status === 'completed').length}/{steps.length}
        </span>
      </h3>
      
      <div className="space-y-2">
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded transition-colors ${
                step.status === 'running' ? 'bg-blue-50 border border-blue-200' : ''
              } ${step.status === 'completed' ? 'bg-green-50' : ''}`}
            >
              {step.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              {step.status === 'running' && (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
              )}
              {step.status === 'pending' && (
                <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
              )}
              {step.status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{step.task}</div>
                <div className="text-xs text-slate-500">
                  Agent: {step.agentId}
                </div>
              </div>
              
              <span className="text-xs bg-slate-200 px-2 py-1 rounded flex-shrink-0">
                Step {step.step}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

```typescript
// src/components/agent-ui/TodoProgress.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Square, ListTodo } from 'lucide-react';

export interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  agent?: string;
}

interface TodoProgressProps {
  todos: TodoItem[];
  title?: string;
}

export function TodoProgress({ todos, title = "Task Progress" }: TodoProgressProps) {
  if (todos.length === 0) return null;
  
  const completed = todos.filter(t => t.completed).length;
  const progress = (completed / todos.length) * 100;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          {title}
        </h3>
        <span className="text-xs text-amber-600 font-medium">
          {completed}/{todos.length} completed
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-amber-200 rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      
      {/* TODO List */}
      <div className="space-y-1.5">
        {todos.map((todo, index) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-start gap-2 text-sm ${
              todo.completed ? 'text-amber-600' : 'text-amber-900'
            }`}
          >
            {todo.completed ? (
              <CheckSquare className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            )}
            <span className={todo.completed ? 'line-through opacity-70' : ''}>
              {todo.task}
            </span>
            {todo.agent && (
              <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">
                {todo.agent}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// src/components/agent-ui/AgentStatusCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Bot, CheckCircle, Loader2, XCircle } from 'lucide-react';

interface AgentStatusCardProps {
  agentId: string;
  agentName: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export function AgentStatusCard({ 
  agentId, 
  agentName, 
  status, 
  result,
  error
}: AgentStatusCardProps) {
  const statusStyles = {
    idle: 'border-slate-200 bg-slate-50',
    running: 'border-blue-300 bg-blue-50',
    completed: 'border-green-300 bg-green-50',
    error: 'border-red-300 bg-red-50',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border rounded-lg p-3 ${statusStyles[status]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4 text-slate-600" />
        <span className="font-medium text-sm">{agentName}</span>
        
        <div className="ml-auto">
          {status === 'running' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          {status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>
      
      {result && (
        <div className="text-sm text-slate-600 mt-2 p-2 bg-white/50 rounded text-wrap break-words">
          {result.length > 200 ? `${result.slice(0, 200)}...` : result}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 mt-2 p-2 bg-red-100 rounded">
          {error}
        </div>
      )}
    </motion.div>
  );
}
```

---

## 5. Python Backend Implementation

### 5.1 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI entry point
│   ├── config.py                     # Configuration
│   └── dependencies.py               # DI dependencies
├── api/
│   ├── __init__.py
│   └── routes/
│       ├── __init__.py
│       ├── orchestrate.py            # Orchestration endpoints
│       ├── agents.py                 # Agent management endpoints
│       └── registry.py               # Registry management
├── db/
│   ├── __init__.py
│   ├── session.py                    # SQLAlchemy session
│   └── models.py                     # SQLAlchemy models
├── registry/
│   ├── __init__.py
│   └── db_registry.py                # Database-backed registry
├── orchestrator/
│   ├── __init__.py
│   └── dynamic_orchestrator.py       # LangGraph orchestrator
├── agents/
│   ├── __init__.py
│   ├── base.py                       # Base agent factory
│   └── builders/
│       ├── langgraph_builder.py      # LangGraph agent builder
│       └── deepagent_builder.py      # DeepAgent builder
└── tools/
    ├── __init__.py
    ├── sql_tools.py
    ├── document_tools.py
    └── ...
```

### 5.2 SQLAlchemy Models

```python
# backend/db/models.py
from sqlalchemy import (
    Column, String, Text, JSON, ARRAY, DateTime, 
    Integer, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Agent(Base):
    __tablename__ = 'agents'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    agent_type = Column(String(50), default='langgraph', nullable=False)
    config = Column(JSON, default={}, nullable=False)
    status = Column(String(20), default='active', nullable=False)
    version = Column(String(20), default='1.0.0')
    owner = Column(String(100))
    tags = Column(ARRAY(String))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    capabilities = relationship("AgentCapability", back_populates="agent", cascade="all, delete-orphan")
    runs = relationship("AgentRun", back_populates="agent")
    
    __table_args__ = (
        Index('agents_status_idx', 'status'),
        Index('agents_owner_idx', 'owner'),
    )


class AgentCapability(Base):
    __tablename__ = 'agent_capabilities'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String(50), ForeignKey('agents.id', ondelete='CASCADE'), nullable=False)
    capability = Column(String(100), nullable=False)
    
    agent = relationship("Agent", back_populates="capabilities")
    
    __table_args__ = (
        UniqueConstraint('agent_id', 'capability', name='unique_agent_capability'),
        Index('capabilities_capability_idx', 'capability'),
    )


class AgentRun(Base):
    __tablename__ = 'agent_runs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(String(50), ForeignKey('agents.id'))
    session_id = Column(String(100))
    user_id = Column(String(100))
    input = Column(JSON)
    output = Column(JSON)
    status = Column(String(20))
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)
    token_usage = Column(JSON)
    error_message = Column(Text)
    error_stack = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    agent = relationship("Agent", back_populates="runs")
    
    __table_args__ = (
        Index('runs_agent_id_idx', 'agent_id'),
        Index('runs_session_id_idx', 'session_id'),
        Index('runs_status_idx', 'status'),
        Index('runs_created_at_idx', 'created_at'),
    )


class AgentWorkflow(Base):
    __tablename__ = 'agent_workflows'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    workflow_definition = Column(JSON, nullable=False)
    status = Column(String(20), default='active', nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### 5.3 Database-backed Agent Registry

```python
# backend/registry/db_registry.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.models import Agent, AgentCapability
from agents.builders.langgraph_builder import build_langgraph_agent
from agents.builders.deepagent_builder import build_deepagent
import logging

logger = logging.getLogger(__name__)


class DatabaseAgentRegistry:
    """PostgreSQL 기반 Agent Registry"""
    
    def __init__(self, session: Session):
        self.session = session
        self._graph_cache: Dict[str, Any] = {}
    
    def get_all_agents(self) -> List[Agent]:
        """모든 활성 Agent 조회"""
        return self.session.query(Agent).filter(
            Agent.status == 'active'
        ).all()
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """ID로 Agent 조회"""
        return self.session.query(Agent).filter(
            Agent.id == agent_id
        ).first()
    
    def find_by_capability(self, capability: str) -> List[Agent]:
        """능력으로 Agent 검색"""
        return self.session.query(Agent).join(AgentCapability).filter(
            AgentCapability.capability == capability,
            Agent.status == 'active'
        ).all()
    
    def get_agent_graph(self, agent_id: str) -> Any:
        """Agent의 실행 가능한 Graph 인스턴스 가져오기 (캐싱)"""
        
        if agent_id in self._graph_cache:
            logger.debug(f"Cache hit for agent: {agent_id}")
            return self._graph_cache[agent_id]
        
        agent = self.get_agent(agent_id)
        if not agent:
            logger.warning(f"Agent not found: {agent_id}")
            return None
        
        graph = self._build_graph(agent)
        self._graph_cache[agent_id] = graph
        
        logger.info(f"Built and cached graph for agent: {agent_id}")
        return graph
    
    def _build_graph(self, agent: Agent) -> Any:
        """Agent config 기반으로 LangGraph/DeepAgent 인스턴스 생성"""
        
        config = agent.config
        
        if agent.agent_type == 'deepagent':
            return build_deepagent(config)
        else:
            return build_langgraph_agent(config)
    
    def invalidate_cache(self, agent_id: str = None):
        """캐시 무효화"""
        if agent_id:
            self._graph_cache.pop(agent_id, None)
            logger.info(f"Cache invalidated for agent: {agent_id}")
        else:
            self._graph_cache.clear()
            logger.info("All cache invalidated")
    
    def to_orchestrator_context(self) -> List[Dict]:
        """Orchestrator가 사용할 Agent 목록"""
        agents = self.get_all_agents()
        return [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "capabilities": [c.capability for c in a.capabilities],
            }
            for a in agents
        ]
    
    def get_context_string(self) -> str:
        """Orchestrator 시스템 프롬프트용 문자열"""
        agents = self.to_orchestrator_context()
        return "\n".join([
            f"- {a['id']}: {a['description']} (capabilities: {', '.join(a['capabilities'])})"
            for a in agents
        ])
```

### 5.4 Dynamic Orchestrator

```python
# backend/orchestrator/dynamic_orchestrator.py
from typing import List, Dict, Any, Literal, Annotated
from langchain_aws import ChatBedrockConverse
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.types import Command
from pydantic import BaseModel, Field
from registry.db_registry import DatabaseAgentRegistry
from db.session import get_session
import json
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class RouterDecision(BaseModel):
    """Orchestrator의 라우팅 결정"""
    reasoning: str = Field(description="선택 이유")
    selected_agents: List[str] = Field(description="실행할 Agent ID 목록")
    execution_plan: List[Dict[str, Any]] = Field(description="실행 계획")
    is_direct_response: bool = Field(default=False, description="Agent 호출 없이 직접 응답 가능 여부")


class OrchestratorState(MessagesState):
    """Orchestrator 상태"""
    plan: List[Dict[str, Any]] = []
    current_step: int = 0
    agent_results: Dict[str, Any] = {}
    todos: List[Dict[str, Any]] = []
    final_response: str = ""


def create_dynamic_orchestrator(registry: DatabaseAgentRegistry):
    """동적 Agent Orchestrator 생성"""
    
    llm = ChatBedrockConverse(
        model="anthropic.claude-3-5-sonnet-20241022-v2:0",
        region_name="us-west-2",
        temperature=0
    )
    
    def get_system_prompt() -> str:
        agent_context = registry.get_context_string()
        return f"""You are an intelligent orchestrator that analyzes user requests and routes them to specialized agents.

Available Agents:
{agent_context}

Your responsibilities:
1. Analyze the user's request to understand their intent
2. If the request can be answered directly without agents, set is_direct_response=true
3. Otherwise, create an execution plan using available agents
4. For complex tasks, break them into steps and assign to multiple agents
5. Always explain your reasoning

Output your decision as structured JSON."""
    
    def router_node(state: OrchestratorState):
        """사용자 요청 분석 및 Agent 선택"""
        
        messages = [
            {"role": "system", "content": get_system_prompt()},
            *state["messages"]
        ]
        
        response = llm.with_structured_output(RouterDecision).invoke(messages)
        
        if response.is_direct_response:
            return {
                "final_response": response.reasoning,
                "plan": []
            }
        
        # Plan 생성
        plan = []
        for i, step in enumerate(response.execution_plan):
            plan.append({
                "step": i + 1,
                "agent_id": step.get("agent_id"),
                "task": step.get("task"),
                "status": "pending"
            })
        
        return {
            "plan": plan,
            "current_step": 0
        }
    
    async def executor_node(state: OrchestratorState):
        """선택된 Agent 실행"""
        
        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        results = state.get("agent_results", {})
        todos = state.get("todos", [])
        
        if current_step >= len(plan):
            return {"agent_results": results}
        
        step = plan[current_step]
        agent_id = step["agent_id"]
        task = step["task"]
        
        # Plan 상태 업데이트
        plan[current_step]["status"] = "running"
        
        logger.info(f"Executing agent: {agent_id}, task: {task}")
        
        try:
            graph = registry.get_agent_graph(agent_id)
            
            if graph is None:
                results[agent_id] = {"error": f"Agent {agent_id} not found"}
                plan[current_step]["status"] = "error"
            else:
                # Agent 실행
                result = await graph.ainvoke({
                    "messages": [{"role": "user", "content": task}]
                })
                
                results[agent_id] = result
                plan[current_step]["status"] = "completed"
                
                # TODO 업데이트 (DeepAgents인 경우)
                if "todos" in result:
                    todos.extend(result["todos"])
                    
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            results[agent_id] = {"error": str(e)}
            plan[current_step]["status"] = "error"
        
        return {
            "plan": plan,
            "current_step": current_step + 1,
            "agent_results": results,
            "todos": todos
        }
    
    def should_continue(state: OrchestratorState) -> Literal["executor", "synthesizer"]:
        """다음 노드 결정"""
        plan = state.get("plan", [])
        current_step = state.get("current_step", 0)
        
        if current_step < len(plan):
            return "executor"
        return "synthesizer"
    
    def synthesizer_node(state: OrchestratorState):
        """결과 종합"""
        
        results = state.get("agent_results", {})
        plan = state.get("plan", [])
        
        if not results:
            return {"final_response": state.get("final_response", "")}
        
        synthesis_prompt = f"""Based on the execution plan and agent results, provide a comprehensive response.

Execution Plan:
{json.dumps(plan, indent=2)}

Agent Results:
{json.dumps(results, indent=2, default=str)}

Synthesize these results into a coherent, helpful response for the user."""
        
        response = llm.invoke([
            {"role": "system", "content": "You synthesize multiple agent outputs into clear, helpful responses."},
            {"role": "user", "content": synthesis_prompt}
        ])
        
        return {"final_response": response.content}
    
    # Graph 구성
    graph = StateGraph(OrchestratorState)
    
    graph.add_node("router", router_node)
    graph.add_node("executor", executor_node)
    graph.add_node("synthesizer", synthesizer_node)
    
    graph.add_edge(START, "router")
    graph.add_conditional_edges("router", should_continue)
    graph.add_conditional_edges("executor", should_continue)
    graph.add_edge("synthesizer", END)
    
    return graph.compile()
```

### 5.5 FastAPI Streaming Endpoint

```python
# backend/api/routes/orchestrate.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from orchestrator.dynamic_orchestrator import create_dynamic_orchestrator
from registry.db_registry import DatabaseAgentRegistry
from db.session import get_session
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/orchestrate/stream")
async def orchestrate_stream(request: Request):
    """Orchestrator 실행 - SSE 스트리밍"""
    
    data = await request.json()
    user_message = data.get("message", "")
    session_id = data.get("session_id")
    
    async def event_generator():
        session = get_session()
        registry = DatabaseAgentRegistry(session)
        orchestrator = create_dynamic_orchestrator(registry)
        
        try:
            async for event in orchestrator.astream_events(
                {"messages": [{"role": "user", "content": user_message}]},
                version="v2"
            ):
                event_type = event.get("event")
                event_data = event.get("data", {})
                
                # Plan 생성 이벤트
                if "plan" in event_data and event_data["plan"]:
                    yield {
                        "event": "plan_created",
                        "data": json.dumps({
                            "type": "plan",
                            "plan": event_data["plan"]
                        })
                    }
                
                # TODO 업데이트 이벤트
                if "todos" in event_data and event_data["todos"]:
                    yield {
                        "event": "todo_update",
                        "data": json.dumps({
                            "type": "todo_update",
                            "todos": event_data["todos"]
                        })
                    }
                
                # Agent 상태 이벤트
                if event_type == "on_chain_start":
                    name = event.get("name", "")
                    if "executor" in name:
                        yield {
                            "event": "agent_started",
                            "data": json.dumps({
                                "type": "agent_status",
                                "status": "running"
                            })
                        }
                
                # 텍스트 스트리밍
                if event_type == "on_chat_model_stream":
                    chunk = event_data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield {
                            "event": "text_delta",
                            "data": json.dumps({
                                "type": "text",
                                "content": chunk.content
                            })
                        }
                
                # 최종 응답
                if "final_response" in event_data and event_data["final_response"]:
                    yield {
                        "event": "final_response",
                        "data": json.dumps({
                            "type": "final",
                            "content": event_data["final_response"]
                        })
                    }
            
            yield {"event": "done", "data": json.dumps({"type": "done"})}
            
        except Exception as e:
            logger.error(f"Orchestration error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({
                    "type": "error",
                    "message": str(e)
                })
            }
        finally:
            session.close()
    
    return EventSourceResponse(event_generator())


@router.post("/api/registry/invalidate")
async def invalidate_cache(request: Request):
    """Agent 캐시 무효화"""
    data = await request.json()
    agent_id = data.get("agent_id")
    
    session = get_session()
    registry = DatabaseAgentRegistry(session)
    registry.invalidate_cache(agent_id)
    session.close()
    
    return {"success": True, "invalidated": agent_id or "all"}
```

---

## 6. Environment Configuration

### 6.1 Next.js Environment Variables

```bash
# .env.local
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agent_platform"

# Python Backend
PYTHON_API_URL="http://localhost:8000"

# LangSmith (Optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=multi-agent-platform
```

### 6.2 Python Backend Environment Variables

```bash
# .env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agent_platform"

# AWS Bedrock
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=multi-agent-platform

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 7. Deployment Architecture

### 7.1 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Infrastructure                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Vercel (Frontend)                         │    │
│  │                    Next.js 15 App                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway / ALB                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              ECS Fargate (Python Backend)                    │    │
│  │              - FastAPI                                       │    │
│  │              - LangGraph Orchestrator                        │    │
│  │              - Auto Scaling                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│              ┌────────────────┼────────────────┐                    │
│              ▼                ▼                ▼                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │ RDS PostgreSQL│  │ Amazon Bedrock│  │ LangSmith             │   │
│  │ (Multi-AZ)    │  │ (Claude 3.5)  │  │ (Observability)       │   │
│  └───────────────┘  └───────────────┘  └───────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Scaling Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| Frontend (Vercel) | Auto-scaled by Vercel |
| Python Backend (ECS) | Horizontal scaling based on CPU/Memory |
| PostgreSQL (RDS) | Read replicas for read-heavy workloads |
| Agent Graph Cache | In-memory per instance + Redis for shared cache |

---

## 8. Future Enhancements

### 8.1 Phase 2 Features

- [ ] Agent Versioning & Rollback
- [ ] A/B Testing for Agent configurations
- [ ] Agent Performance Analytics Dashboard
- [ ] Workflow Template Library
- [ ] Multi-tenant Support

### 8.2 Phase 3 Features

- [ ] Visual Workflow Builder (Drag & Drop)
- [ ] Agent Marketplace
- [ ] Custom Tool Builder
- [ ] Real-time Collaboration
- [ ] Audit Logging & Compliance

---

## 9. Appendix

### 9.1 Sample Agent Configurations

#### Data Analyst Agent (LangGraph)

```json
{
  "id": "data-analyst",
  "name": "Data Analysis Agent",
  "description": "Analyzes data using SQL queries and creates visualizations",
  "agentType": "langgraph",
  "config": {
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "region": "us-west-2",
    "temperature": 0.3,
    "systemPrompt": "You are a data analysis expert. Use SQL queries to analyze data and create clear visualizations to present insights.",
    "tools": ["run_sql_query", "create_chart", "calculate_stats"],
    "maxIterations": 10
  },
  "capabilities": ["data_analysis", "sql", "visualization", "statistics"],
  "tags": ["analytics", "reporting"],
  "owner": "data-team"
}
```

#### Document Processor Agent (DeepAgent)

```json
{
  "id": "document-processor",
  "name": "Document Processing Agent",
  "description": "Processes documents with OCR, summarization, and entity extraction using planning",
  "agentType": "deepagent",
  "config": {
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "systemPrompt": "You are a document processing specialist. Break down complex document tasks into clear steps using the TODO tool. Extract text, summarize content, and identify key entities.",
    "tools": ["extract_text", "summarize", "translate", "extract_entities"],
    "enablePlanning": true
  },
  "capabilities": ["document_processing", "ocr", "summarization", "translation", "ner"],
  "tags": ["documents", "nlp"],
  "owner": "content-team"
}
```

### 9.2 API Reference

#### Agents API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all active agents |
| POST | `/api/agents` | Create new agent |
| GET | `/api/agents/:id` | Get agent by ID |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Deactivate agent |

#### Orchestration API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orchestrate/stream` | Execute orchestrator (SSE) |
| POST | `/api/registry/invalidate` | Invalidate agent cache |

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12 | Platform Team | Initial PRD |
