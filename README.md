# PRD Portfolio

AI/LLM 통합 프로젝트를 위한 Product Requirements Document 및 기술 문서 포트폴리오입니다.

## 📋 개요

이 레포지토리는 실제 프로젝트 경험을 바탕으로 작성된 PRD, 기술 가이드, 리서치 문서를 포함합니다. Claude AI와의 협업을 통해 기술 조사를 수행하고, 이를 체계적인 PRD로 정리하여 실제 구현으로 연결하는 워크플로우를 따릅니다.

## 🎯 문서 작성 워크플로우

```
1. 리서치 (Claude.ai)
   ↓
2. PRD 작성 요청
   ↓
3. Git으로 문서 동기화
   ↓
4. 구현 (Claude Code)
   ↓
5. 예제 코드 생성
```

## 📚 도메인별 PRD 카탈로그

### 🗄️ [Snowflake Integration](./snowflake/)
Snowflake 데이터 웨어하우스 통합 및 보안 분석 시스템

- **PRDs**: Authentication, Splunk Integration, Security Pipeline
- **Guides**: Node.js SDK, Session Management
- **Tech**: Snowflake, SQL, Node.js, Python

[더 보기 →](./snowflake/)

---

### 🤖 [AI Agents & Multi-Agent Systems](./ai-agents/)
AI 에이전트 아키텍처 및 멀티에이전트 오케스트레이션

- **PRDs**: Multi-Agent Platform
- **Research**: Agent Planning, LangGraph Migration
- **Tech**: LangGraph, FastAPI, Next.js, Amazon Bedrock

[더 보기 →](./ai-agents/)

---

### ✨ [Prompt Enhancer](./prompt-enhancer/)
한글→영어 프롬프트 최적화 시스템

- **PRDs**: Next.js Implementation, Python Implementation
- **Features**: XML 구조화, 토큰 효율화, 도메인 특화
- **Tech**: Next.js, FastAPI, Vercel AI SDK, LangChain

[더 보기 →](./prompt-enhancer/)

---

### 🔍 [SQL Pipeline & Text-to-SQL](./sql-pipeline/)
자연어→SQL 변환 및 파이프라인 처리 시스템

- **PRDs**: Text-to-SQL System
- **Features**: NL→SQL, Pipeline Commands, AI Processing
- **Tech**: CodeMirror, LangChain, Amazon Bedrock

[더 보기 →](./sql-pipeline/)

---

### 🎨 [Frontend & UI](./frontend/)
프론트엔드 아키텍처 및 디자인 시스템

- **PRDs**: Query Deduplication Hook
- **Guides**: Claude Theme with shadcn/ui
- **Tech**: React 19, Next.js 15, shadcn/ui, Tailwind CSS

[더 보기 →](./frontend/)

---

## 🛠 기술 스택 요약

### Frontend
- **Framework**: Next.js 15, React 19
- **UI**: shadcn/ui, Tailwind CSS, CodeMirror 6
- **State**: React Query, Zustand
- **AI Integration**: Vercel AI SDK 5.0

### Backend
- **Languages**: Python 3.11+, Node.js, TypeScript
- **Frameworks**: FastAPI, Express
- **AI/LLM**: LangGraph, LangChain, DeepAgents

### Data & AI
- **LLM**: Amazon Bedrock (Claude 3.5 Sonnet/Haiku)
- **Database**: Snowflake, PostgreSQL
- **Observability**: LangSmith

### Tools & Patterns
- **Agent Frameworks**: LangGraph, ReAct Pattern
- **SQL Processing**: Pipeline Commands, Text-to-SQL
- **Prompt Engineering**: XML-structured, Token-optimized

## 🚀 Claude Code 커스텀 명령어

이 프로젝트는 Claude Code의 생산성을 높이는 커스텀 명령어를 포함합니다:

### `/enhance` - 범용 프롬프트 최적화
한글 요청을 Claude 최적화 영어 프롬프트로 변환

```bash
/enhance 프로젝트 킥오프 미팅 어젠다 만들어줘
```

### `/enhance-code` - 코드 작업 전용
프로그래밍 작업을 위한 특화된 프롬프트 생성

```bash
/enhance-code FastAPI로 REST API 만들어줘
```

### `/enhance-analysis` - 데이터 분석 전용
데이터 분석 및 리서치용 구조화된 프롬프트

```bash
/enhance-analysis 월별 매출 데이터 분석하고 트렌드 파악해줘
```

[커스텀 명령어 상세 가이드 →](./.claude/commands/README.md)

## 📁 레포지토리 구조

```
PRD/
├── snowflake/              # Snowflake 통합 PRDs (6개 문서)
├── ai-agents/              # AI Agent 시스템 PRDs (3개 문서)
├── prompt-enhancer/        # 프롬프트 최적화 PRDs (2개 문서)
├── sql-pipeline/           # SQL 파이프라인 PRDs (1개 문서)
├── frontend/               # Frontend 시스템 PRDs (2개 문서)
│
├── examples/               # 실제 구현 예제
│   └── sql_pipeline/       # SQL Pipeline Editor 구현
│
├── .claude/                # Claude Code 설정
│   ├── commands/           # 커스텀 명령어 (/enhance 등)
│   └── tools/              # 커스텀 MCP 도구
│
├── agents/                 # Agent 구현 샘플
├── sub_agents/             # Sub-agent 정의
├── vercel-ai-sdk-files/    # Vercel AI SDK 레퍼런스
│
├── README.md               # 이 파일
└── CLAUDE.md               # Claude Code 작업 가이드
```

## 💡 주요 프로젝트 하이라이트

### 1. Multi-Agent Orchestration Platform
여러 AI 에이전트를 동적으로 관리하고 라우팅하는 플랫폼. Next.js + LangGraph + Amazon Bedrock 기반.

- 동적 Agent Registry
- Generative UI 기반 실시간 모니터링
- Plan → Execute → Review 워크플로우

### 2. SQL Pipeline Editor
Splunk 스타일 파이프라인을 지원하는 SQL 에디터. CodeMirror 6 + AI 통합.

- JWT 디코딩/검증 파이프라인
- AI 기반 데이터 변환 (`ai_summarize`, `ai_sentiment` 등)
- 보안 이벤트 분석 최적화

### 3. Prompt Enhancer
한글 요청을 토큰 효율적인 영어 프롬프트로 자동 변환.

- 30% 토큰 절감
- 80%+ 첫 시도 성공률
- Claude Code 커스텀 명령어로 제공

## 🎓 사용된 패턴 & 아키텍처

### AI Agent Patterns
- **ReAct**: Reasoning + Acting 반복 루프
- **Human-in-the-Loop**: 사용자 승인 단계
- **Multi-Agent Collaboration**: 에이전트 간 협업

### Frontend Patterns
- **Generative UI**: AI 기반 동적 UI 생성
- **Server Components**: Next.js 15 App Router
- **Optimistic Updates**: React Query 낙관적 업데이트

### Data Processing
- **Pipeline Architecture**: 체인 가능한 데이터 변환
- **Streaming**: 실시간 데이터 처리
- **Caching**: 효율적인 결과 캐싱

## 📖 문서 유형

### PRD (Product Requirements Document)
제품/기능의 요구사항, 아키텍처, 구현 명세를 정의한 문서

### Guide
특정 기술이나 SDK의 상세한 사용 가이드

### Research
기술 조사, 패턴 분석, 마이그레이션 전략 문서

## 🔗 유용한 링크

- [Claude Code](https://claude.com/code) - AI 기반 코딩 도구
- [Vercel AI SDK](https://sdk.vercel.ai) - AI 애플리케이션 개발 SDK
- [LangGraph](https://github.com/langchain-ai/langgraph) - Multi-agent orchestration
- [shadcn/ui](https://ui.shadcn.com) - React UI 컴포넌트

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

**Made with ❤️ using Claude AI**
