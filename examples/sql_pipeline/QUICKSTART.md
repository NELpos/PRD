# 🚀 Quick Start Guide

Next.js 15 + JWT 디코딩 + AI 파이프라인 SQL 에디터를 5분 안에 시작하세요!

## 📁 프로젝트 구조

```
sql-pipeline-editor/
├── app/
│   ├── page.tsx                          # 메인 페이지
│   ├── sql-editor/
│   │   └── page.tsx                      # SQL 에디터 페이지
│   └── api/
│       └── sql-pipeline/
│           └── route.ts                  # API 라우트 (파이프라인 실행)
├── components/
│   ├── SQLPipelineEditor.tsx             # 기본 에디터 컴포넌트
│   └── SQLPipelineEditorWithAI.tsx       # AI 기능 포함 에디터
├── lib/
│   ├── pipeline-executor.ts              # 파이프라인 실행 엔진
│   ├── ai-pipeline-commands.ts           # AI 명령어 구현
│   ├── advanced-pipeline-commands.ts     # 고급 파이프라인 명령어
│   └── types.ts                          # TypeScript 타입 정의
├── public/
│   └── examples/                         # 예제 쿼리 파일
├── .env.local                            # 환경 변수 (로컬)
├── .env.production                       # 환경 변수 (프로덕션)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── README.md                             # 메인 README
├── AI-PIPELINE-GUIDE.md                  # AI 파이프라인 상세 가이드
└── AWS-SETUP-GUIDE.md                    # AWS 설정 가이드
```

## ⚡ 3단계로 시작하기

### 1️⃣ 프로젝트 생성 및 의존성 설치

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest sql-pipeline-editor --typescript --tailwind --app

cd sql-pipeline-editor

# 필수 패키지 설치
npm install codemirror @codemirror/state @codemirror/view @codemirror/language \
  @codemirror/lang-sql @codemirror/autocomplete @codemirror/lint \
  @codemirror/commands @lezer/highlight

# AWS Bedrock SDK 설치 (AI 기능 사용 시)
npm install @aws-sdk/client-bedrock-runtime
```

### 2️⃣ 파일 복사

생성된 파일들을 다음 위치에 복사:

```bash
# 컴포넌트
cp sql-pipeline-editor-example.tsx app/page.tsx
cp SQLPipelineEditorWithAI.tsx components/

# 라이브러리
mkdir lib
cp pipeline-executor.ts lib/
cp ai-pipeline-commands.ts lib/
cp advanced-pipeline-commands.ts lib/

# API 라우트
mkdir -p app/api/sql-pipeline
cp api-route-example.ts app/api/sql-pipeline/route.ts
```

### 3️⃣ 환경 변수 설정 (AI 기능 사용 시)

```bash
# .env.local 파일 생성
cat > .env.local << EOF
# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
EOF
```

### 4️⃣ 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속!

## 🎯 기능별 시작 가이드

### JWT 디코딩만 사용하기 (AI 없이)

가장 간단한 시작 방법:

```typescript
// app/page.tsx
import SQLPipelineEditor from './sql-pipeline-editor-example'

export default function Page() {
  return <SQLPipelineEditor />
}
```

**필요한 파일:**
- ✅ `sql-pipeline-editor-example.tsx`
- ✅ CodeMirror 패키지들
- ❌ AWS SDK (불필요)
- ❌ 환경 변수 (불필요)

**사용 가능한 명령어:**
- `jwtdecode` - JWT 토큰 디코딩
- `jwtextract` - JWT 필드 추출
- `jwtvalidate` - JWT 검증
- `filter`, `select`, `exclude`, `sort`, `limit`

**예제 쿼리:**
```sql
SELECT * FROM users | jwtdecode access_token
```

### AI 기능 포함 (풀 버전)

AWS Bedrock 설정 후 모든 기능 사용:

```typescript
// app/page.tsx
import SQLPipelineEditorWithAI from '@/components/SQLPipelineEditorWithAI'

export default function Page() {
  return <SQLPipelineEditorWithAI />
}
```

**필요한 설정:**
1. ✅ AWS Bedrock 계정
2. ✅ Claude Haiku 4.5 모델 접근 권한
3. ✅ 환경 변수 설정
4. ✅ 모든 의존성 설치

**추가 명령어:**
- `ai_transform` - AI 변환
- `ai_extract` - 데이터 추출
- `ai_classify` - 분류
- `ai_summarize` - 요약
- `ai_translate` - 번역
- `ai_sentiment` - 감정 분석

**예제 쿼리:**
```sql
SELECT * FROM reviews 
| ai_sentiment review_text include_score=true
| filter review_text_sentiment = 'negative'
```

## 📝 첫 번째 쿼리 작성하기

### 예제 1: JWT 토큰 디코딩

```sql
-- 사용자의 JWT 토큰 디코딩
SELECT * FROM users | jwtdecode access_token
```

**결과:**
- 원본 데이터 유지
- `access_token_header`: JWT 헤더
- `access_token_payload`: JWT 페이로드
- `access_token_decoded`: 디코딩된 정보 + 만료 여부

### 예제 2: 만료된 토큰 찾기

```sql
-- 만료된 토큰을 가진 세션 찾기
SELECT session_id, user_id, access_token 
FROM sessions 
| jwtvalidate access_token 
| filter access_token_validation.isExpired = true
```

### 예제 3: AI 감정 분석 (AWS 설정 필요)

```sql
-- 부정적인 리뷰만 필터링
SELECT * FROM customer_reviews 
| ai_sentiment review_text include_score=true
| filter review_text_sentiment = 'negative'
| sort review_text_sentiment_score asc
```

### 예제 4: 복합 파이프라인

```sql
-- JWT 디코딩 + AI 분류 + 필터링
SELECT * FROM api_logs 
| jwtdecode authorization 
| ai_classify user_agent categories="mobile,desktop,bot,suspicious"
| filter user_agent_category = 'suspicious' 
       OR authorization_decoded._expired = true
```

## 🔧 커스터마이제이션

### 자신만의 파이프라인 명령어 추가

```typescript
// lib/custom-commands.ts
export const myCustomCommand = (data: DataRow[], args: any) => {
  return data.map(row => ({
    ...row,
    myCustomField: processData(row, args)
  }))
}

// Pipeline Executor에 등록
executor.registerCommand('mycustom', myCustomCommand)
```

### 사용법:
```sql
SELECT * FROM table | mycustom param1=value1
```

## 🎨 UI 커스터마이징

### 에디터 테마 변경

```typescript
EditorView.theme({
  '&': {
    height: '400px',
    fontSize: '16px',
    backgroundColor: '#1e1e1e'  // 다크 모드
  },
  '.cm-content': {
    fontFamily: '"Fira Code", monospace',
    color: '#d4d4d4'
  }
})
```

### Tailwind 스타일 변경

```typescript
// 버튼 스타일
className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
```

## 📚 다음 단계

### 학습 자료

1. **기본 가이드**
   - [README.md](./README.md) - 전체 기능 소개
   - 예제 쿼리 실행해보기

2. **AI 기능**
   - [AI-PIPELINE-GUIDE.md](./AI-PIPELINE-GUIDE.md) - AI 명령어 상세 가이드
   - [AWS-SETUP-GUIDE.md](./AWS-SETUP-GUIDE.md) - AWS Bedrock 설정

3. **고급 기능**
   - [advanced-pipeline-commands.ts](./advanced-pipeline-commands.ts) - 고급 명령어
   - [pipeline-tests.ts](./pipeline-tests.ts) - 테스트 예제

### 실전 프로젝트 아이디어

1. **보안 대시보드**
   - JWT 토큰 만료 모니터링
   - 의심스러운 활동 탐지
   - 실시간 보안 알림

2. **고객 서비스 자동화**
   - 문의 자동 분류
   - 감정 분석 기반 우선순위 설정
   - 다국어 지원

3. **콘텐츠 관리**
   - 기사 자동 요약
   - 카테고리 자동 분류
   - SEO 메타 데이터 생성

4. **데이터 분석**
   - 로그 분석 및 인사이트 추출
   - 이상 패턴 감지
   - 트렌드 분석

## 🐛 트러블슈팅

### 문제: CodeMirror가 표시되지 않음

**해결:**
```bash
npm install codemirror @codemirror/state @codemirror/view
```

### 문제: AI 명령어 실행 시 에러

**원인:** AWS Bedrock 설정 누락

**해결:**
1. `.env.local` 파일 확인
2. AWS credentials 유효성 검증
3. Bedrock 모델 접근 권한 확인

```bash
# AWS 연결 테스트
aws bedrock list-foundation-models --region us-east-1
```

### 문제: JWT 디코딩 실패

**원인:** 잘못된 JWT 형식

**해결:**
- JWT가 세 부분(헤더.페이로드.서명)으로 구성되어 있는지 확인
- Base64 URL 인코딩 형식인지 확인

### 문제: 파이프라인 구문 에러

**해결:**
```sql
-- ❌ 잘못된 예
SELECT * FROM users jwtdecode token

-- ✅ 올바른 예
SELECT * FROM users | jwtdecode token
```

## 💡 Pro Tips

1. **성능 최적화**
   ```sql
   -- 필터링을 먼저 하고 AI 처리
   SELECT * FROM large_table 
   | filter created_at > '2024-01-01'
   | limit 100
   | ai_sentiment review_text
   ```

2. **비용 절감**
   ```sql
   -- batch_size 조정으로 효율성 향상
   | ai_transform content prompt="..." batch_size=10
   ```

3. **디버깅**
   - `select` 명령어로 필요한 컬럼만 확인
   - 단계별로 파이프라인 실행 (주석 활용)

4. **재사용성**
   - 자주 사용하는 쿼리를 저장
   - 커스텀 명령어로 복잡한 로직 캡슐화

## 🆘 도움이 필요하신가요?

- 📖 **문서**: README.md, AI-PIPELINE-GUIDE.md, AWS-SETUP-GUIDE.md
- 💬 **예제**: pipeline-tests.ts의 테스트 케이스 참조
- 🔧 **설정**: .env.local 파일 확인

## 🎉 완료!

이제 JWT 디코딩과 AI 파이프라인을 활용한 강력한 SQL 에디터를 사용할 준비가 되었습니다!

**첫 번째 쿼리를 실행해보세요:**

```sql
SELECT * FROM users | jwtdecode access_token
```

Happy coding! 🚀
