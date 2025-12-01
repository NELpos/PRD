# Next.js 15 + CodeMirror SQL Pipeline Editor

Splunk 스타일의 파이프라인을 지원하는 SQL 에디터입니다. JWT 디코딩, 데이터 변환, 분석 등 다양한 커스텀 명령어를 체인으로 연결할 수 있습니다.

## 🎯 주요 기능

- ✅ **CodeMirror 6** 기반 SQL 에디터
- ✅ **파이프라인 구문** (`|` 연산자로 명령어 체인)
- ✅ **JWT 디코딩** - 실시간으로 JWT 토큰 디코드 및 검증
- ✅ **AI 파이프라인** - AWS Bedrock Claude Haiku 4.5로 데이터 변환 (NEW! 🤖)
- ✅ **자동완성** - 파이프라인 명령어 자동완성
- ✅ **실시간 구문 검사** - 잘못된 명령어 하이라이트
- ✅ **커스텀 명령어** - 쉽게 확장 가능한 플러그인 시스템
- ✅ **Next.js 15** 완벽 호환

## 📦 설치

```bash
# 프로젝트 생성
npx create-next-app@latest sql-pipeline-editor
cd sql-pipeline-editor

# 필수 의존성 설치
npm install codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/lang-sql @codemirror/autocomplete @codemirror/lint @codemirror/commands @lezer/highlight
```

## 🚀 빠른 시작

### 1. 기본 사용법

```typescript
import SQLPipelineEditor from '@/components/SQLPipelineEditor'

export default function Page() {
  return <SQLPipelineEditor />
}
```

### 2. 파이프라인 쿼리 예제

#### JWT 디코딩
```sql
SELECT * FROM users 
| jwtdecode access_token
```

**결과:**
- 원본 데이터 유지
- `access_token_header`: JWT 헤더
- `access_token_payload`: JWT 페이로드
- `access_token_decoded`: 디코딩된 정보 + 만료 여부

#### JWT 필드 추출
```sql
SELECT * FROM sessions 
| jwtextract token fields=userId,email,role
```

**결과:**
- `userId_from_jwt`: JWT에서 추출한 userId
- `email_from_jwt`: JWT에서 추출한 email  
- `role_from_jwt`: JWT에서 추출한 role

#### 복잡한 파이프라인 체인
```sql
SELECT * FROM api_logs 
| jwtdecode authorization 
| filter status = 200 
| json_parse request_body 
| flatten request_body_parsed 
| exclude password,secret 
| sort timestamp desc 
| limit 100
```

## 🎨 사용 가능한 파이프라인 명령어

### JWT 관련 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `jwtdecode` | JWT 토큰 디코딩 | `\| jwtdecode token_column` |
| `jwtextract` | JWT에서 특정 필드 추출 | `\| jwtextract token fields=userId,email` |
| `jwtvalidate` | JWT 유효성 검증 | `\| jwtvalidate token_column` |

### AI 파이프라인 명령어 (🤖 NEW!)

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `ai_transform` | AI 기반 자유 형식 변환 | `\| ai_transform column prompt="요약해줘" output_format=text` |
| `ai_extract` | 구조화된 데이터 추출 | `\| ai_extract column fields=name,email,phone` |
| `ai_classify` | 카테고리 분류 | `\| ai_classify column categories="A,B,C"` |
| `ai_summarize` | 텍스트 요약 | `\| ai_summarize column max_length=100` |
| `ai_translate` | 다국어 번역 | `\| ai_translate column target_lang="Korean"` |
| `ai_sentiment` | 감정 분석 | `\| ai_sentiment column include_score=true` |

> 💡 **AI 파이프라인 상세 가이드**: [AI-PIPELINE-GUIDE.md](./AI-PIPELINE-GUIDE.md) 참조

### 데이터 변환 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `filter` | 조건 필터링 | `\| filter age > 30` |
| `json_parse` | JSON 문자열 파싱 | `\| json_parse metadata` |
| `flatten` | 중첩 객체 평탄화 | `\| flatten nested_object` |
| `rename` | 컬럼 이름 변경 | `\| rename old:new` |
| `select` | 특정 컬럼만 선택 | `\| select id,name,email` |
| `exclude` | 특정 컬럼 제외 | `\| exclude password,secret` |

### 분석 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `stats` | 통계 계산 | `\| stats count,avg(age) by role` |
| `sort` | 정렬 | `\| sort age desc` |
| `limit` | 결과 제한 | `\| limit 10` |
| `unique` | 중복 제거 | `\| unique email` |

### 데이터 보강 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `enrich` | 외부 데이터 조인 | `\| enrich user_details on user_id` |
| `lookup` | 룩업 테이블 조인 | `\| lookup countries on country_code` |

## 💡 실제 사용 시나리오

### 시나리오 1: 보안 감사 - 만료된 JWT 세션 찾기

```sql
SELECT session_id, user_id, access_token, created_at 
FROM active_sessions 
| jwtvalidate access_token 
| filter access_token_validation.isExpired = true 
| select user_id, session_id, access_token_validation 
| sort created_at desc
```

**용도:**
- 만료된 토큰으로 접근하는 세션 탐지
- 보안 감사 리포트 생성

### 시나리오 2: API 로그 분석

```sql
SELECT * FROM api_logs 
| jwtdecode authorization 
| filter authorization_payload.role = 'admin' 
| stats count by endpoint 
| sort count desc 
| limit 10
```

**용도:**
- 관리자 권한의 API 호출 패턴 분석
- 가장 많이 사용되는 엔드포인트 파악

### 시나리오 3: 사용자 프로필 보강

```sql
SELECT user_id, session_token 
FROM user_sessions 
| jwtextract session_token fields=userId,email,role 
| enrich user_profiles on userId 
| select userId, email, role, profile_name, profile_avatar 
| exclude session_token
```

**용도:**
- JWT에서 기본 정보 추출
- 추가 프로필 정보로 보강
- 민감 정보(토큰) 제외

### 시나리오 4: AI 기반 고객 리뷰 분석 (🤖 NEW!)

```sql
SELECT review_id, customer_name, review_text, created_at
FROM customer_reviews
WHERE created_at > '2024-01-01'
| ai_sentiment review_text include_score=true include_aspects=true
| ai_summarize review_text max_length=100 style=brief
| filter review_text_sentiment = 'negative' AND review_text_sentiment_score < -0.5
| sort review_text_sentiment_score asc
| limit 20
```

**용도:**
- 부정적인 고객 리뷰 자동 감지
- 리뷰 요약으로 빠른 파악
- 우선 대응이 필요한 리뷰 식별

### 시나리오 5: 다국어 고객 문의 자동 분류 (🤖 NEW!)

```sql
SELECT ticket_id, customer_email, message_body
FROM support_tickets
WHERE status = 'open'
| ai_translate message_body target_lang="Korean"
| ai_classify message_body_translated categories="billing,technical,general,urgent"
| ai_extract message_body_translated fields="issue_summary,requested_action"
| filter message_body_translated_category IN ('urgent', 'billing')
| select ticket_id, customer_email, message_body_translated, 
         message_body_translated_category, issue_summary_extracted
```

**용도:**
- 다국어 고객 문의 자동 번역
- 문의 유형 자동 분류
- 핵심 정보 추출로 빠른 대응

### 시나리오 6: JWT + AI 복합 보안 분석 (🤖 NEW!)

```sql
SELECT session_id, user_agent, access_token, request_body, ip_address
FROM api_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
| jwtdecode access_token
| ai_classify user_agent categories="mobile,desktop,bot,suspicious" include_confidence=true
| ai_extract request_body fields="action,target_resource,parameters"
| ai_sentiment request_body include_score=true
| filter (user_agent_category = 'suspicious' AND user_agent_confidence > 0.8)
       OR access_token_decoded._expired = true
       OR request_body_sentiment_score < -0.7
| select session_id, user_agent_category, access_token_decoded, 
         action_extracted, request_body_sentiment
```

**용도:**
- AI 기반 이상 행동 패턴 감지
- 만료된 토큰 + 의심스러운 활동 조합 탐지
- 자동화된 보안 위협 분석

## 🔧 커스텀 명령어 추가하기

### 1. 새로운 명령어 정의

```typescript
// lib/custom-commands.ts
import { DataRow } from './types'

export const myCustomCommand = (data: DataRow[], args: any) => {
  return data.map(row => {
    // 데이터 변환 로직
    return {
      ...row,
      customField: processData(row, args)
    }
  })
}
```

### 2. 명령어 등록

```typescript
// Pipeline Executor에 등록
executor.registerCommand('mycustom', myCustomCommand)
```

### 3. 자동완성에 추가

```typescript
const PIPELINE_COMMANDS = [
  {
    name: 'mycustom',
    description: '커스텀 데이터 처리',
    syntax: 'mycustom <args>',
    example: 'SELECT * FROM table | mycustom param1'
  }
]
```

## 📊 JWT 디코딩 상세 예제

### JWT 토큰 구조

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 디코딩 후 결과

```json
{
  "id": 1,
  "username": "john_doe",
  "access_token": "eyJhbGci...",
  
  // jwtdecode 명령어로 추가된 필드들
  "access_token_header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "access_token_payload": {
    "sub": "1234567890",
    "name": "John Doe",
    "userId": 1,
    "email": "john@example.com",
    "role": "admin",
    "iat": 1516239022,
    "exp": 1747775022
  },
  "access_token_decoded": {
    "sub": "1234567890",
    "name": "John Doe",
    "userId": 1,
    "email": "john@example.com",
    "role": "admin",
    "iat": 1516239022,
    "exp": 1747775022,
    "_expired": false,
    "_expiresAt": "2025-05-20T12:30:22.000Z",
    "_issuedAt": "2018-01-18T01:30:22.000Z"
  }
}
```

## 🎨 UI 커스터마이징

### 에디터 테마 변경

```typescript
EditorView.theme({
  '&': {
    height: '400px',
    fontSize: '16px',
    backgroundColor: '#1e1e1e' // 다크 모드
  },
  '.cm-content': {
    fontFamily: '"Fira Code", "Monaco", monospace',
    color: '#d4d4d4'
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    borderRight: '1px solid #3e3e42'
  }
})
```

### 결과 테이블 스타일 변경

```typescript
// Tailwind CSS 클래스 수정
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
  {/* ... */}
</table>
```

## 🚀 성능 최적화

### 1. 대용량 데이터 처리

```typescript
// 웹 워커 사용
const worker = new Worker('/pipeline-worker.js')

worker.postMessage({ 
  query, 
  data: largeDataset 
})

worker.onmessage = (e) => {
  setResults(e.data)
}
```

### 2. 스트리밍 파이프라인

```typescript
async function* streamPipeline(data: DataRow[], commands: string[]) {
  let current = data
  
  for (const command of commands) {
    current = await executeCommand(current, command)
    yield current // 중간 결과 반환
  }
}
```

## 🔒 보안 고려사항

1. **JWT 시크릿 노출 방지**
   - 클라이언트에서는 디코딩만 수행 (검증 X)
   - 실제 검증은 백엔드에서 수행

2. **민감 데이터 필터링**
   ```sql
   SELECT * FROM users 
   | jwtdecode token 
   | exclude password,secret_key,private_data
   ```

3. **입력 검증**
   - 파이프라인 명령어 화이트리스트
   - SQL 인젝션 방지

## 📱 다음 단계

- [ ] 파이프라인 저장 및 재사용
- [ ] 실시간 쿼리 결과 업데이트
- [ ] 시각화 명령어 추가 (`| chart`, `| graph`)
- [ ] 엑셀/CSV 내보내기
- [ ] 쿼리 히스토리
- [ ] 협업 기능

## 🤝 기여하기

새로운 파이프라인 명령어나 기능 추가를 환영합니다!

## 📄 라이선스

MIT

---

**Made with ❤️ using Next.js 15 & CodeMirror 6**
