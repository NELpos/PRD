# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a documentation and PRD (Product Requirements Document) repository focused on AI/LLM integration projects, particularly around:
- Multi-agent orchestration platforms
- Prompt enhancement systems
- SQL pipeline editors with AI capabilities
- Snowflake/Splunk integration projects
- Vercel AI SDK implementations

## Custom Commands

This repository includes Korean-to-English prompt optimization commands in `.claude/commands/`:

### Available Commands
- `/enhance` - 범용 프롬프트 최적화 (Transform any Korean request into Claude-optimized English prompts)
- `/enhance-code` - 코드 작업 전용 최적화 (Optimized for programming tasks)
- `/enhance-analysis` - 데이터 분석 전용 최적화 (Optimized for data analysis and research)

These commands transform Korean requests into structured, XML-based English prompts that follow Claude best practices for token efficiency and clarity.

## Custom Tools

### fetch_document
Located in `.claude/tools/fetch_document.py`
- Fetches and extracts text content from URLs
- Automatically extracts readable text from HTML pages
- Use for reading documentation, articles, and web pages

## Project Structure

```
.
├── .claude/
│   ├── commands/          # Custom slash commands for prompt enhancement
│   └── tools/            # Custom MCP tools (fetch_document)
│
├── agents/               # Agent implementation samples and instructions
├── sub_agents/           # Sub-agent definitions (reviewers, planners)
├── vercel-ai-sdk-files/  # Vercel AI SDK reference files
│
├── examples/
│   └── sql_pipeline/     # SQL Pipeline Editor implementation
│
├── snowflake/            # Snowflake integration PRDs & guides (6 docs)
├── ai-agents/            # AI agent & multi-agent system PRDs (3 docs)
├── prompt-enhancer/      # Prompt optimization system PRDs (2 docs)
├── sql-pipeline/         # SQL pipeline & Text-to-SQL PRDs (1 doc)
├── frontend/             # Frontend & UI system PRDs (2 docs)
│
├── README.md             # Portfolio overview and catalog
└── CLAUDE.md             # This file
```

## Key Projects & Examples

### 1. SQL Pipeline Editor (examples/sql_pipeline/)
A Next.js 15 + CodeMirror 6 SQL editor with Splunk-style pipeline commands.

**Key Features:**
- JWT decoding/extraction/validation commands
- AI-powered transformations using AWS Bedrock (Claude Haiku 4.5)
- Pipeline syntax: `SELECT * FROM table | command1 | command2`

**Common Commands:**
```bash
# Install dependencies
cd examples/sql_pipeline
npm install

# Key dependencies
npm install codemirror @codemirror/state @codemirror/view @codemirror/lang-sql
```

**Pipeline Commands:**
- JWT: `jwtdecode`, `jwtextract`, `jwtvalidate`
- AI: `ai_transform`, `ai_extract`, `ai_classify`, `ai_summarize`, `ai_translate`, `ai_sentiment`
- Data: `filter`, `json_parse`, `flatten`, `rename`, `select`, `exclude`
- Analysis: `stats`, `sort`, `limit`, `unique`

### 2. Multi-Agent Platform
PRD defined in `ai-agents/prd-multi-agent-platform.md`

**Tech Stack:**
- Frontend: Next.js 15, React 19, Vercel AI SDK 5.0, Drizzle ORM
- Backend: Python 3.11+, FastAPI, LangGraph, DeepAgents
- Database: PostgreSQL 16
- LLM: Amazon Bedrock (Claude 3.5 Sonnet)
- Observability: LangSmith

### 3. Prompt Enhancer Projects
Two implementations documented in `prompt-enhancer/`:
- `prd-nextjs.md` - Next.js implementation
- `prd-python.md` - Python implementation

## Working with PRDs

When asked to work with or implement features from PRDs:

1. **Navigate by domain** - PRDs are organized into domain folders: `snowflake/`, `ai-agents/`, `prompt-enhancer/`, `sql-pipeline/`, `frontend/`
2. **Read domain README first** - Each domain folder has a README.md with overview and document list
3. **Read the relevant PRD** - They contain detailed specifications, architecture diagrams, and implementation guides
4. **Check for companion files** - Many PRDs have corresponding implementation examples in `examples/` or `agents/`
5. **Follow the tech stack** - Each PRD specifies its intended technology stack
6. **Reference existing patterns** - Look at `agents/sample-implementation.ts` for coding patterns

## Documentation Patterns

PRDs in this repository typically include:
- System architecture diagrams (ASCII art)
- Database schemas
- API specifications
- Implementation checklists
- Example queries/commands
- Security considerations

## Language Preferences

- **PRDs and Documentation**: Mixed Korean and English (Korean for business context, English for technical specs)
- **Code**: English comments and variable names
- **User Instructions**: Korean preferred for Korean users
- **Prompts to Claude**: English (via `/enhance` commands for better token efficiency)

## Common Workflows

### Implementing from PRD
1. Read the PRD document thoroughly
2. Check `examples/` for reference implementations
3. Review `agents/instructions.md` for guidance
4. Follow the implementation checklist in the PRD

### Adding Pipeline Commands (SQL Editor)
1. Define command in `examples/sql_pipeline/ai-pipeline-commands.ts` or `advanced-pipeline-commands.ts`
2. Register in the pipeline executor
3. Add to autocomplete list
4. Update README.md with examples

### Creating Custom Commands
1. Create `.md` file in `.claude/commands/`
2. Follow the structure in existing commands (enhance.md, enhance-code.md)
3. Use `$ARGUMENTS` placeholder for user input
4. Document in `.claude/commands/README.md`

## Domain-Specific Guidelines

### Snowflake Projects (`snowflake/`)
- Focus on data warehouse integration and security analysis
- Use Snowflake-specific SQL syntax and features
- Reference `system-prompt-sql.md` for AI-generated SQL guidelines
- Check `examples/sql_pipeline/` for pipeline implementation

### AI Agent Projects (`ai-agents/`)
- Use LangGraph for multi-agent orchestration
- Follow ReAct pattern (Reasoning + Acting)
- Implement Plan → Execute → Review workflow
- Reference existing agent patterns in `agents/` and `sub_agents/`

### Prompt Enhancement (`prompt-enhancer/`)
- Use XML-structured prompts for clarity
- Optimize for token efficiency (30% reduction target)
- Support both Next.js and Python implementations
- Leverage `.claude/commands/` for integration

### SQL Pipeline (`sql-pipeline/`)
- Implement Splunk-style pipeline syntax
- Support chained transformations with `|` operator
- Use CodeMirror 6 for SQL editing
- Reference `examples/sql_pipeline/` for complete implementation

### Frontend Projects (`frontend/`)
- Follow Claude brand guidelines (colors, typography)
- Use shadcn/ui components with custom theming
- Implement React Query patterns with deduplication
- Support Generative UI with Vercel AI SDK
