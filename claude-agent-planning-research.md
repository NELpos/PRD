# Claude Agent Planning & Sequential Thinking 구현 가이드

> **Vercel AI SDK 5.0+ & Amazon Bedrock Claude 기반**
> 
> 작성일: 2024-12-16

---

## 목차

1. [개요](#1-개요)
2. [핵심 개념 정리](#2-핵심-개념-정리)
3. [환경 설정](#3-환경-설정)
4. [백엔드 구현](#4-백엔드-구현)
5. [프론트엔드 구현 (AI Elements)](#5-프론트엔드-구현-ai-elements)
6. [전체 통합 예제](#6-전체-통합-예제)
7. [프레임워크 비교](#7-프레임워크-비교)
8. [참고 자료](#8-참고-자료)

---

## 1. 개요

### 1.1 목표

Claude Code에서 사용하는 **Plan Mode**와 **Sequential Thinking** 패턴을 커스텀 Agent에서 재현하여:

- Task 기반 실행 강제
- 추론 과정의 투명한 시각화
- Tool 선택 및 실행 과정 모니터링

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Vercel AI SDK 5.0+, @ai-sdk/amazon-bedrock |
| **Model** | Amazon Bedrock Claude (Sonnet 4, Sonnet 3.7) |
| **Frontend** | AI Elements, React, Next.js |
| **State** | useChat, Custom hooks |

---

## 2. 핵심 개념 정리

### 2.1 Extended Thinking vs Think Tool vs Plan Mode

| 개념 | 설명 | 시점 | 사용 시나리오 |
|------|------|------|--------------|
| **Extended Thinking** | 응답 생성 *전* 심층 추론 | Pre-response | 복잡한 분석, 아키텍처 결정 |
| **Think Tool** | 응답 생성 *중* 멈추고 생각 | Mid-response | 긴 tool call 체인, policy 준수 |
| **Plan Mode** | Read-only 도구로 계획 수립 | Pre-execution | 코드베이스 탐색, 변경 계획 |
| **Sequential Thinking MCP** | 구조화된 단계별 사고 | Throughout | 문제 분해, 브랜칭 추론 |

### 2.2 Anthropic 공식 권장사항

> **Think Tool 사용 시 54% 성능 향상** (τ-bench airline domain)
> - Baseline: 0.370 → Think Tool + Optimized Prompt: 0.570

**Think Tool이 효과적인 경우:**
- Sequential decision making (각 액션이 이전 결과에 의존)
- Long tool call chains
- Policy compliance가 중요한 경우

**Extended Thinking이 더 적합한 경우:**
- Non-sequential tool calls
- Simple instruction following
- 초기 계획 수립 단계

---

## 3. 환경 설정

### 3.1 패키지 설치

```bash
# Core packages
npm install ai@^5.0.0 @ai-sdk/amazon-bedrock zod

# AI Elements
npx ai-elements@latest add conversation message reasoning tool task queue

# 또는 전체 설치
npx shadcn@latest add https://registry.ai-sdk.dev/all.json
```

### 3.2 환경 변수

```env
# .env.local
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

### 3.3 Bedrock 클라이언트 설정

```typescript
// lib/bedrock-client.ts
import { bedrock } from '@ai-sdk/amazon-bedrock';

export const CLAUDE_MODELS = {
  SONNET_4: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  SONNET_37: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  HAIKU: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
} as const;

export const bedrockClaude = (modelId: string = CLAUDE_MODELS.SONNET_4) =>
  bedrock(modelId);
```

---

## 4. 백엔드 구현

### 4.1 Extended Thinking 활성화 (Bedrock)

```typescript
// app/api/chat/route.ts
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
    messages: convertToModelMessages(messages),
    providerOptions: {
      bedrock: {
        // Bedrock에서는 reasoningConfig 사용 (anthropic.thinking 아님!)
        reasoningConfig: {
          type: 'enabled',
          budgetTokens: 12000, // 1024 ~ 32000 권장
        },
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true, // 추론 과정을 클라이언트에 전송
  });
}
```

### 4.2 Think Tool 정의

```typescript
// lib/tools/think-tool.ts
import { tool } from 'ai';
import { z } from 'zod';

export const thinkTool = tool({
  description: `Use this tool to pause and think through complex problems systematically.

WHEN TO USE:
- Before making important decisions or irreversible actions
- After receiving tool results that need careful analysis
- When you need to verify policy compliance
- When planning multi-step operations
- Before switching between different phases of work

HOW TO USE:
1. Break down the problem into components
2. Analyze each component systematically
3. Consider edge cases and potential risks
4. Evaluate available options
5. Formulate your next action based on analysis

OUTPUT:
- Your reasoning should be thorough but focused
- Always conclude with a clear decision or next step`,

  parameters: z.object({
    situation: z.string().describe('Current situation analysis'),
    considerations: z.array(z.string()).describe('Key points to consider'),
    reasoning: z.string().describe('Step-by-step reasoning process'),
    decision: z.string().describe('Conclusion and chosen course of action'),
    nextStep: z.string().describe('Immediate next action to take'),
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level'),
  }),

  execute: async (params) => {
    // Think tool은 실제로 아무것도 수행하지 않음
    // 모델이 생각할 공간을 제공하는 것이 목적
    return {
      acknowledged: true,
      thought_recorded: true,
      timestamp: new Date().toISOString(),
    };
  },
});
```

### 4.3 Task Management Tools

```typescript
// lib/tools/task-tools.ts
import { tool } from 'ai';
import { z } from 'zod';

// Task Schema
const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum(['research', 'analyze', 'execute', 'verify']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  dependencies: z.array(z.string()),
  requiredTools: z.array(z.string()),
});

// Plan Schema
export const planSchema = z.object({
  analysis: z.string().describe('Initial analysis of the request'),
  tasks: z.array(taskSchema),
  executionOrder: z.array(z.string()).describe('Task IDs in execution order'),
  risks: z.array(z.string()).describe('Potential risks or blockers'),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
});

export const createPlanTool = tool({
  description: `Create a structured execution plan before taking any actions.
  
Use this tool to:
- Break down complex requests into discrete, verifiable tasks
- Identify dependencies between tasks
- Determine required tools for each task
- Assess potential risks`,

  parameters: planSchema,

  execute: async (plan) => {
    // 실제 구현에서는 DB나 상태 저장소에 저장
    return {
      planCreated: true,
      taskCount: plan.tasks.length,
      estimatedComplexity: plan.estimatedComplexity,
    };
  },
});

export const updateTaskStatusTool = tool({
  description: 'Update the status of a task in the current plan',

  parameters: z.object({
    taskId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    result: z.string().optional(),
    error: z.string().optional(),
  }),

  execute: async ({ taskId, status, result, error }) => {
    return {
      taskId,
      status,
      updated: true,
      timestamp: new Date().toISOString(),
    };
  },
});

export const taskCompleteTool = tool({
  description: 'Signal that all tasks are complete and the workflow is finished',

  parameters: z.object({
    summary: z.string(),
    tasksCompleted: z.number(),
    tasksFailed: z.number(),
  }),

  execute: async (params) => {
    return { ...params, workflowComplete: true };
  },
});
```

### 4.4 Plan-Execute Workflow

```typescript
// lib/agents/planning-agent.ts
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateObject, streamText, stepCountIs, hasToolCall } from 'ai';
import { z } from 'zod';
import { thinkTool, createPlanTool, updateTaskStatusTool, taskCompleteTool, planSchema } from '../tools';

// Phase 1: Planning (Extended Thinking 활용)
export async function planPhase(userRequest: string, context?: string) {
  const { object: plan, reasoningText } = await generateObject({
    model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
    schema: planSchema,
    system: `You are a planning agent. Your role is to:
1. Analyze the user's request thoroughly
2. Break it down into discrete, verifiable tasks
3. Identify dependencies between tasks
4. Determine required tools for each task
5. Assess potential risks

DO NOT execute anything - ONLY create a detailed plan.
Each task should be atomic, testable, and have clear success criteria.`,
    prompt: `
User Request: ${userRequest}

${context ? `Context:\n${context}` : ''}

Create a detailed execution plan with all necessary tasks.`,
    providerOptions: {
      bedrock: {
        reasoningConfig: { type: 'enabled', budgetTokens: 10000 },
      },
    },
  });

  return { plan, reasoning: reasoningText };
}

// Phase 2: Execution with Think Tool
export async function executePhase(
  plan: z.infer<typeof planSchema>,
  tools: Record<string, any>
) {
  const stream = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
    system: `You are an execution agent following a pre-approved plan.

CURRENT PLAN:
${JSON.stringify(plan, null, 2)}

EXECUTION RULES:
1. Execute tasks in the specified order
2. Use 'think' tool BEFORE any significant action
3. Use 'think' tool AFTER tool results to verify success
4. Use 'updateTaskStatus' to track progress
5. If a task fails, use 'think' to decide: retry, skip, or abort
6. When all tasks complete, use 'taskComplete' tool

IMPORTANT:
- Focus on one task at a time
- Verify each task's success before moving on
- Report any blockers immediately`,
    prompt: 'Begin executing the plan. Start with the first task.',
    tools: {
      think: thinkTool,
      createPlan: createPlanTool,
      updateTaskStatus: updateTaskStatusTool,
      taskComplete: taskCompleteTool,
      ...tools,
    },
    stopWhen: [
      stepCountIs(30),
      hasToolCall('taskComplete'),
    ],
    providerOptions: {
      bedrock: {
        reasoningConfig: { type: 'enabled', budgetTokens: 8000 },
      },
    },
  });

  return stream;
}
```

### 4.5 ToolLoopAgent 활용

```typescript
// lib/agents/tool-loop-agent.ts
import { ToolLoopAgent, stepCountIs, hasToolCall } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { thinkTool, createPlanTool, updateTaskStatusTool, taskCompleteTool } from '../tools';

export function createPlanningAgent(domainTools: Record<string, any>) {
  return new ToolLoopAgent({
    model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),

    instructions: `You are a systematic planning and execution agent.

## Operating Phases

### Phase 1: Analysis
When receiving a new request:
1. Use 'think' tool to fully understand requirements
2. Identify ambiguities - ask clarifying questions if needed
3. Determine scope and complexity

### Phase 2: Planning
Before any execution:
1. Use 'think' to break down into atomic tasks
2. Use 'createPlan' to record the structured plan
3. Wait for plan approval before proceeding

### Phase 3: Execution
For each task in order:
1. Use 'updateTaskStatus' to mark as 'in_progress'
2. Use 'think' to plan specific approach
3. Execute using appropriate tools
4. Use 'think' to verify results
5. Use 'updateTaskStatus' to mark completion

### Phase 4: Completion
After all tasks:
1. Use 'think' to review all results
2. Use 'taskComplete' to signal completion

## Critical Rules
- NEVER skip the planning phase for complex requests
- ALWAYS use 'think' before irreversible actions
- NEVER execute multiple unrelated actions without verification
- Report blockers immediately rather than guessing`,

    tools: {
      think: thinkTool,
      createPlan: createPlanTool,
      updateTaskStatus: updateTaskStatusTool,
      taskComplete: taskCompleteTool,
      ...domainTools,
    },

    stopWhen: [
      stepCountIs(30),
      hasToolCall('taskComplete'),
    ],

    // Step별 동적 제어
    prepareStep: async ({ stepNumber, steps }) => {
      // 초기 단계: 계획 수립에 집중
      if (stepNumber <= 3) {
        return {
          activeTools: ['think', 'createPlan'],
          toolChoice: 'required',
        };
      }

      // 실행 단계: 모든 도구 활성화
      return {
        activeTools: undefined,
        toolChoice: 'auto',
      };
    },
  });
}

// 사용 예시
export async function runAgent(userRequest: string) {
  const agent = createPlanningAgent({
    // 도메인 특화 도구들 추가
  });

  const result = await agent.generate({
    prompt: userRequest,
  });

  return result;
}
```

### 4.6 API Route 전체 구현

```typescript
// app/api/agent/route.ts
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText, convertToModelMessages, UIMessage, stepCountIs, hasToolCall } from 'ai';
import { thinkTool, createPlanTool, updateTaskStatusTool, taskCompleteTool } from '@/lib/tools';

export const maxDuration = 120; // Agent는 더 긴 실행 시간 필요

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),

    system: `You are a systematic planning and execution agent.

## Workflow

1. **Analysis**: Use 'think' to understand the request
2. **Planning**: Use 'createPlan' to create structured task breakdown
3. **Execution**: Execute tasks one by one with verification
4. **Completion**: Use 'taskComplete' when done

## Rules
- Always plan before executing complex tasks
- Use 'think' tool before and after significant actions
- Track progress with 'updateTaskStatus'
- Report failures immediately`,

    messages: convertToModelMessages(messages),

    tools: {
      think: thinkTool,
      createPlan: createPlanTool,
      updateTaskStatus: updateTaskStatusTool,
      taskComplete: taskCompleteTool,
      // 추가 도메인 도구들...
    },

    stopWhen: [
      stepCountIs(30),
      hasToolCall('taskComplete'),
    ],

    onStepFinish: async ({ toolResults, stepNumber }) => {
      // 각 스텝 완료 시 로깅 (디버깅용)
      console.log(`Step ${stepNumber}:`, JSON.stringify(toolResults, null, 2));
    },

    providerOptions: {
      bedrock: {
        reasoningConfig: { type: 'enabled', budgetTokens: 10000 },
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
```

---

## 5. 프론트엔드 구현 (AI Elements)

### 5.1 AI Elements 컴포넌트 개요

| 컴포넌트 | 용도 | 사용 시나리오 |
|----------|------|--------------|
| `Conversation` | 대화 컨테이너 | 전체 채팅 인터페이스 |
| `Message` | 메시지 표시 | User/Assistant 메시지 |
| `Reasoning` | 추론 과정 표시 | Extended Thinking 시각화 |
| `Tool` | Tool 호출 표시 | Tool 입력/출력 시각화 |
| `Task` | Task 진행 상황 | 워크플로우 진행 표시 |
| `Queue` | 목록 표시 | TODO, 첨부파일 등 |
| `Canvas` | 워크플로우 시각화 | 노드 기반 흐름도 |

### 5.2 Agent Chat 컴포넌트

```tsx
// components/agent-chat.tsx
'use client';

import { useState, Fragment } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ToolUIPart } from 'ai';

// AI Elements imports
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import {
  Task,
  TaskItem,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';

// Tool Types
type ThinkToolInput = {
  situation: string;
  considerations: string[];
  reasoning: string;
  decision: string;
  nextStep: string;
  confidence: 'high' | 'medium' | 'low';
};

type CreatePlanInput = {
  analysis: string;
  tasks: Array<{
    id: string;
    description: string;
    type: string;
    status: string;
    dependencies: string[];
    requiredTools: string[];
  }>;
  executionOrder: string[];
  risks: string[];
  estimatedComplexity: string;
};

type UpdateTaskStatusInput = {
  taskId: string;
  status: string;
  result?: string;
  error?: string;
};

export default function AgentChat() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent',
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const isStreaming = status === 'streaming';

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-4">
          {messages.map((message, index) => (
            <Fragment key={message.id}>
              <Message from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    const isLastPart = i === message.parts.length - 1;
                    const isLastMessage = index === messages.length - 1;
                    const isCurrentlyStreaming = isStreaming && isLastPart && isLastMessage;

                    switch (part.type) {
                      // 텍스트 응답
                      case 'text':
                        return (
                          <Response key={`${message.id}-${i}`}>
                            {part.text}
                          </Response>
                        );

                      // 추론 과정 (Extended Thinking)
                      case 'reasoning':
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            isStreaming={isCurrentlyStreaming}
                            className="w-full my-2"
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>
                              {part.text}
                            </ReasoningContent>
                          </Reasoning>
                        );

                      // Tool 호출
                      case 'tool-invocation':
                        return (
                          <ToolDisplay
                            key={`${message.id}-${i}`}
                            toolName={part.toolInvocation.toolName}
                            input={part.toolInvocation.input}
                            output={part.toolInvocation.output}
                            state={part.toolInvocation.state}
                          />
                        );

                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            </Fragment>
          ))}

          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader />
              <span>Agent is working...</span>
            </div>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit}>
          <PromptInput className="relative">
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              disabled={isStreaming}
            />
            <PromptInputSubmit
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute bottom-2 right-2"
            />
          </PromptInput>
        </form>
      </div>
    </div>
  );
}

// Tool Display Component
function ToolDisplay({
  toolName,
  input,
  output,
  state,
}: {
  toolName: string;
  input: any;
  output: any;
  state: 'pending' | 'result' | 'error';
}) {
  // Think Tool 전용 표시
  if (toolName === 'think') {
    return <ThinkToolDisplay input={input as ThinkToolInput} />;
  }

  // Create Plan Tool 전용 표시
  if (toolName === 'createPlan') {
    return <PlanDisplay input={input as CreatePlanInput} />;
  }

  // Update Task Status 전용 표시
  if (toolName === 'updateTaskStatus') {
    return <TaskStatusDisplay input={input as UpdateTaskStatusInput} />;
  }

  // 일반 Tool 표시
  return (
    <Tool defaultOpen={state === 'result'}>
      <ToolHeader>
        <span className="font-medium">{toolName}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          state === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          state === 'result' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {state}
        </span>
      </ToolHeader>
      <ToolContent>
        <ToolInput>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(input, null, 2)}
          </pre>
        </ToolInput>
        {output && (
          <ToolOutput>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          </ToolOutput>
        )}
      </ToolContent>
    </Tool>
  );
}
```

### 5.3 Think Tool 시각화

```tsx
// components/think-tool-display.tsx
'use client';

import { Brain, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

type ThinkToolInput = {
  situation: string;
  considerations: string[];
  reasoning: string;
  decision: string;
  nextStep: string;
  confidence: 'high' | 'medium' | 'low';
};

export function ThinkToolDisplay({ input }: { input: ThinkToolInput }) {
  const confidenceConfig = {
    high: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    medium: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    low: { icon: HelpCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };

  const config = confidenceConfig[input.confidence];
  const ConfidenceIcon = config.icon;

  return (
    <div className={`rounded-lg border ${config.bg} p-4 my-2`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-purple-800">Thinking...</span>
        <div className={`flex items-center gap-1 ml-auto ${config.color}`}>
          <ConfidenceIcon className="w-4 h-4" />
          <span className="text-xs font-medium">{input.confidence} confidence</span>
        </div>
      </div>

      {/* Situation */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
          Situation Analysis
        </h4>
        <p className="text-sm text-gray-700">{input.situation}</p>
      </div>

      {/* Considerations */}
      {input.considerations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Key Considerations
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {input.considerations.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning (collapsible) */}
      <details className="mb-3">
        <summary className="text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
          Detailed Reasoning
        </summary>
        <p className="text-sm text-gray-700 mt-2 pl-4 border-l-2 border-gray-200">
          {input.reasoning}
        </p>
      </details>

      {/* Decision & Next Step */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Decision
          </h4>
          <p className="text-sm font-medium text-gray-800">{input.decision}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Next Step
          </h4>
          <p className="text-sm font-medium text-blue-700">{input.nextStep}</p>
        </div>
      </div>
    </div>
  );
}
```

### 5.4 Plan Display 컴포넌트

```tsx
// components/plan-display.tsx
'use client';

import {
  Task,
  TaskItem,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task';
import { CheckCircle, Clock, AlertTriangle, Play } from 'lucide-react';

type PlanInput = {
  analysis: string;
  tasks: Array<{
    id: string;
    description: string;
    type: string;
    status: string;
    dependencies: string[];
    requiredTools: string[];
  }>;
  executionOrder: string[];
  risks: string[];
  estimatedComplexity: string;
};

export function PlanDisplay({ input }: { input: PlanInput }) {
  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    in_progress: <Play className="w-4 h-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  const complexityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm my-4">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Execution Plan</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            complexityColors[input.estimatedComplexity as keyof typeof complexityColors]
          }`}>
            {input.estimatedComplexity} complexity
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{input.analysis}</p>
      </div>

      {/* Tasks */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Tasks ({input.tasks.length})
        </h4>

        <div className="space-y-2">
          {input.executionOrder.map((taskId, index) => {
            const task = input.tasks.find(t => t.id === taskId);
            if (!task) return null;

            return (
              <Task key={task.id} defaultOpen={task.status === 'in_progress'}>
                <TaskTrigger>
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs text-gray-400 font-mono">
                      #{index + 1}
                    </span>
                    {statusIcons[task.status as keyof typeof statusIcons]}
                    <span className="flex-1 text-sm">{task.description}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {task.type}
                    </span>
                  </div>
                </TaskTrigger>
                <TaskContent>
                  <div className="pl-8 py-2 space-y-2 text-sm">
                    {task.dependencies.length > 0 && (
                      <div>
                        <span className="text-gray-500">Dependencies: </span>
                        {task.dependencies.join(', ')}
                      </div>
                    )}
                    {task.requiredTools.length > 0 && (
                      <div>
                        <span className="text-gray-500">Tools: </span>
                        {task.requiredTools.map(tool => (
                          <code key={tool} className="mx-1 px-1 bg-gray-100 rounded">
                            {tool}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </TaskContent>
              </Task>
            );
          })}
        </div>
      </div>

      {/* Risks */}
      {input.risks.length > 0 && (
        <div className="p-4 border-t bg-orange-50">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">
            ⚠️ Potential Risks
          </h4>
          <ul className="text-sm text-orange-700 space-y-1">
            {input.risks.map((risk, i) => (
              <li key={i}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 5.5 Task Status Display

```tsx
// components/task-status-display.tsx
'use client';

import { CheckCircle, AlertCircle, Clock, Play } from 'lucide-react';

type TaskStatusInput = {
  taskId: string;
  status: string;
  result?: string;
  error?: string;
};

export function TaskStatusDisplay({ input }: { input: TaskStatusInput }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      label: 'Pending',
    },
    in_progress: {
      icon: Play,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: 'In Progress',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Completed',
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Failed',
    },
  };

  const config = statusConfig[input.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} my-2`}>
      <Icon className={`w-5 h-5 ${config.color} mt-0.5`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${config.color}`}>{config.label}</span>
          <code className="text-xs bg-white px-1.5 py-0.5 rounded">
            {input.taskId}
          </code>
        </div>
        {input.result && (
          <p className="text-sm text-gray-700 mt-1">{input.result}</p>
        )}
        {input.error && (
          <p className="text-sm text-red-700 mt-1">Error: {input.error}</p>
        )}
      </div>
    </div>
  );
}
```

### 5.6 Workflow Canvas (선택적)

```tsx
// components/workflow-canvas.tsx
'use client';

import {
  Canvas,
  Connection,
  Controls,
  Edge,
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
  Panel,
  Toolbar,
} from '@/components/ai-elements';

type WorkflowTask = {
  id: string;
  description: string;
  status: string;
  type: string;
};

export function WorkflowCanvas({ tasks }: { tasks: WorkflowTask[] }) {
  // 노드 생성
  const nodes = tasks.map((task, index) => ({
    id: task.id,
    type: 'workflow',
    position: { x: index * 350, y: 100 },
    data: {
      label: task.description,
      description: task.type,
      status: task.status,
      handles: {
        target: index > 0,
        source: index < tasks.length - 1,
      },
    },
  }));

  // 엣지 생성 (순차 연결)
  const edges = tasks.slice(0, -1).map((task, index) => ({
    id: `e-${task.id}-${tasks[index + 1].id}`,
    source: task.id,
    target: tasks[index + 1].id,
    type: task.status === 'completed' ? 'animated' : 'default',
  }));

  // 커스텀 노드 타입
  const nodeTypes = {
    workflow: ({ data }: { data: any }) => {
      const statusColors = {
        pending: 'border-gray-300',
        in_progress: 'border-blue-500 shadow-blue-100 shadow-lg',
        completed: 'border-green-500',
        failed: 'border-red-500',
      };

      return (
        <Node
          handles={data.handles}
          className={`border-2 ${statusColors[data.status as keyof typeof statusColors]}`}
        >
          <NodeHeader>
            <NodeTitle>{data.label}</NodeTitle>
            <NodeDescription>{data.description}</NodeDescription>
          </NodeHeader>
          <NodeFooter>
            <span className={`text-xs font-medium ${
              data.status === 'completed' ? 'text-green-600' :
              data.status === 'in_progress' ? 'text-blue-600' :
              data.status === 'failed' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {data.status}
            </span>
          </NodeFooter>
        </Node>
      );
    },
  };

  return (
    <div className="w-full h-96 border rounded-lg">
      <Canvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Panel position="top-left">
          <div className="bg-white p-2 rounded shadow text-sm">
            <strong>Workflow Progress</strong>
            <div className="text-xs text-gray-500 mt-1">
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length} completed
            </div>
          </div>
        </Panel>
      </Canvas>
    </div>
  );
}
```

---

## 6. 전체 통합 예제

### 6.1 프로젝트 구조

```
my-agent-app/
├── app/
│   ├── api/
│   │   └── agent/
│   │       └── route.ts          # Agent API endpoint
│   ├── page.tsx                  # Main page
│   └── layout.tsx
├── components/
│   ├── ai-elements/              # AI Elements (자동 설치됨)
│   │   ├── conversation.tsx
│   │   ├── message.tsx
│   │   ├── reasoning.tsx
│   │   ├── tool.tsx
│   │   ├── task.tsx
│   │   └── ...
│   ├── agent-chat.tsx           # Agent Chat 컴포넌트
│   ├── think-tool-display.tsx   # Think Tool 시각화
│   ├── plan-display.tsx         # Plan 시각화
│   └── task-status-display.tsx  # Task Status 시각화
├── lib/
│   ├── bedrock-client.ts        # Bedrock 클라이언트
│   ├── tools/
│   │   ├── index.ts
│   │   ├── think-tool.ts
│   │   └── task-tools.ts
│   └── agents/
│       └── planning-agent.ts
├── .env.local
└── package.json
```

### 6.2 Main Page

```tsx
// app/page.tsx
import AgentChat from '@/components/agent-chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Planning Agent
          </h1>
          <p className="text-gray-600 mt-2">
            Powered by Claude on Amazon Bedrock with Extended Thinking
          </p>
        </header>

        <AgentChat />
      </div>
    </main>
  );
}
```

### 6.3 실행 흐름 예시

```
User: "Create a REST API for a todo app with authentication"

┌─────────────────────────────────────────────────────────────┐
│ 1. Extended Thinking (reasoningText)                        │
│    "Let me analyze this request..."                         │
│    [Reasoning component 자동 확장/축소]                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Think Tool Call                                          │
│    [ThinkToolDisplay component]                             │
│    - Situation: User wants a REST API...                    │
│    - Considerations: [auth method, db, endpoints...]        │
│    - Decision: Create structured plan first                 │
│    - Confidence: high                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Create Plan Tool Call                                    │
│    [PlanDisplay component]                                  │
│    Tasks:                                                   │
│    #1 □ Set up project structure (pending)                 │
│    #2 □ Create user model (pending)                        │
│    #3 □ Implement auth endpoints (pending)                 │
│    #4 □ Create todo CRUD (pending)                         │
│    #5 □ Add middleware (pending)                           │
│                                                             │
│    Risks: [auth security, db migration...]                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Execution Loop                                           │
│                                                             │
│    For each task:                                           │
│    ├─ Think Tool → Plan approach                           │
│    ├─ UpdateTaskStatus → in_progress                       │
│    ├─ Execute with domain tools                            │
│    ├─ Think Tool → Verify results                          │
│    └─ UpdateTaskStatus → completed/failed                  │
│                                                             │
│    [TaskStatusDisplay updates in real-time]                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Task Complete                                            │
│    Summary: All 5 tasks completed successfully              │
│    [Final response with deliverables]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 프레임워크 비교

### 7.1 Vercel AI SDK vs LangGraph vs Strands

| 측면 | Vercel AI SDK 5.0 | LangGraph (Deep Agents) | Strands |
|------|-------------------|-------------------------|---------|
| **언어** | TypeScript (Native) | Python (Primary) | Python |
| **Planning** | `generateObject` + schema | Built-in TODO tools | ReWOO pattern |
| **Thinking** | Extended Thinking + Think Tool | Custom nodes | Built-in Thinking Tool |
| **Task 관리** | Custom tools | `write_todos`, `read_todos` | Built-in TODO |
| **Bedrock 통합** | `@ai-sdk/amazon-bedrock` | LangChain Bedrock | Native Bedrock |
| **상태 관리** | `useChat`, Custom | StateGraph | Agent state |
| **UI 통합** | AI Elements | Custom | N/A |
| **배포** | Vercel (native) | LangGraph Platform | AWS (AgentCore) |

### 7.2 선택 가이드

**Vercel AI SDK 5.0 선택:**
- TypeScript/Next.js 프로젝트
- Vercel 인프라 사용
- 세밀한 streaming 제어 필요
- 커스텀 UI 구현 선호
- AI Elements 활용

**LangGraph (Deep Agents) 선택:**
- Python 기반 시스템
- 복잡한 그래프 기반 workflow
- 기존 LangChain 생태계
- Claude Code 패턴 완전 재현

**Strands 선택:**
- AWS 환경 전용
- 프로덕션 배포 우선
- ReWOO/Reflexion 패턴
- Bedrock AgentCore 활용

---

## 8. 참고 자료

### 8.1 공식 문서

- [Vercel AI SDK Documentation](https://ai-sdk.dev/)
- [AI Elements Documentation](https://ai-sdk.dev/elements)
- [Amazon Bedrock Provider](https://ai-sdk.dev/providers/amazon-bedrock)
- [Anthropic Think Tool Blog](https://www.anthropic.com/engineering/claude-think-tool)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

### 8.2 GitHub Repositories

- [vercel/ai](https://github.com/vercel/ai) - AI SDK
- [vercel/ai-elements](https://github.com/vercel/ai-elements) - AI Elements
- [vercel-labs/ai-sdk-reasoning-starter](https://github.com/vercel-labs/ai-sdk-reasoning-starter)
- [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents)
- [langchain-ai/open_deep_research](https://github.com/langchain-ai/open_deep_research)

### 8.3 MCP 서버

- [Sequential Thinking MCP](https://github.com/modelcontextprotocol/server-sequential-thinking)

### 8.4 관련 블로그/아티클

- [AI SDK 5 Announcement](https://vercel.com/blog/ai-sdk-5)
- [Building AI Agent Workflows with Vercel's AI SDK](https://www.callstack.com/blog/building-ai-agent-workflows-with-vercels-ai-sdk-a-practical-guide)
- [LangGraph 101: Building Deep Research Agent](https://towardsdatascience.com/langgraph-101-lets-build-a-deep-research-agent/)
- [Open Deep Research Blog](https://blog.langchain.com/open-deep-research/)

---

## 부록: 빠른 시작 체크리스트

```bash
# 1. 프로젝트 생성
npx create-next-app@latest my-agent-app --typescript --tailwind --app

# 2. 의존성 설치
cd my-agent-app
npm install ai@^5.0.0 @ai-sdk/amazon-bedrock zod

# 3. AI Elements 설치
npx ai-elements@latest add conversation message reasoning tool task

# 4. 환경 변수 설정
echo "AWS_ACCESS_KEY_ID=your_key" >> .env.local
echo "AWS_SECRET_ACCESS_KEY=your_secret" >> .env.local
echo "AWS_REGION=us-east-1" >> .env.local

# 5. 개발 서버 시작
npm run dev
```

---

*이 문서는 2024-12-16에 작성되었으며, 프레임워크 버전 업데이트에 따라 내용이 변경될 수 있습니다.*
