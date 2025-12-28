# PRD: Query Duplication Prevention Hook for Claude Code

## 1. Overview

Claude Code가 데이터베이스 쿼리 파일을 수정할 때, 기존에 유사한 쿼리가 이미 존재하는지 사전에 확인하여 중복 생성을 방지하는 PreToolUse Hook을 구현합니다.

## 2. Problem Statement

현재 Claude Code는 복잡한 멀티스텝 작업 수행 시, `src/lib/db/queries` 디렉토리에 이미 존재하는 쿼리 함수를 재사용하지 않고 새로운 중복 쿼리를 생성하는 경향이 있습니다. 이는 코드베이스의 유지보수성을 저하시키고 불필요한 중복 코드를 양산합니다.

## 3. Objectives

- **Primary Goal**: `src/lib/db/queries` 디렉토리 내 파일 수정 전, 유사한 기존 쿼리가 있는지 자동으로 검증
- **Secondary Goal**: 중복 발견 시 명확한 피드백을 제공하여 기존 쿼리 재사용 유도
- **Tertiary Goal**: 개발자 개입 없이 자동으로 실행되는 워크플로우 구축

## 4. Technical Approach

### 4.1 Hook Type
- **Hook Event**: `PreToolUse` (파일 수정 전 실행)
- **Target Tools**: `Write`, `StrReplace` (파일 쓰기 및 수정 도구)

### 4.2 Trigger Conditions
다음 조건을 **모두** 만족할 때 Hook 실행:
1. Tool name이 `Write` 또는 `StrReplace`
2. 대상 파일 경로가 `src/lib/db/queries/` 디렉토리 내부
3. 파일 내용에 SQL 쿼리 또는 데이터베이스 함수가 포함됨

### 4.3 Verification Process

```
┌─────────────────────────────────────┐
│  Claude Code attempts to modify     │
│  file in src/lib/db/queries/        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PreToolUse Hook triggered          │
│  - Extract proposed changes         │
│  - Parse function names & SQL       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Launch secondary Claude instance   │
│  via Claude Code TypeScript SDK     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Secondary Claude reviews:          │
│  - All existing query files         │
│  - Proposed new query               │
│  - Semantic similarity analysis     │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    Similar      No Duplicate
    Found        Found
        │             │
        │             ▼
        │      ┌─────────────┐
        │      │ Exit Code 0 │
        │      │ Allow write │
        │      └─────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│  Exit Code 2 - Block operation       │
│  stderr: Feedback to Claude          │
│  - Existing function name            │
│  - File location                     │
│  - Recommendation to reuse           │
└──────────────────────────────────────┘
```

## 5. Implementation Specifications

### 5.1 Hook Configuration File
**Location**: `.claude/hooks/pre-query-duplicate-check.json`

```json
{
  "name": "query-duplication-prevention",
  "event": "PreToolUse",
  "tools": ["Write", "StrReplace"],
  "command": "node .claude/hooks/scripts/check-query-duplication.js"
}
```

### 5.2 Hook Script Requirements

**Input** (via stdin):
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write" | "StrReplace",
  "tool_input": {
    "file_path": "string",
    "content": "string"
  }
}
```

**Processing Logic**:

1. **Path Validation**
   ```javascript
   if (!filePath.startsWith('src/lib/db/queries/')) {
     process.exit(0); // Not our concern, allow
   }
   ```

2. **Content Extraction**
   - `Write` tool: Analyze full `content`
   - `StrReplace` tool: Analyze `new_str` for added SQL/functions

3. **Query Pattern Detection**
   - SQL keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `FROM`, `WHERE`
   - Function exports: `export function`, `export const`, `export async function`
   - Extract: function names, table names, query patterns

4. **Existing Queries Scan**
   - Read all `.ts` files in `src/lib/db/queries/`
   - Build index of:
     - Function names
     - SQL query patterns
     - Table names accessed

5. **Claude-based Similarity Check**
   ```typescript
   import { ClaudeCode } from '@anthropic-ai/claude-code';
   
   const reviewer = new ClaudeCode({
     apiKey: process.env.ANTHROPIC_API_KEY
   });
   
   const prompt = `
   Analyze if the proposed query is similar to existing queries.
   
   Proposed Query:
   ${proposedCode}
   
   Existing Queries:
   ${existingQueriesContext}
   
   Respond ONLY with JSON:
   {
     "isDuplicate": boolean,
     "similarFunctions": [
       {
         "name": "string",
         "filePath": "string",
         "similarityReason": "string"
       }
     ],
     "recommendation": "string"
   }
   `;
   ```

6. **Decision & Feedback**
   ```javascript
   if (result.isDuplicate) {
     console.error(`
   ⚠️  Query Duplication Detected
   
   The proposed query appears to duplicate existing functionality:
   
   ${result.similarFunctions.map(f => 
     `  - ${f.name} in ${f.filePath}\n    Reason: ${f.similarityReason}`
   ).join('\n')}
   
   Recommendation: ${result.recommendation}
   
   Please reuse the existing function(s) instead of creating a duplicate.
     `);
     process.exit(2); // Block operation
   }
   
   process.exit(0); // Allow operation
   ```

### 5.3 Environment Variables
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
QUERY_HOOK_ENABLED=true
QUERY_HOOK_SIMILARITY_THRESHOLD=0.75  # Optional: confidence threshold
```

## 6. User Experience

### 6.1 When Duplicate is Found

**Console Output**:
```
🔍 Checking for existing queries in src/lib/db/queries/...

⚠️  Query Duplication Detected

The proposed query appears to duplicate existing functionality:

  - getPendingOrders() in src/lib/db/queries/orders.ts
    Reason: Both queries fetch orders with status='pending' 
    and filter by created_at timestamp

Recommendation: Import and use getPendingOrders() with appropriate 
parameters instead of creating a new query function.

Operation blocked. Please reuse existing functionality.
```

**Claude receives this feedback** and should respond:
```
I see there's already a getPendingOrders() function in 
src/lib/db/queries/orders.ts that does what we need. 
Let me use that instead...
```

### 6.2 When No Duplicate Exists

**Console Output**:
```
🔍 Checking for existing queries in src/lib/db/queries/...
✅ No duplicate queries found. Proceeding with write operation.
```

Claude continues normally.

## 7. Performance Considerations

### 7.1 Optimization Strategies
- **Caching**: Cache existing queries index during session
- **Selective Triggering**: Only run on files with query patterns (not all `.ts` files)
- **Timeout**: Set 10-second timeout for Claude review to prevent hanging

### 7.2 Resource Usage
- **API Calls**: 1 Claude API call per query file modification
- **Estimated Cost**: ~$0.01-0.03 per check (using Claude Sonnet)
- **Time Overhead**: 2-5 seconds per check

## 8. Configuration Options

### 8.1 Hook Activation
```json
{
  "queryDuplicationCheck": {
    "enabled": true,
    "watchPaths": ["src/lib/db/queries/**/*.ts"],
    "excludePaths": ["**/*.test.ts", "**/*.spec.ts"],
    "similarityModel": "claude-sonnet-4-5-20250929",
    "timeout": 10000,
    "cacheExistingQueries": true
  }
}
```

## 9. Success Metrics

- **Duplicate Prevention Rate**: % of actual duplicates caught
- **False Positive Rate**: % of legitimate queries incorrectly blocked
- **Developer Satisfaction**: Feedback on usefulness vs. overhead
- **Code Quality**: Reduction in duplicate query functions over time

## 10. Future Enhancements

1. **Smart Caching**: Invalidate cache only when query files actually change
2. **Similarity Tuning**: Allow developers to adjust similarity threshold
3. **Auto-Import**: Automatically add import statements for existing queries
4. **Dashboard**: Web UI showing prevented duplications and statistics
5. **Learning Mode**: Initial period where hook suggests but doesn't block

## 11. Testing Plan

### 11.1 Test Scenarios
1. ✅ Create identical query → Should block
2. ✅ Create semantically similar query → Should block
3. ✅ Create unique query → Should allow
4. ✅ Modify existing query → Should allow
5. ✅ Create query in different directory → Should allow (no trigger)

### 11.2 Test Implementation
```bash
# Run test suite
npm run test:hooks

# Test specific scenario
npm run test:hooks -- --scenario duplicate-select
```

## 12. Rollout Plan

### Phase 1: Development (Week 1)
- Implement basic hook script
- Test with sample queries
- Gather initial feedback

### Phase 2: Opt-in Beta (Week 2-3)
- Deploy to development environments
- Monitor false positive/negative rates
- Tune similarity detection

### Phase 3: General Availability (Week 4)
- Enable by default
- Provide easy disable mechanism
- Document usage in team wiki

---

## Appendix A: Example Hook Script Structure

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read stdin
let inputData = '';
process.stdin.on('data', chunk => inputData += chunk);
process.stdin.on('end', async () => {
  try {
    const hookData = JSON.parse(inputData);
    await checkQueryDuplication(hookData);
  } catch (error) {
    console.error('Hook error:', error.message);
    process.exit(0); // Don't block on hook errors
  }
});

async function checkQueryDuplication(hookData) {
  const { tool_name, tool_input } = hookData;
  const filePath = tool_input.file_path;
  
  // 1. Path validation
  if (!filePath.startsWith('src/lib/db/queries/')) {
    process.exit(0);
  }
  
  // 2. Extract proposed content
  const proposedContent = tool_name === 'Write' 
    ? tool_input.content 
    : tool_input.new_str;
  
  // 3. Check if it contains query patterns
  if (!containsQueryPatterns(proposedContent)) {
    process.exit(0);
  }
  
  // 4. Scan existing queries
  const existingQueries = await scanExistingQueries();
  
  // 5. Use Claude to check similarity
  const result = await checkSimilarity(proposedContent, existingQueries);
  
  // 6. Make decision
  if (result.isDuplicate) {
    reportDuplication(result);
    process.exit(2); // Block
  }
  
  console.log('✅ No duplicate queries found. Proceeding with write operation.');
  process.exit(0); // Allow
}

function containsQueryPatterns(content) {
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE'];
  const hasSQL = sqlKeywords.some(keyword => 
    content.toUpperCase().includes(keyword)
  );
  
  const hasExport = /export\s+(async\s+)?function/.test(content);
  
  return hasSQL && hasExport;
}

async function scanExistingQueries() {
  const queriesDir = 'src/lib/db/queries';
  const files = fs.readdirSync(queriesDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  
  return files.map(file => ({
    path: path.join(queriesDir, file),
    content: fs.readFileSync(path.join(queriesDir, file), 'utf-8')
  }));
}

async function checkSimilarity(proposed, existing) {
  // Use Claude API or simple pattern matching
  // Implementation details here
  return {
    isDuplicate: false,
    similarFunctions: [],
    recommendation: ''
  };
}

function reportDuplication(result) {
  const message = `
⚠️  Query Duplication Detected

The proposed query appears to duplicate existing functionality:

${result.similarFunctions.map(f => 
  `  - ${f.name} in ${f.filePath}\n    Reason: ${f.similarityReason}`
).join('\n')}

Recommendation: ${result.recommendation}

Please reuse the existing function(s) instead of creating a duplicate.
  `;
  
  console.error(message);
}
```

## Appendix B: Directory Structure

```
project-root/
├── .claude/
│   └── hooks/
│       ├── pre-query-duplicate-check.json
│       └── scripts/
│           ├── check-query-duplication.js
│           └── utils/
│               ├── query-scanner.js
│               └── similarity-checker.js
├── src/
│   └── lib/
│       └── db/
│           └── queries/
│               ├── orders.ts
│               ├── users.ts
│               └── products.ts
└── package.json
```

## Appendix C: Configuration Examples

### Minimal Configuration
```json
{
  "name": "query-duplication-prevention",
  "event": "PreToolUse",
  "tools": ["Write", "StrReplace"],
  "command": "node .claude/hooks/scripts/check-query-duplication.js"
}
```

### Advanced Configuration
```json
{
  "name": "query-duplication-prevention",
  "event": "PreToolUse",
  "tools": ["Write", "StrReplace"],
  "command": "node .claude/hooks/scripts/check-query-duplication.js",
  "options": {
    "timeout": 10000,
    "retries": 2,
    "logLevel": "info"
  },
  "environment": {
    "QUERY_HOOK_SIMILARITY_THRESHOLD": "0.75",
    "QUERY_HOOK_CACHE_ENABLED": "true"
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Author**: Development Team  
**Status**: Draft for Review
