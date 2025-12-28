# PRD: Claude Code 프롬프트 향상 Hook
## FastAPI + LangChain + LangGraph 전용 (Python)

---

## 📋 문서 정보

| 항목 | 내용 |
|------|------|
| **문서 버전** | 1.0 |
| **작성일** | 2025-12-25 |
| **대상 스택** | FastAPI, LangChain, LangGraph, Python |
| **Hook 언어** | Python 3.11+ |
| **패키지 관리** | pip / poetry / uv |

---

## 1. 개요

### 1.1 목적

한글로 입력된 프롬프트를 Python AI 백엔드 개발에 최적화된 영어 프롬프트로 변환하고, FastAPI, LangChain, LangGraph 등 Python AI 생태계에 맞는 Best Practice 컨텍스트를 자동 주입합니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| **한글 → 영어 변환** | LangChain/FastAPI 기술 용어 정확한 번역 |
| **도메인 감지** | API / AI-Agent / RAG / Workflow 자동 분류 |
| **컨텍스트 주입** | LCEL, LangGraph State, Pydantic 등 Best Practice |
| **바이패스** | `*`, `/`, `#`, `!` prefix로 향상 건너뛰기 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                     User Prompt (Korean)                            │
│      "RAG 체인 만들어줘. PDF 로드하고 청킹해서 벡터 스토어에 저장해줘"    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│               UserPromptSubmit Hook (Python)                        │
│                                                                     │
│  1. Parse stdin JSON (prompt, cwd, session_id)                      │
│  2. Bypass Check (prefix, Korean ratio)                             │
│  3. Domain Detection (api/agent/rag/workflow)                       │
│  4. Technical Term Translation (한글 → 영어)                         │
│  5. Context Injection (Python AI Best Practices)                    │
│  6. Output enhanced prompt (stdout)                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Claude (via Amazon Bedrock)                      │
│              Enhanced English prompt with full context              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 파일 구조

```
your-python-project/
├── .claude/
│   ├── hooks/
│   │   └── prompt_enhancer.py    # 메인 Hook 스크립트
│   └── settings.json             # Hook 등록 설정
├── pyproject.toml
├── requirements.txt
├── src/
│   └── ...
└── ...
```

---

## 4. 핵심 구현

### 4.1 메인 Hook 스크립트 (`.claude/hooks/prompt_enhancer.py`)

```python
#!/usr/bin/env python3
"""
Claude Code Prompt Enhancer Hook
FastAPI + LangChain + LangGraph 전용

한글 프롬프트를 영어로 변환하고 Python AI Best Practice 컨텍스트를 주입합니다.
"""

import json
import re
import sys
from typing import Literal, TypedDict

# ==================== 설정 ====================

BYPASS_PREFIXES = ("*", "/", "#", "!")
KOREAN_THRESHOLD = 0.1
DEBUG = False


# ==================== 타입 정의 ====================

Domain = Literal["api", "agent", "rag", "workflow", "general"]


class DetectionResult(TypedDict):
    domain: Domain
    keywords: list[str]


class HookInput(TypedDict):
    session_id: str
    transcript_path: str
    cwd: str
    permission_mode: str
    hook_event_name: str
    prompt: str


# ==================== 키워드 정의 ====================

DOMAIN_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "api": {
        "ko": [
            "API", "엔드포인트", "라우터", "미들웨어", "인증", "권한",
            "요청", "응답", "스키마", "모델", "의존성 주입",
            "CRUD", "REST", "GraphQL", "웹소켓", "SSE"
        ],
        "en": [
            "api", "endpoint", "router", "middleware", "auth", "authentication",
            "request", "response", "schema", "model", "dependency injection",
            "crud", "rest", "graphql", "websocket", "sse", "fastapi"
        ]
    },
    "agent": {
        "ko": [
            "에이전트", "도구", "함수 호출", "도구 호출", "ReAct",
            "계획", "실행", "자율", "멀티 에이전트", "오케스트레이션"
        ],
        "en": [
            "agent", "tool", "function calling", "tool calling", "react",
            "planning", "execution", "autonomous", "multi-agent", "orchestration",
            "create_react_agent", "tool_executor", "AgentExecutor"
        ]
    },
    "rag": {
        "ko": [
            "RAG", "검색", "임베딩", "벡터", "청킹", "문서",
            "로더", "스플리터", "리트리버", "벡터 스토어", "유사도"
        ],
        "en": [
            "rag", "retrieval", "embedding", "vector", "chunking", "document",
            "loader", "splitter", "retriever", "vector store", "similarity",
            "faiss", "chroma", "pinecone", "qdrant", "weaviate"
        ]
    },
    "workflow": {
        "ko": [
            "그래프", "워크플로우", "노드", "엣지", "상태", "체크포인터",
            "조건부", "분기", "병렬", "휴먼 인 더 루프", "서브그래프"
        ],
        "en": [
            "graph", "workflow", "node", "edge", "state", "checkpointer",
            "conditional", "branch", "parallel", "human in the loop", "subgraph",
            "langgraph", "StateGraph", "MessageGraph", "add_node", "add_edge"
        ]
    }
}


# ==================== 기술 용어 사전 ====================

TECH_TERMS: dict[str, str] = {
    # === FastAPI ===
    "패스트API": "FastAPI",
    "엔드포인트": "endpoint",
    "라우터": "APIRouter",
    "의존성 주입": "Dependency Injection (Depends)",
    "미들웨어": "middleware",
    "백그라운드 태스크": "BackgroundTasks",
    "요청 본문": "request body",
    "응답 모델": "response_model",
    "경로 매개변수": "path parameter",
    "쿼리 매개변수": "query parameter",
    "스키마": "Pydantic model/schema",
    "유효성 검사": "validation",
    
    # === LangChain Core ===
    "랭체인": "LangChain",
    "체인": "chain (LCEL Runnable)",
    "프롬프트 템플릿": "PromptTemplate / ChatPromptTemplate",
    "출력 파서": "output parser",
    "메모리": "memory",
    "콜백": "callback",
    "런너블": "Runnable",
    
    # === LangChain RAG ===
    "문서 로더": "DocumentLoader",
    "텍스트 분할기": "TextSplitter (RecursiveCharacterTextSplitter)",
    "임베딩": "Embeddings",
    "벡터 스토어": "VectorStore",
    "검색기": "Retriever",
    "청킹": "chunking",
    "청크": "chunk",
    "메타데이터": "metadata",
    
    # === LangChain Agents ===
    "에이전트": "Agent",
    "도구": "Tool (@tool decorator)",
    "도구 호출": "tool calling",
    "함수 호출": "function calling",
    "에이전트 실행기": "AgentExecutor",
    "리액트 에이전트": "create_react_agent",
    
    # === LangGraph ===
    "랭그래프": "LangGraph",
    "상태 그래프": "StateGraph",
    "메시지 그래프": "MessageGraph",
    "노드": "node",
    "엣지": "edge",
    "조건부 엣지": "conditional_edge",
    "체크포인터": "Checkpointer (MemorySaver)",
    "상태": "State (TypedDict)",
    "서브그래프": "subgraph",
    "휴먼 인 더 루프": "human-in-the-loop (interrupt_before/after)",
    
    # === Common ===
    "비동기": "async/await",
    "스트리밍": "streaming (astream, astream_events)",
    "배치": "batch processing",
    "재시도": "retry (with_retry)",
    "폴백": "fallback (with_fallback)",
    "캐시": "caching",
    "토큰": "token",
    "컨텍스트 윈도우": "context window",
    
    # === Actions ===
    "만들어": "create/implement",
    "추가해": "add",
    "수정해": "fix/modify",
    "삭제해": "delete/remove",
    "개선해": "improve/optimize",
    "구현해": "implement",
    "리팩토링": "refactor",
    "테스트": "test",
    "배포": "deploy",
}


# ==================== 컨텍스트 템플릿 ====================

CONTEXT_TEMPLATES: dict[Domain, str] = {
    "api": """
[Stack: FastAPI + Python 3.11+]
[Domain: API Development]

FastAPI Best Practices:
- Use Pydantic models for request/response validation
- Implement dependency injection with Depends()
- Apply async/await for I/O-bound operations
- Use proper HTTP status codes (HTTPException)
- Implement proper error handling with exception handlers
- Use APIRouter for route organization
- Apply OpenAPI documentation with docstrings
- Implement background tasks for long-running operations

Pydantic V2 Patterns:
- Use model_validator for complex validation
- Apply Field() for field constraints and descriptions
- Use ConfigDict for model configuration
""",

    "agent": """
[Stack: LangChain + LangGraph + Python]
[Domain: AI Agent Development]

LangChain Agent Best Practices:
- Use @tool decorator for tool definitions
- Implement proper tool descriptions for LLM understanding
- Apply structured tool inputs with Pydantic
- Use create_react_agent for ReAct pattern
- Implement proper error handling in tools
- Apply tool result parsing

LangGraph Agent Patterns:
- Use StateGraph for complex agent workflows
- Implement conditional edges for decision making
- Apply checkpointing for persistence
- Use interrupt_before for human-in-the-loop
- Implement proper state management with TypedDict
""",

    "rag": """
[Stack: LangChain + VectorStore + Python]
[Domain: RAG (Retrieval-Augmented Generation)]

RAG Pipeline Best Practices:
- Choose appropriate DocumentLoader for your data source
- Use RecursiveCharacterTextSplitter with proper chunk_size and overlap
- Select embedding model based on your use case (OpenAI, HuggingFace, etc.)
- Implement proper metadata handling for filtering
- Use similarity_search with score threshold
- Apply reranking for improved relevance

Vector Store Selection:
- FAISS for local/in-memory (no persistence needed)
- Chroma for local with persistence
- Pinecone/Qdrant/Weaviate for production scale

LCEL RAG Chain Pattern:
retriever | format_docs | prompt | llm | output_parser
""",

    "workflow": """
[Stack: LangGraph + Python]
[Domain: AI Workflow / Graph Development]

LangGraph Best Practices:
- Define clear State schema with TypedDict
- Use add_node() for discrete operations
- Implement add_edge() for sequential flow
- Apply add_conditional_edges() for branching logic
- Use START and END constants for graph boundaries
- Implement Checkpointer for state persistence

State Management:
- Use Annotated with operator.add for list accumulation
- Implement reducer functions for custom state updates
- Keep state minimal and serializable

Advanced Patterns:
- Use subgraphs for modular workflow design
- Implement parallel execution with fan-out/fan-in
- Apply human-in-the-loop with interrupt_before/after
- Use MemorySaver for development, PostgresSaver for production
""",

    "general": """
[Stack: FastAPI + LangChain + LangGraph + Python]

Follow Python best practices:
- Use type hints throughout
- Apply async/await for I/O operations
- Implement proper error handling
- Use Pydantic for data validation
"""
}


# ==================== 유틸리티 함수 ====================

def get_korean_ratio(text: str) -> float:
    """Calculate the ratio of Korean characters in text."""
    korean_pattern = re.compile(r"[가-힣]")
    korean_chars = len(korean_pattern.findall(text))
    total_chars = len(text.replace(" ", "").replace("\n", ""))
    return korean_chars / max(total_chars, 1)


def should_bypass(prompt: str) -> bool:
    """Check if prompt should bypass enhancement."""
    if not prompt or not prompt.strip():
        return True
    if prompt.startswith(BYPASS_PREFIXES):
        return True
    if get_korean_ratio(prompt) < KOREAN_THRESHOLD:
        return True
    return False


def detect_domain(prompt: str) -> DetectionResult:
    """Detect the domain from prompt content."""
    prompt_lower = prompt.lower()
    detected_keywords: list[str] = []
    
    scores: dict[str, int] = {"api": 0, "agent": 0, "rag": 0, "workflow": 0}
    
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords["ko"]:
            if kw in prompt:
                scores[domain] += 1
                detected_keywords.append(kw)
        for kw in keywords["en"]:
            if kw.lower() in prompt_lower:
                scores[domain] += 1
                detected_keywords.append(kw)
    
    max_score = max(scores.values())
    
    if max_score == 0:
        return {"domain": "general", "keywords": []}
    
    # Find domain with max score
    for domain, score in scores.items():
        if score == max_score:
            return {"domain": domain, "keywords": detected_keywords}  # type: ignore
    
    return {"domain": "general", "keywords": detected_keywords}


def translate_terms(text: str) -> str:
    """Translate Korean technical terms to English."""
    result = text
    
    # Sort by length (longest first) to prevent partial matches
    sorted_terms = sorted(TECH_TERMS.items(), key=lambda x: len(x[0]), reverse=True)
    
    for ko, en in sorted_terms:
        result = re.sub(re.escape(ko), en, result, flags=re.IGNORECASE)
    
    return result


def enhance(prompt: str, detection: DetectionResult) -> str:
    """Create enhanced prompt with translation and context."""
    translated = translate_terms(prompt)
    context = CONTEXT_TEMPLATES[detection["domain"]]
    
    return f"""{context}
---

[User Request - Translated from Korean]
{translated}

[Original Korean Request]
{prompt}

---
Please implement the above request following Python and LangChain/LangGraph best practices.
Use LCEL (LangChain Expression Language) for chain composition.
Detected Domain: {detection["domain"]}
""".strip()


def log(*args) -> None:
    """Log to stderr for debugging."""
    if DEBUG:
        print("[prompt-enhancer]", *args, file=sys.stderr)


# ==================== 메인 ====================

def main() -> None:
    try:
        # Read JSON from stdin
        input_text = sys.stdin.read()
        input_data: HookInput = json.loads(input_text)
        
        prompt = input_data.get("prompt", "")
        
        log("Input prompt:", prompt)
        
        # Bypass check
        if should_bypass(prompt):
            log("Bypassing enhancement")
            sys.exit(0)
        
        # Detect domain
        detection = detect_domain(prompt)
        log("Detection result:", detection)
        
        # Enhance prompt
        enhanced = enhance(prompt, detection)
        log("Enhanced prompt:", enhanced)
        
        # Output to stdout
        print(enhanced)
        sys.exit(0)
        
    except Exception as e:
        log("Error:", e)
        sys.exit(0)


if __name__ == "__main__":
    main()
```

---

## 5. 설치 및 설정

### 5.1 Python 환경 확인

```bash
# Python 버전 확인 (3.11+ 권장)
python3 --version

# 또는 특정 버전 사용
python3.11 --version
```

### 5.2 Hook 파일 설치

```bash
# Hook 디렉토리 생성
mkdir -p .claude/hooks

# Hook 스크립트 생성 (위 코드를 복사)
touch .claude/hooks/prompt_enhancer.py
chmod +x .claude/hooks/prompt_enhancer.py
```

### 5.3 settings.json 설정

`.claude/settings.json` 파일 생성:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/prompt_enhancer.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 5.4 설치 확인

```bash
# Claude Code 재시작 후
claude

# /hooks 명령으로 등록 확인
/hooks
```

---

## 6. 사용 예시

### 6.1 FastAPI Endpoint

**입력:**
```
사용자 CRUD API 만들어줘. Pydantic 스키마 쓰고 의존성 주입으로 DB 세션 관리해줘
```

**출력:**
```
[Stack: FastAPI + Python 3.11+]
[Domain: API Development]

FastAPI Best Practices:
- Use Pydantic models for request/response validation
- Implement dependency injection with Depends()
- Apply async/await for I/O-bound operations
...

---

[User Request - Translated from Korean]
Create a user CRUD API. Use Pydantic model/schema and manage DB session with Dependency Injection (Depends)

[Original Korean Request]
사용자 CRUD API 만들어줘. Pydantic 스키마 쓰고 의존성 주입으로 DB 세션 관리해줘

---
Please implement the above request following Python and LangChain/LangGraph best practices.
Use LCEL (LangChain Expression Language) for chain composition.
Detected Domain: api
```

### 6.2 RAG Pipeline

**입력:**
```
RAG 체인 만들어줘. PDF 문서 로더로 파일 읽고 청킹해서 Chroma 벡터 스토어에 저장해줘
```

**출력:**
```
[Stack: LangChain + VectorStore + Python]
[Domain: RAG (Retrieval-Augmented Generation)]

RAG Pipeline Best Practices:
- Choose appropriate DocumentLoader for your data source
- Use RecursiveCharacterTextSplitter with proper chunk_size and overlap
- Select embedding model based on your use case
...

LCEL RAG Chain Pattern:
retriever | format_docs | prompt | llm | output_parser

---

[User Request - Translated from Korean]
Create a RAG chain (LCEL Runnable). Read files with PDF DocumentLoader, do chunking, and store in Chroma VectorStore

[Original Korean Request]
RAG 체인 만들어줘. PDF 문서 로더로 파일 읽고 청킹해서 Chroma 벡터 스토어에 저장해줘

---
Please implement the above request following Python and LangChain/LangGraph best practices.
Use LCEL (LangChain Expression Language) for chain composition.
Detected Domain: rag
```

### 6.3 LangGraph Workflow

**입력:**
```
멀티 에이전트 그래프 만들어줘. 리서처랑 라이터 노드 있고 조건부 엣지로 분기해줘
```

**출력:**
```
[Stack: LangGraph + Python]
[Domain: AI Workflow / Graph Development]

LangGraph Best Practices:
- Define clear State schema with TypedDict
- Use add_node() for discrete operations
- Implement add_edge() for sequential flow
- Apply add_conditional_edges() for branching logic
...

---

[User Request - Translated from Korean]
Create a multi-Agent graph. Have researcher and writer node and branch with conditional_edge

[Original Korean Request]
멀티 에이전트 그래프 만들어줘. 리서처랑 라이터 노드 있고 조건부 엣지로 분기해줘

---
Please implement the above request following Python and LangChain/LangGraph best practices.
Use LCEL (LangChain Expression Language) for chain composition.
Detected Domain: workflow
```

### 6.4 Agent with Tools

**입력:**
```
웹 검색 도구랑 계산기 도구 가진 에이전트 만들어줘. ReAct 패턴으로 구현해줘
```

**출력:**
```
[Stack: LangChain + LangGraph + Python]
[Domain: AI Agent Development]

LangChain Agent Best Practices:
- Use @tool decorator for tool definitions
- Implement proper tool descriptions for LLM understanding
- Apply structured tool inputs with Pydantic
- Use create_react_agent for ReAct pattern
...

---

[User Request - Translated from Korean]
Create an Agent with web search Tool (@tool decorator) and calculator Tool (@tool decorator). Implement with ReAct pattern

[Original Korean Request]
웹 검색 도구랑 계산기 도구 가진 에이전트 만들어줘. ReAct 패턴으로 구현해줘

---
Please implement the above request following Python and LangChain/LangGraph best practices.
Use LCEL (LangChain Expression Language) for chain composition.
Detected Domain: agent
```

### 6.5 바이패스

```bash
# 향상 건너뛰기
claude "* 그냥 간단하게 해줘"      # * prefix
claude "/help"                      # / prefix (slash command)
claude "Just create a function"     # 영어만 (Korean ratio < 10%)
```

---

## 7. 커스터마이징

### 7.1 용어 추가

`TECH_TERMS` 딕셔너리에 프로젝트 특화 용어 추가:

```python
TECH_TERMS: dict[str, str] = {
    # 기존 용어...
    
    # 프로젝트 특화 용어 추가
    "크롤러": "web crawler",
    "스케줄러": "scheduler (APScheduler)",
    "큐": "message queue (Redis/RabbitMQ)",
    # ...
}
```

### 7.2 컨텍스트 수정

`CONTEXT_TEMPLATES`에서 프로젝트에 맞게 Best Practice 수정:

```python
CONTEXT_TEMPLATES: dict[Domain, str] = {
    "api": """
[Stack: FastAPI + Python 3.11+]
[Domain: API Development]

Project-Specific Guidelines:
- Use our custom BaseModel from src/schemas/base
- Follow repository pattern in src/repositories
- Apply service layer in src/services
...
""",
    # ...
}
```

### 7.3 디버그 모드

```python
DEBUG = True  # stderr로 디버그 로그 출력
```

---

## 8. 트러블슈팅

### 8.1 Hook이 실행되지 않음

```bash
# Python 경로 확인
which python3

# Hook 파일 권한 확인
ls -la .claude/hooks/prompt_enhancer.py

# 직접 실행 테스트
echo '{"prompt": "테스트 API 만들어줘"}' | python3 .claude/hooks/prompt_enhancer.py

# Claude Code 재시작
claude
```

### 8.2 인코딩 에러

```bash
# UTF-8 환경 변수 설정
export PYTHONIOENCODING=utf-8
```

### 8.3 디버그

```bash
# 디버그 모드로 Claude Code 실행
claude --debug
```

### 8.4 settings.json 위치

```bash
# 프로젝트별 설정
.claude/settings.json

# 전역 설정 (모든 프로젝트에 적용)
~/.claude/settings.json
```

---

## 9. 고급: Poetry/UV 프로젝트 감지

프로젝트 파일을 분석해서 더 정확한 컨텍스트를 제공하도록 확장할 수 있습니다:

```python
import os
from pathlib import Path

def detect_project_deps(cwd: str) -> list[str]:
    """Detect project dependencies from pyproject.toml or requirements.txt."""
    deps = []
    
    pyproject = Path(cwd) / "pyproject.toml"
    requirements = Path(cwd) / "requirements.txt"
    
    if pyproject.exists():
        content = pyproject.read_text()
        if "langchain" in content:
            deps.append("langchain")
        if "langgraph" in content:
            deps.append("langgraph")
        if "fastapi" in content:
            deps.append("fastapi")
    
    if requirements.exists():
        content = requirements.read_text()
        # Similar checks...
    
    return deps
```

---

## 10. 참고 자료

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [LCEL Conceptual Guide](https://python.langchain.com/docs/concepts/lcel/)
