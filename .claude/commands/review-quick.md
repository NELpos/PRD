# Next.js 15 Quick Code Review

**IMPORTANT: Provide all review results in Korean (한글로 작성)**

Tech Stack: Next.js 15, React 19, TypeScript, Zustand, shadcn/ui, Drizzle ORM, TanStack Query

Focus on HIGH PRIORITY issues only (🔴). Provide concise, actionable feedback.

## Frontend Review (Priority Items Only)

### 1. React 19 Compiler Anti-patterns
- Remove unnecessary `React.memo`, `useMemo`, `useCallback` that block automatic optimization
- Verify components follow Rules of React (pure, no side effects in render)
- Check for memoization-for-correctness bugs (over-reliance on reference equality)

### 2. Server/Client Component Architecture
- Verify default Server Component usage (no unnecessary `'use client'`)
- Check Client Components are pushed to leaf nodes only
- Ensure data fetching happens in Server Components, not API routes
- Validate no sensitive data exposure in Client Components

### 3. TanStack Query Patterns
- Check for duplicate fetch logic that should use `useQuery`
- Verify proper `queryKey` structure and consistency
- Look for missing error/loading states
- Check unnecessary API route calls (should be Server Component direct fetching)

### 4. Zustand State Management
- Verify global state is actually global-worthy (not local component state)
- Check for state over-fetching (selecting too much data causing re-renders)
- Ensure proper selector usage: `const name = useStore(state => state.name)`
- Look for state that should be React Query cache instead

### 5. shadcn/ui Component Usage
- Check for improper component composition
- Verify accessibility props are properly set
- Look for inline style overrides (should use Tailwind classes)
- Ensure proper form integration with React Hook Form

### 6. Critical Performance Issues
- Identify waterfalls in data fetching
- Check for missing `next/image` optimization
- Verify heavy components have dynamic imports
- Look for large Client Component bundles

## Backend Review (Priority Items Only)

### 1. Drizzle ORM Optimization
- Check for N+1 query problems
- Verify proper relations usage (with() for eager loading)
- Look for missing indexes on frequently queried columns
- Check for select() optimization (avoid selecting unused columns)

### 2. API Routes vs Server Components
- Identify API routes that should be Server Components
- Check caching strategy for GET endpoints
- Verify proper error handling and status codes

### 3. Security Critical Issues
- Check environment variable leaks (NEXT_PUBLIC_ misuse)
- Verify SQL injection prevention (using Drizzle parameterized queries)
- Look for exposed API keys or secrets in client code

## Output Format

For each issue found:

**🔴 [Issue Title]**
- **Location**: `file/path:line`
- **Current Code**: 
```typescript
// problematic code
```
- **Improved Code**:
```typescript
// optimized code with comments
```
- **Impact**: Performance/Security/Maintainability improvement expected
- **Reason**: Specific Next.js 15/React 19 best practice reference

## Final Checklist
- [ ] No React Compiler blocking patterns
- [ ] Server/Client boundary optimized
- [ ] TanStack Query properly integrated
- [ ] Zustand selectors optimized
- [ ] Drizzle queries optimized (no N+1)
- [ ] No critical security issues

Begin quick review now. **Write all results in Korean.**