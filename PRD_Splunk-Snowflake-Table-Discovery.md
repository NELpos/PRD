# PRD: Splunk-to-Snowflake Table Discovery Feature

## 📋 Document Information

| Item | Details |
|------|---------|
| **Version** | 1.0 |
| **Last Updated** | 2025-11-09 |
| **Author** | Engineering Team |
| **Status** | Draft for Review |
| **Target Release** | Q1 2025 |

---

## 🎯 Executive Summary

### Overview
기존 Next.js 15 애플리케이션에 AI 기반 테이블 검색 기능을 추가하여, Splunk에 익숙한 사용자가 Snowflake 데이터베이스의 550+ 테이블 중 관련 테이블을 자연어 또는 SPL(Splunk Processing Language) 쿼리로 쉽게 찾을 수 있도록 지원합니다.

### Business Value
- **생산성 향상**: 테이블 검색 시간 90% 단축 (평균 30분 → 3분)
- **온보딩 가속화**: 신규 분석가의 Snowflake 적응 기간 50% 감소
- **쿼리 정확도 개선**: 잘못된 테이블 사용으로 인한 오류 80% 감소
- **지식 공유**: Splunk-Snowflake 매핑 지식의 중앙화 및 자동화

### Strategic Alignment
- **마이그레이션 전략**: Splunk → Snowflake 전환을 원활하게 지원
- **AI-First Initiative**: 조직의 AI 활용 역량 강화
- **셀프서비스 분석**: 데이터 팀 의존도 감소

---

## 📊 Background & Context

### Current State
```
As-Is:
사용자 → Slack/Email로 데이터 팀에 문의
      → 데이터 팀이 수동으로 테이블 찾기 (30-60분)
      → 테이블명 + 간단한 설명 전달
      → 사용자가 다시 질문하는 경우 많음
```

### Problem Statement
1. **컨텍스트 손실**: Splunk 사용자가 익숙한 `index`, `sourcetype` 개념이 Snowflake에 직접 매핑되지 않음
2. **확장성 문제**: 550개 테이블에 대한 문서화가 불충분하고 분산됨
3. **반복적 질문**: 동일한 질문이 매주 5-10건 발생
4. **검색 어려움**: Snowflake Information Schema 쿼리만으로는 의미적 검색 불가능

### Target Users
- **Primary**: Splunk 경험이 있는 데이터 분석가 (30명)
- **Secondary**: 신규 입사자 및 데이터 엔지니어 (10명)
- **Tertiary**: 데이터 팀 (부하 감소 목적, 5명)

---

## 🎯 Goals & Success Metrics

### Goals

#### Primary Goals
1. 자연어 또는 SPL 쿼리로 관련 Snowflake 테이블 검색
2. Splunk → Snowflake 필드 매핑 자동 제공
3. 샘플 SQL 쿼리 생성

#### Secondary Goals
1. 검색 결과에 대한 사용자 피드백 수집
2. 자주 검색되는 패턴 학습 및 최적화
3. Slack 통합 (향후 Phase 2)

### Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **검색 성공률** | N/A | 85% | 상위 3개 결과 내 정답 포함 비율 |
| **응답 시간** | N/A | <2초 | P95 응답 시간 |
| **사용자 만족도** | N/A | 4.0/5.0 | 주간 설문 조사 |
| **데이터 팀 문의 감소** | 100% | -60% | 주간 Slack 문의 건수 |
| **일일 활성 사용자** | N/A | 15+ | 하루 1회 이상 사용 |
| **재검색 비율** | N/A | <20% | 동일 세션 내 재검색 비율 |

### KPIs (3개월 후)
- Monthly Active Users: 25+
- Average searches per user: 10+
- Search-to-action conversion: 70%+ (검색 후 실제 쿼리 실행)

---

## 👥 User Stories

### Epic 1: 기본 검색 기능

#### Story 1.1: Splunk 용어로 검색
```
As a Splunk 사용자
I want to "index=web_logs sourcetype=nginx"와 같은 Splunk 쿼리를 입력하면
So that 대응하는 Snowflake 테이블을 빠르게 찾을 수 있다

Acceptance Criteria:
- SPL 패턴을 파싱하여 index, sourcetype 추출
- 직접 매핑 테이블에서 우선 검색
- 상위 3개 테이블 추천 (신뢰도 점수 포함)
- 각 테이블에 대한 Splunk 원본 정보 표시
```

#### Story 1.2: 자연어 검색
```
As a 비기술 사용자
I want to "nginx 에러 로그 어디 있어?"와 같이 자연어로 질문하면
So that 기술 용어를 정확히 몰라도 테이블을 찾을 수 있다

Acceptance Criteria:
- 자연어 의도 파싱 (Intent Recognition)
- 키워드 기반 임베딩 검색
- 사용자 친화적인 결과 설명
- 추가 질문 가이드 제공
```

#### Story 1.3: 필드 매핑 확인
```
As a 데이터 분석가
I want to Splunk의 "_time" 필드가 Snowflake의 어떤 컬럼인지 보고 싶다
So that 기존 SPL 쿼리를 SQL로 변환할 수 있다

Acceptance Criteria:
- Splunk 필드 → Snowflake 컬럼 매핑 테이블 표시
- 데이터 타입 차이 경고
- 예시 값 비교 (optional)
```

### Epic 2: 결과 활용

#### Story 2.1: SQL 쿼리 생성
```
As a SQL 초보자
I want to 추천된 테이블에 대한 샘플 SQL 쿼리를 보고 싶다
So that 바로 복사해서 실행할 수 있다

Acceptance Criteria:
- 기본 SELECT 쿼리 생성
- 원본 SPL 쿼리의 조건을 SQL WHERE절로 변환
- Copy 버튼으로 원클릭 복사
```

#### Story 2.2: 검색 결과 피드백
```
As a 사용자
I want to 검색 결과가 유용했는지 피드백을 주고 싶다
So that 시스템이 점점 더 정확해질 수 있다

Acceptance Criteria:
- 👍/👎 버튼으로 간단한 피드백
- 선택한 테이블 추적 (analytics)
- 피드백 데이터로 재학습 (Phase 2)
```

### Epic 3: 관리 기능

#### Story 3.1: 메타데이터 동기화
```
As a 데이터 엔지니어
I want to Snowflake 테이블 변경 사항을 자동으로 반영하고 싶다
So that 수동 업데이트 없이 최신 상태 유지

Acceptance Criteria:
- 일일 1회 자동 sync (cron job)
- 신규 테이블 자동 임베딩
- 변경된 스키마 re-embedding
- Sync 실패 시 Slack 알림
```

---

## 🏗️ Technical Requirements

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Existing Next.js 15 App                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              New Feature Module                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  UI Layer (React Components)                   │  │  │
│  │  │  - SearchInput                                 │  │  │
│  │  │  - ResultsDisplay                              │  │  │
│  │  │  - FieldMappingTable                           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                         │                            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  API Routes (Next.js App Router)               │  │  │
│  │  │  - /api/table-search                           │  │  │
│  │  │  - /api/chat (Vercel AI SDK)                   │  │  │
│  │  │  - /api/feedback                               │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                         │                            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Agent Layer (AI SDK 5.0)                      │  │  │
│  │  │  - IntentParser (Haiku)                        │  │  │
│  │  │  - TableSearchAgent (Haiku/Sonnet)             │  │  │
│  │  │  - SQLGenerator (Sonnet)                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                         │                            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Data Layer                                    │  │  │
│  │  │  - VectorDB (Vercel Postgres + pgvector)       │  │  │
│  │  │  - Snowflake Client (existing)                 │  │  │
│  │  │  - MappingTable (new)                          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  External Services                                   │  │
│  │  - Amazon Bedrock (Claude Haiku/Sonnet)             │  │
│  │  - Voyage AI (Embeddings)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Reason |
|-----------|-----------|---------|
| **Frontend** | Existing Next.js 15 + React | 기존 프로젝트 통합 |
| **UI Components** | Existing component library | 일관성 유지 |
| **State Management** | Vercel AI SDK 5.0 `useChat` | 실시간 스트리밍 |
| **Backend** | Next.js App Router API Routes | 서버리스, Edge 지원 |
| **LLM** | Amazon Bedrock (Claude) | 기업 정책 준수 |
| **Embeddings** | Voyage AI | Anthropic 권장 |
| **Vector DB** | Vercel Postgres + pgvector | 기존 인프라 활용 |
| **ORM** | Drizzle ORM (existing?) | 타입 안전성 |
| **Data Source** | Existing Snowflake connection | 재사용 |

### Amazon Bedrock Integration

#### Required Configuration

```typescript
// lib/bedrock-client.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Vercel AI SDK adapter
import { LanguageModelV1 } from '@ai-sdk/provider';

export function createBedrockProvider() {
  return {
    languageModel(modelId: string): LanguageModelV1 {
      return new BedrockClaude(modelId);
    }
  };
}
```

#### Model IDs
- **Haiku**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Sonnet**: `anthropic.claude-3-5-sonnet-20241022-v2:0`

#### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-*",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-*"
      ]
    }
  ]
}
```

### Environment Variables (New)

```bash
# Amazon Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Voyage AI (Embeddings)
VOYAGE_API_KEY=pa-...

# Feature Flags
ENABLE_TABLE_SEARCH=true
TABLE_SEARCH_MAX_RESULTS=10

# Snowflake (existing)
SNOWFLAKE_ACCOUNT=...
SNOWFLAKE_USER=...
SNOWFLAKE_PASSWORD=...

# Postgres (existing or new)
POSTGRES_URL=postgres://...
```

### Database Schema Changes

```sql
-- 1. Splunk-Snowflake 매핑 테이블
CREATE TABLE IF NOT EXISTS splunk_snowflake_mapping (
    id SERIAL PRIMARY KEY,
    snowflake_table VARCHAR(255) NOT NULL,
    snowflake_schema VARCHAR(255) NOT NULL,
    splunk_indexes TEXT[],
    splunk_sourcetypes TEXT[],
    field_mappings JSONB,
    example_spl_queries TEXT[],
    migration_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    UNIQUE(snowflake_schema, snowflake_table)
);

-- 2. 임베딩 저장 테이블
CREATE TABLE IF NOT EXISTS table_embeddings (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(255) NOT NULL,
    layer VARCHAR(50) NOT NULL CHECK (layer IN ('splunk', 'semantic', 'technical')),
    document_text TEXT NOT NULL,
    embedding vector(1024),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(table_id, layer)
);

CREATE INDEX ON table_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_table_embeddings_table_id ON table_embeddings(table_id);

-- 3. 검색 로그 및 피드백
CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    query TEXT NOT NULL,
    intent_parsed JSONB,
    results JSONB,
    selected_table VARCHAR(255),
    feedback VARCHAR(20) CHECK (feedback IN ('positive', 'negative', 'neutral')),
    search_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_logs_user ON search_logs(user_id);
CREATE INDEX idx_search_logs_created ON search_logs(created_at);

-- 4. 동기화 로그
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    tables_processed INTEGER,
    tables_failed INTEGER,
    error_details JSONB,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed'))
);
```

### API Specifications

#### POST /api/table-search

**Request**
```typescript
{
  "query": "index=web_logs sourcetype=nginx",
  "options": {
    "maxResults": 5,
    "includeSQL": true,
    "includeMapping": true
  }
}
```

**Response**
```typescript
{
  "results": [
    {
      "tableId": "LOGS.NGINX_ACCESS",
      "tableName": "NGINX_ACCESS",
      "schema": "LOGS",
      "confidence": "high",
      "score": 0.95,
      "splunkOrigin": {
        "indexes": ["web_logs", "prod_web_logs"],
        "sourcetypes": ["nginx:access", "nginx"]
      },
      "reason": "직접 매핑: index=web_logs, sourcetype=nginx:access",
      "fieldMappings": {
        "_time": "timestamp",
        "status": "http_status",
        "clientip": "client_ip"
      },
      "sampleSQL": "SELECT timestamp, http_status, client_ip FROM LOGS.NGINX_ACCESS WHERE timestamp >= DATEADD(day, -7, CURRENT_DATE())",
      "migrationTips": "raw_log 컬럼은 VARCHAR(16MB)로 저장됨"
    }
  ],
  "searchStrategy": "direct_mapping",
  "searchDuration": 1250
}
```

#### POST /api/chat (AI SDK 5.0 compatible)

**Request**
```typescript
{
  "messages": [
    {
      "role": "user",
      "content": "nginx 에러 로그 찾고 싶어"
    }
  ]
}
```

**Response** (Streaming)
```
data: {"type":"text","delta":"검색 중입니다..."}

data: {"type":"tool_call","toolName":"searchVector","args":{"query":"nginx error log"}}

data: {"type":"tool_result","result":[...]}

data: {"type":"text","delta":"LOGS.NGINX_ERROR 테이블을 추천합니다..."}
```

#### POST /api/feedback

**Request**
```typescript
{
  "searchId": "uuid",
  "selectedTable": "LOGS.NGINX_ACCESS",
  "feedback": "positive",
  "comment": "정확했어요" // optional
}
```

---

## 🎨 UI/UX Requirements

### User Flows

#### Flow 1: 빠른 검색 (Happy Path)
```
1. 사용자가 검색창에 "index=web_logs" 입력
2. 자동완성으로 유사 검색어 제안 (optional)
3. Enter 누름
4. Loading indicator (1-2초)
5. 상위 3개 결과 카드 형태로 표시
   - 각 카드: 테이블명, 신뢰도, Splunk 원본, 펼치기 버튼
6. 카드 펼침 → 필드 매핑, SQL 코드 표시
7. "Copy SQL" 버튼 클릭 → 복사 완료 토스트
8. 👍 버튼 클릭 → 피드백 저장
```

#### Flow 2: 결과 없음
```
1. 사용자가 애매한 검색어 입력
2. "관련 테이블을 찾을 수 없습니다" 메시지
3. 제안:
   - "다른 키워드로 검색해보세요"
   - "자주 검색되는 테이블 보기"
   - "데이터 팀에 문의하기" (Slack 링크)
```

### Wireframes

#### Main Search Interface
```
┌────────────────────────────────────────────────────────┐
│  [← Back]         Table Finder        [Help] [Settings]│
├────────────────────────────────────────────────────────┤
│                                                        │
│  🔍 ┌──────────────────────────────────────────────┐  │
│     │ index=web_logs sourcetype=nginx          [X]│  │
│     └──────────────────────────────────────────────┘  │
│     💡 Tip: Splunk 쿼리나 자연어로 검색하세요          │
│                                                        │
│  📊 검색 결과 (0.8초)                                  │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✅ LOGS.NGINX_ACCESS                 [신뢰도: HIGH]│
│  │                                                 │   │
│  │ 📍 Splunk: index=web_logs, sourcetype=nginx    │   │
│  │ 💡 직접 매핑으로 찾음 (100% 일치)              │   │
│  │                                                 │   │
│  │ [필드 매핑 보기 ▼] [SQL 예시 ▼] [👍 4  👎 0]    │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ ⚠️  LOGS.WEB_ACCESS_ARCHIVE          [신뢰도: MED]│
│  │ ...                                             │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Expanded Result Card
```
┌────────────────────────────────────────────────────┐
│ ✅ LOGS.NGINX_ACCESS                               │
│                                                    │
│ 📍 Splunk 원본                                     │
│    - Index: web_logs, prod_web_logs               │
│    - Sourcetype: nginx:access, nginx              │
│                                                    │
│ 🔄 필드 매핑                           [Copy All]  │
│ ┌────────────────┬─────────────────────────────┐  │
│ │ Splunk 필드    │ Snowflake 컬럼              │  │
│ ├────────────────┼─────────────────────────────┤  │
│ │ _time          │ timestamp (TIMESTAMP)       │  │
│ │ status         │ http_status (INT)           │  │
│ │ clientip       │ client_ip (VARCHAR)         │  │
│ └────────────────┴─────────────────────────────┘  │
│                                                    │
│ 📝 샘플 SQL                            [Copy SQL] │
│ ┌──────────────────────────────────────────────┐  │
│ │ SELECT                                       │  │
│ │   timestamp,                                 │  │
│ │   http_status,                               │  │
│ │   client_ip                                  │  │
│ │ FROM LOGS.NGINX_ACCESS                       │  │
│ │ WHERE timestamp >= DATEADD(day, -7, CURRENT_│  │
│ │   DATE())                                    │  │
│ │   AND http_status >= 400                     │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ⚠️  주의사항: raw_log는 VARCHAR(16MB) 제한 있음    │
│                                                    │
│ [이 결과가 도움이 되었나요? 👍 👎]                  │
└────────────────────────────────────────────────────┘
```

### Design System Integration

- 기존 프로젝트의 Design Tokens 사용
- Color Scheme: 기존 primary/secondary 색상
- Typography: 기존 font stack
- Spacing: 기존 spacing scale (4px grid)
- Components: 기존 Button, Card, Input 재사용

### Accessibility Requirements

- WCAG 2.1 AA 준수
- 키보드 네비게이션 지원 (Tab, Enter, Esc)
- Screen reader 호환 (ARIA labels)
- High contrast mode 지원
- Focus indicators 명확히

---

## ⚙️ Non-Functional Requirements

### Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Search Response Time** | P95 < 2초 | CloudWatch Metrics |
| **Embedding Query** | P99 < 500ms | pgvector EXPLAIN ANALYZE |
| **LLM Inference** | P95 < 1.5초 | Bedrock metrics |
| **Page Load Time** | FCP < 1.5초 | Lighthouse CI |
| **Bundle Size Increase** | < 50KB gzipped | Next.js bundle analyzer |

### Scalability

- **Concurrent Users**: 50 (현재), 200 (1년 후)
- **Daily Searches**: 500 (현재), 2000 (1년 후)
- **Table Count**: 550 → 1000+ (점진적 증가)
- **Vector DB**: 10,000 embeddings (550 tables × 3 layers × 예비)

### Reliability

- **Uptime**: 99.5% (기존 앱과 동일)
- **Error Rate**: < 1% (검색 실패율)
- **Fallback**: Bedrock 장애 시 cached results 제공
- **Data Freshness**: 테이블 메타데이터 최대 24시간 지연 허용

### Security

- **Authentication**: 기존 앱의 인증 시스템 재사용
- **Authorization**: Role-based access (analyst, admin)
- **Data Privacy**: 
  - 검색 로그는 30일 후 자동 삭제
  - 개인 식별 정보 마스킹
  - Bedrock는 데이터 저장 안 함 (AWS 정책)
- **API Keys**: AWS Secrets Manager 사용

### Compliance

- **GDPR**: 사용자 데이터 삭제 요청 지원
- **SOC 2**: 로그 감사 추적 가능
- **Data Residency**: AWS region 설정 준수

---

## 📅 Implementation Plan

### Phase 1: MVP (2주)

**Week 1: Infrastructure**
- [ ] Amazon Bedrock 연결 설정 및 테스트
- [ ] Vercel Postgres + pgvector 스키마 생성
- [ ] Voyage AI 임베딩 파이프라인 구축
- [ ] 기존 Snowflake 연결 통합

**Week 2: Core Features**
- [ ] Intent Parser Agent 구현
- [ ] Vector search 로직 구현
- [ ] 기본 UI 컴포넌트 개발
- [ ] API routes 구현

**Deliverables**
- 최소 50개 테이블에 대한 검색 동작
- 기본 UI (검색창 + 결과 리스트)
- Splunk 용어 검색 지원

### Phase 2: Enhancement (2주)

**Week 3: Advanced Features**
- [ ] 550개 전체 테이블 임베딩
- [ ] SQL 생성 기능
- [ ] 필드 매핑 UI
- [ ] 피드백 시스템

**Week 4: Polish & Testing**
- [ ] 성능 최적화
- [ ] 에러 핸들링 개선
- [ ] E2E 테스트 작성
- [ ] Documentation

**Deliverables**
- 프로덕션 레디 기능
- 사용자 가이드 문서
- 운영 매뉴얼

### Phase 3: Post-Launch (계속)

- [ ] 사용자 피드백 수집 및 분석
- [ ] 검색 품질 모니터링
- [ ] A/B 테스트 (모델 선택, 프롬프트 튜닝)
- [ ] Slack 통합 (future)

---

## 🔒 Security & Privacy

### Data Handling

```
┌─────────────────────────────────────────────────┐
│ Data Classification                             │
├─────────────────────────────────────────────────┤
│ Public       : 테이블 스키마, 컬럼명             │
│ Internal     : Splunk 매핑 정보                  │
│ Confidential : 검색 로그 (일부 민감 쿼리 포함)    │
│ Restricted   : AWS credentials                   │
└─────────────────────────────────────────────────┘
```

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **SQL Injection** | 파라미터화된 쿼리, ORM 사용 |
| **Prompt Injection** | Input sanitization, system prompt 보호 |
| **Data Leakage** | Bedrock는 학습에 사용 안 함 (AWS 보장) |
| **Excessive Costs** | Rate limiting, budget alerts |
| **Unauthorized Access** | 기존 RBAC 시스템 통합 |

---

## 💰 Cost Analysis

### Estimated Monthly Costs (100 users, 50 searches/day)

| Component | Usage | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| **Bedrock Haiku** | 1M input tokens | $0.25/1M | $0.25 |
| **Bedrock Sonnet** | 500K tokens | $3/1M | $1.50 |
| **Voyage AI** | 10K embed calls | $0.12/1K | $1.20 |
| **Vercel Postgres** | Storage + queries | Included | $0 |
| **Vercel Hosting** | Edge functions | Included | $0 |
| **Total** | | | **~$3/month** |

### Cost Optimization

- Haiku 우선 사용 (Sonnet은 복잡한 쿼리만)
- 임베딩 캐싱 (중복 방지)
- Rate limiting per user (10 searches/min)
- Bedrock batch inference (future)

---

## 🚨 Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Bedrock 할당량 초과** | Low | High | Quota increase 요청, fallback to cached |
| **Vector search 느림** | Medium | Medium | HNSW 인덱스 최적화, 캐싱 |
| **LLM 환각 (hallucination)** | Medium | High | 검증 로직 추가, 신뢰도 점수 표시 |
| **기존 앱과 충돌** | Low | High | Feature flag, 점진적 배포 |

### Business Risks

| Risk | Mitigation |
|------|-----------|
| **사용자 채택 낮음** | 조기 사용자 피드백, 교육 세션 |
| **데이터 품질 문제** | Splunk 매핑 테이블 검증 프로세스 |
| **운영 부담 증가** | 자동화된 모니터링, 알림 |

---

## 📐 Dependencies

### Internal Dependencies

- **Snowflake Connection**: 기존 연결 정보 재사용
- **Auth System**: 기존 인증/인가 시스템 통합
- **Component Library**: 기존 React 컴포넌트 활용
- **CI/CD Pipeline**: 기존 배포 프로세스 사용

### External Dependencies

| Dependency | Version | Purpose | Risk |
|------------|---------|---------|------|
| Vercel AI SDK | 5.0+ | Agent framework | Low (stable) |
| Amazon Bedrock | - | LLM inference | Low (managed) |
| Voyage AI | 3.5 | Embeddings | Medium (third-party) |
| pgvector | 0.5+ | Vector search | Low (mature) |

### Data Dependencies

- **Splunk Mapping Table**: 초기 데이터 입력 필요 (수동 또는 반자동)
- **Snowflake Metadata**: Information Schema 접근 권한
- **Historical Queries**: Splunk 저장된 쿼리 export (optional)

---

## 🔮 Future Enhancements

### Post-MVP Features (Phase 3+)

1. **Slack Bot 통합**
   - `/find-table index=web_logs` 명령어
   - DM으로 결과 전송

2. **쿼리 자동 변환**
   - SPL → SQL 완전 자동 변환
   - 복잡한 aggregation 지원

3. **학습 시스템**
   - 사용자 피드백으로 재학습
   - 자주 검색되는 패턴 우선순위

4. **시각화**
   - 테이블 관계 그래프
   - 데이터 lineage 추적

5. **멀티 DB 지원**
   - BigQuery, Databricks 추가
   - Cross-platform 검색

---

## 📊 Monitoring & Observability

### Metrics to Track

**Business Metrics**
- Daily Active Users
- Searches per user
- Search success rate
- Selected table distribution
- User satisfaction (CSAT)

**Technical Metrics**
- API response time (P50, P95, P99)
- LLM latency
- Vector search latency
- Error rate by endpoint
- Bedrock token usage

**Data Quality Metrics**
- Embedding freshness
- Mapping completeness
- Sync success rate

### Dashboards

```
┌─────────────────────────────────────────────────┐
│ Table Finder - Operations Dashboard            │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔍 Search Metrics (Last 7 days)                │
│  ├─ Total Searches: 2,450                       │
│  ├─ Success Rate: 87% ▲ 2%                      │
│  └─ Avg Response Time: 1.8s ▼ 0.3s              │
│                                                 │
│  💰 Cost (This Month)                           │
│  ├─ Bedrock: $2.15 / $10 budget                 │
│  └─ Voyage AI: $0.85                            │
│                                                 │
│  ⚠️  Alerts                                      │
│  └─ [2h ago] Sync job failed for 5 tables       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Alerting

- Search error rate > 5% → Slack #data-alerts
- Response time P95 > 3초 → PagerDuty
- Bedrock quota > 80% → Email to ops
- Sync failure → Slack #data-ops

---

## ✅ Acceptance Criteria

### Definition of Done

- [ ] 기능이 기존 Next.js 앱에 통합됨
- [ ] 550개 테이블 모두 임베딩 완료
- [ ] Splunk 쿼리 검색 성공률 > 80%
- [ ] P95 응답 시간 < 2초
- [ ] Unit test coverage > 70%
- [ ] E2E test 통과
- [ ] Security review 통과
- [ ] Documentation 완료
- [ ] Staging 환경 배포 및 검증
- [ ] 5명 이상 beta 테스트 완료

### Launch Checklist

**Pre-Launch**
- [ ] Feature flag 설정 (`ENABLE_TABLE_SEARCH=true`)
- [ ] Bedrock quota increase 승인
- [ ] Monitoring dashboard 구성
- [ ] Rollback plan 준비
- [ ] User guide 작성

**Launch Day**
- [ ] 10% 트래픽으로 canary 배포
- [ ] 메트릭 모니터링 (1시간)
- [ ] 100% 트래픽으로 확대
- [ ] Slack announcement

**Post-Launch (1주)**
- [ ] Daily metrics review
- [ ] User feedback 수집
- [ ] Bug fix 배포
- [ ] Retrospective 회의

---

## 📚 Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **SPL** | Splunk Processing Language - Splunk 쿼리 언어 |
| **Index** | Splunk의 데이터 저장소 단위 |
| **Sourcetype** | Splunk의 데이터 타입 분류 |
| **pgvector** | PostgreSQL vector extension |
| **HNSW** | Hierarchical Navigable Small World - 벡터 인덱싱 알고리즘 |
| **Embedding** | 텍스트의 벡터 표현 (1024-dim) |

### B. References

- [Vercel AI SDK 5.0 Docs](https://sdk.vercel.ai)
- [Amazon Bedrock Developer Guide](https://docs.aws.amazon.com/bedrock/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Voyage AI API Reference](https://docs.voyageai.com)

### C. Open Questions

1. **Splunk 매핑 데이터 품질**: 누가 초기 데이터를 입력/검증하나?
   - **Action**: 데이터 팀과 협의 필요

2. **Multi-tenancy**: 여러 팀이 다른 Snowflake 스키마 사용 시?
   - **Action**: Phase 2에서 고려

3. **Real-time vs Batch**: 테이블 변경 감지를 실시간으로?
   - **Decision**: 초기에는 일일 배치, 향후 CDC 고려

---

## 📝 Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Product Owner** | | | |
| **Engineering Lead** | | | |
| **Data Team Lead** | | | |
| **Security Officer** | | | |

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-09 | Engineering | Initial draft |

---

**Next Steps**

1. ✅ PRD Review 회의 스케줄 (이해관계자)
2. ⏳ Technical spike: Bedrock integration (2일)
3. ⏳ Design mockup 작성 (디자이너)
4. ⏳ Sprint planning (팀 전체)

---

*End of Document*
