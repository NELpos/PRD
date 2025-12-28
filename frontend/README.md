# Frontend & UI Systems

프론트엔드 아키텍처, UI 컴포넌트, 디자인 시스템 관련 프로젝트 문서 모음입니다.

## 📚 문서 목록

### Implementation Guides

1. **[Claude Theme with shadcn/ui](./guide-claude-theme-shadcn.md)**
   - Claude AI 공식 브랜드 컬러 및 타이포그래피 가이드
   - shadcn/ui 컴포넌트에 Claude 테마 적용
   - 디자인 시스템 구축 방법론

### Product Requirements Documents (PRDs)

2. **[Query Duplication Detection Hook](./prd-query-duplication-hook.md)**
   - React Query 중복 요청 방지 훅
   - 성능 최적화 및 서버 부하 감소
   - TypeScript 타입 안전성

## 🛠 주요 기술 스택

### UI Framework
- React 19
- Next.js 15
- Tailwind CSS
- shadcn/ui

### State Management
- React Query / TanStack Query
- Zustand
- React Context

### Design System
- Claude Official Brand Colors
- Radix UI Primitives
- Tailwind CSS Custom Theme

## 🎨 Claude 브랜드 컬러

### Primary Colors
```css
--claude-orange: #D97706    /* Claude Signature Orange */
--claude-beige: #FEF3C7     /* Light Background */
--claude-brown: #92400E     /* Dark Text */
```

### Semantic Colors
```css
--success: #10B981
--error: #EF4444
--warning: #F59E0B
--info: #3B82F6
```

## 💡 주요 패턴 및 기법

### 1. Query Deduplication
동일한 API 요청이 짧은 시간 내에 여러 번 발생하는 것을 방지합니다.

```typescript
import { useQueryDeduplication } from '@/hooks/useQueryDeduplication'

const { data, isLoading } = useQueryDeduplication({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  dedupWindowMs: 1000 // 1초 내 중복 요청 방지
})
```

### 2. Claude Theme Integration
shadcn/ui 컴포넌트에 Claude 브랜드를 적용합니다.

```tsx
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        claude: {
          orange: '#D97706',
          beige: '#FEF3C7',
          brown: '#92400E',
        }
      }
    }
  }
}
```

### 3. Generative UI with AI SDK
Vercel AI SDK를 사용한 동적 UI 생성입니다.

```tsx
import { useActions, useUIState } from 'ai/rsc'

const { generateUI } = useActions()
const [messages, setMessages] = useUIState()
```

## 🔗 관련 리소스

- [Vercel AI SDK 파일](../vercel-ai-sdk-files/)
  - UI Message Types
  - Tool Patterns
  - AI Elements Review

- [예제 구현](../examples/sql_pipeline/)
  - SQL Pipeline Editor UI

## 🎯 주요 사용 사례

### 1. AI-Powered 인터페이스
- 동적으로 생성되는 UI 컴포넌트
- 실시간 상태 표시 (Loading, Processing, Complete)
- 에이전트 작업 진행 상황 시각화

### 2. 디자인 시스템 구축
- 일관된 브랜드 아이덴티티
- 재사용 가능한 컴포넌트 라이브러리
- 다크 모드 지원

### 3. 성능 최적화
- 중복 요청 방지
- 지능형 캐싱
- 코드 스플리팅

## 📊 성능 메트릭

### Query Deduplication 효과
- API 요청 감소: **40-60%**
- 서버 부하 감소: **50%**
- 초기 렌더링 속도 향상: **30%**

### UI 렌더링 최적화
- React.memo 활용
- Virtual Scrolling (대용량 리스트)
- Lazy Loading (이미지, 컴포넌트)

## 🚀 Best Practices

1. **컴포넌트 분리**: UI, 로직, 스타일 관심사 분리
2. **타입 안전성**: TypeScript로 모든 Props 및 State 타입 정의
3. **접근성**: ARIA 속성 및 키보드 네비게이션 지원
4. **반응형 디자인**: Mobile-first 접근 방식
5. **에러 바운더리**: 에러 처리 및 폴백 UI 제공
