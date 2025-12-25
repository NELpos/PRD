# PRD: Claude Code 프롬프트 향상 Hook
## Next.js 15 + React + Vercel AI SDK 전용

---

## 📋 문서 정보

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0 |
| **작성일** | 2025-12-25 |
| **대상 스택** | Next.js 15, React 19, Vercel AI SDK, TypeScript |
| **Hook 언어** | TypeScript (Bun 런타임) |
| **패키지 관리** | pnpm |

---

## 1. 개요

### 1.1 목적

한글로 입력된 프롬프트를 Next.js 개발에 최적화된 영어 프롬프트로 변환하고, App Router, Server Components, Vercel AI SDK 등 Next.js 15 생태계에 맞는 Best Practice 컨텍스트를 자동 주입합니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| **한글 → 영어 변환** | Next.js/React 기술 용어 정확한 번역 |
| **도메인 감지** | Frontend / Backend(API) / AI Integration 자동 분류 |
| **컨텍스트 주입** | App Router, RSC, Server Actions 등 Best Practice |
| **바이패스** | `*`, `/`, `#`, `!` prefix로 향상 건너뛰기 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                     User Prompt (Korean)                            │
│         "로그인 컴포넌트 만들어줘. 서버 액션으로 인증 처리해줘"          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              UserPromptSubmit Hook (TypeScript/Bun)                 │
│                                                                     │
│  1. Parse stdin JSON (prompt, cwd, session_id)                      │
│  2. Bypass Check (prefix, Korean ratio)                             │
│  3. Domain Detection (frontend/backend/ai/fullstack)                │
│  4. Technical Term Translation (한글 → 영어)                         │
│  5. Context Injection (Next.js Best Practices)                      │
│  6. Output enhanced prompt (stdout)                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Claude (via Amazon Bedrock)                      │
│              Enhanced English prompt with full context              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 파일 구조

```
your-nextjs-project/
├── .claude/
│   ├── hooks/
│   │   └── prompt-enhancer.ts    # 메인 Hook 스크립트
│   └── settings.json             # Hook 등록 설정
├── package.json
├── next.config.ts
└── ...
```

---

## 4. 핵심 구현

### 4.1 메인 Hook 스크립트 (`.claude/hooks/prompt-enhancer.ts`)

```typescript
#!/usr/bin/env bun
/**
 * Claude Code Prompt Enhancer Hook
 * Next.js 15 + React + Vercel AI SDK 전용
 * 
 * 한글 프롬프트를 영어로 변환하고 Next.js Best Practice 컨텍스트를 주입합니다.
 */

import type { UserPromptSubmitHookInput } from "@anthropic-ai/claude-code";

// ==================== 설정 ====================

const CONFIG = {
  bypassPrefixes: ['*', '/', '#', '!'],
  koreanThreshold: 0.1,
  debug: false
};

// ==================== 타입 정의 ====================

type Domain = 'frontend' | 'backend' | 'ai' | 'fullstack' | 'general';

interface DetectionResult {
  domain: Domain;
  keywords: string[];
}

// ==================== 키워드 정의 ====================

const DOMAIN_KEYWORDS = {
  frontend: {
    ko: [
      '컴포넌트', 'UI', 'UX', '화면', '스타일', '레이아웃', '반응형',
      '버튼', '폼', '입력', '모달', '팝업', '네비게이션', '사이드바',
      '애니메이션', '트랜지션', '테일윈드', '스타일링', '다크모드',
      '훅', '상태', '이펙트', '컨텍스트', '리듀서', '클라이언트'
    ],
    en: [
      'component', 'ui', 'ux', 'style', 'layout', 'responsive',
      'button', 'form', 'input', 'modal', 'navigation', 'sidebar',
      'animation', 'transition', 'tailwind', 'dark mode',
      'hook', 'state', 'effect', 'context', 'use client'
    ]
  },
  backend: {
    ko: [
      'API', '서버', '데이터베이스', 'DB', '인증', '권한', '엔드포인트',
      '라우터', '미들웨어', '서버 액션', '라우트 핸들러',
      '토큰', 'JWT', '세션', '쿠키', '캐시', '프리즈마', '드리즐'
    ],
    en: [
      'api', 'server', 'database', 'auth', 'authentication', 'authorization',
      'endpoint', 'router', 'middleware', 'server action', 'route handler',
      'token', 'jwt', 'session', 'cookie', 'cache', 'prisma', 'drizzle'
    ]
  },
  ai: {
    ko: [
      'AI', '챗봇', '스트리밍', '채팅', 'LLM', '프롬프트',
      '생성', '응답', '대화', '어시스턴트', '도구 호출'
    ],
    en: [
      'ai', 'chatbot', 'streaming', 'chat', 'llm', 'prompt',
      'generate', 'response', 'conversation', 'assistant', 'tool calling',
      'useChat', 'useCompletion', 'streamText', 'generateText'
    ]
  }
};

// ==================== 기술 용어 사전 ====================

const TECH_TERMS: Record<string, string> = {
  // === Next.js Core ===
  '넥스트': 'Next.js',
  '앱 라우터': 'App Router',
  '페이지 라우터': 'Pages Router',
  '서버 컴포넌트': 'Server Component (RSC)',
  '클라이언트 컴포넌트': 'Client Component',
  '서버 액션': 'Server Action',
  '라우트 핸들러': 'Route Handler',
  '레이아웃': 'layout',
  '페이지': 'page',
  '로딩 상태': 'loading state',
  '에러 바운더리': 'error boundary',
  '서스펜스': 'Suspense',
  '스트리밍': 'streaming SSR',
  '하이드레이션': 'hydration',
  '프리렌더링': 'pre-rendering',
  '정적 생성': 'Static Site Generation (SSG)',
  '서버 사이드 렌더링': 'Server-Side Rendering (SSR)',
  '증분 정적 재생성': 'Incremental Static Regeneration (ISR)',
  '동적 라우트': 'dynamic route',
  '병렬 라우트': 'parallel routes',
  '인터셉팅 라우트': 'intercepting routes',
  
  // === React 19 ===
  '리액트': 'React',
  '컴포넌트': 'component',
  '훅': 'hook',
  '상태': 'state',
  '이펙트': 'effect',
  '컨텍스트': 'context',
  '리듀서': 'reducer',
  '메모이제이션': 'memoization',
  '콜백': 'callback',
  '레퍼런스': 'ref',
  '폼 액션': 'form action',
  '옵티미스틱': 'optimistic update',
  '트랜지션': 'transition',
  
  // === Vercel AI SDK ===
  'AI SDK': 'Vercel AI SDK',
  '채팅 훅': 'useChat hook',
  '완성 훅': 'useCompletion hook',
  '스트리밍 응답': 'streaming response',
  '도구 호출': 'tool calling',
  '구조화된 출력': 'structured output (generateObject)',
  
  // === Styling ===
  '테일윈드': 'Tailwind CSS',
  '스타일링': 'styling',
  '다크모드': 'dark mode',
  '반응형': 'responsive design',
  '애니메이션': 'animation',
  
  // === Data & Auth ===
  '프리즈마': 'Prisma',
  '드리즐': 'Drizzle ORM',
  '인증': 'authentication',
  '권한': 'authorization',
  '세션': 'session',
  '미들웨어': 'middleware',
  
  // === Common Actions ===
  '만들어': 'create/implement',
  '추가해': 'add',
  '수정해': 'fix/modify',
  '삭제해': 'delete/remove',
  '개선해': 'improve/optimize',
  '구현해': 'implement',
  '리팩토링': 'refactor',
  '테스트': 'test',
  '배포': 'deploy'
};

// ==================== 컨텍스트 템플릿 ====================

const CONTEXT_TEMPLATES: Record<Domain, string> = {
  frontend: `
[Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS]
[Domain: Frontend Development]

Next.js 15 Best Practices:
- Use Server Components (RSC) by default, add 'use client' only when needed
- Implement proper file conventions: page.tsx, layout.tsx, loading.tsx, error.tsx
- Use Suspense boundaries for streaming and loading states
- Apply Tailwind CSS with shadcn/ui components
- Ensure accessibility (WCAG 2.1 AA)
- Implement responsive design with mobile-first approach

React 19 Patterns:
- Use new hooks: useFormStatus, useOptimistic, use()
- Prefer Server Components for data fetching
- Use form actions for mutations
`,

  backend: `
[Stack: Next.js 15 API Layer + TypeScript]
[Domain: Backend / API Development]

Next.js 15 Backend Best Practices:
- Use Server Actions for form mutations ('use server')
- Implement Route Handlers (route.ts) for REST API endpoints
- Apply Zod for request/response validation
- Use middleware.ts for auth, redirects, headers
- Implement proper error handling with NextResponse
- Consider edge runtime for performance-critical endpoints

Data Layer:
- Prisma or Drizzle ORM for database operations
- Implement proper caching with unstable_cache or fetch cache
- Use server-only package for sensitive operations
`,

  ai: `
[Stack: Next.js 15 + Vercel AI SDK + TypeScript]
[Domain: AI Integration]

Vercel AI SDK Best Practices:
- Use useChat hook for conversational interfaces
- Use useCompletion hook for single completions
- Implement streamText for streaming responses in Route Handlers
- Apply generateObject for structured outputs with Zod schemas
- Handle errors gracefully with onError callbacks
- Implement tool calling for function execution
- Consider rate limiting and cost control

Streaming Pattern:
- Use StreamingTextResponse in Route Handlers
- Apply Suspense for client-side streaming UI
- Implement loading states with useChat's isLoading
`,

  fullstack: `
[Stack: Next.js 15 + React 19 + Vercel AI SDK + TypeScript]
[Domain: Full-Stack Development]

Architecture Best Practices:
- Server Components for data fetching and initial render
- Client Components for interactivity and AI chat interfaces
- Server Actions for form mutations and data updates
- Route Handlers for external API integrations

Data Flow:
- Fetch data in Server Components, pass to Client as props
- Use Server Actions for mutations, revalidate with revalidatePath/revalidateTag
- Implement optimistic updates with useOptimistic

AI Integration:
- Use Vercel AI SDK hooks in Client Components
- Implement streaming with Route Handlers + StreamingTextResponse
- Apply proper error boundaries for AI failures
`,

  general: `
[Stack: Next.js 15 + React 19 + TypeScript]

Follow Next.js 15 and React 19 best practices.
Use App Router conventions and Server Components where appropriate.
`
};

// ==================== 유틸리티 함수 ====================

function getKoreanRatio(text: string): number {
  const koreanRegex = /[가-힣]/g;
  const koreanChars = text.match(koreanRegex)?.length ?? 0;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 ? koreanChars / totalChars : 0;
}

function shouldBypass(prompt: string): boolean {
  if (!prompt || prompt.trim().length === 0) return true;
  if (CONFIG.bypassPrefixes.some(prefix => prompt.startsWith(prefix))) return true;
  if (getKoreanRatio(prompt) < CONFIG.koreanThreshold) return true;
  return false;
}

function detectDomain(prompt: string): DetectionResult {
  const promptLower = prompt.toLowerCase();
  const detectedKeywords: string[] = [];
  
  const scores = { frontend: 0, backend: 0, ai: 0 };

  // 프론트엔드 키워드 매칭
  [...DOMAIN_KEYWORDS.frontend.ko, ...DOMAIN_KEYWORDS.frontend.en].forEach(kw => {
    if (prompt.includes(kw) || promptLower.includes(kw.toLowerCase())) {
      scores.frontend++;
      detectedKeywords.push(kw);
    }
  });

  // 백엔드 키워드 매칭
  [...DOMAIN_KEYWORDS.backend.ko, ...DOMAIN_KEYWORDS.backend.en].forEach(kw => {
    if (prompt.includes(kw) || promptLower.includes(kw.toLowerCase())) {
      scores.backend++;
      detectedKeywords.push(kw);
    }
  });

  // AI 키워드 매칭
  [...DOMAIN_KEYWORDS.ai.ko, ...DOMAIN_KEYWORDS.ai.en].forEach(kw => {
    if (prompt.includes(kw) || promptLower.includes(kw.toLowerCase())) {
      scores.ai++;
      detectedKeywords.push(kw);
    }
  });

  const maxScore = Math.max(scores.frontend, scores.backend, scores.ai);
  
  if (maxScore === 0) return { domain: 'general', keywords: [] };

  // 복합 도메인 체크
  const threshold = maxScore * 0.5;
  const activeDomains = Object.entries(scores).filter(([_, score]) => score >= threshold);
  
  if (activeDomains.length > 1) {
    return { domain: 'fullstack', keywords: detectedKeywords };
  }

  if (scores.ai === maxScore) return { domain: 'ai', keywords: detectedKeywords };
  if (scores.frontend === maxScore) return { domain: 'frontend', keywords: detectedKeywords };
  if (scores.backend === maxScore) return { domain: 'backend', keywords: detectedKeywords };
  
  return { domain: 'general', keywords: detectedKeywords };
}

function translateTerms(text: string): string {
  let result = text;
  
  // 긴 용어부터 먼저 치환 (부분 매칭 방지)
  const sortedTerms = Object.entries(TECH_TERMS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [ko, en] of sortedTerms) {
    result = result.replace(new RegExp(ko, 'gi'), en);
  }
  
  return result;
}

function enhance(prompt: string, detection: DetectionResult): string {
  const translated = translateTerms(prompt);
  const context = CONTEXT_TEMPLATES[detection.domain];

  return `${context}
---

[User Request - Translated from Korean]
${translated}

[Original Korean Request]
${prompt}

---
Please implement the above request following Next.js 15 and React 19 best practices.
`.trim();
}

function log(...args: unknown[]): void {
  if (CONFIG.debug) {
    console.error('[prompt-enhancer]', ...args);
  }
}

// ==================== 메인 ====================

async function main(): Promise<void> {
  try {
    const inputText = await Bun.stdin.text();
    const input = JSON.parse(inputText) as UserPromptSubmitHookInput;
    
    const { prompt } = input;
    
    log('Input prompt:', prompt);

    if (shouldBypass(prompt)) {
      log('Bypassing enhancement');
      process.exit(0);
    }

    const detection = detectDomain(prompt);
    log('Detection result:', detection);

    const enhanced = enhance(prompt, detection);
    log('Enhanced prompt:', enhanced);

    console.log(enhanced);
    process.exit(0);
  } catch (error) {
    log('Error:', error);
    process.exit(0);
  }
}

main();
```

---

## 5. 설치 및 설정

### 5.1 의존성 설치

```bash
# Bun 런타임 설치 (Hook 실행용)
curl -fsSL https://bun.sh/install | bash

# 타입 패키지 설치
pnpm add -D @anthropic-ai/claude-code
```

### 5.2 Hook 파일 설치

```bash
# Hook 디렉토리 생성
mkdir -p .claude/hooks

# Hook 스크립트 생성 (위 코드를 복사)
touch .claude/hooks/prompt-enhancer.ts
chmod +x .claude/hooks/prompt-enhancer.ts
```

### 5.3 settings.json 설정

`.claude/settings.json` 파일 생성:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/prompt-enhancer.ts",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 5.4 설치 확인

```bash
# Claude Code 재시작 후
claude

# /hooks 명령으로 등록 확인
/hooks
```

---

## 6. 사용 예시

### 6.1 Frontend 컴포넌트

**입력:**
```
로그인 폼 컴포넌트 만들어줘. 이메일이랑 비밀번호 입력받고 유효성 검사도 해줘
```

**출력:**
```
[Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS]
[Domain: Frontend Development]

Next.js 15 Best Practices:
- Use Server Components (RSC) by default, add 'use client' only when needed
- Implement proper file conventions: page.tsx, layout.tsx, loading.tsx, error.tsx
- Use Suspense boundaries for streaming and loading states
...

---

[User Request - Translated from Korean]
Create a login form component. Accept email and password input and implement validation as well

[Original Korean Request]
로그인 폼 컴포넌트 만들어줘. 이메일이랑 비밀번호 입력받고 유효성 검사도 해줘

---
Please implement the above request following Next.js 15 and React 19 best practices.
```

### 6.2 Server Action (Backend)

**입력:**
```
회원가입 서버 액션 구현해줘. 이메일 중복 체크하고 프리즈마로 DB에 저장해줘
```

**출력:**
```
[Stack: Next.js 15 API Layer + TypeScript]
[Domain: Backend / API Development]

Next.js 15 Backend Best Practices:
- Use Server Actions for form mutations ('use server')
- Implement Route Handlers (route.ts) for REST API endpoints
- Apply Zod for request/response validation
...

---

[User Request - Translated from Korean]
Implement a sign-up Server Action. Check email duplication and save to DB with Prisma

[Original Korean Request]
회원가입 서버 액션 구현해줘. 이메일 중복 체크하고 프리즈마로 DB에 저장해줘

---
Please implement the above request following Next.js 15 and React 19 best practices.
```

### 6.3 AI Integration

**입력:**
```
채팅 인터페이스 만들어줘. useChat 훅 써서 스트리밍 응답 받게 해줘
```

**출력:**
```
[Stack: Next.js 15 + Vercel AI SDK + TypeScript]
[Domain: AI Integration]

Vercel AI SDK Best Practices:
- Use useChat hook for conversational interfaces
- Use useCompletion hook for single completions
- Implement streamText for streaming responses in Route Handlers
...

---

[User Request - Translated from Korean]
Create a chat interface. Use useChat hook to receive streaming response

[Original Korean Request]
채팅 인터페이스 만들어줘. useChat 훅 써서 스트리밍 응답 받게 해줘

---
Please implement the above request following Next.js 15 and React 19 best practices.
```

### 6.4 바이패스

```bash
# 향상 건너뛰기
claude "* 그냥 간단하게 해줘"      # * prefix
claude "/help"                      # / prefix (slash command)
claude "Just create a button"       # 영어만 (Korean ratio < 10%)
```

---

## 7. 커스터마이징

### 7.1 용어 추가

`TECH_TERMS` 객체에 프로젝트 특화 용어 추가:

```typescript
const TECH_TERMS: Record<string, string> = {
  // 기존 용어...
  
  // 프로젝트 특화 용어 추가
  '대시보드': 'dashboard',
  '어드민': 'admin panel',
  '알림': 'notification',
  // ...
};
```

### 7.2 컨텍스트 수정

`CONTEXT_TEMPLATES`에서 프로젝트에 맞게 Best Practice 수정:

```typescript
const CONTEXT_TEMPLATES: Record<Domain, string> = {
  frontend: `
[Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS]
[Domain: Frontend Development]

Project-Specific Guidelines:
- Use our custom Button component from @/components/ui
- Follow the design system in Figma
- ...
`,
  // ...
};
```

### 7.3 디버그 모드

```typescript
const CONFIG = {
  // ...
  debug: true  // stderr로 디버그 로그 출력
};
```

---

## 8. 트러블슈팅

### 8.1 Hook이 실행되지 않음

```bash
# Bun 설치 확인
bun --version

# Hook 파일 권한 확인
ls -la .claude/hooks/prompt-enhancer.ts

# Claude Code 재시작
claude
```

### 8.2 타입 에러

```bash
# 타입 패키지 재설치
pnpm add -D @anthropic-ai/claude-code
```

### 8.3 디버그

```bash
# 디버그 모드로 Claude Code 실행
claude --debug
```

---

## 9. 참고 자료

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [shadcn/ui Components](https://ui.shadcn.com)
