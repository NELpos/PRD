---
name: vercel-ai-sdk-5
description: Use when writing Vercel AI SDK 5.0+ code with Amazon Bedrock and Claude 4.5 models. Automatically referenced for streamText, useChat, UIMessage, Tool Calling, Multi-step Agent patterns. Activates when working with AI SDK related code.
---

# Vercel AI SDK 5.0+ Best Practices Guide
## Amazon Bedrock + Claude 4.5 Environment

<skill_context>
SDK_VERSION: Vercel AI SDK 5.0+
PROVIDER: Amazon Bedrock
MODELS: Claude 4.5 (Sonnet, Haiku, Opus)
CRITICAL_CHANGES: UIMessage uses `parts` array instead of `content` string
</skill_context>

<important>
AI SDK 5.0 introduced breaking changes. Many APIs have changed from previous versions.
Always use the patterns documented here, NOT legacy patterns.
</important>

---

## 1. AMAZON BEDROCK PROVIDER SETUP

### Installation
```bash
npm install ai @ai-sdk/amazon-bedrock @ai-sdk/react
```

### Provider Initialization

```typescript
// ✅ PRODUCTION: AWS SDK Credential Provider Chain
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
});

// ✅ DEVELOPMENT: Environment variables (automatic)
import { bedrock } from '@ai-sdk/amazon-bedrock';
// Uses AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY automatically
```

### Claude 4.5 Model IDs

```typescript
// Claude 4.5 Models (Cross-region inference)
bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0')  // Sonnet - balanced
bedrock('us.anthropic.claude-haiku-4-5-20250514-v1:0')   // Haiku - fast/cheap
bedrock('us.anthropic.claude-opus-4-5-20250514-v1:0')    // Opus - most capable

// Model Selection Guide:
// - Haiku: Fast classification, routing, simple tasks
// - Sonnet: General conversation, coding, balanced performance
// - Opus: Complex reasoning, analysis, highest capability
```

---

## 2. UIMESSAGE STRUCTURE (CRITICAL FOR SDK 5.0)

### Type Definition

```typescript
import type { UIMessage, UIMessagePart } from 'ai';

// UIMessage Structure
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: UIMessagePart[];  // ⚠️ USE parts, NOT content!
  metadata?: unknown;
}

// UIMessagePart Types
type UIMessagePart = 
  | { type: 'text'; text: string; state?: 'streaming' | 'done' }
  | { type: 'reasoning'; text: string; }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown; state: 'pending' | 'result'; result?: unknown }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
  | { type: 'file'; data: string; mediaType: string }
  | { type: 'source'; sourceType: 'url'; id: string; url: string; title?: string };
```

### Parts-Based Rendering

```tsx
// ✅ CORRECT: Parts-based rendering
{messages.map((message) => (
  <div key={message.id}>
    {message.parts.map((part, i) => {
      switch (part.type) {
        case 'text':
          return <span key={i}>{part.text}</span>;
        case 'reasoning':
          return <Reasoning key={i}>{part.text}</Reasoning>;
        case 'tool-call':
          return (
            <ToolCall 
              key={i} 
              name={part.toolName} 
              args={part.args}
              state={part.state}
              result={part.result}
            />
          );
        default:
          return null;
      }
    })}
  </div>
))}

// ❌ WRONG: Legacy content (DOES NOT WORK in SDK 5.0)
{messages.map(m => <div>{m.content}</div>)}
```

---

## 3. SERVER-SIDE: streamText

### Basic Pattern

```typescript
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';

export const maxDuration = 30;  // Streaming timeout

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
    messages: convertToModelMessages(messages),  // ⚠️ REQUIRED conversion
    system: 'You are a helpful assistant.',
  });
  
  return result.toUIMessageStreamResponse();  // ⚠️ USE toUIMessageStreamResponse
}
```

### Extended Thinking (Claude Reasoning)

```typescript
const { text, reasoning, reasoningDetails } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  prompt: 'Analyze this complex problem',
  providerOptions: {
    bedrock: {
      reasoningConfig: { 
        type: 'enabled', 
        budgetTokens: 4096
      },
    },
  },
});
```

---

## 4. CLIENT-SIDE: useChat Hook

### Basic Pattern

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, regenerate, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError: (error) => console.error('Chat error:', error),
    onFinish: ({ message }) => console.log('Finished:', message),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });  // ⚠️ Use text property
      setInput('');
    }
  };

  return (/* UI using messages.parts for rendering */);
}
```

### Status Values
- `'ready'`: Idle, waiting for input
- `'submitted'`: Request sent
- `'streaming'`: Response streaming
- `'error'`: Error occurred

---

## 5. MULTI-STEP TOOL CALLING

### Tool Definition

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
    unit: z.enum(['C', 'F']).default('C'),
  }),
  execute: async ({ location, unit }) => {
    return { location, temperature: 22, unit, condition: 'Sunny' };
  },
});
```

### Multi-step Agent Pattern

```typescript
import { streamText, stepCountIs, tool } from 'ai';

const tools = {
  getLocation: tool({ /* ... */ }),
  getWeather: tool({ /* ... */ }),
  // Answer Tool - NO execute → terminates agent when called
  answer: tool({
    description: 'Provide final structured answer',
    inputSchema: z.object({
      summary: z.string(),
      recommendation: z.string(),
    }),
    // NO execute function!
  }),
};

const result = streamText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  messages: convertToModelMessages(messages),
  tools,
  stopWhen: stepCountIs(5),  // Maximum 5 steps
  toolChoice: 'auto',
});
```

### Client-side Tool Handling

```tsx
const { messages, addToolResult } = useChat({
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getUserConfirmation') {
      const confirmed = window.confirm(toolCall.args.message);
      addToolResult({
        toolCallId: toolCall.toolCallId,
        result: { confirmed },
      });
    }
  },
  
  sendAutomaticallyWhen: ({ messages }) => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role !== 'assistant') return false;
    const toolCalls = lastMessage.parts.filter(p => p.type === 'tool-call');
    return toolCalls.length > 0 && toolCalls.every(tc => tc.state === 'result');
  },
});
```

---

## 6. ERROR HANDLING

```typescript
import { NoSuchToolError, InvalidToolArgumentsError, ToolExecutionError } from 'ai';

return result.toUIMessageStreamResponse({
  onError: (error) => {
    if (NoSuchToolError.isInstance(error)) return 'Unknown tool';
    if (InvalidToolArgumentsError.isInstance(error)) return 'Invalid arguments';
    if (ToolExecutionError.isInstance(error)) return 'Tool failed';
    if (error.message?.includes('ThrottlingException')) return 'Rate limited';
    if (error.message?.includes('AccessDeniedException')) return 'Access denied';
    return 'An error occurred';
  },
});
```

---

## 7. STRUCTURED OUTPUT

```typescript
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { experimental_output } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  experimental_output: Output.object({
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
    }),
  }),
  prompt: 'Analyze this...',
});
```

---

## 8. COMMON MISTAKES REFERENCE

| Wrong | Correct |
|-------|---------|
| `message.content` | `message.parts.map(...)` |
| `append({ content })` | `sendMessage({ text })` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |
| `streamText({ messages })` | `streamText({ messages: convertToModelMessages(messages) })` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |

---

## ADDITIONAL REFERENCE FILES

For detailed information, read these reference files:
- `references/ui-message-types.md`: Detailed UIMessage type definitions
- `references/tool-patterns.md`: Advanced Multi-step Tool Calling patterns

This skill activates automatically when working with AI SDK code and provides Best Practices guidance.
