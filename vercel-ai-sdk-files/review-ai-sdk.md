---
description: Comprehensive code review for Vercel AI SDK 5.0+ with Amazon Bedrock and Claude 4.5 models. Validates Best Practices compliance.
allowed-tools: Bash(find:*), Bash(grep:*), Bash(cat:*), Read, Glob, Grep
argument-hint: [file_path_or_directory (optional)]
---

# Vercel AI SDK 5.0+ Best Practices Code Review
## Environment: Amazon Bedrock + Claude 4.5

<context>
TARGET: $ARGUMENTS (defaults to entire project if no argument provided)
SDK_VERSION: Vercel AI SDK 5.0+
PROVIDER: Amazon Bedrock
MODELS: Claude 4.5 (Sonnet, Haiku, Opus)
</context>

<objective>
Analyze code using Vercel AI SDK 5.0+ with Amazon Bedrock and Claude 4.5 models.
Validate compliance with official Best Practices and provide actionable improvement recommendations.
</objective>

---

## REVIEW CHECKLIST

### 1. AMAZON BEDROCK PROVIDER CONFIGURATION

#### 1.1 Package Installation & Setup
- [ ] `@ai-sdk/amazon-bedrock` package is installed
- [ ] AWS credentials are securely managed (environment variables or credential provider)
- [ ] Region configuration is correct
- [ ] Cross-region inference model IDs use correct format

```typescript
// ✅ RECOMMENDED: Environment variables (default)
import { bedrock } from '@ai-sdk/amazon-bedrock';
// Automatically uses AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

// ✅ RECOMMENDED: Explicit configuration
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// ✅ RECOMMENDED: AWS SDK Credential Provider Chain (production)
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
});
```

#### 1.2 Claude 4.5 Model ID Usage
- [ ] Using Claude 4.5 models (Sonnet, Haiku, Opus) with correct model IDs
- [ ] Cross-region inference uses `us.` or `eu.` prefix
- [ ] Model selection matches task complexity (Haiku: fast classification, Sonnet: general purpose, Opus: complex reasoning)

```typescript
// ✅ Claude 4.5 Model IDs (Cross-region inference)
bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0')  // Claude 4.5 Sonnet
bedrock('us.anthropic.claude-haiku-4-5-20250514-v1:0')   // Claude 4.5 Haiku
bedrock('us.anthropic.claude-opus-4-5-20250514-v1:0')    // Claude 4.5 Opus

// ✅ Model Selection Guide
// - Fast classification/routing: Haiku (low cost, fast response)
// - General conversation/coding: Sonnet (balanced performance)
// - Complex reasoning/analysis: Opus (highest capability)
```

---

### 2. UIMESSAGE STRUCTURE VALIDATION (AI SDK 5.0 CRITICAL)

#### 2.1 UIMessage Type Usage
- [ ] Uses `parts` array instead of deprecated `content` string
- [ ] Correctly imports `UIMessage`, `UIMessagePart` types
- [ ] Renders each part based on its `type` property
- [ ] Handles `state` property for streaming status

```typescript
// ✅ AI SDK 5.0+ UIMessage Structure
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: UIMessagePart[];  // ⚠️ NOT content!
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

#### 2.2 Parts-Based Rendering
- [ ] Iterates over `message.parts` with `.map()`
- [ ] Implements switch/case for each `part.type`
- [ ] Checks `tool-call` part `state` (pending vs result)
- [ ] Displays `reasoning` parts with separate UI (Extended Thinking)

```tsx
// ✅ CORRECT: Parts-based rendering
{messages.map((message) => (
  <div key={message.id}>
    {message.parts.map((part, i) => {
      switch (part.type) {
        case 'text':
          return (
            <span 
              key={i} 
              className={part.state === 'streaming' ? 'animate-pulse' : ''}
            >
              {part.text}
            </span>
          );
        case 'reasoning':
          return (
            <details key={i} className="reasoning">
              <summary>🧠 Thinking...</summary>
              <p>{part.text}</p>
            </details>
          );
        case 'tool-call':
          return (
            <div key={i} className="tool-call">
              <strong>🔧 {part.toolName}</strong>
              {part.state === 'pending' && <span>Executing...</span>}
              {part.state === 'result' && <pre>{JSON.stringify(part.result)}</pre>}
            </div>
          );
        default:
          return null;
      }
    })}
  </div>
))}

// ❌ WRONG: Legacy content usage (does not work in AI SDK 5.0!)
{messages.map(m => <div>{m.content}</div>)}
```

#### 2.3 Message Conversion
- [ ] Server uses `convertToModelMessages()` for conversion
- [ ] Does NOT pass UIMessage directly to streamText

```typescript
// ✅ CORRECT: Use conversion function
const result = streamText({
  model: bedrock('...'),
  messages: convertToModelMessages(messages),  // REQUIRED!
});

// ❌ WRONG: Direct pass
const result = streamText({
  model: bedrock('...'),
  messages: messages,  // ERROR!
});
```

---

### 3. CORE API USAGE PATTERNS

#### 3.1 useChat Hook Usage
- [ ] Imports `useChat` from `@ai-sdk/react`
- [ ] Uses `DefaultChatTransport` or `TextStreamChatTransport` appropriately
- [ ] Sends messages with `sendMessage` and renders with `parts`
- [ ] Implements `onError`, `onFinish`, `onData` callbacks
- [ ] Manages loading state with `status`

```typescript
// ✅ RECOMMENDED PATTERN
const { messages, sendMessage, status, regenerate, error } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  onError: (error) => console.error(error),
  onFinish: ({ message }) => console.log('Finished:', message),
});

const isLoading = status === 'streaming' || status === 'submitted';

// Message sending
sendMessage({ text: input });  // ⚠️ Use text, not parts for simple messages
```

#### 3.2 Server-side streamText (Bedrock + Claude)
- [ ] Uses `convertToModelMessages` to convert UIMessage to ModelMessage
- [ ] Returns response with `toUIMessageStreamResponse()`
- [ ] Uses `@ai-sdk/amazon-bedrock` provider
- [ ] Sets `maxDuration` for streaming timeout

```typescript
// ✅ RECOMMENDED PATTERN (Amazon Bedrock + Claude)
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';

export const maxDuration = 30;  // Allow streaming up to 30 seconds

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
    messages: convertToModelMessages(messages),
  });
  
  return result.toUIMessageStreamResponse();
}
```

---

### 4. CLAUDE EXTENDED THINKING (REASONING)

#### 4.1 Reasoning Config
- [ ] Uses reasoning feature with Claude 4.5 models
- [ ] Sets appropriate `budgetTokens`
- [ ] Properly handles reasoning results

```typescript
// ✅ RECOMMENDED: Enable Extended Thinking
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateText } from 'ai';

const { text, reasoning, reasoningDetails } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  prompt: 'Analyze this complex problem',
  providerOptions: {
    bedrock: {
      reasoningConfig: { 
        type: 'enabled', 
        budgetTokens: 4096  // Token budget for reasoning
      },
    },
  },
});

console.log('Reasoning:', reasoning);
console.log('Final answer:', text);
```

---

### 5. TOOL CALLING PATTERNS

#### 5.1 Tool Definition
- [ ] Uses `tool()` helper for type-safe definitions
- [ ] Uses Zod schema for `inputSchema`
- [ ] Provides clear `description` for LLM understanding
- [ ] Includes proper error handling in `execute` function

```typescript
// ✅ RECOMMENDED PATTERN
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get current weather for a specific location',
  inputSchema: z.object({
    location: z.string().describe('City name or coordinates'),
    unit: z.enum(['C', 'F']).default('C').describe('Temperature unit'),
  }),
  execute: async ({ location, unit }) => {
    try {
      // Implementation
      return { location, temperature: 22, unit, condition: 'Sunny' };
    } catch (error) {
      return { error: error.message };
    }
  },
});
```

#### 5.2 Claude Text Editor Tool (Claude 4.5)
- [ ] Uses correct tool name for Claude 4.5: `str_replace_based_edit_tool`
- [ ] Uses correct tool name for Claude 3.5 and earlier: `str_replace_editor`

```typescript
// ✅ Claude 4.5 Text Editor Tool
const response = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  tools: {
    str_replace_based_edit_tool: textEditorTool,  // Claude 4.5 tool name
  },
});
```

#### 5.3 Multi-step Tool Calling (DETAILED)
- [ ] Uses `stopWhen: stepCountIs(n)` to limit maximum steps
- [ ] Sets appropriate termination conditions for Agent patterns (typically 5-10 steps)
- [ ] Properly passes tool results to next steps
- [ ] Client tools use `onToolCall` + `addToolResult`
- [ ] Configures `sendAutomaticallyWhen` for auto-resubmission
- [ ] Uses Answer Tool pattern to force structured final output

```typescript
// ✅ RECOMMENDED: Multi-step Agent Pattern
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const tools = {
  getLocation: tool({
    description: 'Get user location',
    inputSchema: z.object({}),
    execute: async () => ({ city: 'Seoul', country: 'KR' }),
  }),
  getWeather: tool({
    description: 'Get weather for a city',
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => ({ city, temp: 22, condition: 'Sunny' }),
  }),
  // Answer Tool - no execute function → terminates agent when called
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
  toolChoice: 'auto',        // 'auto' | 'required' | 'none'
});
```

```tsx
// ✅ Client-side Tool Handling Pattern
const { messages, sendMessage, addToolResult } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getUserConfirmation') {
      const confirmed = window.confirm(toolCall.args.message);
      addToolResult({
        toolCallId: toolCall.toolCallId,
        result: { confirmed },
      });
    }
  },
  
  // Auto-resubmit after tool results
  sendAutomaticallyWhen: ({ messages }) => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role !== 'assistant') return false;
    
    const toolCalls = lastMessage.parts.filter(p => p.type === 'tool-call');
    return toolCalls.length > 0 && toolCalls.every(tc => tc.state === 'result');
  },
});
```

#### 5.4 Multi-step Workflow (createUIMessageStream)
- [ ] Uses `createUIMessageStream` for complex multi-step workflows
- [ ] Composes multiple streams with `writer.merge()`
- [ ] Manages stream connections with `sendFinish: false` / `sendStart: false`

```typescript
// ✅ Explicit Workflow Control
import { createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai';

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    // Step 1: Intent extraction (fast with Haiku)
    const step1 = streamText({
      model: bedrock('us.anthropic.claude-haiku-4-5-20250514-v1:0'),
      system: 'Extract user intent',
      messages: convertToModelMessages(messages),
      toolChoice: 'required',
      tools: { extractIntent: intentTool },
    });
    
    writer.merge(step1.toUIMessageStream({ sendFinish: false }));
    
    // Step 2: Detailed processing (with Sonnet)
    const step2 = streamText({
      model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
      messages: [
        ...convertToModelMessages(messages),
        ...(await step1.response).messages,
      ],
    });
    
    writer.merge(step2.toUIMessageStream({ sendStart: false }));
  },
});

return createUIMessageStreamResponse({ stream });
```

---

### 6. STRUCTURED OUTPUT

- [ ] Uses `experimental_output` for structured outputs
- [ ] Defines clear and complete Zod schemas
- [ ] Correctly uses `Output.object()` or `Output.text()`

```typescript
// ✅ RECOMMENDED PATTERN (Bedrock + Claude)
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { experimental_output } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  experimental_output: Output.object({
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
    }),
  }),
  prompt: 'Analyze this article...',
});
```

---

### 7. ERROR HANDLING

#### 7.1 Client-side Error Handling
- [ ] Implements `onError` callback in `useChat`
- [ ] Uses Error Boundary appropriately
- [ ] Displays user-friendly error messages
- [ ] Handles AWS/Bedrock-specific errors

#### 7.2 Server-side Error Handling
- [ ] Implements `onError` handler in `toUIMessageStreamResponse`
- [ ] Distinguishes `NoSuchToolError`, `InvalidToolArgumentsError`, `ToolExecutionError`
- [ ] Uses try/catch for errors outside streaming
- [ ] Handles AWS credential errors
- [ ] Handles Bedrock throttling/rate limit errors

```typescript
// ✅ RECOMMENDED PATTERN
import { NoSuchToolError, InvalidToolArgumentsError, ToolExecutionError, streamText } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const result = streamText({
      model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        if (NoSuchToolError.isInstance(error)) {
          return 'Unknown tool requested';
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          return 'Invalid tool arguments';
        } else if (ToolExecutionError.isInstance(error)) {
          return 'Tool execution failed';
        }
        // AWS/Bedrock error handling
        if (error.message?.includes('ThrottlingException')) {
          return 'Rate limit exceeded. Please try again later.';
        }
        if (error.message?.includes('AccessDeniedException')) {
          return 'AWS access denied. Check credentials.';
        }
        return 'An error occurred';
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

---

### 8. PERFORMANCE OPTIMIZATION

#### 8.1 Caching
- [ ] Has caching strategy for repeated requests (Redis, KV, etc.)
- [ ] Considers Language Model Middleware for caching
- [ ] Cache key generation logic is appropriate

#### 8.2 Streaming Optimization
- [ ] Uses `experimental_throttle` to control update frequency
- [ ] Prevents unnecessary re-renders
- [ ] Has memory management for long streams

#### 8.3 Bedrock-specific Optimization
- [ ] Selected appropriate AWS region (minimize latency)
- [ ] Uses cross-region inference when needed
- [ ] Considers Provisioned Throughput for high traffic

---

### 9. TELEMETRY & MONITORING

- [ ] Enables `experimental_telemetry`
- [ ] Uses `functionId` and `metadata` for traceability
- [ ] Excludes sensitive data with `recordInputs: false`
- [ ] Considers AWS CloudWatch integration

```typescript
// ✅ RECOMMENDED PATTERN
const result = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  prompt: 'Hello',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'chat-completion',
    metadata: { 
      userId: 'xxx',
      provider: 'bedrock',
      model: 'claude-4.5-sonnet'
    },
    recordInputs: false,  // Exclude sensitive data
  },
});
```

---

### 10. TYPE SAFETY

- [ ] Correctly uses `UIMessage`, `UIMessagePart` types
- [ ] Tool types are inferred with `InferUITools`
- [ ] Properly utilizes generic type parameters

---

### 11. MESSAGE PERSISTENCE

- [ ] Uses `resumeStream` feature for stream resumption
- [ ] Has message history save/restore logic
- [ ] Distinguishes chat sessions with `id` prop

---

### 12. AWS SECURITY BEST PRACTICES

- [ ] AWS credentials are NOT hardcoded in code
- [ ] IAM roles/policies follow least privilege principle
- [ ] Production uses `fromNodeProviderChain()` or IAM roles
- [ ] Session tokens are securely managed

```typescript
// ❌ ANTI-PATTERN: Hardcoded credentials
const bedrock = createAmazonBedrock({
  accessKeyId: 'AKIAXXXXXXXX',    // NEVER DO THIS!
  secretAccessKey: 'xxxxxxxx',     // NEVER DO THIS!
});

// ✅ RECOMMENDED: Environment variables or IAM roles
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  credentialProvider: fromNodeProviderChain(),
});
```

---

## COMMON MISTAKES TO CHECK

| Mistake | Wrong | Correct |
|---------|-------|---------|
| Message content | `message.content` | `message.parts.map(...)` |
| Send message | `append({ content })` | `sendMessage({ text })` |
| Stream response | `toDataStreamResponse()` | `toUIMessageStreamResponse()` |
| Pass messages | `streamText({ messages })` | `streamText({ messages: convertToModelMessages(messages) })` |
| Multi-step limit | `maxSteps: 5` | `stopWhen: stepCountIs(5)` |

---

## REVIEW PROCEDURE

1. **File Discovery**: Find all AI SDK related code files
2. **Pattern Analysis**: Validate each checklist item
3. **Issue Identification**: Identify code deviating from Best Practices
4. **Recommendation**: Provide specific code modification suggestions

---

## OUTPUT FORMAT

### Review Summary
Report score and status for each category:
- ✅ Excellent: Follows Best Practices well
- ⚠️ Needs Improvement: Some patterns not recommended
- ❌ Requires Fix: Critical Best Practices violation

### Detailed Review
For each issue:
1. **File Location**: File and line where issue was found
2. **Current Code**: Current implementation
3. **Problem**: Why this is an issue
4. **Recommended Fix**: Improved code example
5. **Reference**: Related AI SDK official documentation link

---

## OUTPUT LANGUAGE INSTRUCTION

<important>
After completing the review, provide the final review results summary in **Korean (한국어)**.
The detailed code examples can remain in English, but all explanations, findings, and recommendations must be written in Korean.
</important>

---

## START REVIEW

Analyze the project's AI SDK related code based on the above checklist and report all improvements and Best Practices violations in detail.
