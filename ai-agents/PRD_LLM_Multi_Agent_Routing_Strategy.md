# Product Requirements Document

## LLM Multi-Agent Routing Strategy
### Vercel AI SDK 6.0 기반 하이브리드 라우팅 아키텍처

---

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0 |
| **작성일** | 2025년 12월 28일 |
| **기술 스택** | Vercel AI SDK 6.0, TypeScript, Next.js |
| **상태** | Draft |

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Background & Problem Statement](#2-background--problem-statement)
3. [Proposed Solution: 하이브리드 라우팅 아키텍처](#3-proposed-solution-하이브리드-라우팅-아키텍처)
4. [Routing Patterns 상세](#4-routing-patterns-상세)
5. [Multi-Agent Framework 비교 분석](#5-multi-agent-framework-비교-분석)
6. [Mastra Framework 상세 분석](#6-mastra-framework-상세-분석)
7. [구현 권장사항](#7-구현-권장사항)
8. [Success Metrics](#8-success-metrics)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [결론](#10-결론)

---

## 1. Executive Summary

본 문서는 LLM 기반 시스템에서 사용자 질문에 따라 적절한 Agent/Tool을 동적으로 라우팅하는 전략을 정의합니다. "항상 Orchestrator를 거치는 방식"의 오버헤드를 줄이고, 질문의 복잡도에 따라 선택적 라우팅을 수행하는 **하이브리드 접근법**을 권장합니다.

### 1.1 핵심 전략 요약

1. **빠른 분류 단계**를 두되, 최소한의 비용으로 수행 (gpt-4o-mini 활용)
2. **단순한 질문**은 바로 처리하여 라우팅 스킵
3. **복잡한 질문**만 전문 Agent로 위임
4. 각 Agent 내에서는 **Tool-based 자율 결정**

---

## 2. Background & Problem Statement

### 2.1 현재 상황

- Vercel AI SDK 6.0 기반 LLM 시스템 구현 중
- 다양한 도메인의 질문을 처리해야 하는 요구사항
- Agent와 Tool의 동적 활성화 전략 필요

### 2.2 해결해야 할 문제

- 모든 요청이 Orchestrator를 거칠 때 발생하는 **지연과 비용**
- 단순 질문에 대한 **불필요한 복잡한 처리**
- Agent/Tool 선택의 **일관성과 정확성**
- 시스템 확장 시 **라우팅 로직 관리**

---

## 3. Proposed Solution: 하이브리드 라우팅 아키텍처

### 3.1 아키텍처 개요

제안하는 하이브리드 아키텍처는 크게 3개 계층으로 구성됩니다:

| 계층 | 역할 | 기술 구현 |
|------|------|----------|
| **Quick Classifier** | 입력 분류, 복잡도 판단 | gpt-4o-mini + generateObject |
| **Specialized Agents** | 도메인별 전문 처리 | Agent + Tools (자율 결정) |
| **Direct Response** | 단순 질문 즉시 응답 | generateText (라우팅 스킵) |

### 3.2 처리 흐름

```
[사용자 입력]
      ↓
[Quick Classifier] ─ 복잡도, 도메인, Tool 필요 여부 판단
      ↓
┌─────────────┬─────────────┬─────────────┐
│   Simple    │    Code     │  Research   │
│  (직접응답)  │   Agent     │   Agent     │
└─────────────┴─────────────┴─────────────┘
```

### 3.3 Quick Classifier 상세

**분류 기준:**

- **복잡도 (simple/complex)**: Tool 호출 필요 여부, 다단계 추론 필요 여부
- **도메인 (code/research/general/data)**: 질문 주제에 따른 분류
- **Tool 필요 여부**: 외부 시스템 연동 필요 여부

---

## 4. Routing Patterns 상세

### 4.1 라우팅 구현 방식 비교

| 방식 | 장점 | 단점 | 사용 시나리오 |
|------|------|------|--------------|
| **LLM Function Calling** | 유연함, 복잡한 자연어 처리 | 추가 LLM 호출 비용 | 복잡한 의도 파악 |
| **Semantic Router** | 빠름, 저비용 | 사전 정의 카테고리 필요 | 명확한 의도 분류 |
| **하이브리드 (권장)** | 속도와 유연성 균형 | 구현 복잡도 | 프로덕션 환경 |

### 4.2 Vercel AI SDK 6.0 구현 패턴

#### 기본 라우팅 패턴

```typescript
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

async function handleQuery(query: string) {
  // Step 1: Quick Classification (저비용 모델 사용)
  const { object: classification } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      type: z.enum(['code', 'research', 'general']),
      complexity: z.enum(['simple', 'complex']),
      needsTool: z.boolean(),
    }),
    prompt: `Classify this query: ${query}`,
  });

  // Step 2: Route based on classification
  if (classification.complexity === 'simple' && !classification.needsTool) {
    // 단순 질문: 직접 응답 (라우팅 스킵)
    return generateText({
      model: openai('gpt-4o-mini'),
      prompt: query,
    });
  }

  // Step 3: 복잡한 질문: 전문 Agent로 위임
  switch (classification.type) {
    case 'code':
      return codeAgent.execute(query);
    case 'research':
      return researchAgent.execute(query);
    default:
      return generalAgent.execute(query);
  }
}
```

#### Tool Loop Agent 패턴

```typescript
import { Agent } from '@ai-sdk/agent';

const codeAgent = new Agent({
  model: openai('gpt-4o'),
  tools: {
    executeCode,
    searchDocs,
    analyzeError,
  },
  system: `You are a code expert. Use tools as needed to solve coding problems.`,
  stopWhen: stepCountIs(10),
});

// Agent가 자율적으로 Tool 선택
const result = await codeAgent.execute(query);
```

---

## 5. Multi-Agent Framework 비교 분석

### 5.1 주요 프레임워크 비교

| 프레임워크 | 라우팅 내장 | 동적 Agent | 병렬 실행 | 상태 관리 | TypeScript |
|-----------|:----------:|:---------:|:--------:|:--------:|:----------:|
| **Vercel AI SDK** | 수동 | 수동 | ✅ | 기본 | ✅✅ |
| **LangGraph** | ✅ 조건부 엣지 | ✅ Supervisor | ✅ | ✅✅ | JS 지원 |
| **CrewAI** | ✅ 역할 기반 | ✅ Crew | ✅ | ✅ | ❌ Python |
| **Mastra** | ✅ 워크플로우 | ✅ | ✅ | ✅ | ✅✅ |
| **OpenAI Agents** | ✅ Handoff | ✅ | 제한적 | 기본 | ✅ |
| **Pydantic AI** | 수동/그래프 | ✅ | ✅ | ✅ | ❌ Python |

### 5.2 상황별 권장 프레임워크

| 상황 | 권장 프레임워크 |
|------|----------------|
| TypeScript + Next.js 유지, Vercel AI SDK 기존 사용 | **Mastra** ⭐ |
| 가장 유연한 오케스트레이션 필요 | **LangGraph** |
| 빠른 MVP, 역할 기반 접근 | **CrewAI** (Python) |
| OpenAI만 사용, 단순 핸드오프 | **OpenAI Agents SDK** |
| 타입 안전성 + Python | **Pydantic AI** |
| 현재 코드 최대한 유지 | **Vercel AI SDK + 자체 라우터** |

---

## 6. Mastra Framework 상세 분석

### 6.1 기본 정보

| 항목 | 내용 |
|------|------|
| **라이선스** | Apache 2.0 (상업적 사용 가능) |
| **GitHub Stars** | 18.3k+ |
| **npm 주간 다운로드** | ~44,000회 |
| **개발사** | Gatsby 팀 (Y Combinator W25) |
| **현재 버전** | 1.0 베타 준비 중 |
| **Vercel AI SDK 호환** | ✅ 완전 호환 (위에 구축됨) |

### 6.2 핵심 기능

- **Model Routing**: 40+ LLM 프로바이더 지원 (OpenAI, Claude, Gemini 등)
- **Agents**: 자율적 에이전트 + Tool 호출
- **Workflows**: 그래프 기반 워크플로우 엔진 (`.then()`, `.branch()`, `.parallel()`)
- **Human-in-the-loop**: 중단/재개 가능
- **RAG**: 벡터 스토어 통합
- **MCP 서버**: Model Context Protocol 지원
- **Evals & Observability**: 내장 평가 및 모니터링

### 6.3 Amazon Bedrock 연동

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { Agent } from '@mastra/core/agent';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  // AWS 인증 정보
});

const agent = new Agent({
  name: 'My Agent',
  model: bedrock('anthropic.claude-3-5-sonnet-20240620-v1:0'),
  instructions: 'You are a helpful assistant.',
  tools: { /* ... */ },
});
```

**주의사항:**
- AI SDK를 통한 공식 지원
- Claude 3.5 Sonnet 등 Bedrock 모델 사용 가능
- Tool + Working Memory 동시 사용 시 일부 버그 존재 (활발히 수정 중)

### 6.4 엔터프라이즈 적합성

#### ✅ 장점

- **완전한 셀프 호스팅 지원** (온프레미스/Private Cloud)
- **소스코드와 인프라 완전 제어**
- **기존 인증 시스템과 통합 가능**
- **Observability 내장** (트레이싱, 로깅)
- Apache 2.0 라이선스로 상업적 사용 자유

#### ⚠️ 주의사항

- 공식 SOC2/ISO 인증 없음 (프레임워크 자체는 인증 대상 아님)
- 엔터프라이즈 SLA 제공 안됨 (Discord 커뮤니티 지원)
- 1.0 정식 버전 미출시 (베타 준비 중)

### 6.5 실제 사용 사례

- **Factorial** (유니콘, 14,000+ 고객): HR 플랫폼 AI 에이전트
- **Cedar** (YC W25): 온보딩 AI Copilot
- **다수 YC 스타트업**: 고객 지원 자동화, CAD 다이어그램, 의료 기록, 금융 문서 등

---

## 7. 구현 권장사항

### 7.1 권장 아키텍처 옵션

#### Option A: Mastra로 마이그레이션 ⭐ (강력 권장)

- Vercel AI SDK 위에 구축되어 **기존 코드 호환**
- 워크플로우 엔진 추가 (`.then()`, `.branch()`, `.parallel()`)
- 에이전트 오케스트레이션 내장

```typescript
import { Workflow, createStep } from '@mastra/core';

const classifyStep = createStep({
  id: 'classify',
  execute: async ({ input }) => {
    // Quick classification logic
    return { route: 'code', complexity: 'complex' };
  },
});

const workflow = new Workflow({ name: 'router' })
  .step(classifyStep)
  .branch(({ result }) => result.route, {
    code: codeAgentStep,
    research: researchAgentStep,
    general: generalAgentStep,
  });
```

#### Option B: LangGraph (Python 백엔드)

- 복잡한 워크플로우, RAG, 다중 도구 시나리오에 최적
- TypeScript도 지원하나 Python이 더 성숙
- LangGraph Studio로 시각화 가능

#### Option C: Vercel AI SDK 유지 + 자체 라우터

- 프레임워크 전환 없이 직접 Router 클래스 구현
- 가장 가벼운 접근법
- 복잡한 워크플로우에는 한계

### 7.2 단계별 구현 계획

| Phase | 기간 | 내용 |
|-------|------|------|
| **Phase 1** | 2주 | Quick Classifier 구현 |
| | | - gpt-4o-mini 기반 분류기 개발 |
| | | - 복잡도/도메인 분류 스키마 정의 |
| **Phase 2** | 4주 | 전문 Agent 개발 |
| | | - Code Agent, Research Agent 등 도메인별 Agent 구현 |
| | | - 각 Agent의 Tool 정의 및 연동 |
| **Phase 3** | 2주 | 통합 및 최적화 |
| | | - 라우팅 로직 통합 |
| | | - 성능 측정 및 튜닝 |
| **Phase 4** | 2주 | 프로덕션 배포 |
| | | - 모니터링 설정 |
| | | - A/B 테스트 및 롤아웃 |

---

## 8. Success Metrics

| 지표 | 현재 | 목표 |
|------|------|------|
| 평균 응답 시간 (단순 질문) | TBD | < 1초 |
| 평균 응답 시간 (복잡 질문) | TBD | < 5초 |
| 라우팅 정확도 | TBD | > 95% |
| 비용 절감률 | Baseline | 30% 감소 |
| 사용자 만족도 | TBD | > 4.5/5 |

---

## 9. Risks & Mitigations

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|----------|
| Mastra 1.0 미출시 | 중간 | 베타 버전 충분히 테스트, 폴백 플랜 준비 |
| Bedrock Tool 버그 | 낮음 | 최신 버전 모니터링, 이슈 트래킹 |
| 분류 정확도 저하 | 높음 | 지속적 평가, 프롬프트 튜닝, 피드백 루프 |
| 엔터프라이즈 지원 부재 | 중간 | Discord 커뮤니티 활용, 내부 전문성 확보 |
| 프레임워크 종속성 | 낮음 | 추상화 레이어 구현, 인터페이스 분리 |

---

## 10. 결론

본 PRD에서 제안하는 **하이브리드 라우팅 전략**은 Vercel AI SDK 6.0의 장점을 최대한 활용하면서도 효율적인 구조를 제공합니다.

### 핵심 원칙

1. **"항상 Orchestrator를 거치는 것"은 오버헤드**
2. **빠른 분류 단계**를 두되, 최소한의 비용으로 수행
3. **단순한 것은 바로 처리** (라우팅 스킵)
4. **복잡한 것만 전문 Agent로 위임**
5. **각 Agent 내에서는 Tool-based 자율 결정**

### 권장 프레임워크

TypeScript/Next.js 환경에서 Vercel AI SDK를 이미 사용 중이라면, **Mastra로의 마이그레이션을 강력히 권장**합니다.

- Vercel AI SDK 위에 구축되어 기존 코드와의 호환성 우수
- 워크플로우 엔진과 에이전트 오케스트레이션 기능 내장
- 오픈소스 (Apache 2.0)로 완전한 인프라 통제 가능

---

## Appendix A: 참고 자료

- [Vercel AI SDK Documentation](https://ai-sdk.dev)
- [Mastra Documentation](https://mastra.ai/docs)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Anthropic Building Effective Agents](https://docs.anthropic.com)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io)
- [Mastra GitHub Repository](https://github.com/mastra-ai/mastra)

---

## Appendix B: 용어 정의

| 용어 | 정의 |
|------|------|
| **Agent** | LLM과 Tool을 결합하여 자율적으로 작업을 수행하는 시스템 |
| **Tool** | Agent가 호출할 수 있는 외부 기능 (API, 데이터베이스 등) |
| **Router** | 입력을 분류하여 적절한 처리 경로로 전달하는 컴포넌트 |
| **Orchestrator** | 여러 Agent의 협업을 조율하는 상위 컴포넌트 |
| **MCP** | Model Context Protocol - AI 모델과 외부 도구 연결 표준 |
| **RAG** | Retrieval-Augmented Generation - 검색 증강 생성 |
| **Semantic Router** | 임베딩 유사도 기반 의도 분류 시스템 |

---

## Appendix C: Mastra 워크플로우 예제

### 기본 라우팅 워크플로우

```typescript
import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { Workflow, createStep } from '@mastra/core/workflow';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// 1. Quick Classifier Step
const classifyStep = createStep({
  id: 'classify-input',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    route: z.enum(['code', 'research', 'general']),
    complexity: z.enum(['simple', 'complex']),
  }),
  execute: async ({ input, mastra }) => {
    const classifier = mastra.getAgent('classifier');
    const result = await classifier.generate(input.query);
    return JSON.parse(result.text);
  },
});

// 2. Specialized Agents
const codeAgent = new Agent({
  name: 'code-agent',
  model: openai('gpt-4o'),
  instructions: 'You are an expert programmer...',
  tools: { executeCode, searchDocs, analyzeError },
});

const researchAgent = new Agent({
  name: 'research-agent',
  model: openai('gpt-4o'),
  instructions: 'You are a research expert...',
  tools: { webSearch, summarize, extractFacts },
});

// 3. Workflow Definition
const routingWorkflow = new Workflow({ name: 'smart-router' })
  .step(classifyStep)
  .branch(
    ({ result }) => result.route,
    {
      code: codeAgentStep,
      research: researchAgentStep,
      general: generalAgentStep,
    }
  );

// 4. Mastra Instance
export const mastra = new Mastra({
  agents: { codeAgent, researchAgent },
  workflows: { routingWorkflow },
});
```

---

*문서 끝*
