# Task: Enhance Chat Interface with Real-Time Task Progress

## Overview
I need you to add real-time task progress visualization to our existing chat interface using AI Elements Task component. This is an ENHANCEMENT to existing code, not a new project.

## 🚨 CRITICAL: Start with Analysis, NOT Coding

**DO NOT write any code until you complete the analysis phase.**

### Phase 0: Codebase Analysis (Required First Step)

1. **Explore the entire project structure**
   ```bash
   tree -L 3
   # or
   find . -type f -name "*.tsx" -o -name "*.ts" | head -30
   ```

2. **Locate these critical files:**
   - [ ] Main chat interface component (where useChat is used)
   - [ ] API route handling chat requests
   - [ ] Current Response component usage
   - [ ] Type definitions location
   - [ ] Existing tool definitions
   - [ ] AI Elements components location

3. **Document your findings:**
   Create a file called `IMPLEMENTATION_PLAN.md` with:
   - Current project structure
   - Paths to all key files
   - Import patterns (@ / ~ / relative)
   - Naming conventions
   - Styling approach
   - Existing tools list

4. **Share your analysis with me before proceeding**
   Show me your `IMPLEMENTATION_PLAN.md` so we can confirm you understand the structure correctly.

## Documentation Provided

I've prepared three comprehensive documents:

### 1. PRD Document
- Product requirements and specifications
- **Includes emphasis on adapting to existing codebase**
- Implementation phases with detailed checklist
- Success criteria

### 2. Sample Implementation Code
- Reference implementations for all components
- **These are TEMPLATES - adapt to our codebase, don't copy-paste**
- Shows the pattern and data flow
- Demonstrates correct API usage

### 3. Implementation Guide
- Step-by-step instructions
- **Emphasizes analysis-first approach**
- Troubleshooting tips
- Testing checklist

## Key Principles

1. ✅ **Understand first, code second**
2. ✅ **Adapt sample code to match existing patterns**
3. ✅ **Extend existing types, don't create parallel ones**
4. ✅ **Follow project's conventions exactly**
5. ✅ **Preserve all existing functionality**
6. ✅ **Test incrementally**

## What I Expect

### First Response: Your Analysis
Please respond with:
```markdown
# Codebase Analysis Complete

## Project Structure
- Framework: [Next.js App Router / Pages / Other]
- Components: [path]
- API Routes: [path]
- Types: [path]

## Key Files Located
- Chat Component: [exact path]
- API Endpoint: [exact path]
- Response Component: [path]
- Types: [path]

## Code Patterns
- Import alias: [@ / ~ / relative]
- Naming: [convention]
- Exports: [default / named]
- Styling: [approach]

## Existing Tools
1. [tool name] - [file location]
2. [tool name] - [file location]

## Implementation Strategy
Based on this structure, I will:
1. [specific file] - [what I'll do]
2. [specific file] - [what I'll do]
3. [specific file] - [what I'll do]

## Questions / Concerns
- [any uncertainties about the codebase]
- [any potential conflicts]
```

### After Analysis Approval: Implementation
Only after I approve your analysis, proceed with:
1. Installing Task component
2. Updating types
3. Modifying API route
4. Creating EnhancedResponse
5. Updating chat component

## Expected Outcome

Users should see:
- Real-time task cards during tool execution
- Status indicators (pending → in_progress → completed)
- Progress updates streaming in
- Expandable/collapsible task details
- All existing chat functionality preserved

## What NOT to Do

❌ Don't start coding immediately
❌ Don't copy-paste sample code without adapting
❌ Don't create new folder structures
❌ Don't change existing file organization
❌ Don't skip the analysis phase
❌ Don't break existing functionality

## What TO Do

✅ Analyze the codebase thoroughly first
✅ Adapt all sample code to match our patterns
✅ Follow existing conventions
✅ Test after each change
✅ Ask questions if uncertain
✅ Document your changes

## Questions Before Starting?

Before you begin the analysis, do you have any questions about:
- The task requirements?
- The expected approach?
- The documentation provided?
- What I'm looking for in your analysis?

---

Please start by exploring the codebase and providing your analysis. I'll review it before you proceed with implementation.
