# Text-to-SQL 시스템 PRD (Product Requirements Document)

> **문서 버전**: 1.0  
> **작성일**: 2024년 11월  
> **목적**: Claude Code와 협업하여 Text-to-SQL 시스템 구축

---

## 1. 프로젝트 개요

### 1.1 배경
사용자가 자연어로 데이터베이스를 조회할 수 있는 Text-to-SQL 시스템을 구축한다. 50개 이상의 테이블이 존재하는 환경에서 사용자의 질문(예: "akamai 로그는 어디서 조회해야돼?")을 받아 적절한 테이블을 찾고, 정확한 SQL 쿼리를 생성하는 것이 목표이다.

### 1.2 핵심 목표
- **정확도 우선**: 복잡한 JOIN 쿼리 포함 80-85% 이상의 SQL 생성 정확도
- **2단계 워크플로우**: 관련 테이블 검색 → 컬럼 정보 기반 SQL 생성
- **자동화된 메타데이터 관리**: 테이블 설명, 컬럼 정보, 샘플 데이터 자동 생성

### 1.3 성공 지표 (KPIs)
| 지표 | 목표값 | 측정 방법 |
|-----|-------|----------|
| SQL 생성 정확도 | ≥ 80% | 실행 성공 + 결과 검증 |
| 테이블 검색 정확도 | ≥ 90% | 관련 테이블 포함 여부 |
| 평균 응답 시간 | < 5초 | 질문 → SQL 생성 완료 |
| 자기 수정 성공률 | ≥ 70% | 재시도 후 성공 비율 |

---

## 2. 기술 스택

### 2.1 인프라 환경
```
┌─────────────────────────────────────────────────────────────┐
│                        기술 스택                             │
├─────────────────────────────────────────────────────────────┤
│  프레임워크      │ Next.js 15 (App Router)                   │
│  AI 통합        │ Vercel AI SDK (@ai-sdk/amazon-bedrock)    │
│  클라우드       │ Amazon Bedrock                            │
│  벡터 DB       │ Neon PostgreSQL + pgvector                 │
│  배포          │ Vercel                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 AI 모델 구성
| 용도 | 모델 | Model ID | 선택 이유 |
|-----|------|----------|----------|
| **임베딩** | Cohere Embed v4 | `cohere.embed-v4:0` | 128K 컨텍스트, 비대칭 검색, 100+ 언어 지원 |
| **테이블 선택** | Claude 3.5 Haiku | `anthropic.claude-3-5-haiku-20241022-v1:0` | 빠른 응답, 저비용, 라우팅에 적합 |
| **SQL 생성** | Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | 높은 정확도, 복잡한 쿼리 처리 |

### 2.3 Cohere Embed v4 선택 근거
| 특성 | Amazon Titan v2 | Cohere Embed v4 | 선택 |
|-----|----------------|-----------------|------|
| 컨텍스트 길이 | ~8K 토큰 | **128K 토큰** | ✅ Cohere |
| 멀티모달 | ❌ | ✅ | ✅ Cohere |
| 다국어 | 25+ | **100+ (한국어 포함)** | ✅ Cohere |
| 비대칭 검색 (`input_type`) | ❌ | ✅ | ✅ Cohere |
| RAG 벤치마크 성능 | 양호 | **우수** | ✅ Cohere |

---

## 3. 시스템 아키텍처

### 3.1 전체 아키텍처 다이어그램
```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE / SERVERLESS                      │
├──────────────────────────────────────────────────────────────────────┤
│  Next.js 15 App                                                       │
│  ┌─────────────────┐    ┌──────────────────┐                         │
│  │  Server Action  │───▶│  Pipeline        │                         │
│  │  /api/sql       │    │  Orchestrator    │                         │
│  └─────────────────┘    └────────┬─────────┘                         │
│                                  │                                    │
│         ┌────────────────────────┼────────────────────────┐          │
│         ▼                        ▼                        ▼          │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐     │
│  │ Stage 1:    │         │ Stage 2:    │         │ Stage 3:    │     │
│  │ 테이블      │         │ SQL         │         │ 검증 &      │     │
│  │ 선택(Haiku) │         │ 생성(Sonnet)│         │ 실행        │     │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘     │
└─────────┼────────────────────────┼────────────────────────┼──────────┘
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  NEON           │    │  AMAZON BEDROCK     │    │  TARGET DB      │
│  (pgvector)     │    │                     │    │                 │
│  ─────────────  │    │  Cohere Embed v4    │    │  PostgreSQL/    │
│  • 스키마       │    │  Claude Haiku       │    │  Snowflake/     │
│    임베딩       │    │  Claude Sonnet      │    │  기타           │
│  • 퓨샷 예제    │    │                     │    │                 │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
```

### 3.2 요청 처리 워크플로우
```
사용자: "akamai 로그는 어디서 조회해야돼?"
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 1: 사용자 질문 임베딩                                     │
│   • 모델: Cohere Embed v4                                     │
│   • input_type: 'search_query'                                │
│   • 출력: 768/1536차원 벡터                                    │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 2: 벡터 유사도 검색                                       │
│   • Vector DB (Neon + pgvector)                               │
│   • 코사인 유사도 기반 상위 10개 테이블 검색                     │
│   • LLM 호출 없음 (빠름)                                       │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 3: 테이블 선택 정제                                       │
│   • 모델: Claude Haiku                                        │
│   • 입력: 후보 테이블 목록 + 사용자 질문                        │
│   • 출력: 최종 선택 테이블 + 필요 컬럼                          │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 4: SQL 생성                                              │
│   • 모델: Claude Sonnet                                       │
│   • 입력: 선택된 테이블 스키마 + 샘플 데이터 + 퓨샷 예제         │
│   • 출력: SQL 쿼리 + 설명                                      │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 5: 검증 & 자기 수정 (최대 3회)                            │
│   • 구문 검증 → 스키마 참조 검증 → 실행 검증                    │
│   • 실패 시 오류 메시지와 함께 재생성 요청                       │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
        최종 SQL + 실행 결과 반환
```

---

## 4. 프로젝트 구조

### 4.1 디렉토리 구조
```
project-root/
├── app/
│   ├── api/
│   │   └── sql/
│   │       └── route.ts              # SQL 생성 API 엔드포인트
│   ├── chat/
│   │   └── page.tsx                  # 채팅 UI
│   └── layout.tsx
│
├── lib/
│   ├── ai/
│   │   ├── bedrock.ts                # Bedrock 클라이언트 설정
│   │   ├── table-selector.ts         # Stage 1: 테이블 선택 (Haiku)
│   │   ├── sql-generator.ts          # Stage 2: SQL 생성 (Sonnet)
│   │   └── query-classifier.ts       # 쿼리 복잡도 분류
│   │
│   ├── embeddings/
│   │   ├── cohere-embed.ts           # Cohere Embed v4 클라이언트
│   │   └── search.ts                 # 벡터 검색 로직
│   │
│   ├── metadata/
│   │   ├── extractor.ts              # DB에서 메타데이터 추출
│   │   ├── enricher.ts               # LLM으로 설명 생성
│   │   ├── masking.ts                # 민감 데이터 마스킹
│   │   ├── formatter.ts              # 최종 포맷 변환
│   │   └── store.ts                  # 벡터 DB 저장
│   │
│   ├── validation/
│   │   ├── sql-validator.ts          # SQL 구문 검증
│   │   └── semantic-validator.ts     # 의미론적 검증
│   │
│   ├── db/
│   │   ├── neon.ts                   # Neon 연결 설정
│   │   ├── schema-store.ts           # 스키마 저장소 CRUD
│   │   └── example-store.ts          # 퓨샷 예제 저장소
│   │
│   └── pipeline/
│       └── text-to-sql.ts            # 전체 파이프라인 오케스트레이터
│
├── scripts/
│   ├── generate-metadata.ts          # 메타데이터 생성 CLI
│   ├── seed-examples.ts              # 퓨샷 예제 시딩
│   └── test-accuracy.ts              # 정확도 테스트
│
├── types/
│   ├── metadata.ts                   # 메타데이터 타입 정의
│   └── pipeline.ts                   # 파이프라인 타입 정의
│
└── prompts/
    ├── table-selection.md            # 테이블 선택 프롬프트 템플릿
    └── sql-generation.md             # SQL 생성 프롬프트 템플릿
```

---

## 5. 데이터 모델

### 5.1 Vector DB 스키마 (Neon + pgvector)

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 테이블 스키마 저장소
CREATE TABLE table_schemas (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  database_name VARCHAR(255) DEFAULT 'main',
  
  -- 검색용 요약
  summary TEXT NOT NULL,
  business_domain VARCHAR(100),
  
  -- 전체 스키마 정보 (JSON)
  full_schema JSONB NOT NULL,
  /*
    {
      "ddl": "CREATE TABLE ...",
      "columns": [
        {
          "name": "id",
          "type": "INT",
          "description": "고유 식별자",
          "sample_values": [1, 2, 3],
          "is_sensitive": false
        }
      ],
      "relationships": [
        {"column": "user_id", "references": "users.id"}
      ],
      "sample_rows": [...],
      "statistics": {"row_count": 10000}
    }
  */
  
  -- 임베딩용 통합 텍스트
  search_text TEXT NOT NULL,
  
  -- 벡터 임베딩 (Cohere v4: 1536 or 768)
  embedding vector(1536),
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT false  -- 수동 검토 완료 여부
);

-- 벡터 인덱스 (IVFFlat)
CREATE INDEX ON table_schemas 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 퓨샷 예제 저장소
CREATE TABLE query_examples (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,              -- 사용자 질문
  sql_query TEXT NOT NULL,             -- 정답 SQL
  tables_used TEXT[] NOT NULL,         -- 사용된 테이블
  complexity VARCHAR(50),              -- simple, moderate, complex
  verified BOOLEAN DEFAULT false,      -- 검증 완료 여부
  embedding vector(1536),              -- 질문 임베딩
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON query_examples 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);
```

### 5.2 테이블 메타데이터 JSON 구조

```typescript
interface TableMetadata {
  table_name: string;
  database_name: string;
  summary: string;              // "Akamai CDN 액세스 로그 저장"
  business_domain: string;      // "로그", "사용자", "결제" 등
  
  full_schema: {
    ddl: string;                // CREATE TABLE 문
    columns: ColumnMetadata[];
    relationships: Relationship[];
    sample_rows: Record<string, any>[];
    statistics: {
      row_count: number;
      last_updated?: string;
    };
  };
  
  search_text: string;          // 임베딩에 사용될 통합 텍스트
  common_query_patterns: string[];  // 자주 묻는 질문 예시
}

interface ColumnMetadata {
  name: string;
  type: string;
  description: string;          // LLM이 생성한 설명
  sample_values?: (string | number)[];  // 최대 10개
  is_primary_key: boolean;
  is_foreign_key: boolean;
  references?: string;          // "users.id"
  is_sensitive: boolean;        // 민감 데이터 여부
  is_nullable: boolean;
}

interface Relationship {
  column: string;
  references: string;           // "table.column"
  type: 'FOREIGN KEY' | 'IMPLICIT';
}
```

---

## 6. API 설계

### 6.1 SQL 생성 API

**Endpoint**: `POST /api/sql`

**Request**:
```typescript
interface SQLGenerationRequest {
  question: string;              // 사용자 자연어 질문
  options?: {
    maxRetries?: number;         // 자기 수정 최대 횟수 (기본: 3)
    executeQuery?: boolean;      // SQL 실행 여부 (기본: false)
    dialect?: 'postgresql' | 'mysql' | 'snowflake';
  };
}
```

**Response**:
```typescript
interface SQLGenerationResponse {
  success: boolean;
  data?: {
    query: string;               // 생성된 SQL
    explanation: string;         // SQL 설명
    tables_used: string[];       // 사용된 테이블
    results?: any[];             // 실행 결과 (옵션)
  };
  metadata: {
    attempts: number;            // 시도 횟수
    execution_time_ms: number;
    model_used: string;
    tables_searched: string[];   // 검색된 후보 테이블
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 6.2 메타데이터 관리 API

**테이블 목록 조회**: `GET /api/metadata/tables`

**단일 테이블 조회**: `GET /api/metadata/tables/:tableName`

**메타데이터 갱신**: `POST /api/metadata/refresh`
```typescript
interface RefreshRequest {
  tables?: string[];             // 특정 테이블만 갱신 (없으면 전체)
  forceRegenerate?: boolean;     // LLM 설명 재생성 여부
}
```

---

## 7. 핵심 컴포넌트 구현 명세

### 7.1 Cohere Embed v4 클라이언트

**파일**: `lib/embeddings/cohere-embed.ts`

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

/**
 * Cohere Embed v4로 텍스트 임베딩 생성
 * 
 * @param texts - 임베딩할 텍스트 배열
 * @param inputType - 'search_document' (저장용) | 'search_query' (검색용)
 * @returns 임베딩 벡터 배열
 * 
 * 중요: inputType을 올바르게 설정해야 검색 정확도가 향상됨
 * - 테이블 메타데이터 저장 시: 'search_document'
 * - 사용자 질문 검색 시: 'search_query'
 */
export async function embedWithCohere(
  texts: string[],
  inputType: 'search_document' | 'search_query' = 'search_document'
): Promise<number[][]> {
  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: "cohere.embed-v4:0",
    body: JSON.stringify({
      texts: texts,
      input_type: inputType,
      embedding_types: ["float"],
      // truncate: "END"  // 긴 텍스트 자동 truncate
    })
  }));
  
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embeddings.float;
}

// 단일 텍스트용 헬퍼 함수
export async function embedTableSchema(schemaText: string): Promise<number[]> {
  const embeddings = await embedWithCohere([schemaText], 'search_document');
  return embeddings[0];
}

export async function embedUserQuery(query: string): Promise<number[]> {
  const embeddings = await embedWithCohere([query], 'search_query');
  return embeddings[0];
}
```

### 7.2 테이블 선택기 (Haiku)

**파일**: `lib/ai/table-selector.ts`

```typescript
import { generateObject } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { z } from 'zod';

const bedrock = createAmazonBedrock({ region: 'us-east-1' });

const tableSelectionSchema = z.object({
  relevant_tables: z.array(z.string()),
  relevant_columns: z.array(z.string()),
  reasoning: z.string(),
  query_complexity: z.enum(['simple', 'moderate', 'complex']),
  requires_join: z.boolean(),
});

/**
 * 후보 테이블 중 사용자 질문에 필요한 테이블 선택
 * 
 * @param userQuery - 사용자 질문
 * @param candidateTables - 벡터 검색으로 찾은 후보 테이블 목록
 */
export async function identifyRelevantTables(
  userQuery: string,
  candidateTables: Array<{ table_name: string; summary: string; similarity: number }>
) {
  const tableMetadata = candidateTables
    .map(t => `- ${t.table_name} (유사도: ${(t.similarity * 100).toFixed(1)}%): ${t.summary}`)
    .join('\n');

  const result = await generateObject({
    model: bedrock('anthropic.claude-3-5-haiku-20241022-v1:0'),
    schema: tableSelectionSchema,
    system: `당신은 데이터베이스 스키마 분석가입니다. 
사용자 질문에 답하기 위해 필요한 테이블을 후보 목록에서 선택하세요.

## 후보 테이블 목록
${tableMetadata}

## 판단 기준
1. 질문에서 언급된 키워드와 테이블명/설명의 관련성
2. 필요한 데이터를 얻기 위한 최소한의 테이블 선택
3. JOIN이 필요한 경우 관련 테이블 모두 포함
4. 불필요한 테이블은 제외

## 복잡도 분류
- simple: 단일 테이블, 기본 WHERE/SELECT
- moderate: 2-3개 테이블 JOIN
- complex: 4개 이상 테이블 또는 서브쿼리 필요`,
    prompt: userQuery,
    temperature: 0.1,
  });

  return result.object;
}
```

### 7.3 SQL 생성기 (Sonnet)

**파일**: `lib/ai/sql-generator.ts`

```typescript
import { generateObject } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { z } from 'zod';

const bedrock = createAmazonBedrock({ region: 'us-east-1' });

const sqlGenerationSchema = z.object({
  query: z.string(),
  explanation: z.string(),
  tables_used: z.array(z.string()),
  columns_used: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});

/**
 * 스키마 정보를 기반으로 SQL 쿼리 생성
 * 
 * @param userQuery - 사용자 질문
 * @param schemaContext - 선택된 테이블의 전체 스키마 정보
 * @param fewShotExamples - 유사한 질문-SQL 쌍 예제
 * @param previousError - 이전 시도의 오류 (재시도 시)
 */
export async function generateSQL(
  userQuery: string,
  schemaContext: string,
  fewShotExamples: string,
  sqlDialect: string = 'PostgreSQL',
  previousError?: string
) {
  const prompt = previousError
    ? `${userQuery}\n\n⚠️ 이전 시도가 다음 오류로 실패했습니다:\n${previousError}\n\n위 오류를 수정하여 SQL을 다시 작성해주세요.`
    : userQuery;

  const result = await generateObject({
    model: bedrock('anthropic.claude-3-5-sonnet-20241022-v2:0'),
    schema: sqlGenerationSchema,
    system: `당신은 ${sqlDialect} 전문 SQL 개발자입니다.

## 데이터베이스 스키마
${schemaContext}

## 유사한 질문-SQL 예제
${fewShotExamples || '(예제 없음)'}

## SQL 작성 규칙
1. 위 스키마에 존재하는 테이블과 컬럼만 사용
2. 외래 키 관계에 따라 적절한 JOIN 사용
3. 문자열 비교 시 대소문자를 고려 (ILIKE 또는 LOWER() 사용)
4. 가독성을 위해 테이블 별칭 사용 (예: orders o, users u)
5. NULL 값은 COALESCE로 처리
6. 집계 함수 사용 시 반드시 GROUP BY 포함
7. SELECT 쿼리만 생성 (INSERT, UPDATE, DELETE 금지)
8. 복잡한 쿼리는 CTE (WITH 절) 사용하여 가독성 확보

## 출력 형식
- 실행 가능한 유효한 SQL 쿼리
- 쿼리 로직에 대한 간단한 설명
- 사용된 테이블과 주요 컬럼 목록`,
    prompt,
    temperature: 0.1,
    maxTokens: 2048,
  });

  return result.object;
}
```

### 7.4 전체 파이프라인 오케스트레이터

**파일**: `lib/pipeline/text-to-sql.ts`

```typescript
import { embedUserQuery } from '../embeddings/cohere-embed';
import { findRelevantTables, getSchemaDetails, findSimilarExamples } from '../db/schema-store';
import { identifyRelevantTables } from '../ai/table-selector';
import { generateSQL } from '../ai/sql-generator';
import { validateSQL, executeSQL } from '../validation/sql-validator';

interface PipelineConfig {
  maxRetries: number;
  executeQuery: boolean;
  sqlDialect: 'postgresql' | 'mysql' | 'snowflake';
}

interface PipelineResult {
  success: boolean;
  query?: string;
  explanation?: string;
  results?: any[];
  error?: string;
  metadata: {
    tablesUsed: string[];
    tablesSearched: string[];
    attempts: number;
    executionTimeMs: number;
  };
}

export async function textToSQLPipeline(
  userQuery: string,
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult> {
  const { maxRetries = 3, executeQuery = false, sqlDialect = 'postgresql' } = config;
  const startTime = Date.now();
  let attempts = 0;
  let lastError = '';

  // ===== STEP 1: 사용자 질문 임베딩 =====
  const queryEmbedding = await embedUserQuery(userQuery);

  // ===== STEP 2: 벡터 유사도 검색 =====
  const candidateTables = await findRelevantTables(queryEmbedding, 10);
  const tablesSearched = candidateTables.map(t => t.table_name);

  // ===== STEP 3: LLM으로 테이블 선택 정제 =====
  const tableSelection = await identifyRelevantTables(userQuery, candidateTables);

  // ===== STEP 4: 선택된 테이블의 전체 스키마 가져오기 =====
  const fullSchemas = await getSchemaDetails(tableSelection.relevant_tables);
  const schemaContext = formatSchemasForPrompt(fullSchemas);

  // ===== STEP 5: 유사한 퓨샷 예제 검색 =====
  const similarExamples = await findSimilarExamples(queryEmbedding, 3, tableSelection.relevant_tables);
  const fewShotContext = formatExamplesForPrompt(similarExamples);

  // ===== STEP 6: SQL 생성 (자기 수정 루프) =====
  while (attempts < maxRetries) {
    attempts++;

    const sqlResult = await generateSQL(
      userQuery,
      schemaContext,
      fewShotContext,
      sqlDialect,
      attempts > 1 ? lastError : undefined
    );

    // 구문 검증
    const syntaxValidation = validateSQL(sqlResult.query);
    if (!syntaxValidation.isValid) {
      lastError = `구문 오류: ${syntaxValidation.error}`;
      continue;
    }

    // 실행 검증 (옵션)
    if (executeQuery) {
      try {
        const results = await executeSQL(sqlResult.query);
        return {
          success: true,
          query: sqlResult.query,
          explanation: sqlResult.explanation,
          results,
          metadata: {
            tablesUsed: sqlResult.tables_used,
            tablesSearched,
            attempts,
            executionTimeMs: Date.now() - startTime,
          },
        };
      } catch (execError: any) {
        lastError = `실행 오류: ${execError.message}`;
        continue;
      }
    }

    // 실행 없이 반환
    return {
      success: true,
      query: sqlResult.query,
      explanation: sqlResult.explanation,
      metadata: {
        tablesUsed: sqlResult.tables_used,
        tablesSearched,
        attempts,
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  return {
    success: false,
    error: `${maxRetries}회 시도 후 실패. 마지막 오류: ${lastError}`,
    metadata: {
      tablesUsed: [],
      tablesSearched,
      attempts,
      executionTimeMs: Date.now() - startTime,
    },
  };
}

// 헬퍼 함수
function formatSchemasForPrompt(schemas: any[]): string {
  return schemas.map(s => `
-- 테이블: ${s.table_name}
-- 설명: ${s.summary}
${s.full_schema.ddl}

-- 샘플 데이터:
${s.full_schema.sample_rows?.slice(0, 3).map(r => JSON.stringify(r)).join('\n') || '없음'}

-- 관계:
${s.full_schema.relationships?.map(r => `-- ${r.column} → ${r.references}`).join('\n') || '없음'}
`).join('\n\n');
}

function formatExamplesForPrompt(examples: any[]): string {
  if (!examples.length) return '';
  
  return examples.map((e, i) => `
### 예제 ${i + 1}
질문: ${e.question}
SQL:
\`\`\`sql
${e.sql_query}
\`\`\`
`).join('\n');
}
```

---

## 8. 메타데이터 자동 생성 파이프라인

### 8.1 파이프라인 개요
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    테이블 메타데이터 자동 생성 파이프라인                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: 자동 추출 (SQL)                                                    │
│  └─▶ information_schema에서 DDL, 컬럼, FK, 통계 추출                         │
│  └─▶ 샘플 데이터 추출 (LIMIT 5, 민감 데이터 마스킹)                           │
│  └─▶ distinct 값 20개 이하인 컬럼의 값 목록 추출                              │
│                                                                             │
│  STEP 2: LLM 보강 (Claude Sonnet)                                           │
│  └─▶ 테이블 목적/설명 자동 생성                                              │
│  └─▶ 컬럼별 비즈니스 의미 생성                                               │
│  └─▶ 자주 묻는 질문 예시 3개 생성                                            │
│  └─▶ 관련 테이블 추천                                                        │
│                                                                             │
│  STEP 3: 사람 검토 (선택적)                                                  │
│  └─▶ 핵심 테이블 10-15개만 수동 검토                                         │
│  └─▶ 비즈니스 용어/도메인 지식 보강                                          │
│                                                                             │
│  STEP 4: 임베딩 & 저장                                                       │
│  └─▶ Cohere Embed v4로 search_text 임베딩                                   │
│  └─▶ Neon pgvector에 저장                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 민감 데이터 마스킹 규칙

```typescript
// lib/metadata/masking.ts

const SENSITIVE_COLUMN_PATTERNS = [
  /password/i, /passwd/i, /pwd/i,
  /ssn/i, /social.*security/i,
  /credit.*card/i, /card.*number/i,
  /phone/i, /mobile/i, /tel/i,
  /email/i, /mail/i,
  /address/i, /addr/i,
  /birth/i, /dob/i,
  /salary/i, /income/i,
  /secret/i, /token/i, /api.*key/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, type: 'Credit Card' },
  { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/, type: 'Email' },
  { pattern: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/, type: 'Phone' },
];
```

### 8.3 CLI 실행 명령어

```bash
# 전체 테이블 메타데이터 생성
npx ts-node scripts/generate-metadata.ts

# 특정 테이블만 갱신
npx ts-node scripts/generate-metadata.ts --table akamai_logs

# 테스트 모드 (저장 안함)
npx ts-node scripts/generate-metadata.ts --dry-run

# LLM 설명 재생성
npx ts-node scripts/generate-metadata.ts --regenerate-descriptions
```

---

## 9. 정확도 향상 전략

### 9.1 정확도 향상 체크리스트

| 기술 | 예상 향상 | 우선순위 | 구현 난이도 |
|-----|---------|---------|-----------|
| 스키마에 샘플 데이터 포함 | +6% | 높음 | 낮음 |
| 동적 퓨샷 예제 선택 | +7% | 높음 | 중간 |
| 자기 수정 루프 (3회) | +5-10% | 높음 | 낮음 |
| 풍부한 컬럼 설명 | 필수 | 높음 | 중간 |
| 복잡한 쿼리 분해 | +8% | 중간 | 높음 |
| LLM 테이블 요약 | 검색 정확도 향상 | 높음 | 중간 |
| 비대칭 임베딩 (input_type) | +5-10% | 높음 | 낮음 |

### 9.2 퓨샷 예제 관리

```typescript
// 검증된 예제 추가
await addVerifiedExample({
  question: "지난 7일간 akamai 로그에서 404 에러가 가장 많은 URL은?",
  sql_query: `
    SELECT url, COUNT(*) as error_count
    FROM akamai_logs
    WHERE status_code = 404
      AND timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY url
    ORDER BY error_count DESC
    LIMIT 10
  `,
  tables_used: ["akamai_logs"],
  complexity: "moderate"
});
```

---

## 10. 구현 일정 (Phase)

### Phase 1: 기반 구축 (1주)
- [ ] 프로젝트 초기 설정 (Next.js 15, TypeScript)
- [ ] Bedrock 클라이언트 연동 (Cohere, Claude)
- [ ] Neon + pgvector 설정
- [ ] 기본 벡터 검색 구현

### Phase 2: 메타데이터 파이프라인 (1주)
- [ ] 메타데이터 추출기 구현
- [ ] LLM 설명 생성기 구현
- [ ] 민감 데이터 마스킹
- [ ] CLI 스크립트 작성
- [ ] 50개 테이블 메타데이터 생성

### Phase 3: 핵심 파이프라인 (1주)
- [ ] 테이블 선택기 (Haiku) 구현
- [ ] SQL 생성기 (Sonnet) 구현
- [ ] 자기 수정 루프 구현
- [ ] API 엔드포인트 구현

### Phase 4: 정확도 최적화 (1주)
- [ ] 퓨샷 예제 시스템 구현
- [ ] 프롬프트 튜닝
- [ ] 정확도 테스트 및 개선
- [ ] 핵심 테이블 수동 검토

### Phase 5: UI 및 배포 (1주)
- [ ] 채팅 UI 구현
- [ ] 에러 핸들링 강화
- [ ] 모니터링 설정
- [ ] Vercel 배포

---

## 11. 테스트 전략

### 11.1 테스트 데이터셋

```typescript
// scripts/test-accuracy.ts
const testCases = [
  // 단순 쿼리
  {
    question: "akamai 로그 테이블 조회해줘",
    expected_tables: ["akamai_logs"],
    complexity: "simple"
  },
  // 필터링
  {
    question: "지난 7일간 akamai 로그에서 에러 건수",
    expected_tables: ["akamai_logs"],
    expected_contains: ["WHERE", "status_code", "7 days"],
    complexity: "simple"
  },
  // JOIN
  {
    question: "각 사용자별 주문 금액 합계",
    expected_tables: ["users", "orders"],
    expected_contains: ["JOIN", "SUM", "GROUP BY"],
    complexity: "moderate"
  },
  // 복잡한 쿼리
  {
    question: "월별 매출 추이와 전월 대비 증감률",
    expected_tables: ["orders"],
    expected_contains: ["LAG", "OVER", "PARTITION"],
    complexity: "complex"
  }
];
```

### 11.2 정확도 측정 스크립트

```bash
# 전체 테스트 실행
npx ts-node scripts/test-accuracy.ts

# 결과 예시
# ================================
# Text-to-SQL 정확도 테스트 결과
# ================================
# 총 테스트: 50
# 성공: 42 (84%)
# 실패: 8 (16%)
# 
# 복잡도별:
# - simple: 95% (19/20)
# - moderate: 85% (17/20)
# - complex: 60% (6/10)
```

---

## 12. 환경 변수

```env
# .env.local

# AWS Bedrock
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Neon Database (Vector Store)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Target Database (SQL 실행 대상)
TARGET_DB_URL=postgresql://user:password@host/target_database

# Optional
LOG_LEVEL=info
MAX_RETRIES=3
```

---

## 13. 참고 자료

### 13.1 핵심 문서
- [Vercel AI SDK - Amazon Bedrock](https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock)
- [Cohere Embed v4 Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed-v4.html)
- [Neon pgvector Guide](https://neon.tech/docs/extensions/pgvector)

### 13.2 연구 자료
- Pinterest Text-to-SQL 사례: 검색 적중률 40% → 90% 향상
- DIN-SQL: 쿼리 분해를 통한 85.3% 정확도 달성
- SQL-of-Thought: 멀티 에이전트로 91.59% 달성

### 13.3 벤치마크 참고
- Spider Benchmark: 복잡한 Text-to-SQL 평가 표준
- 2단계 RAG 접근: 80-85% 정확도 (프로덕션 권장)

---

## 14. Claude Code 작업 지침

### 14.1 우선 구현 순서
```
1. lib/embeddings/cohere-embed.ts    ← 먼저 구현
2. lib/db/neon.ts                    ← DB 연결
3. lib/metadata/extractor.ts         ← 메타데이터 추출
4. lib/metadata/enricher.ts          ← LLM 설명 생성
5. lib/ai/table-selector.ts          ← 테이블 선택
6. lib/ai/sql-generator.ts           ← SQL 생성
7. lib/pipeline/text-to-sql.ts       ← 통합
8. app/api/sql/route.ts              ← API
```

### 14.2 주의사항
- Cohere Embed v4 사용 시 `input_type` 파라미터 필수
- 민감 데이터 마스킹 로직 반드시 적용
- 자기 수정 루프 최대 3회로 제한
- 모든 LLM 호출에 `temperature: 0.1` 설정 (일관성)

### 14.3 테스트 명령어
```bash
# 개발 서버
npm run dev

# 메타데이터 생성
npm run generate-metadata

# 정확도 테스트
npm run test-accuracy
```

---

**문서 끝**
