# Product Requirements Document
## OpenTelemetry + ClickHouse AI Observability Platform 구축

---

| 항목 | 내용 |
|-----|------|
| **문서 버전** | 1.0 |
| **작성일** | 2024년 12월 |
| **프로젝트 코드** | AI-OBS-2024 |
| **상태** | Draft → Review |

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Background & Problem Statement](#2-background--problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Technical Specifications](#4-technical-specifications)
5. [Implementation Plan](#5-implementation-plan)
6. [Success Metrics & KPIs](#6-success-metrics--kpis)
7. [Risks & Mitigations](#7-risks--mitigations)
8. [Resource Requirements](#8-resource-requirements)
9. [Dependencies & Assumptions](#9-dependencies--assumptions)
10. [Appendix](#10-appendix)

---

## 1. Executive Summary

### 1.1 프로젝트 개요

본 프로젝트는 OpenTelemetry 표준과 ClickHouse 분석 데이터베이스를 기반으로 한 AI Observability 플랫폼 구축을 목표로 합니다. Vercel AI SDK의 telemetry 기능을 활용하여 LLM 호출에 대한 상세 메트릭을 수집하고, 기존 SOC 이벤트 및 시스템 로그와 통합하여 통합 분석 환경을 제공합니다.

### 1.2 핵심 목표

- AI/LLM 서비스의 실시간 성능 모니터링 및 비용 추적
- SOC 이벤트와 AI 메트릭의 통합 분석 환경 구축
- PostgreSQL 분석 워크로드의 ClickHouse 마이그레이션으로 성능 개선
- 벤더 중립적 OpenTelemetry 표준 채택으로 미래 확장성 확보
- Next.js 기반 통합 대시보드 구축

### 1.3 기대 효과

| 영역 | 현재 상태 | 목표 상태 |
|-----|----------|----------|
| 쿼리 성능 | 30초+ (PostgreSQL) | < 3초 (ClickHouse) |
| 데이터 압축률 | 2-3x | 10-20x |
| AI 비용 가시성 | 수동 집계 | 실시간 대시보드 |
| 데이터 삽입 | 수천/초 | 수백만/초 |

---

## 2. Background & Problem Statement

### 2.1 현재 아키텍처

현재 시스템은 PostgreSQL을 중심으로 SOC 이벤트, 메시지 저장, AI 호출 로그를 처리하고 있으며, Elasticsearch를 벡터 검색 용도로 활용하고 있습니다.

| 구성요소 | 현재 용도 | 문제점 |
|---------|----------|--------|
| PostgreSQL | SOC 이벤트, 메시지, AI 로그 | 대용량 집계 쿼리 성능 저하 |
| Elasticsearch | 벡터 검색, 전문 검색 | 높은 스토리지 비용, 집계 성능 |
| AI 메트릭 | 수동 로깅 또는 미수집 | 비용/성능 가시성 부재 |

### 2.2 해결해야 할 문제

1. **분석 쿼리 성능:** PostgreSQL에서 SOC 이벤트 집계 시 30초 이상 소요
2. **AI 비용 추적:** LLM 호출별 토큰 사용량, 비용, 레이턴시 추적 불가
3. **스토리지 효율:** 시계열 데이터의 비효율적 저장 및 높은 비용
4. **통합 가시성:** AI 메트릭과 SOC 이벤트의 분리된 모니터링
5. **확장성:** 데이터 증가에 따른 PostgreSQL 확장 한계

---

## 3. Solution Architecture

### 3.1 목표 아키텍처 개요

하이브리드 아키텍처를 채택하여 PostgreSQL(OLTP)과 ClickHouse(OLAP)를 역할에 맞게 분리 운영합니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           데이터 플로우                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Application (Vercel AI SDK)                                            │
│         │                                                               │
│         │ experimental_telemetry: { isEnabled: true }                   │
│         ▼                                                               │
│  OpenTelemetry SDK                                                      │
│         │                                                               │
│         │ OTLP (gRPC/HTTP)                                              │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    OTel Collector                                │   │
│  │                 (수집 → 변환 → 라우팅)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      ClickHouse                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ ai_traces   │  │ soc_events  │  │ app_logs    │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 Next.js Dashboard App                            │   │
│  │         (@clickhouse/client → API Routes → React UI)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 컴포넌트 역할 분담

| 컴포넌트 | 역할 | 저장 데이터 |
|---------|------|------------|
| ClickHouse | OLAP 분석, 시계열 집계, 대시보드 쿼리 | AI Traces, SOC Events, Logs, Metrics |
| PostgreSQL | OLTP 트랜잭션, 관계형 데이터 | Users, Settings, Workflows, Metadata |
| OTel Collector | 텔레메트리 수집, 변환, 라우팅 | N/A (Pass-through) |
| Elasticsearch | 벡터 검색 (기존 유지 또는 pgvector 전환) | Embeddings, Full-text Index |

### 3.3 ClickHouse 배포 옵션

| 옵션 | 장점 | 단점 | 예상 비용 |
|-----|------|------|----------|
| **ClickHouse Cloud** | 완전 관리형, 자동 스케일링 | 데이터 외부 저장 | $500-2,000/월 |
| **EKS Self-Hosted** | 완전한 제어, 데이터 주권 | 운영 부담 높음 | $800-1,500/월 + 인력 |
| **ClickHouse BYOC** | 데이터는 자사 VPC, 관리형 | 비용 다소 높음 | $1,000-3,000/월 |

> **권장:** 초기에는 ClickHouse Cloud (AWS Marketplace)로 빠른 검증 후, 필요시 BYOC 또는 Self-Hosted 전환

---

## 4. Technical Specifications

### 4.1 OpenTelemetry 통합

#### 4.1.1 Vercel AI SDK 설정

Vercel AI SDK의 `experimental_telemetry` 옵션을 활성화하여 LLM 호출 시 자동으로 OpenTelemetry span을 생성합니다.

```typescript
// AI SDK Configuration
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: userMessage,
  experimental_telemetry: { 
    isEnabled: true,
    metadata: {
      userId: user.id,
      sessionId: session.id
    }
  }
});
```

#### 4.1.2 OpenTelemetry SDK 초기화

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

export function register() {
  const sdk = new NodeSDK({
    resource: new Resource({
      'service.name': 'ai-observability-app',
      'service.version': '1.0.0',
      'deployment.environment': process.env.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
  });
  
  sdk.start();
}
```

#### 4.1.3 수집되는 AI 메트릭

| Attribute | 설명 | 예시 값 |
|-----------|------|--------|
| `ai.model.id` | 사용된 AI 모델 | gpt-4o, claude-3-5-sonnet |
| `ai.usage.promptTokens` | 입력 토큰 수 | 1500 |
| `ai.usage.completionTokens` | 출력 토큰 수 | 800 |
| `ai.response.finishReason` | 완료 사유 | stop, length, tool-calls |
| `Duration` | 응답 시간 (ms) | 2500 |

### 4.2 OTel Collector 설정

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000
  
  # 민감 정보 마스킹
  transform:
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["ai.prompt"], "Bearer [^\\s]+", "Bearer ***")
          - replace_pattern(attributes["ai.prompt"], "\\b\\d{3}-\\d{2}-\\d{4}\\b", "***-**-****")

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: otel
    username: default
    password: ${CLICKHOUSE_PASSWORD}
    traces_table_name: otel_traces
    ttl: 90d

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, transform]
      exporters: [clickhouse]
```

### 4.3 ClickHouse 스키마 설계

#### 4.3.1 AI Traces 테이블

```sql
CREATE TABLE ai_traces (
    -- 시간/식별
    timestamp DateTime64(3),
    trace_id String,
    span_id String,
    parent_span_id String,
    
    -- AI 메트릭
    model LowCardinality(String),
    prompt_tokens UInt32,
    completion_tokens UInt32,
    total_tokens UInt32 MATERIALIZED prompt_tokens + completion_tokens,
    duration_ms UInt32,
    
    -- 비용 계산 (Materialized)
    cost_usd Decimal(10, 6) MATERIALIZED 
        multiIf(
            model = 'gpt-4o', prompt_tokens * 0.0025 / 1000 + completion_tokens * 0.01 / 1000,
            model = 'gpt-4o-mini', prompt_tokens * 0.00015 / 1000 + completion_tokens * 0.0006 / 1000,
            model = 'claude-3-5-sonnet', prompt_tokens * 0.003 / 1000 + completion_tokens * 0.015 / 1000,
            0
        ),
    
    -- 컨텍스트
    user_id String,
    session_id String,
    
    -- 상태
    status LowCardinality(String),
    error_message Nullable(String),
    
    -- 메타데이터
    service_name LowCardinality(String),
    environment LowCardinality(String)
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (model, timestamp, trace_id)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

#### 4.3.2 SOC Events 테이블

```sql
CREATE TABLE soc_events (
    -- 시간/식별
    timestamp DateTime64(3),
    event_id UUID,
    
    -- 이벤트 분류
    event_type LowCardinality(String),      -- 'alert', 'incident', 'log'
    severity LowCardinality(String),         -- 'critical', 'high', 'medium', 'low'
    category LowCardinality(String),         -- 'malware', 'intrusion', 'policy'
    
    -- 소스 정보
    source_ip IPv4,
    source_port UInt16,
    dest_ip IPv4,
    dest_port UInt16,
    
    -- 컨텍스트
    user_id String,
    asset_id String,
    rule_id LowCardinality(String),
    
    -- 상세 데이터
    raw_event String,
    enrichment JSON,
    
    -- AI 분석 결과 (있는 경우)
    ai_analysis Nullable(String),
    ai_confidence Nullable(Float32),
    ai_model_id Nullable(LowCardinality(String))
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, severity, timestamp, event_id)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

#### 4.3.3 Materialized View (실시간 집계)

```sql
-- 시간별 AI 메트릭 집계
CREATE MATERIALIZED VIEW ai_metrics_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (model, hour)
AS SELECT
    toStartOfHour(timestamp) as hour,
    model,
    count() as request_count,
    sum(prompt_tokens) as total_prompt_tokens,
    sum(completion_tokens) as total_completion_tokens,
    sum(cost_usd) as total_cost,
    avg(duration_ms) as avg_duration_ms,
    quantile(0.95)(duration_ms) as p95_duration_ms,
    countIf(status = 'ERROR') as error_count
FROM ai_traces
GROUP BY hour, model;

-- 시간별 SOC 이벤트 집계
CREATE MATERIALIZED VIEW soc_events_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (event_type, severity, hour)
AS SELECT
    toStartOfHour(timestamp) as hour,
    event_type,
    severity,
    count() as event_count,
    uniqExact(source_ip) as unique_sources,
    uniqExact(user_id) as unique_users
FROM soc_events
GROUP BY hour, event_type, severity;
```

### 4.4 Next.js 연동

#### 4.4.1 ClickHouse 클라이언트 설정

```typescript
// lib/clickhouse.ts
import { createClient } from '@clickhouse/client';

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD,
  database: 'otel',
});

// 타입 정의
export interface AITrace {
  trace_id: string;
  timestamp: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  duration_ms: number;
  cost_usd: number;
  user_id: string;
  status: string;
}

export interface AIMetricsHourly {
  hour: string;
  model: string;
  request_count: number;
  total_cost: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  error_count: number;
}
```

#### 4.4.2 API Route 예시

```typescript
// app/api/metrics/ai/daily/route.ts
import { NextResponse } from 'next/server';
import { clickhouse, AIMetricsHourly } from '@/lib/clickhouse';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');

  const result = await clickhouse.query({
    query: `
      SELECT
        toDate(hour) as date,
        model,
        sum(request_count) as request_count,
        sum(total_cost) as total_cost,
        avg(avg_duration_ms) as avg_duration_ms,
        max(p95_duration_ms) as p95_duration_ms,
        sum(error_count) as error_count
      FROM ai_metrics_hourly
      WHERE hour >= now() - INTERVAL {days:UInt32} DAY
      GROUP BY date, model
      ORDER BY date DESC, total_cost DESC
    `,
    query_params: { days },
    format: 'JSONEachRow'
  });

  const data = await result.json();
  return NextResponse.json(data);
}
```

---

## 5. Implementation Plan

### 5.1 Phase 1: Foundation (Week 1-4)

**목표:** AI Telemetry 수집 및 기본 대시보드 구축

| 주차 | 작업 내용 | 산출물 |
|-----|----------|--------|
| Week 1 | ClickHouse Cloud 설정, 스키마 생성 | ClickHouse 인스턴스 |
| Week 2 | OTel Collector 배포, AI SDK 연동 | Telemetry 파이프라인 |
| Week 3 | Next.js API Routes 구현 | Metrics API |
| Week 4 | 기본 대시보드 UI 개발 | AI 비용/성능 대시보드 |

**Phase 1 완료 기준:**
- [ ] ClickHouse Cloud 인스턴스 운영 중
- [ ] AI SDK telemetry → ClickHouse 데이터 흐름 확인
- [ ] 기본 대시보드에서 일별 토큰 사용량, 비용 확인 가능

### 5.2 Phase 2: Integration (Week 5-8)

**목표:** SOC 이벤트 통합 및 Dual-Write 구현

| 주차 | 작업 내용 | 산출물 |
|-----|----------|--------|
| Week 5 | SOC 이벤트 스키마 설계, Dual-Write 구현 | SOC 테이블, Writer 로직 |
| Week 6 | PostgreSQL → ClickHouse 분석 쿼리 이전 | 마이그레이션 스크립트 |
| Week 7 | Materialized View 구성 (실시간 집계) | hourly/daily 집계 뷰 |
| Week 8 | SOC 대시보드 통합, 알럿 설정 | 통합 대시보드, Alert 규칙 |

**Phase 2 완료 기준:**
- [ ] SOC 이벤트가 PostgreSQL + ClickHouse 동시 저장
- [ ] 분석 쿼리가 ClickHouse에서 < 5초 내 응답
- [ ] SOC 대시보드에서 실시간 이벤트 현황 확인 가능

### 5.3 Phase 3: Optimization (Week 9-12)

**목표:** 성능 최적화 및 운영 안정화

| 주차 | 작업 내용 | 산출물 |
|-----|----------|--------|
| Week 9-10 | 쿼리 성능 튜닝, 인덱스 최적화 | 성능 벤치마크 리포트 |
| Week 11 | PostgreSQL 분석 쿼리 완전 이전 | 마이그레이션 완료 |
| Week 12 | 운영 문서화, 팀 교육 | 운영 매뉴얼, 교육 자료 |

**Phase 3 완료 기준:**
- [ ] 모든 분석 쿼리가 ClickHouse로 이전
- [ ] 쿼리 응답 시간 < 3초 달성
- [ ] 운영 매뉴얼 및 트러블슈팅 가이드 완성

---

## 6. Success Metrics & KPIs

### 6.1 Technical KPIs

| Metric | 현재 Baseline | Target | 측정 주기 |
|--------|--------------|--------|----------|
| 집계 쿼리 응답 시간 | 30+ 초 | < 3초 | 일간 |
| 데이터 삽입 처리량 | 1,000 rows/sec | 100,000+ rows/sec | 일간 |
| 스토리지 압축률 | 2-3x | 10-20x | 월간 |
| 시스템 가용성 | - | 99.9% | 월간 |
| 데이터 지연 (Ingestion Lag) | - | < 5초 | 실시간 |

### 6.2 Business KPIs

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| AI 비용 가시성 | 실시간 모델별 비용 추적 | 대시보드 완성도 |
| 인시던트 대응 시간 | MTTR 30% 감소 | SOC 이벤트 로그 |
| 인프라 비용 절감 | 스토리지 비용 50% 절감 | AWS 빌링 비교 |
| 팀 생산성 | 분석 쿼리 작성 시간 50% 감소 | 개발자 서베이 |

---

## 7. Risks & Mitigations

| 리스크 | 영향도 | 완화 전략 | 담당 |
|--------|-------|----------|------|
| ClickHouse 학습 곡선 | Medium | 교육 세션, 문서화, PoC 진행 | Tech Lead |
| 데이터 마이그레이션 복잡성 | High | Dual-Write로 점진적 전환 | Data Engineer |
| OTel Collector 운영 부담 | Medium | Managed 서비스 검토 (Grafana Cloud) | DevOps |
| 기존 PostgreSQL 의존성 | Low | PostgreSQL은 OLTP용으로 유지 | Backend |
| 비용 초과 | Medium | ClickHouse Cloud 사용량 모니터링, 알럿 설정 | PM |
| 데이터 정합성 | High | Dual-Write 기간 중 검증 쿼리 실행 | Data Engineer |

---

## 8. Resource Requirements

### 8.1 인력

| 역할 | 투입 기간 | 주요 책임 |
|-----|----------|----------|
| Tech Lead | 12주 (50%) | 아키텍처 설계, 기술 의사결정 |
| Backend Engineer | 12주 (100%) | OTel 통합, API 개발, 스키마 설계 |
| Frontend Engineer | 8주 (100%) | 대시보드 UI 개발 |
| DevOps Engineer | 8주 (50%) | 인프라 구성, 모니터링 설정 |

### 8.2 인프라 비용 (월간 예상)

| 항목 | Phase 1-2 | Phase 3+ |
|-----|-----------|----------|
| ClickHouse Cloud | $500-1,000 | $1,000-2,000 |
| OTel Collector (EKS) | $100-200 | $200-300 |
| 네트워크/데이터 전송 | $50-100 | $100-200 |
| **Total** | **$650-1,300** | **$1,300-2,500** |

### 8.3 도구 및 라이선스

| 도구 | 용도 | 비용 |
|-----|------|------|
| ClickHouse Cloud | 분석 데이터베이스 | 사용량 기반 |
| Grafana Cloud (선택) | 대시보드/알럿 | Free tier 가능 |
| Vercel | Next.js 호스팅 | Pro $20/월 |
| GitHub Actions | CI/CD | 포함 |

---

## 9. Dependencies & Assumptions

### 9.1 기술적 의존성

- **Vercel AI SDK v3.0+** (experimental_telemetry 지원)
- **Next.js 14+** (App Router, Server Components)
- **OpenTelemetry JS SDK 1.x**
- **@clickhouse/client** (공식 Node.js 클라이언트)
- **AWS EKS** (OTel Collector 배포용)

### 9.2 가정 사항

- 기존 PostgreSQL 데이터베이스는 OLTP 워크로드용으로 유지
- Elasticsearch 벡터 검색은 당분간 현행 유지 (추후 pgvector 검토)
- AI/LLM 호출량이 월간 10만 건 이상으로 증가할 것으로 예상
- 팀 내 SQL 작성 역량 보유 (ClickHouse SQL 학습 용이)
- AWS 환경에서 운영 (EKS, RDS, S3 활용 가능)

### 9.3 외부 의존성

- OpenAI / Anthropic API 가용성
- ClickHouse Cloud 서비스 안정성
- AWS 리전 가용성 (ap-northeast-2 권장)

---

## 10. Appendix

### 10.1 ClickHouse SQL vs PostgreSQL 주요 차이점

| 항목 | PostgreSQL | ClickHouse |
|-----|------------|------------|
| 테이블 생성 | `CREATE TABLE t (id INT)` | `CREATE TABLE t (...) ENGINE=MergeTree() ORDER BY (...)` |
| 데이터 타입 | INTEGER, BIGINT, VARCHAR | Int32, UInt64, String, LowCardinality |
| 함수 대소문자 | Case-insensitive | Case-sensitive (`count()` ✓, `COUNT()` ✗) |
| UPDATE/DELETE | 즉시 실행, 빈번한 사용 가능 | `ALTER TABLE ... UPDATE/DELETE`, 드물게 사용 |
| 인덱스 | B-tree, GIN, GiST | Primary key 기반 sparse index |
| 트랜잭션 | Full ACID | 제한적 (Append-only 최적화) |

### 10.2 자주 사용하는 ClickHouse 쿼리 패턴

```sql
-- 최근 24시간 AI 비용 요약
SELECT
    model,
    count() as requests,
    sum(total_tokens) as tokens,
    sum(cost_usd) as cost,
    avg(duration_ms) as avg_latency
FROM ai_traces
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY model
ORDER BY cost DESC;

-- P95 레이턴시 추이
SELECT
    toStartOfHour(timestamp) as hour,
    model,
    quantile(0.95)(duration_ms) as p95_ms
FROM ai_traces
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY hour, model
ORDER BY hour DESC;

-- SOC 이벤트 심각도별 트렌드
SELECT
    toStartOfDay(timestamp) as day,
    severity,
    count() as events,
    uniqExact(source_ip) as unique_sources
FROM soc_events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY day, severity
ORDER BY day DESC, events DESC;
```

### 10.3 참고 자료

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs)
- [Vercel AI SDK Telemetry](https://sdk.vercel.ai/docs/ai-sdk-core/telemetry)
- [@clickhouse/client GitHub](https://github.com/ClickHouse/clickhouse-js)
- [Moose OLAP (ClickHouse ORM)](https://docs.fiveonefour.com/moose/olap)
- [ClickHouse for Observability](https://clickhouse.com/use-cases/observability)

### 10.4 용어 정의

| 용어 | 정의 |
|-----|------|
| **OLAP** | Online Analytical Processing - 대량 데이터 분석 워크로드 |
| **OLTP** | Online Transaction Processing - 트랜잭션 처리 워크로드 |
| **OTel** | OpenTelemetry의 약어 |
| **Span** | 분산 트레이싱의 단위 작업 |
| **Trace** | 관련된 Span들의 집합 |
| **Materialized View** | 미리 계산된 결과를 저장하는 뷰 |
| **Dual-Write** | 두 개의 데이터 저장소에 동시에 쓰는 패턴 |

---

## 승인

| 역할 | 이름 | 서명 / 날짜 |
|-----|------|------------|
| Product Owner | | |
| Tech Lead | | |
| Engineering Manager | | |

---

*— End of Document —*
