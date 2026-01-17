# Code Review Skill

**Tidy First**와 **Modern Software Engineering** 원칙을 기반으로 한 Claude Code 범용 코드 리뷰 Skill입니다.

## 개요

이 Skill은 다음 원칙들을 체계적으로 적용하여 코드를 검토합니다:

### Tidy First 4가지 원칙
1. **Guard Clauses** - 조기 반환으로 중첩 제거
2. **Extract Function** - 긴 함수를 작은 함수로 분리
3. **High Cohesion** - 관련된 기능끼리 묶기
4. **Low Coupling** - 의존성 최소화

### Modern Software Engineering 5가지 원칙
1. **Modularity** - 독립적인 모듈로 구성
2. **Cohesion** - 관련된 기능끼리 응집
3. **Separation of Concerns** - 관심사의 분리
4. **Information Hiding** - 정보 은닉과 캡슐화
5. **Coupling** - 최소한의 의존성

## 설치

### 1. Claude Code Skill로 설치

이 디렉토리를 Claude Code의 skill 디렉토리에 복사합니다:

```bash
# macOS/Linux
mkdir -p ~/.claude/skills
cp -r code-review-skill ~/.claude/skills/

# Windows
mkdir %USERPROFILE%\.claude\skills
xcopy /E /I code-review-skill %USERPROFILE%\.claude\skills\code-review-skill
```

### 2. 복잡도 분석 스크립트 사용 (선택)

복잡도 분석 스크립트를 사용하려면 TypeScript가 필요합니다:

```bash
# 프로젝트에 이미 TypeScript가 있다면 바로 사용 가능
pnpm install -D ts-node typescript

# 또는 전역 설치
npm install -g ts-node typescript
```

## 사용법

### 기본 사용 (한국어 프롬프트)

Claude Code에서 다음과 같은 한국어 명령어를 사용하면 자동으로 Skill이 트리거됩니다:

```
코드 리뷰해줘
이 코드 어때?
리팩토링 제안해줘
코드 품질 확인해줘
결합도 낮춰줘
중첩된 if문 제거해줘
이 코드 문제점 찾아줘
PR 리뷰해줘
```

또는 명령어로:
```
/review
/code-review
/리뷰
```

### 사용 예시

#### 1. 단일 파일 리뷰
```
사용자: "lib/utils.ts 코드 좀 봐줘"

Claude:
[Skill 자동 트리거]
- 파일 읽기
- Tidy First 4가지 원칙 적용
- 발견 사항 우선순위 부여
- 한글 리포트 생성
```

#### 2. Pull Request 리뷰
```
사용자: "PR #123 머지 전에 검토해줘"

Claude:
[Skill 자동 트리거]
- gh pr diff 실행
- 변경된 파일 목록 추출
- 각 파일 리뷰
- 통합 리포트 생성
```

#### 3. 프로젝트 전체 분석
```
사용자: "프로젝트 전체 코드 품질 어때?"

Claude:
[Skill 자동 트리거]
- 모든 소스 파일 스캔
- Tidy First + Modern SE 원칙 적용
- Top 10 이슈 리스트
- 전체 품질 점수 제공
```

#### 4. 특정 원칙만 검토
```
사용자: "이 코드 결합도만 확인해줘"

Claude:
[Low Coupling 원칙만 적용하여 리뷰]
```

### 복잡도 분석 스크립트 사용

프로젝트의 복잡도를 자동으로 분석할 수 있습니다:

```bash
# 단일 파일 분석
ts-node scripts/analyze-complexity.ts src/components/Calculator.tsx

# 디렉토리 전체 분석
ts-node scripts/analyze-complexity.ts src/

# 임계값 지정 (기본값: 10)
ts-node scripts/analyze-complexity.ts src/ --threshold 15
```

**출력 예시**:
```
================================================================================
복잡도 분석 결과 (임계값: 10 이상)
================================================================================

⚠️  복잡도 10 이상 함수: 3개

순위   함수명                              파일:줄                                      복잡도    라인      중첩
----------------------------------------------------------------------------------------------------
1      processOrder                        OrderService.ts:45                          15        48        3
2      calculateDiscount                   PriceCalculator.ts:120                      12        35        2
3      validateUserInput                   UserForm.tsx:78                             11        28        2

================================================================================
통계 정보
================================================================================
총 함수 수: 45
평균 복잡도: 6.2
평균 라인 수: 18.5
최대 복잡도: 15

복잡도 분포:
  단순 (1-10):        42개 (93.3%)
  보통 (11-20):        3개 (6.7%)
  복잡 (21-50):        0개 (0.0%)
  매우 복잡 (51+):     0개 (0.0%)

================================================================================
권장 사항
================================================================================
⚠️  보통 복잡도 함수가 있습니다. 리팩토링을 권장합니다.
```

## 디렉토리 구조

```
code-review-skill/
├── SKILL.md                          # 핵심 워크플로우 (Claude가 읽음)
├── README.md                         # 이 파일
├── references/                       # 상세 참고 문서
│   ├── tidy-first.md                 # Tidy First 4가지 원칙 체크리스트
│   ├── modern-engineering.md         # Modern SE 5가지 원칙 체크리스트
│   ├── language-guides/              # 언어별 가이드 (확장 가능)
│   │   ├── typescript.md
│   │   ├── python.md
│   │   └── javascript.md
│   └── framework-guides/             # 프레임워크별 가이드 (확장 가능)
│       ├── react.md
│       └── nextjs.md
├── scripts/                          # 자동화 도구
│   └── analyze-complexity.ts         # TypeScript 복잡도 분석
└── assets/                           # 템플릿
    ├── review-template.md            # 리뷰 리포트 템플릿
    └── priority-matrix.md            # 우선순위 매트릭스
```

## 리뷰 결과 예시

```markdown
# 코드 리뷰 결과

## 요약
- 검토 파일: 3개
- 발견 사항: High 2개, Medium 5개, Low 1개
- 전체 품질 점수: Tidy First 준수율 75%, Modern SE 준수율 82%

## High Priority Issues

### 1. [UserService.ts:45] Low Coupling 미적용

**분류**: Tidy First - Low Coupling

**문제점**:
UserService가 구체적인 Database 클래스에 직접 의존하여 테스트가 어렵습니다.

**개선 제안**:

**Before**:
```typescript
class UserService {
  private db: Database

  constructor() {
    this.db = new Database() // 강한 결합
  }
}
```

**After**:
```typescript
interface IDatabase {
  query(sql: string): any[]
}

class UserService {
  constructor(private db: IDatabase) {} // 의존성 주입
}
```

**개선 효과**:
- ✅ 테스트 시 Mock 객체 사용 가능
- ✅ Database 구현 교체 용이
- ✅ 의존성 역전 원칙(DIP) 적용
```

## 확장하기

### 새 언어 추가

`references/language-guides/` 아래에 파일을 추가하면 자동으로 감지됩니다:

```bash
# 예: Go 언어 가이드 추가
touch references/language-guides/go.md
```

SKILL.md는 수정할 필요 없이 자동으로 해당 언어를 감지합니다.

### 새 프레임워크 추가

`references/framework-guides/` 아래에 파일을 추가합니다:

```bash
# 예: Vue 프레임워크 가이드 추가
touch references/framework-guides/vue.md
```

## 라이선스

MIT License

---

**이 Skill은 다른 프로젝트에 바로 적용할 수 있는 범용 코드 리뷰 도구입니다!**
