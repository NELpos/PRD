# Multi-Step Tool Calling Advanced Patterns
## Vercel AI SDK 5.0+ / Amazon Bedrock + Claude 4.5

<reference_context>
This file provides advanced patterns for Multi-step Tool Calling in Vercel AI SDK 5.0+.
Use this reference when implementing complex agent workflows with multiple tool calls.
</reference_context>

---

## OVERVIEW

Multi-step Tool Calling enables Claude to perform complex tasks by sequentially calling multiple tools. In AI SDK 5.0, this is controlled with the `stopWhen` option.

---

## 1. BASIC MULTI-STEP PATTERN

### Server-side Setup

```typescript
import { 
  convertToModelMessages, 
  streamText, 
  stepCountIs,
  tool,
  UIMessage 
} from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { z } from 'zod';

const tools = {
  getLocation: tool({
    description: 'Get user location based on IP',
    inputSchema: z.object({}),
    execute: async () => ({ city: 'Seoul', country: 'KR' }),
  }),
  
  getWeather: tool({
    description: 'Get weather for a city',
    inputSchema: z.object({
      city: z.string(),
    }),
    execute: async ({ city }) => ({
      city,
      temperature: 18,
      condition: 'Cloudy',
    }),
  }),
  
  getRecommendation: tool({
    description: 'Get activity recommendation based on weather',
    inputSchema: z.object({
      weather: z.object({
        temperature: z.number(),
        condition: z.string(),
      }),
    }),
    execute: async ({ weather }) => ({
      recommendation: weather.temperature > 20 
        ? 'Perfect for outdoor activities!'
        : 'Consider indoor activities today.',
    }),
  }),
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
    system: `You are a helpful assistant. 
    When asked about weather or activities:
    1. First get the user's location
    2. Then get the weather for that location  
    3. Finally provide a recommendation based on the weather`,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),  // Maximum 5 steps
  });
  
  return result.toUIMessageStreamResponse();
}
```

### Execution Flow Example

```
User: "What should I do today?"
  ↓
Step 1: Claude calls getLocation()
  → Result: { city: 'Seoul', country: 'KR' }
  ↓
Step 2: Claude calls getWeather({ city: 'Seoul' })
  → Result: { city: 'Seoul', temperature: 18, condition: 'Cloudy' }
  ↓
Step 3: Claude calls getRecommendation({ weather: {...} })
  → Result: { recommendation: 'Consider indoor activities today.' }
  ↓
Step 4: Claude generates final response
  → "Based on your location in Seoul where it's 18°C and cloudy, 
     I'd recommend indoor activities today!"
```

---

## 2. stopWhen vs toolChoice

### stopWhen: stepCountIs(n)
Allows model to perform up to n tool call/response cycles.

```typescript
stopWhen: stepCountIs(5)
// Step 1: Tool call → Step 2: Result → Step 3: Tool call → ...
// Terminates after maximum 5 steps
```

### toolChoice Options

```typescript
// Auto-decide (default)
toolChoice: 'auto'

// Force tool call
toolChoice: 'required'

// Disable tool calls (text only)
toolChoice: 'none'

// Force specific tool
toolChoice: { tool: 'getWeather' }
```

### Combined Pattern

```typescript
// Force tool call on first step, then auto
const result = streamText({
  model: bedrock('...'),
  messages: convertToModelMessages(messages),
  tools,
  toolChoice: 'required',  // First step
  stopWhen: stepCountIs(3),
});
```

---

## 3. MULTI-STEP WORKFLOW (createUIMessageStream)

Explicit control for complex multi-step workflows:

```typescript
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  tool,
} from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // === Step 1: Intent Extraction ===
      const intentResult = streamText({
        model: bedrock('us.anthropic.claude-haiku-4-5-20250514-v1:0'),  // Fast model
        system: 'Extract the user intent as a structured object.',
        messages: convertToModelMessages(messages),
        toolChoice: 'required',
        tools: {
          extractIntent: tool({
            description: 'Extract user intent',
            inputSchema: z.object({
              category: z.enum(['weather', 'search', 'task', 'other']),
              details: z.string(),
            }),
            execute: async (intent) => intent,
          }),
        },
      });
      
      // Stream Step 1 (exclude finish event)
      writer.merge(intentResult.toUIMessageStream({ sendFinish: false }));
      
      // Wait for Step 1 completion
      const intent = await intentResult.response;
      const intentData = intent.messages[0]?.content?.[0]?.result;
      
      // === Step 2: Process Based on Intent ===
      let step2Result;
      
      if (intentData?.category === 'weather') {
        step2Result = streamText({
          model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
          system: 'Provide detailed weather information.',
          messages: [
            ...convertToModelMessages(messages),
            ...intent.messages,
          ],
          tools: { getWeather: weatherTool },
          stopWhen: stepCountIs(2),
        });
      } else {
        step2Result = streamText({
          model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
          messages: [
            ...convertToModelMessages(messages),
            ...intent.messages,
          ],
        });
      }
      
      // Stream Step 2 (exclude start event)
      writer.merge(step2Result.toUIMessageStream({ sendStart: false }));
    },
  });
  
  return createUIMessageStreamResponse({ stream });
}
```

---

## 4. EXTRACTING STEPS RESULTS

Extract all tool calls from generated steps:

```typescript
const { steps, text, toolCalls, toolResults } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  messages: convertToModelMessages(messages),
  tools,
  stopWhen: stepCountIs(10),
});

// Collect all tool calls from all steps
const allToolCalls = steps.flatMap(step => step.toolCalls);

// Analyze each step
steps.forEach((step, index) => {
  console.log(`Step ${index + 1}:`);
  console.log('  Tool calls:', step.toolCalls.length);
  console.log('  Text:', step.text?.substring(0, 50));
  console.log('  Finish reason:', step.finishReason);
});

// Total token usage across steps
const totalTokens = steps.reduce((sum, step) => ({
  input: sum.input + (step.usage?.inputTokens || 0),
  output: sum.output + (step.usage?.outputTokens || 0),
}), { input: 0, output: 0 });
```

---

## 5. CLIENT-SIDE TOOL RESULT HANDLING

Handling tools that must execute in the browser:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function ChatWithClientTools() {
  const { messages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    
    // Client-side tool handling
    onToolCall: async ({ toolCall }) => {
      switch (toolCall.toolName) {
        case 'getUserConfirmation':
          const confirmed = window.confirm(toolCall.args.message);
          addToolResult({
            toolCallId: toolCall.toolCallId,
            result: { confirmed },
          });
          break;
          
        case 'getClipboard':
          try {
            const text = await navigator.clipboard.readText();
            addToolResult({
              toolCallId: toolCall.toolCallId,
              result: { text },
            });
          } catch {
            addToolResult({
              toolCallId: toolCall.toolCallId,
              result: { error: 'Clipboard access denied' },
            });
          }
          break;
          
        case 'getBrowserInfo':
          addToolResult({
            toolCallId: toolCall.toolCallId,
            result: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              screenSize: `${screen.width}x${screen.height}`,
            },
          });
          break;
      }
    },
    
    // Auto-resubmit after tool results
    sendAutomaticallyWhen: ({ messages }) => {
      const lastMessage = messages.at(-1);
      if (lastMessage?.role !== 'assistant') return false;
      
      // Check if all tool-calls have results
      const toolCalls = lastMessage.parts.filter(
        (p): p is ToolCallUIPart => p.type === 'tool-call'
      );
      
      return toolCalls.length > 0 && 
             toolCalls.every(tc => tc.state === 'result');
    },
  });
  
  return (/* UI */);
}
```

---

## 6. ANSWER TOOL PATTERN

Force model to provide structured final output:

```typescript
const { toolCalls } = await generateText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  system: `You are solving problems step by step.
Use the calculate tool for computations.
When you have the final answer, use the answer tool.`,
  prompt: 'Calculate: (15 * 4) + (28 / 7) - 3',
  tools: {
    calculate: tool({
      description: 'Evaluate a math expression',
      inputSchema: z.object({ expression: z.string() }),
      execute: async ({ expression }) => {
        // Use mathjs or similar in production
        return eval(expression);
      },
    }),
    
    // Answer tool - NO execute → terminates agent loop when called
    answer: tool({
      description: 'Provide the final structured answer',
      inputSchema: z.object({
        steps: z.array(z.object({
          calculation: z.string(),
          result: z.number(),
        })),
        finalAnswer: z.number(),
        explanation: z.string(),
      }),
      // NO execute function! Calling this tool terminates the agent
    }),
  },
  toolChoice: 'required',
  stopWhen: stepCountIs(10),
});

// Extract answer tool result
const answerCall = toolCalls.find(tc => tc.toolName === 'answer');
if (answerCall) {
  console.log('Final answer:', answerCall.args);
  // { steps: [...], finalAnswer: 61, explanation: '...' }
}
```

---

## 7. ERROR HANDLING & RETRY

```typescript
const result = streamText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  messages: convertToModelMessages(messages),
  tools: {
    riskyOperation: tool({
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        try {
          const result = await externalAPI.call(id);
          return { success: true, data: result };
        } catch (error) {
          // Return error as result → model can retry or choose alternative
          return { 
            success: false, 
            error: error.message,
            suggestion: 'Try with a different ID or use fallback method',
          };
        }
      },
    }),
  },
  stopWhen: stepCountIs(5),
});

return result.toUIMessageStreamResponse({
  onError: (error) => {
    if (ToolExecutionError.isInstance(error)) {
      return `Tool execution failed: ${error.message}. Please try again.`;
    }
    return 'An error occurred';
  },
});
```

---

## 8. PERFORMANCE OPTIMIZATION

### Model Selection Strategy

```typescript
// Fast classification → Haiku
const classification = await generateText({
  model: bedrock('us.anthropic.claude-haiku-4-5-20250514-v1:0'),
  toolChoice: 'required',
  tools: { classify: classificationTool },
  prompt: userQuery,
});

// Complex processing → Sonnet/Opus
const result = streamText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250514-v1:0'),
  messages: [...],
  stopWhen: stepCountIs(5),
});
```

### Parallel Tool Calls

Claude can call independent tools in parallel:

```typescript
// Model may auto-decide to call these in parallel
tools: {
  getWeatherSeoul: tool({ ... }),
  getWeatherTokyo: tool({ ... }),
  getWeatherNewYork: tool({ ... }),
}

// Prompt: "Compare weather in Seoul, Tokyo, and New York"
// → All 3 tools may be called in a single step
```

---

## CHECKLIST

- [ ] Set maximum steps with `stopWhen: stepCountIs(n)` 
- [ ] Use appropriate step count to prevent infinite loops (typically 5-10)
- [ ] Client tools use `onToolCall` + `addToolResult`
- [ ] Configure auto-resubmit with `sendAutomaticallyWhen`
- [ ] Use Answer Tool pattern for structured final output
- [ ] Return tool execution errors as results so model can respond
- [ ] Use Haiku for simple classification, Sonnet/Opus for complex processing
