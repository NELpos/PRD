# UIMessage Type Definitions
## Vercel AI SDK 5.0+

<reference_context>
This file provides detailed UIMessage type definitions for Vercel AI SDK 5.0+.
Use this reference when implementing message rendering or handling message data.
</reference_context>

---

## CORE INTERFACES

### UIMessage

```typescript
interface UIMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools
> {
  /**
   * Unique identifier for the message
   */
  id: string;
  
  /**
   * Role of the message sender
   */
  role: 'system' | 'user' | 'assistant';
  
  /**
   * Custom metadata (optional)
   */
  metadata?: METADATA;
  
  /**
   * Array of message parts - USE THIS FOR RENDERING
   * ⚠️ NOT content! The content property does NOT exist in SDK 5.0
   */
  parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}
```

---

## UIMESSAGEPART TYPES

### TextUIPart
```typescript
interface TextUIPart {
  type: 'text';
  text: string;
  state?: 'streaming' | 'done';  // Streaming status indicator
}
```

### ReasoningUIPart (Claude Extended Thinking)
```typescript
interface ReasoningUIPart {
  type: 'reasoning';
  text: string;
  state?: 'streaming' | 'done';
}
```

### ToolCallUIPart
```typescript
interface ToolCallUIPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
  state: 'pending' | 'result';  // 'pending' = executing, 'result' = completed
  result?: unknown;  // Present when state === 'result'
}
```

### ToolResultUIPart
```typescript
interface ToolResultUIPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
}
```

### FileUIPart
```typescript
interface FileUIPart {
  type: 'file';
  data: string;      // Base64 encoded
  mediaType: string; // MIME type
}
```

### SourceUIPart
```typescript
interface SourceUIPart {
  type: 'source';
  sourceType: 'url';
  id: string;
  url: string;
  title?: string;
}
```

### DataUIPart (Custom)
```typescript
interface DataUIPart<T = unknown> {
  type: string;  // Custom type name
  data: T;
}
```

---

## RENDERING PATTERNS

### Basic Parts Rendering

```tsx
function MessageRenderer({ message }: { message: UIMessage }) {
  return (
    <div className="message">
      {message.parts.map((part, index) => (
        <MessagePart key={`${message.id}-${index}`} part={part} />
      ))}
    </div>
  );
}

function MessagePart({ part }: { part: UIMessagePart }) {
  switch (part.type) {
    case 'text':
      return (
        <span className={part.state === 'streaming' ? 'animate-pulse' : ''}>
          {part.text}
        </span>
      );
      
    case 'reasoning':
      return (
        <details className="reasoning">
          <summary>🧠 Thinking...</summary>
          <p>{part.text}</p>
        </details>
      );
      
    case 'tool-call':
      return (
        <div className="tool-call">
          <span className="tool-name">🔧 {part.toolName}</span>
          <pre>{JSON.stringify(part.args, null, 2)}</pre>
          {part.state === 'result' && (
            <div className="result">
              <strong>Result:</strong>
              <pre>{JSON.stringify(part.result, null, 2)}</pre>
            </div>
          )}
          {part.state === 'pending' && (
            <span className="loading">Executing...</span>
          )}
        </div>
      );
      
    case 'source':
      return (
        <a href={part.url} className="source-link" target="_blank">
          📎 {part.title || part.url}
        </a>
      );
      
    case 'file':
      if (part.mediaType.startsWith('image/')) {
        return (
          <img 
            src={`data:${part.mediaType};base64,${part.data}`} 
            alt="Attached file"
          />
        );
      }
      return <span>📄 File: {part.mediaType}</span>;
      
    default:
      return null;
  }
}
```

### Streaming Status Handling

```tsx
function StreamingMessage({ message, status }: { 
  message: UIMessage; 
  status: string;
}) {
  const lastTextPart = message.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .at(-1);
  
  const isStreaming = status === 'streaming' && 
                      lastTextPart?.state === 'streaming';
  
  return (
    <div className={`message ${isStreaming ? 'streaming' : ''}`}>
      {message.parts.map((part, i) => (
        <MessagePart key={i} part={part} />
      ))}
      {isStreaming && <span className="cursor">▊</span>}
    </div>
  );
}
```

---

## TYPE-SAFE TOOL PARTS

```typescript
import type { InferUITools, UIMessage, ToolSet } from 'ai';

// Define tools
const tools: ToolSet = {
  weather: tool({
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => ({ temp: 22, city }),
  }),
  search: tool({
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => ({ results: [] }),
  }),
};

// Infer tool types
type MyTools = InferUITools<typeof tools>;

// Type-safe message
type MyMessage = UIMessage<never, never, MyTools>;

// Type-safe part handling
function handleToolPart(part: UIMessagePart<never, MyTools>) {
  if (part.type === 'tool-call') {
    // part.toolName is typed as 'weather' | 'search'
    switch (part.toolName) {
      case 'weather':
        // part.args is typed as { city: string }
        console.log(`Weather for ${part.args.city}`);
        break;
      case 'search':
        // part.args is typed as { query: string }
        console.log(`Searching: ${part.args.query}`);
        break;
    }
  }
}
```

---

## MESSAGE CONVERSION

### UIMessage → ModelMessage

```typescript
import { convertToModelMessages } from 'ai';

// REQUIRED when making API requests
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: bedrock('...'),
    messages: convertToModelMessages(messages),  // REQUIRED!
  });
  
  return result.toUIMessageStreamResponse();
}
```

### Multi-modal Tool Results

```typescript
import { tool, convertToModelMessages } from 'ai';

const screenshotTool = tool({
  inputSchema: z.object({}),
  execute: async () => 'base64ImageData...',
  // Convert result to image for model
  toModelOutput: (result) => [
    { type: 'image', data: result }
  ],
});

// Pass tools option during conversion
const modelMessages = convertToModelMessages(messages, {
  tools: { screenshot: screenshotTool },
});
```

---

## MIGRATION GUIDE (4.x → 5.0)

```typescript
// ❌ AI SDK 4.x (OLD - DO NOT USE)
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;  // Simple string - DEPRECATED
}

// ✅ AI SDK 5.0+ (CURRENT)
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: UIMessagePart[];  // Structured parts array
}

// Migration Example
// BEFORE (wrong)
<div>{message.content}</div>

// AFTER (correct)
<div>
  {message.parts
    .filter(p => p.type === 'text')
    .map((p, i) => <span key={i}>{p.text}</span>)}
</div>
```

---

## QUICK REFERENCE

| Property | SDK 4.x | SDK 5.0+ |
|----------|---------|----------|
| Message content | `message.content` | `message.parts` |
| Text extraction | `message.content` | `message.parts.filter(p => p.type === 'text').map(p => p.text)` |
| Tool calls | In content | `part.type === 'tool-call'` |
| Streaming state | Not available | `part.state === 'streaming'` |
