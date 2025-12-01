# AI Pipeline Commands - 사용 가이드

AWS Bedrock의 Claude Haiku 4.5를 활용한 AI 파이프라인 커맨드 완전 가이드입니다.

## 🤖 개요

Snowflake Cortex AI와 유사하게, SQL 쿼리 결과에 AI 변환을 파이프라인으로 연결할 수 있습니다. 

```sql
-- Snowflake Cortex AI 스타일
SELECT *, SNOWFLAKE.CORTEX.COMPLETE('claude-3-haiku', prompt) as ai_result
FROM table

-- 우리의 파이프라인 스타일 (더 직관적!)
SELECT * FROM table 
| ai_transform column prompt="분석해줘" output_format=json
```

## 📦 설치 및 설정

### 1. 의존성 설치

```bash
npm install @aws-sdk/client-bedrock-runtime
```

### 2. AWS Credentials 설정

```typescript
// app/api/sql-pipeline/route.ts
import { registerAICommands } from '@/lib/ai-pipeline-commands'

const executor = new PipelineExecutor()

registerAICommands(executor, {
  region: 'us-east-1',
  // Option 1: IAM Role (추천 - EC2, Lambda 등)
  // credentials는 자동으로 감지됨

  // Option 2: Access Key (개발 환경)
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
```

### 3. 환경 변수 설정

```env
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 🎯 사용 가능한 AI 커맨드

| 커맨드 | 설명 | 사용 사례 |
|--------|------|-----------|
| `ai_transform` | 자유 형식 AI 변환 | 요약, 분석, 변환 등 모든 작업 |
| `ai_extract` | 구조화된 데이터 추출 | 이름, 이메일, 날짜 등 추출 |
| `ai_classify` | 카테고리 분류 | 감정, 주제, 긴급도 분류 |
| `ai_summarize` | 텍스트 요약 | 긴 텍스트 요약 |
| `ai_translate` | 다국어 번역 | 언어 번역 |
| `ai_sentiment` | 감정 분석 | 긍정/부정/중립 판단 |

## 💡 실전 사용 예제

### 1. 고객 리뷰 감정 분석

```sql
SELECT 
  review_id,
  customer_name,
  review_text,
  created_at
FROM customer_reviews
WHERE created_at > '2024-01-01'
| ai_sentiment review_text include_score=true include_aspects=true
| filter review_text_sentiment = 'negative'
| sort review_text_sentiment_score asc
| limit 20
```

**결과:**
```json
{
  "review_id": 123,
  "customer_name": "김철수",
  "review_text": "배송이 너무 늦어서 실망했습니다...",
  "review_text_sentiment": "negative",
  "review_text_sentiment_score": -0.75,
  "review_text_sentiment_aspects": {
    "delivery": "negative",
    "product": "neutral",
    "service": "negative"
  },
  "review_text_sentiment_keywords": ["늦어서", "실망"]
}
```

### 2. 고객 문의 자동 분류 및 요약

```sql
SELECT 
  ticket_id,
  customer_email,
  subject,
  message_body
FROM support_tickets
WHERE status = 'open'
| ai_classify message_body categories="billing,technical,general,urgent"
| ai_summarize message_body max_length=100 style=brief
| filter message_body_category = 'urgent'
| select ticket_id,customer_email,message_body_summary,message_body_category
```

**결과:**
```json
{
  "ticket_id": 456,
  "customer_email": "customer@example.com",
  "message_body_summary": "결제 오류로 인해 서비스가 중단됨. 즉시 해결 필요.",
  "message_body_category": "urgent"
}
```

### 3. 다국어 제품 설명 생성

```sql
SELECT 
  product_id,
  product_name,
  description_en
FROM products
WHERE category = 'electronics'
| ai_translate description_en target_lang="Korean"
| ai_translate description_en target_lang="Japanese"
| ai_transform description_en prompt="Make this description more engaging and highlight key features" output_format=text
| select product_id,product_name,description_en_translated,description_en_ai_result
```

### 4. 비정형 데이터에서 구조화된 정보 추출

```sql
SELECT 
  email_id,
  email_body
FROM customer_emails
WHERE category = 'contact_info_request'
| ai_extract email_body fields="name,email,phone,company,preferred_contact_time"
| select email_id,name_extracted,email_extracted,phone_extracted,company_extracted
```

**결과:**
```json
{
  "email_id": 789,
  "name_extracted": "홍길동",
  "email_extracted": "hong@example.com",
  "phone_extracted": "010-1234-5678",
  "company_extracted": "ABC 주식회사",
  "preferred_contact_time_extracted": "오후 2-5시"
}
```

### 5. JWT 토큰 + AI 분석 복합 파이프라인

```sql
SELECT 
  session_id,
  user_agent,
  access_token,
  request_body
FROM api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
| jwtdecode access_token
| ai_classify user_agent categories="mobile,desktop,bot,suspicious"
| ai_extract request_body fields="action,target_resource,parameters"
| filter user_agent_category = 'suspicious' OR access_token_decoded._expired = true
| select session_id,user_agent_category,action_extracted,access_token_decoded
```

**사용 사례:** 보안 위협 탐지 - 의심스러운 접근이나 만료된 토큰 사용 감지

### 6. 콘텐츠 큐레이션 및 개인화

```sql
SELECT 
  article_id,
  title,
  content,
  tags
FROM articles
WHERE published_date > NOW() - INTERVAL '7 days'
| ai_summarize content max_length=150 style=bullet_points
| ai_classify content categories="technology,business,lifestyle,entertainment"
| ai_transform content prompt="Generate 3 engaging social media posts from this article" output_format=json
| select article_id,title,content_summary,content_category,content_ai_result
```

### 7. 실시간 번역 + 감정 분석 파이프라인

```sql
SELECT 
  comment_id,
  username,
  comment_text,
  language
FROM live_comments
WHERE created_at > NOW() - INTERVAL '10 minutes'
| ai_translate comment_text target_lang="Korean" source_lang=language
| ai_sentiment comment_text_translated include_score=true
| filter comment_text_sentiment_score < -0.5
| select comment_id,username,comment_text_translated,comment_text_sentiment,comment_text_sentiment_score
```

**사용 사례:** 글로벌 라이브 스트림에서 부정적 댓글 모니터링

## 🎨 AI 커맨드 상세 설명

### ai_transform

**가장 유연한 AI 커맨드** - 모든 종류의 변환 작업 가능

```sql
| ai_transform column_name prompt="프롬프트" output_format=text|json|markdown
```

**파라미터:**
- `column`: 변환할 컬럼명
- `prompt`: AI에게 전달할 명령어
- `output_format`: 출력 형식 (text, json, markdown, csv, auto)
- `system_prompt`: (선택) 시스템 프롬프트
- `batch_size`: (선택) 배치 크기 (기본: 5)

**예제:**

```sql
-- 긴 보고서를 임원 요약으로 변환
| ai_transform report_text 
    prompt="Convert this to an executive summary with key metrics and recommendations" 
    output_format=markdown

-- JSON 데이터에서 인사이트 추출
| ai_transform sales_data 
    prompt="Analyze these sales figures and provide 3 key insights" 
    output_format=json

-- 기술 문서를 비전문가용으로 재작성
| ai_transform technical_doc 
    prompt="Rewrite this for non-technical audience, explaining jargon" 
    output_format=text
```

### ai_extract

**구조화된 정보 추출** - 비정형 텍스트에서 특정 필드 추출

```sql
| ai_extract column_name fields="field1,field2,field3"
```

**파라미터:**
- `column`: 분석할 컬럼명
- `fields`: 추출할 필드 목록 (배열)
- `output_format`: json 또는 auto (기본: json)
- `batch_size`: (선택) 배치 크기

**예제:**

```sql
-- 이력서에서 정보 추출
| ai_extract resume_text 
    fields="name,email,years_experience,skills,education,current_company"

-- 계약서에서 핵심 정보 추출
| ai_extract contract_text 
    fields="party_a,party_b,start_date,end_date,payment_terms,renewal_clause"

-- 의료 기록에서 주요 정보 추출
| ai_extract medical_record 
    fields="diagnosis,medications,allergies,treatment_plan,next_appointment"
```

### ai_classify

**카테고리 분류** - 텍스트를 사전 정의된 카테고리로 분류

```sql
| ai_classify column_name categories="cat1,cat2,cat3" include_confidence=true
```

**파라미터:**
- `column`: 분류할 컬럼명
- `categories`: 가능한 카테고리 목록 (배열)
- `include_confidence`: (선택) 신뢰도 포함 여부 (기본: false)
- `batch_size`: (선택) 배치 크기

**예제:**

```sql
-- 고객 문의 분류
| ai_classify inquiry_text 
    categories="product_question,complaint,refund_request,technical_support,general" 
    include_confidence=true

-- 뉴스 기사 분류
| ai_classify article_text 
    categories="politics,economy,technology,sports,entertainment,health"

-- 이메일 우선순위 분류
| ai_classify email_body 
    categories="urgent,high,normal,low" 
    include_confidence=true
| filter email_body_category IN ('urgent', 'high') AND email_body_confidence > 0.8
```

### ai_summarize

**텍스트 요약** - 긴 텍스트를 간결하게 요약

```sql
| ai_summarize column_name max_length=200 style=brief|detailed|bullet_points
```

**파라미터:**
- `column`: 요약할 컬럼명
- `max_length`: (선택) 최대 글자 수 (기본: 200)
- `style`: (선택) 요약 스타일 (brief, detailed, bullet_points)
- `batch_size`: (선택) 배치 크기

**예제:**

```sql
-- 간단한 한 줄 요약
| ai_summarize article_content max_length=100 style=brief

-- 상세 요약
| ai_summarize meeting_notes max_length=500 style=detailed

-- 불릿 포인트 요약
| ai_summarize project_report max_length=300 style=bullet_points
```

### ai_translate

**다국어 번역** - 텍스트를 다른 언어로 번역

```sql
| ai_translate column_name target_lang="Korean" source_lang="English"
```

**파라미터:**
- `column`: 번역할 컬럼명
- `target_lang`: 목표 언어
- `source_lang`: (선택) 원본 언어 (기본: auto-detect)
- `batch_size`: (선택) 배치 크기

**예제:**

```sql
-- 영어를 한국어로
| ai_translate product_desc target_lang="Korean"

-- 자동 언어 감지 후 번역
| ai_translate user_message target_lang="English"

-- 다중 언어 번역 체인
| ai_translate content target_lang="Korean"
| ai_translate content target_lang="Japanese"
| ai_translate content target_lang="Chinese"
```

### ai_sentiment

**감정 분석** - 텍스트의 감정 분석

```sql
| ai_sentiment column_name include_score=true include_aspects=true
```

**파라미터:**
- `column`: 분석할 컬럼명
- `include_score`: (선택) 감정 점수 포함 (-1 ~ 1)
- `include_aspects`: (선택) 세부 측면별 감정 포함
- `batch_size`: (선택) 배치 크기

**예제:**

```sql
-- 기본 감정 분석
| ai_sentiment review_text

-- 점수 포함 감정 분석
| ai_sentiment comment include_score=true
| filter comment_sentiment_score < -0.3

-- 세부 측면 분석 (제품, 서비스, 가격 등)
| ai_sentiment customer_feedback include_score=true include_aspects=true
```

## 🚀 성능 최적화

### 1. 배치 처리 크기 조정

```sql
-- 소량 데이터: batch_size를 늘려서 빠르게 처리
SELECT * FROM small_table 
| ai_transform content prompt="..." batch_size=10

-- 대량 데이터: batch_size를 줄여서 안정적으로 처리
SELECT * FROM large_table 
| ai_transform content prompt="..." batch_size=3
```

### 2. 필요한 행만 필터링 후 AI 처리

```sql
-- ❌ 비효율적: 모든 데이터를 AI로 처리
SELECT * FROM reviews | ai_sentiment review_text

-- ✅ 효율적: 필터링 후 AI 처리
SELECT * FROM reviews 
| filter created_at > NOW() - INTERVAL '7 days'
| limit 100
| ai_sentiment review_text
```

### 3. 결과 캐싱

```typescript
// 서버 사이드에서 결과 캐싱
const cacheKey = `ai_${hash(query)}`
const cached = await redis.get(cacheKey)

if (cached) {
  return cached
}

const result = await executor.execute(query)
await redis.set(cacheKey, result, { ex: 3600 }) // 1시간 캐싱
```

## 💰 비용 관리

### AWS Bedrock Claude Haiku 4.5 요금

- Input: $0.0003 per 1K tokens (~$0.3 per 1M tokens)
- Output: $0.0015 per 1K tokens (~$1.5 per 1M tokens)

### 비용 절감 팁

1. **필요한 데이터만 처리**
   ```sql
   -- limit으로 처리량 제한
   | limit 100
   | ai_transform content prompt="..."
   ```

2. **출력 형식 최적화**
   ```sql
   -- 짧은 응답 요청
   | ai_summarize content max_length=50
   
   -- 불필요한 세부사항 제외
   | ai_classify text categories="A,B,C"  -- include_confidence=false
   ```

3. **배치 처리로 효율성 증대**
   ```sql
   -- 한 번에 많은 행 처리
   | ai_transform content prompt="..." batch_size=10
   ```

## 🔒 보안 고려사항

### 1. 민감 데이터 필터링

```sql
SELECT * FROM user_data 
| exclude ssn,credit_card,password  -- 민감 정보 제외
| ai_transform description prompt="..."
```

### 2. PII 자동 마스킹

```typescript
// AI 처리 전 개인정보 마스킹
function maskPII(text: string): string {
  return text
    .replace(/\d{3}-\d{4}-\d{4}/g, '***-****-****')  // 전화번호
    .replace(/\w+@\w+\.\w+/g, '***@***.***')         // 이메일
}
```

### 3. IAM 정책 설정

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
      ]
    }
  ]
}
```

## 📊 모니터링 및 로깅

```typescript
// AI 호출 로깅
executor.on('ai_command', (event) => {
  console.log({
    command: event.command,
    column: event.column,
    rowCount: event.rowCount,
    duration: event.duration,
    cost: calculateCost(event.tokens)
  })
})
```

## 🎓 고급 사용 사례

### 1. 다단계 AI 파이프라인

```sql
SELECT * FROM customer_feedback
| ai_translate feedback target_lang="English"
| ai_sentiment feedback_translated include_score=true
| ai_extract feedback_translated fields="product_mentioned,issue_type,urgency_level"
| ai_classify feedback_translated categories="bug,feature_request,praise,complaint"
| filter feedback_translated_sentiment = 'negative' AND urgency_level_extracted = 'high'
| ai_transform feedback_translated 
    prompt="Generate a professional response addressing this concern"
    output_format=text
```

### 2. A/B 테스트를 위한 콘텐츠 생성

```sql
SELECT 
  campaign_id,
  original_copy
FROM marketing_campaigns
| ai_transform original_copy 
    prompt="Create a more casual, friendly version" 
    output_format=text
| ai_transform original_copy 
    prompt="Create a more professional, authoritative version" 
    output_format=text
| select campaign_id,original_copy,original_copy_ai_result AS version_a, original_copy_ai_result AS version_b
```

---

**Made with 🤖 using AWS Bedrock Claude Haiku 4.5**
