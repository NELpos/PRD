# Claude Code Lessons Learned → LangGraph 적용 가이드

> Anthropic이 Claude Code를 개발하면서 검증한 에이전트 패턴을 LangGraph 백엔드에 적용하는 방법

---

## 목차

1. [왜 Claude Code 패턴을 배워야 하는가?](#1-왜-claude-code-패턴을-배워야-하는가)
2. [Lesson 1: Explore → Plan → Execute → Verify 워크플로우](#lesson-1-explore--plan--execute--verify-워크플로우)
3. [Lesson 2: CLAUDE.md 패턴 → Agent Context Provider](#lesson-2-claudemd-패턴--agent-context-provider)
4. [Lesson 3: 검증 가능한 목표 (TDD 패턴)](#lesson-3-검증-가능한-목표-tdd-패턴)
5. [Lesson 4: Extended Thinking 레벨 시스템](#lesson-4-extended-thinking-레벨-시스템)
6. [Lesson 5: Subagents & 병렬화 패턴](#lesson-5-subagents--병렬화-패턴)
7. [Lesson 6: Context Management](#lesson-6-context-management)
8. [종합: Production-Ready 그래프](#종합-production-ready-그래프)
9. [적용 체크리스트](#적용-체크리스트)

---

## 1. 왜 Claude Code 패턴을 배워야 하는가?

### Claude Agent SDK vs LangGraph 선택 기준

| 구분 | Claude Agent SDK | LangGraph |
|------|------------------|-----------|
| **실행 환경** | 사용자 로컬 컴퓨터 | 서버 (클라우드) |
| **주요 목적** | 컴퓨터 제어/자동화 | 워크플로우 오케스트레이션 |
| **LLM 지원** | Claude 전용 | 모든 LLM (범용) |
| **배포 형태** | CLI, 데스크탑 앱 | API 서버 |
| **사용 시나리오** | Claude Code, IDE 플러그인 | 웹 서비스 백엔드, 챗봇 API |

**웹 서비스 백엔드를 만든다면 → LangGraph 사용**

**하지만 Claude Code의 설계 철학과 패턴은 LangGraph에도 적용 가능!**

### Claude Code에서 배운 핵심 원칙

```
┌─────────────────────────────────────────────────────────────────┐
│           Claude Code에서 배운 핵심 원칙들                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. "Explore → Plan → Code → Commit" 워크플로우                  │
│     └─ 바로 실행하지 말고, 먼저 탐색하고 계획하라                  │
│                                                                  │
│  2. CLAUDE.md 패턴                                               │
│     └─ 에이전트에게 지속적인 컨텍스트를 제공하라                   │
│                                                                  │
│  3. 검증 가능한 목표 (Tests, Screenshots)                        │
│     └─ 에이전트가 스스로 결과를 검증할 수 있게 하라                │
│                                                                  │
│  4. Extended Thinking ("think harder", "ultrathink")             │
│     └─ 복잡한 문제는 더 깊이 생각하게 하라                        │
│                                                                  │
│  5. Subagents & Parallelization                                  │
│     └─ 큰 작업은 분할하고 병렬로 처리하라                         │
│                                                                  │
│  6. Context Management (/clear, compaction)                      │
│     └─ 컨텍스트를 적극적으로 관리하라                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lesson 1: Explore → Plan → Execute → Verify 워크플로우

### Claude Code에서 배운 것

> "Steps #1-#2 are crucial—without them, Claude tends to jump straight to coding a solution."
> — Anthropic Engineering Blog

**문제**: LLM은 요청을 받으면 바로 실행하려고 함 → 잘못된 방향으로 갈 확률 높음

**해결**: 명시적으로 단계를 분리

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ EXPLORE  │───▶│   PLAN   │───▶│ EXECUTE  │───▶│  VERIFY  │
│          │    │          │    │          │    │          │
│ 코드작성 │    │ think    │    │ 계획대로 │    │ 기준대비 │
│ 금지!    │    │ harder   │    │ 실행     │    │ 검증     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### LangGraph 적용 코드

```python
from typing import TypedDict, Literal, List
from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
import json

class TaskState(TypedDict):
    query: str
    explored_context: List[dict]
    plan: dict
    plan_approved: bool
    execution_result: str
    verification_result: dict
    final_output: str

llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")

# ============================================
# Phase 1: EXPLORE (탐색) - 코드 작성 금지!
# ============================================
async def explore_node(state: TaskState) -> dict:
    """
    Claude Code 교훈: "explicitly tell it not to write any code just yet"
    """
    explore_prompt = f"""
당신은 분석 전문가입니다. 다음 요청을 분석하세요.

요청: {state["query"]}

**중요: 이 단계에서는 절대로 해결책을 제시하거나 코드를 작성하지 마세요.**

대신 다음을 수행하세요:
1. 이 요청을 완수하기 위해 필요한 정보가 무엇인지 파악
2. 어떤 데이터/컨텍스트가 필요한지 목록화
3. 잠재적인 제약 조건이나 엣지 케이스 식별
4. 유사한 문제가 어떻게 해결되었는지 조사 필요 여부 판단

JSON 형식으로 응답:
{{
    "understanding": "요청에 대한 이해",
    "required_information": ["필요한 정보1", "필요한 정보2"],
    "constraints": ["제약1", "제약2"],
    "questions": ["명확화가 필요한 질문들"],
    "similar_patterns_to_research": ["조사할 패턴들"]
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": explore_prompt}])
    explored = json.loads(response.content)
    return {"explored_context": [explored]}

# ============================================
# Phase 2: PLAN (계획) - Extended Thinking 활용
# ============================================
async def plan_node(state: TaskState) -> dict:
    """
    Claude Code 교훈: "use the word 'think' to trigger extended thinking mode"
    """
    context = state["explored_context"]
    
    plan_prompt = f"""
think harder

# 계획 수립

## 탐색 결과
{json.dumps(context, indent=2, ensure_ascii=False)}

## 원본 요청
{state["query"]}

## 지시사항
위 탐색 결과를 바탕으로 상세한 실행 계획을 수립하세요.
**아직 실행하지 마세요. 계획만 세우세요.**

JSON 형식으로 응답:
{{
    "approach": "선택한 접근 방식 설명",
    "steps": [
        {{
            "step": 1,
            "action": "수행할 작업",
            "expected_output": "예상 결과",
            "verification": "검증 방법"
        }}
    ],
    "risks": ["리스크1", "리스크2"],
    "confidence": 0.85
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": plan_prompt}])
    plan = json.loads(response.content)
    return {"plan": plan}

# ============================================
# Phase 3: EXECUTE (실행)
# ============================================
async def execute_node(state: TaskState) -> dict:
    """계획된 단계를 순차적으로 실행"""
    plan = state["plan"]
    
    execute_prompt = f"""
# 실행 단계

## 승인된 계획
{json.dumps(plan, indent=2, ensure_ascii=False)}

위 계획의 각 단계를 순서대로 실행하세요.
각 단계 실행 후 예상 결과와 실제 결과를 비교하세요.
"""
    response = await llm.ainvoke([{"role": "user", "content": execute_prompt}])
    return {"execution_result": response.content}

# ============================================
# Phase 4: VERIFY (검증)
# ============================================
async def verify_node(state: TaskState) -> dict:
    """결과 검증"""
    verify_prompt = f"""
# 결과 검증

## 원본 요청
{state["query"]}

## 실행 결과
{state["execution_result"]}

다음을 확인하세요:
1. 원본 요청의 모든 요구사항이 충족되었는가?
2. 예상치 못한 부작용은 없는가?
3. 결과물의 품질은 적절한가?

JSON 형식:
{{
    "all_requirements_met": true/false,
    "quality_score": 8.5,
    "issues_found": [],
    "recommendation": "approve/revise/reject"
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": verify_prompt}])
    verification = json.loads(response.content)
    return {"verification_result": verification}

# ============================================
# 그래프 구성
# ============================================
def create_explore_plan_execute_graph():
    graph = StateGraph(TaskState)
    
    graph.add_node("explore", explore_node)
    graph.add_node("plan", plan_node)
    graph.add_node("execute", execute_node)
    graph.add_node("verify", verify_node)
    
    graph.add_edge(START, "explore")
    graph.add_edge("explore", "plan")
    graph.add_edge("plan", "execute")
    graph.add_edge("execute", "verify")
    graph.add_edge("verify", END)
    
    return graph.compile()
```

---

## Lesson 2: CLAUDE.md 패턴 → Agent Context Provider

### Claude Code에서 배운 것

> "CLAUDE.md is a special file that Claude automatically pulls into context when starting a conversation."

**CLAUDE.md에 포함되는 것들:**
- Common bash commands
- Core files and utility functions
- Code style guidelines
- Testing instructions
- Repository etiquette
- Any unexpected behaviors or warnings

**문제**: 매 요청마다 에이전트가 프로젝트 컨텍스트를 모름

**해결**: 지속적인 컨텍스트를 시스템 프롬프트처럼 주입

### LangGraph 적용 코드

```python
from typing import Optional, List
from pydantic import BaseModel
from pathlib import Path
import yaml

class AgentContext(BaseModel):
    """CLAUDE.md 역할을 하는 에이전트 컨텍스트"""
    
    project_name: str
    description: str
    code_style: dict
    available_tools: List[str]
    forbidden_actions: List[str]
    common_commands: dict
    domain_knowledge: dict
    lessons_learned: List[dict]  # 실수에서 배운 교훈
    
    def to_system_prompt(self) -> str:
        """시스템 프롬프트로 변환"""
        return f"""
# 프로젝트 컨텍스트

## 프로젝트: {self.project_name}
{self.description}

## 코드 스타일
{yaml.dump(self.code_style, allow_unicode=True)}

## 사용 가능한 도구
{chr(10).join(f"- {tool}" for tool in self.available_tools)}

## 금지된 행동 (절대 하지 마세요)
{chr(10).join(f"- ❌ {action}" for action in self.forbidden_actions)}

## 도메인 지식
{yaml.dump(self.domain_knowledge, allow_unicode=True)}

## 이전 실수에서 배운 교훈
{chr(10).join(f"- [{l['date']}] {l['lesson']}" for l in self.lessons_learned)}
"""

class AgentContextManager:
    """에이전트 컨텍스트 관리자"""
    
    def __init__(self, config_path: str = "agent_context.yaml"):
        self.config_path = Path(config_path)
        self._context: Optional[AgentContext] = None
    
    def load(self) -> AgentContext:
        if self._context is None:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    data = yaml.safe_load(f)
                self._context = AgentContext(**data)
            else:
                self._context = self._create_default()
        return self._context
    
    def add_lesson(self, lesson: str, category: str = "general"):
        """
        실수에서 배운 교훈 추가
        Claude Code의 # 기능과 유사
        """
        from datetime import datetime
        context = self.load()
        context.lessons_learned.append({
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": category,
            "lesson": lesson
        })
        self._save()
    
    def _save(self):
        with open(self.config_path, 'w') as f:
            yaml.dump(self._context.dict(), f, allow_unicode=True)
    
    def _create_default(self) -> AgentContext:
        return AgentContext(
            project_name="My AI Agent",
            description="AI 에이전트 백엔드 서비스",
            code_style={"language": "python", "formatter": "black"},
            available_tools=["web_search", "database_query"],
            forbidden_actions=["사용자 데이터 외부 전송", "확인 없이 데이터 삭제"],
            common_commands={"테스트": "pytest -v"},
            domain_knowledge={},
            lessons_learned=[]
        )

# 사용 예시
context_manager = AgentContextManager()

def create_agent_with_context(tools: list):
    context = context_manager.load()
    return create_react_agent(
        model=ChatAnthropic(model="claude-sonnet-4-5-20250929"),
        tools=tools,
        prompt=context.to_system_prompt()
    )

# 운영 중 발견한 이슈 학습
context_manager.add_lesson(
    "날짜 파싱 시 항상 timezone을 명시해야 함",
    category="datetime"
)
```

### agent_context.yaml 예시

```yaml
project_name: "E-commerce AI Agent"
description: "이커머스 고객 지원 및 분석 에이전트"

code_style:
  language: python
  formatter: black
  type_hints: required

available_tools:
  - web_search: 상품 정보 검색
  - order_lookup: 주문 조회
  - inventory_check: 재고 확인

forbidden_actions:
  - 고객 결제 정보 로깅
  - 주문 자동 취소 (반드시 확인 필요)

domain_knowledge:
  business_hours: "09:00-18:00 KST"
  return_policy: "구매 후 7일 이내"

lessons_learned:
  - date: "2025-01-15"
    category: "order"
    lesson: "주문번호는 항상 대문자로 변환해서 조회해야 함"
```

---

## Lesson 3: 검증 가능한 목표 (TDD 패턴)

### Claude Code에서 배운 것

> "Claude performs best when it has a clear target to iterate against—a visual mock, a test case, or another kind of output."

**TDD 워크플로우:**
1. 테스트 먼저 작성 (예상 입출력 기반)
2. 테스트 실행 → 실패 확인
3. 코드 작성 → 테스트 통과까지 반복
4. 커밋

### LangGraph 적용 코드

```python
from typing import TypedDict, List
from langgraph.graph import StateGraph, START, END

class TDDState(TypedDict):
    task: str
    acceptance_criteria: List[dict]  # 테스트 케이스 역할
    result: str
    verification_results: List[dict]
    iteration: int
    max_iterations: int

async def define_acceptance_criteria(state: TDDState) -> dict:
    """
    TDD의 "테스트 먼저 작성"에 해당
    실행 전에 성공 기준을 명확히 정의
    """
    prompt = f"""
# 성공 기준 정의

작업: {state["task"]}

이 작업의 성공을 판단할 수 있는 명확한 기준을 정의하세요.

각 기준은:
1. 객관적으로 검증 가능해야 함
2. 예/아니오로 판단 가능해야 함
3. 구체적인 예상 값이나 조건을 포함해야 함

JSON 형식:
{{
    "criteria": [
        {{
            "id": "C1",
            "description": "기준 설명",
            "verification_method": "검증 방법",
            "expected_value": "예상 값"
        }}
    ]
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    criteria = json.loads(response.content)
    return {"acceptance_criteria": criteria["criteria"]}

async def execute_task(state: TDDState) -> dict:
    """작업 실행"""
    criteria = state["acceptance_criteria"]
    
    prompt = f"""
# 작업 실행

작업: {state["task"]}

## 충족해야 할 기준
{json.dumps(criteria, indent=2, ensure_ascii=False)}

위 기준을 모두 충족하도록 작업을 수행하세요.
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"result": response.content, "iteration": state.get("iteration", 0) + 1}

async def verify_against_criteria(state: TDDState) -> dict:
    """각 성공 기준에 대해 검증 수행"""
    prompt = f"""
# 결과 검증

## 작업 결과
{state["result"]}

## 검증할 기준
{json.dumps(state["acceptance_criteria"], indent=2, ensure_ascii=False)}

각 기준에 대해 PASS/FAIL을 판정하세요.
반드시 객관적으로 판단하세요. 애매하면 FAIL입니다.

JSON 형식:
{{
    "verifications": [
        {{
            "criteria_id": "C1",
            "status": "PASS" 또는 "FAIL",
            "actual_value": "실제 값",
            "reason": "판정 이유"
        }}
    ],
    "all_passed": true/false
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    verification = json.loads(response.content)
    return {"verification_results": verification["verifications"]}

def should_retry(state: TDDState) -> str:
    """재시도 여부 결정"""
    verifications = state.get("verification_results", [])
    iteration = state.get("iteration", 0)
    max_iter = state.get("max_iterations", 3)
    
    all_passed = all(v["status"] == "PASS" for v in verifications)
    
    if all_passed:
        return "complete"
    elif iteration >= max_iter:
        return "max_iterations"
    else:
        return "retry"

async def retry_with_feedback(state: TDDState) -> dict:
    """실패한 기준에 대한 피드백을 주고 재실행"""
    failed = [v for v in state["verification_results"] if v["status"] == "FAIL"]
    
    prompt = f"""
# 재시도 (시도 {state["iteration"]}/{state["max_iterations"]})

## 실패한 기준
{json.dumps(failed, indent=2, ensure_ascii=False)}

## 이전 결과
{state["result"]}

실패한 기준을 충족하도록 수정하세요.
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"result": response.content, "iteration": state["iteration"] + 1}

def create_tdd_graph():
    graph = StateGraph(TDDState)
    
    graph.add_node("define_criteria", define_acceptance_criteria)
    graph.add_node("execute", execute_task)
    graph.add_node("verify", verify_against_criteria)
    graph.add_node("retry", retry_with_feedback)
    
    graph.add_edge(START, "define_criteria")
    graph.add_edge("define_criteria", "execute")
    graph.add_edge("execute", "verify")
    graph.add_conditional_edges("verify", should_retry, {
        "complete": END,
        "retry": "retry",
        "max_iterations": END
    })
    graph.add_edge("retry", "verify")
    
    return graph.compile()
```

---

## Lesson 4: Extended Thinking 레벨 시스템

### Claude Code에서 배운 것

> "think" < "think hard" < "think harder" < "ultrathink"
> Each level allocates progressively more thinking budget.

| 키워드 | 토큰 예산 | 사용 시나리오 |
|--------|----------|--------------|
| `think` | ~4,000 | 일반적인 추론 |
| `think hard` / `megathink` | ~10,000 | 복잡한 문제 |
| `think harder` | ~20,000 | 심층 분석 |
| `ultrathink` | ~32,000 | 아키텍처 설계, 복잡한 디버깅 |

### LangGraph 적용 코드

```python
from enum import Enum
from langchain_anthropic import ChatAnthropic

class ThinkingLevel(Enum):
    QUICK = "quick"           # 기본
    THINK = "think"           # ~4K tokens
    THINK_HARD = "think_hard" # ~10K tokens  
    THINK_HARDER = "think_harder"  # ~20K tokens
    ULTRATHINK = "ultrathink" # ~32K tokens

THINKING_BUDGETS = {
    ThinkingLevel.QUICK: 0,
    ThinkingLevel.THINK: 4000,
    ThinkingLevel.THINK_HARD: 10000,
    ThinkingLevel.THINK_HARDER: 20000,
    ThinkingLevel.ULTRATHINK: 31999,
}

THINKING_PROMPTS = {
    ThinkingLevel.QUICK: "",
    ThinkingLevel.THINK: "think about this carefully",
    ThinkingLevel.THINK_HARD: "think hard about this",
    ThinkingLevel.THINK_HARDER: "think harder and consider all angles",
    ThinkingLevel.ULTRATHINK: "ultrathink - take your time to deeply analyze",
}

def get_llm_with_thinking(level: ThinkingLevel) -> ChatAnthropic:
    """Thinking 레벨에 맞는 LLM 인스턴스 반환"""
    budget = THINKING_BUDGETS[level]
    
    if budget == 0:
        return ChatAnthropic(model="claude-sonnet-4-5-20250929")
    
    return ChatAnthropic(
        model="claude-sonnet-4-5-20250929",
        extra_body={
            "thinking": {
                "type": "enabled",
                "budget_tokens": budget
            }
        }
    )

def enhance_prompt_with_thinking(prompt: str, level: ThinkingLevel) -> str:
    """프롬프트에 thinking 지시어 추가"""
    thinking_instruction = THINKING_PROMPTS[level]
    if thinking_instruction:
        return f"{thinking_instruction}\n\n{prompt}"
    return prompt

def auto_select_thinking_level(task_description: str) -> ThinkingLevel:
    """작업 복잡도에 따른 자동 레벨 선택"""
    
    ultrathink_keywords = ["architecture", "설계", "전략", "마이그레이션"]
    think_harder_keywords = ["분석", "비교", "평가", "최적화", "디버깅"]
    think_hard_keywords = ["계획", "검토", "구현", "복잡한"]
    
    task_lower = task_description.lower()
    
    if any(kw in task_lower for kw in ultrathink_keywords):
        return ThinkingLevel.ULTRATHINK
    elif any(kw in task_lower for kw in think_harder_keywords):
        return ThinkingLevel.THINK_HARDER
    elif any(kw in task_lower for kw in think_hard_keywords):
        return ThinkingLevel.THINK_HARD
    elif len(task_description) > 500:
        return ThinkingLevel.THINK
    else:
        return ThinkingLevel.QUICK

# LangGraph 노드에서 사용
async def planning_node_with_auto_thinking(state: dict) -> dict:
    task = state["query"]
    level = auto_select_thinking_level(task)
    
    llm = get_llm_with_thinking(level)
    prompt = enhance_prompt_with_thinking(
        f"다음 작업에 대한 계획을 수립하세요: {task}",
        level
    )
    
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    
    return {
        "plan": response.content,
        "thinking_level_used": level.value
    }
```

---

## Lesson 5: Subagents & 병렬화 패턴

### Claude Code에서 배운 것

> "Telling Claude to use subagents to verify details or investigate particular questions, especially early on in a conversation, tends to preserve context availability."

**핵심 인사이트:**
- Subagent는 독립된 컨텍스트를 가짐
- 메인 에이전트의 컨텍스트를 오염시키지 않음
- 병렬 실행으로 속도 향상
- 결과만 요약해서 반환

### LangGraph 적용 코드

```python
from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

class MainState(TypedDict):
    query: str
    subtasks: List[dict]
    subagent_results: Annotated[list, lambda x, y: x + y]  # 결과 병합
    final_answer: str

class SubagentState(TypedDict):
    subtask: dict
    parent_context: str  # 최소한의 컨텍스트만 전달
    result: str

async def run_subagent(state: SubagentState) -> dict:
    """독립된 컨텍스트에서 실행되는 서브에이전트"""
    subtask = state["subtask"]
    
    prompt = f"""
# 서브태스크 실행

## 배경 (간략)
{state["parent_context"][:500]}...

## 할당된 작업
{subtask["description"]}

## 지시사항
- 이 작업만 집중해서 수행하세요
- 결과는 간결하게 요약하세요 (500자 이내)
- 핵심 발견사항만 보고하세요

JSON 형식:
{{
    "task_id": "{subtask["id"]}",
    "status": "success/partial/failed",
    "key_findings": ["발견1", "발견2"],
    "summary": "한 문장 요약"
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"result": response.content}

async def decompose_task(state: MainState) -> dict:
    """작업을 서브태스크로 분해"""
    prompt = f"""
# 작업 분해

원본 작업: {state["query"]}

독립적으로 수행 가능한 서브태스크로 분해하세요.

JSON 형식:
{{
    "subtasks": [
        {{
            "id": "ST1",
            "description": "서브태스크 설명",
            "type": "research/analysis/verification"
        }}
    ],
    "execution_strategy": "parallel" 또는 "sequential"
}}
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    result = json.loads(response.content)
    return {"subtasks": result["subtasks"]}

def dispatch_subagents(state: MainState) -> List[Send]:
    """서브에이전트들을 병렬로 디스패치"""
    subtasks = state["subtasks"]
    parent_context = state["query"]
    
    return [
        Send(
            "subagent",
            {
                "subtask": subtask,
                "parent_context": parent_context
            }
        )
        for subtask in subtasks
    ]

async def synthesize_results(state: MainState) -> dict:
    """서브에이전트 결과 종합"""
    results = state["subagent_results"]
    
    prompt = f"""
# 결과 종합

원본 질문: {state["query"]}

서브에이전트 결과들:
{json.dumps(results, indent=2, ensure_ascii=False)}

위 결과들을 종합하여 완전한 답변을 작성하세요.
"""
    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"final_answer": response.content}

def create_subagent_graph():
    graph = StateGraph(MainState)
    
    graph.add_node("decompose", decompose_task)
    graph.add_node("subagent", run_subagent)
    graph.add_node("synthesize", synthesize_results)
    
    graph.add_edge(START, "decompose")
    graph.add_conditional_edges("decompose", dispatch_subagents, ["subagent"])
    graph.add_edge("subagent", "synthesize")
    graph.add_edge("synthesize", END)
    
    return graph.compile()
```

---

## Lesson 6: Context Management

### Claude Code에서 배운 것

> "Use the /clear command frequently between tasks to reset the context window."
> "Too much context degrades performance."

**컨텍스트 구성 요소:**
- Messages: 대화 기록
- Tool results: 도구 실행 결과
- MCP tools: 연결된 도구들
- Custom agents: 서브에이전트
- Memory files: CLAUDE.md 등

### LangGraph 적용 코드

```python
from typing import List
from dataclasses import dataclass
import tiktoken

@dataclass
class ContextWindow:
    """컨텍스트 윈도우 관리"""
    max_tokens: int = 100000
    compaction_threshold: float = 0.7  # 70% 차면 압축
    
    messages: List[dict] = None
    tool_results: List[dict] = None
    
    def __post_init__(self):
        self.messages = self.messages or []
        self.tool_results = self.tool_results or []
        self._encoder = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        return len(self._encoder.encode(text))
    
    def total_tokens(self) -> int:
        total = 0
        for msg in self.messages:
            total += self.count_tokens(str(msg))
        for result in self.tool_results:
            total += self.count_tokens(str(result))
        return total
    
    def usage_ratio(self) -> float:
        return self.total_tokens() / self.max_tokens
    
    def needs_compaction(self) -> bool:
        return self.usage_ratio() > self.compaction_threshold

class ContextCompactor:
    """컨텍스트 압축기"""
    
    def __init__(self, llm):
        self.llm = llm
    
    async def compact_messages(
        self, 
        messages: List[dict],
        keep_recent: int = 5
    ) -> List[dict]:
        """오래된 메시지를 요약으로 압축"""
        if len(messages) <= keep_recent:
            return messages
        
        old_messages = messages[:-keep_recent]
        recent_messages = messages[-keep_recent:]
        
        summary_prompt = f"""
다음 대화 기록을 핵심만 간결하게 요약하세요 (200자 이내):

{json.dumps(old_messages, indent=2, ensure_ascii=False)}
"""
        response = await self.llm.ainvoke([{"role": "user", "content": summary_prompt}])
        
        compacted = [
            {"role": "system", "content": f"[이전 대화 요약]\n{response.content}"}
        ]
        compacted.extend(recent_messages)
        return compacted

# LangGraph에서 사용
async def context_management_node(state: dict) -> dict:
    """매 노드 실행 전 컨텍스트 상태 확인"""
    window = ContextWindow(
        messages=state["messages"],
        tool_results=state.get("tool_results", [])
    )
    
    stats = {
        "total_tokens": window.total_tokens(),
        "usage_ratio": window.usage_ratio(),
        "compacted": False
    }
    
    if window.needs_compaction():
        compactor = ContextCompactor(llm)
        compacted_messages = await compactor.compact_messages(state["messages"])
        
        stats["compacted"] = True
        return {
            "messages": compacted_messages,
            "context_stats": stats
        }
    
    return {"context_stats": stats}
```

---

## 종합: Production-Ready 그래프

모든 패턴을 적용한 프로덕션 에이전트:

```python
from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver

class ProductionAgentState(TypedDict):
    query: str
    agent_context: str          # CLAUDE.md
    exploration: dict           # Explore
    plan: dict                  # Plan
    thinking_level: str
    subtasks: List[dict]        # Subagents
    subagent_results: Annotated[list, lambda x, y: x + y]
    execution_result: str       # Execute
    acceptance_criteria: List[dict]  # TDD
    verification_results: List[dict] # Verify
    iteration: int
    context_stats: dict         # Context Management
    final_output: str

def create_production_agent_graph(checkpointer=None):
    graph = StateGraph(ProductionAgentState)
    
    # Context 주입 (CLAUDE.md)
    graph.add_node("inject_context", inject_agent_context)
    
    # Phase 1: EXPLORE
    graph.add_node("explore", explore_node)
    
    # Phase 2: PLAN (with thinking level)
    graph.add_node("plan", plan_with_thinking_node)
    graph.add_node("define_criteria", define_acceptance_criteria)
    
    # Phase 3: EXECUTE (with subagents)
    graph.add_node("decompose", decompose_into_subtasks)
    graph.add_node("subagent", run_subagent)
    graph.add_node("synthesize", synthesize_subagent_results)
    
    # Phase 4: VERIFY (TDD style)
    graph.add_node("verify", verify_against_criteria)
    graph.add_node("retry", retry_with_feedback)
    
    # Context Management
    graph.add_node("manage_context", context_management_node)
    
    # 엣지 정의
    graph.add_edge(START, "inject_context")
    graph.add_edge("inject_context", "explore")
    graph.add_edge("explore", "plan")
    graph.add_edge("plan", "define_criteria")
    graph.add_edge("define_criteria", "decompose")
    graph.add_conditional_edges("decompose", dispatch_subagents, ["subagent"])
    graph.add_edge("subagent", "synthesize")
    graph.add_edge("synthesize", "verify")
    graph.add_conditional_edges("verify", check_verification_result, {
        "pass": "manage_context",
        "fail": "retry",
        "max_iterations": "manage_context"
    })
    graph.add_edge("retry", "verify")
    graph.add_edge("manage_context", END)
    
    return graph.compile(checkpointer=checkpointer)
```

---

## 적용 체크리스트

| Claude Code 패턴 | LangGraph 적용 | 핵심 포인트 |
|-----------------|---------------|------------|
| **Explore → Plan → Code** | 명시적 노드 분리 | 바로 실행 금지, 탐색과 계획 먼저 |
| **CLAUDE.md** | AgentContext 클래스 | 지속적 컨텍스트, lessons_learned |
| **Extended Thinking** | ThinkingLevel enum | 작업 복잡도에 따른 thinking 예산 |
| **TDD 워크플로우** | Acceptance Criteria 노드 | 실행 전 성공 기준 정의 |
| **Subagents** | Send() 병렬 디스패치 | 독립 컨텍스트, 결과만 반환 |
| **/clear, Compaction** | ContextCompactor | 70% 임계치에서 자동 압축 |
| **Visual Feedback** | Screenshot 검증 노드 | UI 작업 시 시각적 검증 |

---

## 참고 자료

- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

---

> **핵심 메시지**: Claude Code의 패턴은 Anthropic이 실제로 검증한 에이전트 설계 방식입니다. 
> 이 패턴들을 LangGraph 백엔드에 적용하면 더 안정적이고 효과적인 AI Agent를 구축할 수 있습니다.
