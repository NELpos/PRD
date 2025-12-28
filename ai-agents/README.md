# AI Agents & Multi-Agent Systems

AI 에이전트 아키텍처, 멀티에이전트 오케스트레이션, LangGraph 기반 시스템 설계 문서 모음입니다.

## 📚 문서 목록

### Product Requirements Documents (PRDs)

1. **[Multi-Agent Orchestration Platform](./prd-multi-agent-platform.md)**
   - 다중 AI 에이전트 플랫폼 아키텍처
   - Agent Registry 및 동적 라우팅
   - Generative UI 기반 실시간 상태 시각화
   - **Tech Stack**: Next.js 15, FastAPI, LangGraph, PostgreSQL, Amazon Bedrock

### Research Documents

2. **[Claude Agent Planning Research](./research-planning.md)**
   - Claude Code의 계획(Planning) 메커니즘 연구
   - Agent 기반 작업 분해 및 실행 전략
   - Plan → Execute → Review 워크플로우

3. **[Claude Code to LangGraph Migration](./research-langgraph-migration.md)**
   - Claude Code 패턴을 LangGraph로 전환하는 방법론
   - State Machine 설계 및 노드 구성
   - 에이전트 간 협업 패턴

## 🛠 주요 기술 스택

### Frontend
- Next.js 15, React 19
- Vercel AI SDK 5.0
- Drizzle ORM
- AI Elements (Generative UI)

### Backend
- Python 3.11+
- FastAPI
- LangGraph
- DeepAgents

### AI/LLM
- Amazon Bedrock (Claude 3.5 Sonnet)
- LangSmith (Observability)

### Database
- PostgreSQL 16

## 🔗 관련 리소스

- [Agent 구현 샘플](../agents/)
- [Sub-Agent 정의](../sub_agents/)
- [Prompt Enhancer PRD](../prompt-enhancer/)

## 💡 주요 개념

### Multi-Agent Orchestration
- **Agent Registry**: 에이전트 중앙 관리 및 동적 로딩
- **Dynamic Routing**: 사용자 요청 분석 후 적절한 에이전트 선택
- **State Management**: 에이전트 간 상태 공유 및 동기화

### Generative UI Patterns
- **Plan Visualization**: 계획 수립 단계 실시간 표시
- **TODO Progress**: 작업 진행 상황 추적
- **Agent Status**: 에이전트 실행 상태 모니터링

### LangGraph Workflows
- **ReAct Pattern**: Reasoning + Acting 반복 루프
- **Human-in-the-Loop**: 사용자 승인 단계 통합
- **Checkpointing**: 에이전트 상태 저장 및 복원

## 🎯 활용 분야

1. **자동화된 코드 리뷰**: 다중 에이전트 협업으로 심층 분석
2. **복잡한 데이터 파이프라인**: 각 단계별 전문 에이전트 활용
3. **고객 지원 시스템**: 문의 분류 및 자동 응답
4. **리서치 및 분석**: 정보 수집, 분석, 보고서 생성 자동화
