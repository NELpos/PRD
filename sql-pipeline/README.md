# SQL Pipeline & Text-to-SQL Systems

자연어를 SQL로 변환하고, SQL 쿼리에 파이프라인 명령어를 추가하여 고급 데이터 처리를 수행하는 시스템입니다.

## 📚 문서 목록

### Product Requirements Documents (PRDs)

1. **[Text-to-SQL System](./prd-text-to-sql.md)**
   - 자연어 질문을 SQL 쿼리로 자동 변환
   - 스키마 이해 및 컨텍스트 기반 쿼리 생성
   - AI 기반 쿼리 최적화 및 검증
   - 데이터베이스 방언별 최적화 (PostgreSQL, MySQL, Snowflake 등)

## 🛠 주요 기술 스택

### Frontend
- Next.js 15
- CodeMirror 6 (SQL 에디터)
- Tailwind CSS

### Backend
- Python FastAPI
- LangChain / LlamaIndex
- Amazon Bedrock (Claude)

### Database Support
- Snowflake
- PostgreSQL
- MySQL
- BigQuery

## 🔗 관련 리소스

- [SQL Pipeline Editor 구현 예제](../examples/sql_pipeline/)
  - CodeMirror 6 기반 SQL 에디터
  - Splunk 스타일 파이프라인 구문
  - JWT 디코딩, AI 변환 등 커스텀 명령어

- [Snowflake SQL System Prompt](../snowflake/system-prompt-sql.md)

## 💡 핵심 기능

### Text-to-SQL 변환
자연어 질문을 정확한 SQL 쿼리로 변환합니다.

**예시:**
```
질문: "지난 달 매출이 가장 높았던 상위 10개 제품을 보여줘"

생성된 SQL:
SELECT
    product_name,
    SUM(revenue) as total_revenue
FROM sales
WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND sale_date < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY product_name
ORDER BY total_revenue DESC
LIMIT 10
```

### 파이프라인 명령어

SQL 쿼리 결과에 추가 처리를 체인으로 연결합니다.

**예시:**
```sql
SELECT * FROM api_logs
| jwtdecode authorization
| ai_sentiment review_text include_score=true
| filter sentiment_score > 0.5
| sort timestamp desc
| limit 100
```

**사용 가능한 파이프라인 명령어:**
- **JWT**: `jwtdecode`, `jwtextract`, `jwtvalidate`
- **AI**: `ai_transform`, `ai_extract`, `ai_classify`, `ai_summarize`, `ai_translate`, `ai_sentiment`
- **데이터 변환**: `filter`, `json_parse`, `flatten`, `rename`, `select`, `exclude`
- **분석**: `stats`, `sort`, `limit`, `unique`

## 🎯 주요 사용 사례

### 1. 비즈니스 분석가
SQL을 모르는 분석가도 자연어로 데이터를 조회할 수 있습니다.

### 2. 보안 분석
API 로그에서 JWT를 디코딩하고 이상 패턴을 자동 탐지합니다.

### 3. 고객 인사이트
리뷰 데이터를 AI로 분석하여 감정 및 주요 이슈를 추출합니다.

### 4. 데이터 보강
외부 API나 위협 인텔리전스로 데이터를 실시간 보강합니다.

## 📊 성능 최적화

- **스키마 캐싱**: 데이터베이스 스키마 정보 캐싱으로 속도 향상
- **쿼리 검증**: 실행 전 구문 및 의미 검증
- **컨텍스트 압축**: 스키마 정보를 효율적으로 압축하여 프롬프트에 포함
- **Few-shot Learning**: 예제 쿼리로 정확도 향상

## 🔒 보안 고려사항

1. **SQL Injection 방지**: 파라미터화된 쿼리 생성
2. **권한 검증**: 사용자별 테이블 접근 권한 확인
3. **민감 데이터 마스킹**: 개인정보 자동 필터링
4. **감사 로그**: 모든 쿼리 생성 및 실행 이력 기록
