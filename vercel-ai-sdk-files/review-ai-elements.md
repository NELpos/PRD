---
description: Review Next.js frontend implementation using AI Elements components. Validates proper component usage and integration with Vercel AI SDK. (MCP supported)
allowed-tools: Bash(find:*), Bash(grep:*), Bash(cat:*), Read, Glob, Grep, mcp__ai-elements__*
argument-hint: [file_path_or_directory (optional)]
---

# AI Elements Component Usage Review
## Environment: Next.js + Vercel AI SDK

<context>
TARGET: $ARGUMENTS (defaults to entire project if no argument provided)
LIBRARY: AI Elements (built on shadcn/ui)
FRAMEWORK: Next.js with React 19
STYLING: Tailwind CSS 4
MCP_AVAILABLE: true (AI Elements MCP server installed)
</context>

<objective>
Analyze frontend code using Vercel AI Elements component library.
Validate proper component usage, integration with AI SDK hooks, and adherence to Best Practices.
Provide actionable improvement recommendations.
</objective>

---

## PRE-REVIEW: MCP QUERY FOR LATEST INFORMATION

Before starting the review, query AI Elements MCP for latest component information:
- Available components list
- Latest API and props for each component
- Recommended usage patterns

Use `mcp__ai-elements__*` tools to fetch current documentation.

---

## REVIEW CHECKLIST

### 1. AI ELEMENTS INSTALLATION & SETUP

#### 1.1 Package Installation
- [ ] Components installed via `ai-elements` CLI
- [ ] shadcn/ui base configuration is correct
- [ ] Components located in `@/components/ai-elements/` directory
- [ ] React 19 compatibility verified
- [ ] Tailwind CSS 4 configured

```bash
# RECOMMENDED Installation
npx ai-elements@latest add conversation
npx ai-elements@latest add message
npx ai-elements@latest add prompt-input
npx ai-elements@latest add response
npx ai-elements@latest add reasoning

# OR using shadcn CLI
npx shadcn@latest add https://registry.ai-sdk.dev/all.json
```

---

### 2. CORE COMPONENT USAGE VALIDATION

#### 2.1 Conversation Component
- [ ] Uses `<Conversation>` container to wrap message area
- [ ] Uses `<ConversationContent>` for message list rendering
- [ ] Uses `<ConversationEmptyState>` for initial state display
- [ ] Uses `<ConversationScrollButton>` for scroll button
- [ ] Auto-scroll functionality works correctly

```tsx
// ✅ RECOMMENDED PATTERN
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';

<Conversation>
  <ConversationContent>
    {messages.length === 0 ? (
      <ConversationEmptyState
        icon={<MessageSquare className="size-12" />}
        title="Start a conversation"
        description="Type a message below to begin"
      />
    ) : (
      messages.map((message) => (
        // Message components
      ))
    )}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

#### 2.2 Message Component
- [ ] Uses `<Message>` component for each message
- [ ] Uses `from` prop to distinguish user/assistant roles
- [ ] Wraps content with `<MessageContent>`
- [ ] Uses `<MessageResponse>` for AI responses (markdown support)
- [ ] Uses `<MessageActions>` for action buttons

```tsx
// ✅ RECOMMENDED PATTERN
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';

{messages.map((message) => (
  <Message key={message.id} from={message.role}>
    <MessageContent>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return message.role === 'assistant' ? (
              <MessageResponse key={`${message.id}-${i}`}>
                {part.text}
              </MessageResponse>
            ) : (
              <span key={`${message.id}-${i}`}>{part.text}</span>
            );
          case 'reasoning':
            return (
              <Reasoning key={`${message.id}-${i}`}>
                {part.text}
              </Reasoning>
            );
          default:
            return null;
        }
      })}
    </MessageContent>
    
    {message.role === 'assistant' && (
      <MessageActions>
        <MessageAction onClick={() => regenerate()} label="Regenerate">
          <RefreshCcwIcon className="size-3" />
        </MessageAction>
        <MessageAction 
          onClick={() => navigator.clipboard.writeText(part.text)} 
          label="Copy"
        >
          <CopyIcon className="size-3" />
        </MessageAction>
      </MessageActions>
    )}
  </Message>
))}
```

#### 2.3 PromptInput Component
- [ ] Uses `<PromptInput>` or `<Input>` for form container
- [ ] Uses `<PromptInputTextarea>` for text input area
- [ ] Uses `<PromptInputSubmit>` for submit button
- [ ] Uses `status` prop to display streaming state
- [ ] Uses `<PromptInputAttachments>` for file attachments (if needed)
- [ ] Uses `<PromptInputSelect>` for model selection (optional)

```tsx
// ✅ RECOMMENDED PATTERN
import {
  Input,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputActionAddAttachments,
} from '@/components/ai-elements/prompt-input';

<Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
  <PromptInputTextarea
    value={input}
    placeholder="Type your message..."
    onChange={(e) => setInput(e.currentTarget.value)}
    className="pr-12"
  />
  <PromptInputSubmit
    status={status === 'streaming' ? 'streaming' : 'ready'}
    disabled={!input.trim()}
    className="absolute bottom-1 right-1"
  />
</Input>
```

#### 2.4 Response Component
- [ ] Uses `<Response>` component for AI response rendering
- [ ] Markdown rendering works correctly
- [ ] Code block highlighting is applied
- [ ] Streaming responses render smoothly

```tsx
// ✅ RECOMMENDED PATTERN
import { Response } from '@/components/ai-elements/response';

{message.role === 'assistant' && (
  <Response>{part.text}</Response>
)}
```

#### 2.5 Reasoning Component (Extended Thinking Support)
- [ ] Uses `<Reasoning>` component for Claude Extended Thinking
- [ ] Uses `isStreaming` prop to display streaming state
- [ ] Auto-collapses when reasoning completes

```tsx
// ✅ RECOMMENDED PATTERN (Claude Extended Thinking)
import { Reasoning } from '@/components/ai-elements/reasoning';

{message.parts.map((part, i) => {
  if (part.type === 'reasoning') {
    return (
      <Reasoning 
        key={`${message.id}-${i}`}
        isStreaming={status === 'streaming'}
      >
        {part.text}
      </Reasoning>
    );
  }
  // ...
})}
```

---

### 3. TOOL & CODE BLOCK COMPONENTS

#### 3.1 Tool Component
- [ ] Uses `<Tool>` component for Tool Call display
- [ ] Uses `status` prop to display execution state
- [ ] Properly renders tool results

```tsx
// ✅ RECOMMENDED PATTERN
import { Tool } from '@/components/ai-elements/tool';

{part.type === 'tool-call' && (
  <Tool 
    name={part.toolName} 
    status={part.state === 'result' ? 'complete' : 'loading'}
  >
    {part.result && JSON.stringify(part.result, null, 2)}
  </Tool>
)}
```

#### 3.2 CodeBlock Component
- [ ] Uses `<CodeBlock>` component for code blocks
- [ ] Language-specific syntax highlighting is applied
- [ ] Copy button is provided

```tsx
// ✅ RECOMMENDED PATTERN
import { CodeBlock } from '@/components/ai-elements/code-block';

<CodeBlock language="typescript">
  {codeContent}
</CodeBlock>
```

---

### 4. USECHAT HOOK INTEGRATION

#### 4.1 Correct Integration Pattern
- [ ] Correctly connects `useChat` hook return values with AI Elements components
- [ ] Renders `messages` array based on `parts`
- [ ] Calls `sendMessage` function in submit handler
- [ ] Manages loading/streaming state with `status`
- [ ] Provides response regeneration with `regenerate` function

```tsx
// ✅ RECOMMENDED Integration Pattern
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Type a message below to begin"
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return message.role === 'assistant' ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i}>{part.text}</span>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      
      <Input onSubmit={handleSubmit}>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type your message..."
        />
        <PromptInputSubmit
          status={status === 'streaming' ? 'streaming' : 'ready'}
          disabled={!input.trim() || isLoading}
        />
      </Input>
    </div>
  );
}
```

---

### 5. STYLING & ACCESSIBILITY

#### 5.1 Tailwind CSS Usage
- [ ] Maintains AI Elements default styles while customizing
- [ ] Properly uses Tailwind CSS 4 utility classes
- [ ] Supports dark mode

#### 5.2 Accessibility
- [ ] Keyboard navigation is possible
- [ ] ARIA labels are properly set
- [ ] Screen reader support is provided
- [ ] Focus management is correct

---

### 6. PERFORMANCE OPTIMIZATION

#### 6.1 Rendering Optimization
- [ ] `key` prop is correctly set (uses message.id)
- [ ] No unnecessary re-renders
- [ ] Memoization applied where needed

#### 6.2 Streaming Performance
- [ ] No performance degradation with long streaming responses
- [ ] Scroll remains smooth with long message lists

---

### 7. ANTI-PATTERN DETECTION

#### 7.1 Patterns to Avoid
- [ ] Uses `message.parts` instead of `message.content` (AI SDK 5.0+)
- [ ] Uses `<ConversationScrollButton>` instead of custom scroll logic
- [ ] Uses `<Response>` or `<MessageResponse>` instead of direct markdown parsing

```tsx
// ❌ ANTI-PATTERN: Legacy content usage
{messages.map(m => (
  <div>{m.content}</div>  // Does NOT work in AI SDK 5.0+
))}

// ✅ RECOMMENDED: Parts-based rendering
{messages.map(m => (
  <Message from={m.role}>
    <MessageContent>
      {m.parts.map(part => /* handle by part.type */)}
    </MessageContent>
  </Message>
))}
```

---

### 8. COMPONENT AVAILABILITY CHECK

| Component | Purpose | Required |
|-----------|---------|----------|
| `Conversation` | Message container with auto-scroll | ✅ Yes |
| `Message` | Individual message display | ✅ Yes |
| `PromptInput` | User input form | ✅ Yes |
| `Response` | AI response with markdown | ✅ Yes |
| `Reasoning` | Extended Thinking display | If using Claude reasoning |
| `Tool` | Tool call display | If using tools |
| `CodeBlock` | Code syntax highlighting | If displaying code |
| `Actions` | Action buttons | Recommended |

---

## REVIEW PROCEDURE

1. **File Discovery**: Find AI Elements components and page files
2. **MCP Query**: Check latest component info via AI Elements MCP
3. **Pattern Analysis**: Validate each checklist item
4. **Issue Identification**: Identify code deviating from Best Practices
5. **Recommendation**: Provide specific code modification suggestions

---

## OUTPUT FORMAT

### Review Summary
Report score and status for each category:
- ✅ Excellent: Follows AI Elements Best Practices well
- ⚠️ Needs Improvement: Some component usage not recommended
- ❌ Requires Fix: Critical Best Practices violation or missing components

### Component Usage Analysis
| Component | Installed | Used | Recommendation |
|-----------|-----------|------|----------------|
| Conversation | ✅/❌ | ✅/❌ | ... |
| Message | ✅/❌ | ✅/❌ | ... |
| PromptInput | ✅/❌ | ✅/❌ | ... |
| Response | ✅/❌ | ✅/❌ | ... |
| Reasoning | ✅/❌ | ✅/❌ | ... |
| Tool | ✅/❌ | ✅/❌ | ... |
| CodeBlock | ✅/❌ | ✅/❌ | ... |

### Detailed Review
For each issue:
1. **File Location**: File and line where issue was found
2. **Current Code**: Current implementation
3. **Problem**: Why this is an issue
4. **Recommended Fix**: Improved code example using AI Elements
5. **Reference**: Related AI Elements official documentation link

---

## REFERENCE LINKS

- AI Elements Documentation: https://ai-sdk.dev/elements
- AI Elements GitHub: https://github.com/vercel/ai-elements
- MCP Server Setup: https://ai-sdk.dev/elements/mcp
- Vercel AI SDK Documentation: https://ai-sdk.dev/docs

---

## OUTPUT LANGUAGE INSTRUCTION

<important>
After completing the review, provide the final review results summary in **Korean (한국어)**.
The detailed code examples can remain in English, but all explanations, findings, and recommendations must be written in Korean.
</important>

---

## START REVIEW

Analyze the project's AI Elements component usage based on the above checklist and report all improvements and Best Practices violations in detail.

If MCP is available, use `mcp__ai-elements__*` tools to query the latest component information.
