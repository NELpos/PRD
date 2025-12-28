# Snowflake Integration PRDs

Snowflake 데이터 웨어하우스 통합 및 보안 분석 시스템 관련 프로젝트 문서 모음입니다.

## 📚 문서 목록

### Product Requirements Documents (PRDs)

1. **[Snowflake Authentication System](./prd-authentication.md)**
   - Snowflake 인증 시스템 설계 및 구현
   - OAuth, Key Pair, SSO 인증 방식
   - 보안 모범 사례

2. **[Splunk-Snowflake Table Discovery](./prd-splunk-table-discovery.md)**
   - Splunk와 Snowflake 간 테이블 자동 검색
   - 메타데이터 동기화
   - 스키마 매핑 자동화

3. **[SQL Pipeline for Security Event Analysis](./prd-sql-pipeline-security.md)**
   - 보안 이벤트 분석용 클라이언트 측 파이프라인
   - 위협 인텔리전스 통합
   - AI 기반 패턴 탐지

### Implementation Guides

4. **[Node.js SDK Guide](./guide-nodejs-sdk.md)**
   - Snowflake Node.js SDK 완벽 가이드
   - 연결 관리 및 쿼리 실행
   - 에러 핸들링 및 베스트 프랙티스

5. **[Session State Management](./guide-session-state.md)**
   - Snowflake 세션 상태 관리
   - `getSessionState()` API 상세 가이드
   - 세션 복원 및 디버깅

### System Prompts

6. **[SQL System Prompt](./system-prompt-sql.md)**
   - AI 기반 SQL 생성을 위한 시스템 프롬프트
   - Snowflake SQL 방언 최적화
   - 쿼리 생성 가이드라인

## 🛠 주요 기술 스택

- **Database**: Snowflake Data Warehouse
- **Languages**: SQL, JavaScript/TypeScript, Python
- **SDK**: Snowflake Node.js SDK, Snowflake Python Connector
- **Authentication**: OAuth 2.0, Key Pair, SSO (Okta, Azure AD)
- **Integration**: Splunk, AWS, Security Tools

## 🔗 관련 리소스

- [SQL Pipeline 구현 예제](../examples/sql_pipeline/)
- [Text-to-SQL PRD](../sql-pipeline/prd-text-to-sql.md)

## 💡 주요 사용 사례

1. **보안 이벤트 분석**: 대규모 로그 데이터에서 위협 탐지
2. **데이터 통합**: 다양한 소스의 데이터를 Snowflake로 통합
3. **실시간 대시보드**: BI 도구와 Snowflake 연동
4. **규정 준수**: 감사 로그 및 데이터 거버넌스
