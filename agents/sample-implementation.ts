// ============================================
// FILE: types/chat.ts
// ============================================
import { UIMessage } from 'ai';
import { z } from 'zod';

// Task schemas
export const taskItemSchema = z.object({
  type: z.enum(['text', 'file', 'action']),
  text: z.string(),
  file: z.object({
    name: z.string(),
    icon: z.string(),
    color: z.string().optional(),
  }).optional(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(taskItemSchema),
  status: z.enum(['pending', 'in_progress', 'completed', 'error']),
  progress: z.object({
    current: z.number(),
    total: z.number(),
  }).optional(),
});

// Custom data part type
export type TaskDataPart = {
  type: 'data-task';
  id: string;
  data: z.infer<typeof taskSchema>;
};

// Enhanced UIMessage with task support
export type EnhancedUIMessage = UIMessage<
  {}, // metadata
  TaskDataPart, // data parts
  {} // tools
>;

// ============================================
// FILE: app/api/chat/route.ts
// ============================================
import { openai } from '@ai-sdk/openai';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
  convertToModelMessages,
} from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: openai('gpt-4o'),
        messages: convertToModelMessages(messages),
        tools: {
          analyzeCode: tool({
            description: 'Analyze code files and generate insights',
            inputSchema: z.object({
              files: z.array(z.string()),
              analysisType: z.string(),
            }),
            
            onInputStart: ({ toolCallId }) => {
              writer.write({
                type: 'data-task',
                id: toolCallId,
                data: {
                  id: toolCallId,
                  title: 'Starting code analysis',
                  status: 'pending',
                  items: [],
                },
              });
            },
            
            onInputAvailable: ({ input, toolCallId }) => {
              writer.write({
                type: 'data-task',
                id: toolCallId,
                data: {
                  id: toolCallId,
                  title: 'Analyzing code files',
                  status: 'in_progress',
                  items: [
                    { 
                      type: 'text', 
                      text: `Found ${input.files.length} files to analyze` 
                    }
                  ],
                  progress: { current: 0, total: input.files.length },
                },
              });
            },
            
            execute: async ({ files, analysisType }, { toolCallId }) => {
              const results = [];
              
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Simulate processing
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Update progress
                writer.write({
                  type: 'data-task',
                  id: toolCallId,
                  data: {
                    id: toolCallId,
                    title: 'Analyzing code files',
                    status: 'in_progress',
                    items: [
                      ...results,
                      { 
                        type: 'file', 
                        text: 'Analyzed',
                        file: { 
                          name: file, 
                          icon: file.endsWith('.tsx') ? 'react' : 
                                file.endsWith('.ts') ? 'typescript' : 
                                'javascript'
                        }
                      }
                    ],
                    progress: { current: i + 1, total: files.length },
                  },
                });
                
                results.push({
                  type: 'file' as const,
                  text: 'Analyzed',
                  file: { name: file, icon: 'typescript' }
                });
              }
              
              // Final completion
              writer.write({
                type: 'data-task',
                id: toolCallId,
                data: {
                  id: toolCallId,
                  title: 'Code analysis complete',
                  status: 'completed',
                  items: [
                    ...results,
                    { type: 'text', text: 'Generated insights report' },
                    { type: 'text', text: 'Found 3 optimization opportunities' },
                  ],
                  progress: { current: files.length, total: files.length },
                },
              });
              
              return {
                summary: `Analyzed ${files.length} files successfully`,
                insights: ['Insight 1', 'Insight 2', 'Insight 3'],
              };
            },
          }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse(stream);
}

// ============================================
// FILE: components/enhanced-response.tsx
// ============================================
'use client';

import { Response } from '@/components/ai-elements/response';
import { 
  Task, 
  TaskTrigger, 
  TaskContent, 
  TaskItem,
  TaskItemFile 
} from '@/components/ai-elements/task';
import { EnhancedUIMessage, TaskDataPart } from '@/types/chat';
import { 
  SiReact, 
  SiTypescript, 
  SiJavascript 
} from '@icons-pack/react-simple-icons';

const iconMap = {
  react: SiReact,
  typescript: SiTypescript,
  javascript: SiJavascript,
};

interface EnhancedResponseProps {
  message: EnhancedUIMessage;
}

export function EnhancedResponse({ message }: EnhancedResponseProps) {
  // Extract text content
  const textContent = message.parts
    .filter(part => part.type === 'text')
    .map(part => 'text' in part ? part.text : '')
    .join('');
  
  // Extract task parts
  const taskParts = message.parts.filter(
    part => part.type === 'data-task'
  ) as TaskDataPart[];

  return (
    <div className="space-y-4">
      {/* Render tasks */}
      {taskParts.map((taskPart, index) => {
        const task = taskPart.data;
        const isActive = task.status === 'in_progress' || task.status === 'pending';
        
        return (
          <Task 
            key={taskPart.id} 
            defaultOpen={isActive || index === taskParts.length - 1}
          >
            <TaskTrigger title={task.title} />
            <TaskContent>
              {task.items.map((item, itemIndex) => (
                <TaskItem key={itemIndex}>
                  {item.type === 'file' && item.file ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-muted-foreground">{item.text}</span>
                      <TaskItemFile>
                        {item.file.icon && iconMap[item.file.icon as keyof typeof iconMap] && (
                          React.createElement(
                            iconMap[item.file.icon as keyof typeof iconMap],
                            { className: 'size-4' }
                          )
                        )}
                        <span>{item.file.name}</span>
                      </TaskItemFile>
                    </span>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </TaskItem>
              ))}
              
              {/* Progress indicator */}
              {task.progress && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Progress: {task.progress.current} / {task.progress.total}
                </div>
              )}
            </TaskContent>
          </Task>
        );
      })}
      
      {/* Render text response */}
      {textContent && (
        <Response>{textContent}</Response>
      )}
    </div>
  );
}

// ============================================
// FILE: app/page.tsx (or your chat component)
// ============================================
'use client';

import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { EnhancedResponse } from '@/components/enhanced-response';
import { EnhancedUIMessage } from '@/types/chat';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = 
    useChat<EnhancedUIMessage>({
      api: '/api/chat',
    });

  return (
    <div className="flex flex-col h-screen">
      <Conversation>
        <ConversationContent>
          {messages.map((message, index) => (
            <Message key={index} from={message.role}>
              <MessageContent>
                <EnhancedResponse message={message} />
              </MessageContent>
            </Message>
          ))}
          
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <div className="animate-pulse">Thinking...</div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Try: Analyze my React components"
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </form>
    </div>
  );
}