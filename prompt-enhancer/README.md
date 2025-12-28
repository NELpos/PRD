# Prompt Enhancer System

한글 요청을 Claude AI가 이해하기 쉬운 최적화된 영어 프롬프트로 자동 변환하는 시스템입니다.

## 📚 문서 목록

### Product Requirements Documents (PRDs)

1. **[Prompt Enhancer - Next.js Implementation](./prd-nextjs.md)**
   - Next.js 15 기반 프롬프트 최적화 웹 애플리케이션
   - 실시간 프롬프트 변환 및 프리뷰
   - Vercel AI SDK 통합

2. **[Prompt Enhancer - Python Implementation](./prd-python.md)**
   - Python FastAPI 기반 프롬프트 최적화 API
   - CLI 도구 및 배치 처리
   - LangChain 통합

## 🛠 주요 기술 스택

### Next.js Version
- Next.js 15, React 19
- Vercel AI SDK 5.0
- Tailwind CSS
- Amazon Bedrock (Claude)

### Python Version
- Python 3.11+
- FastAPI
- LangChain
- Click (CLI)

## 💡 핵심 기능

### 프롬프트 최적화 원칙

1. **XML 구조화**
   - `<task>`, `<instructions>`, `<requirements>` 등 명확한 섹션 구분
   - Claude가 이해하기 쉬운 구조

2. **토큰 효율성**
   - 영어 프롬프트 사용으로 30% 토큰 절감
   - 불필요한 표현 제거

3. **명확한 지시사항**
   - 모호한 표현 제거
   - 구체적이고 실행 가능한 요구사항

4. **도메인 특화**
   - 코드 작업용 최적화
   - 데이터 분석용 최적화
   - 문서 작성용 최적화

## 🔗 관련 리소스

- [Claude Code 커스텀 명령어](../.claude/commands/)
  - `/enhance` - 범용 프롬프트 최적화
  - `/enhance-code` - 코드 작업 전용
  - `/enhance-analysis` - 데이터 분석 전용

## 📊 예상 효과

- ⚡ 작업 시간 **60% 단축**
- 💰 토큰 사용 **30% 절감**
- 🎯 첫 시도 성공률 **80%+**
- 🤝 팀 일관성 확보

## 🎯 사용 사례

### Before (한글 프롬프트)
```
FastAPI로 REST API 만들어줘
```

### After (최적화된 영어 프롬프트)
```xml
<task>
Implement a RESTful API using FastAPI framework
</task>

<requirements>
- Use FastAPI 0.100+ with async/await pattern
- Include CRUD operations for core resources
- Add request/response validation with Pydantic models
- Implement proper error handling and HTTP status codes
- Include API documentation with OpenAPI/Swagger
</requirements>

<output_format>
- Complete Python code with type hints
- Directory structure explanation
- Respond in Korean for explanations
</output_format>
```

## 🚀 워크플로우

1. **한글 요청 입력**: 사용자가 자연스러운 한글로 요청
2. **프롬프트 분석**: 작업 유형, 도메인, 복잡도 파악
3. **XML 구조화**: 최적의 XML 구조로 변환
4. **영어 변환**: 기술 용어와 명확한 지시사항으로 변환
5. **검증 및 개선**: 토큰 효율성 및 명확성 검증
