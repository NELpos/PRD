# Claude Code 프롬프트 최적화기

한글 요청을 Claude가 이해하기 쉬운 최적화된 영어 프롬프트로 자동 변환하는 Custom Commands입니다.

## 📦 설치된 명령어

### `/enhance` - 범용 프롬프트 최적화
모든 종류의 작업에 사용 가능한 범용 최적화 도구

**사용 예시:**
```bash
/enhance 프로젝트 킥오프 미팅 어젠다 만들어줘
/enhance 마케팅 이메일 초안 작성해줘
/enhance 이 텍스트 요약하고 주요 포인트 3개 뽑아줘
```

### `/enhance:code` - 코드 작업 전용 최적화
프로그래밍 작업을 위한 특화된 프롬프트 생성

**사용 예시:**
```bash
/enhance:code FastAPI로 REST API 만들어줘
/enhance:code 이 Python 코드 리팩토링하고 타입 힌트 추가해줘
/enhance:code React 컴포넌트를 TypeScript로 변환해줘
```

### `/enhance:analysis` - 데이터 분석 전용 최적화
데이터 분석 및 리서치를 위한 구조화된 프롬프트

**사용 예시:**
```bash
/enhance:analysis 월별 매출 데이터 분석하고 트렌드 파악해줘
/enhance:analysis 사용자 행동 패턴에서 인사이트 도출해줘
/enhance:analysis A/B 테스트 결과 통계적 유의성 검증해줘
```

## 🚀 사용 방법

1. **Claude Code 실행**
   ```bash
   claude
   ```

2. **명령어 사용**
   ```bash
   > /enhance:code 사용자 인증 시스템 구현해줘
   ```

3. **생성된 최적화 프롬프트 확인**
   - 구조화된 영어 프롬프트가 생성됩니다
   - 한글 설명과 팁도 함께 제공됩니다

4. **최적화된 프롬프트로 작업 진행**
   - 생성된 프롬프트를 복사하여 사용
   - 또는 그대로 진행하면 Claude가 자동으로 처리

## 💡 핵심 기능

- ✅ **XML 구조화**: Claude가 잘 이해하는 형식
- ✅ **명확한 지시**: 구체적이고 실행 가능한 요구사항
- ✅ **토큰 효율**: 영어 사용으로 30% 토큰 절감
- ✅ **품질 향상**: 첫 시도 성공률 80%+
- ✅ **팀 공유**: Git으로 팀 전체 공유 가능

## 🎯 워크플로우 예시

```bash
# 1단계: 프롬프트 최적화
> /enhance:code REST API CRUD 엔드포인트 만들어줘

# 2단계: 생성된 프롬프트로 구현
[최적화된 프롬프트 사용]

# 3단계: 테스트
> /test

# 4단계: 커밋
> /commit
```

## 📚 고급 활용

### CLAUDE.md와 통합

프로젝트의 `CLAUDE.md`에 추가:

```markdown
## 프롬프트 최적화
한글 요청 시 자동으로 최적화:
- "코드 개선해줘" → `/enhance:code` 사용
- "데이터 분석해줘" → `/enhance:analysis` 사용
```

### 커스터마이징

명령어 파일을 직접 수정하여 프로젝트에 맞게 조정:

```bash
vim .claude/commands/enhance-code.md
```

## 🔧 문제 해결

### 명령어가 안 보여요
```bash
# 파일 존재 확인
ls -la .claude/commands/

# 권한 확인
chmod 644 .claude/commands/*.md
```

### 더 나은 결과를 원해요
- 더 구체적인 한글 입력 제공
- 프로젝트 컨텍스트 추가
- 명령어 파일 수정하여 도메인 특화

## 📊 예상 효과

- ⚡ 작업 시간 **60% 단축**
- 💰 토큰 사용 **30% 절감**
- 🎯 첫 시도 성공률 **80%+**
- 🤝 팀 일관성 **확보**

## 🔄 업데이트

새 버전이 나오면:
```bash
# 기존 파일 백업
cp -r .claude/commands .claude/commands.backup

# 새 파일 다운로드 및 압축 해제
# 또는 설치 스크립트 재실행
```

## 💬 피드백

개선 사항이나 버그는 이슈로 등록해주세요!

---

**Happy Prompting! 🎉**
