# Next.js 15 Comprehensive Deep Code Review

**IMPORTANT: Provide all review results in Korean (한글로 작성)**

Tech Stack: Next.js 15, React 19, TypeScript, Zustand, shadcn/ui, Drizzle ORM, TanStack Query

Perform comprehensive analysis with all priority levels (🔴 High, 🟡 Medium, 🟢 Low).

## 📋 Frontend Deep Review

### 1. React 19 & Compiler Optimization
- **Automatic Memoization**:
  - Remove all unnecessary `React.memo`, `useMemo`, `useCallback`
  - Identify exceptions: expensive calculations, external library integrations, strict reference equality requirements
  - Verify React Compiler isn't disabled/blocked by ESLint rules
  
- **Component Purity Validation**:
  - Check all components follow Rules of React
  - Verify no side effects during render phase
  - Ensure props/state immutability
  - Look for hidden mutation bugs
  
- **Performance Profiling**:
  - Identify components causing excessive re-renders
  - Check for prop drilling (should use composition or Zustand)
  - Verify proper use of React 19's `use()` hook for async operations

### 2. Server/Client Components Architecture
- **Server Components Strategy**:
  - Verify all components are Server Components by default
  - Check `'use client'` is minimal and necessary
  - Ensure data fetching happens on server (direct DB/API calls)
  - Validate no API routes used for internal data fetching
  - Check proper async/await in Server Components
  
- **Client Components Optimization**:
  - Verify Client Components only for: `useState`, `useEffect`, browser APIs, event handlers
  - Check Client Components are at leaf nodes (component tree edges)
  - Ensure no full page/layout marked as `'use client'`
  - Verify proper serializable props between Server/Client boundary
  
- **Composition Patterns**:
  - Check for proper Server Component wrapping Client Components
  - Verify children pattern for flexible composition
  - Look for context provider optimization opportunities

### 3. TanStack Query Advanced Patterns
- **Query Management**:
  - Check proper `queryKey` factory pattern implementation
  - Verify `staleTime` and `gcTime` are appropriately configured
  - Look for query dependencies and parallel queries optimization
  - Check proper use of `enabled` option for dependent queries
  
- **Server State vs Client State**:
  - Verify server state uses React Query (not Zustand)
  - Check Zustand is only for UI state (theme, sidebar state, etc.)
  - Look for state duplication between React Query cache and Zustand
  
- **Advanced Features**:
  - Check prefetching strategy (getQueryClient in Server Components)
  - Verify optimistic updates implementation
  - Look for infinite query patterns for pagination
  - Check proper query invalidation after mutations
  - Verify suspense integration if used
  
- **Performance Optimization**:
  - Check for select option to prevent unnecessary re-renders
  - Verify structural sharing is working correctly
  - Look for query deduplication opportunities

### 4. Zustand State Management Deep Dive
- **Store Architecture**:
  - Check store is properly sliced (multiple small stores vs one big store)
  - Verify proper TypeScript typing for stores
  - Look for middleware usage: persist, devtools, immer
  - Check for store subscription optimization
  
- **Selector Optimization**:
  - Verify granular selectors: `useStore(state => state.specificValue)`
  - Check for shallow equality comparisons where needed
  - Look for derived state (should use selectors, not stored values)
  - Verify no entire state selections causing unnecessary re-renders
  
- **State Patterns**:
  - Check state updates are immutable
  - Verify async actions are properly handled
  - Look for state reset/clear patterns
  - Check for proper state initialization
  
- **Integration**:
  - Verify Zustand doesn't duplicate server state (should be in React Query)
  - Check proper integration with Server Components (minimal usage)
  - Look for localStorage persistence configuration

### 5. shadcn/ui Component System
- **Component Composition**:
  - Check proper component assembly (Button, Card, Dialog, etc.)
  - Verify no prop drilling (use composition instead)
  - Look for proper variant usage (cva patterns)
  - Check for consistent spacing/sizing tokens
  
- **Accessibility (a11y)**:
  - Verify ARIA labels on interactive elements
  - Check keyboard navigation support
  - Look for focus management in dialogs/modals
  - Verify color contrast ratios
  - Check for screen reader support
  
- **Form Integration**:
  - Verify React Hook Form integration with shadcn Form components
  - Check proper validation schema (Zod integration)
  - Look for proper error message display
  - Verify form submission handling
  
- **Theming & Styling**:
  - Check proper CSS variable usage (--primary, --background, etc.)
  - Verify no inline styles (use Tailwind utility classes)
  - Look for dark mode implementation
  - Check responsive design patterns
  - Verify proper cn() utility usage for class merging
  
- **Performance**:
  - Check for unnecessary component re-renders
  - Verify proper memoization for complex components (if needed)
  - Look for heavy components that need code splitting

### 6. Performance & Optimization
- **Code Splitting**:
  - Check `next/dynamic` usage for heavy components
  - Verify route-based automatic code splitting
  - Look for bundle size optimization opportunities
  - Check for proper loading states during lazy loading
  
- **Image Optimization**:
  - Verify all images use `next/image`
  - Check proper `priority`, `loading`, `sizes` attributes
  - Look for responsive image configurations
  - Verify image format optimization (WebP/AVIF)
  
- **Bundle Optimization**:
  - Check for unnecessary dependencies
  - Verify tree-shakeable imports
  - Look for duplicate dependencies in bundle
  - Check Client Component JavaScript bundle sizes
  - Verify proper externalization of large libraries
  
- **Rendering Performance**:
  - Check for waterfall patterns in data fetching
  - Verify proper streaming with Suspense boundaries
  - Look for layout shift issues (CLS)
  - Check for proper loading skeleton implementation

### 7. Next.js 15 Specific Features
- **Partial Prerendering (PPR)**: Check if experimental PPR can be enabled
- **after() API**: Look for analytics/logging that should use after()
- **Turbopack**: Verify development uses `--turbo` flag
- **Caching Strategy**: Check understanding of new uncached-by-default behavior
- **Async Request APIs**: Verify proper usage of headers(), cookies(), params
- **Metadata API**: Check proper SEO metadata configuration

### 8. Code Quality & Refactoring
- **Duplicate Code**:
  - Identify repeated logic for custom hooks extraction
  - Check for reusable component opportunities
  - Look for utility function separation needs
  
- **Component Size**:
  - Verify components are 150-200 lines max
  - Check single responsibility principle adherence
  - Look for composition over configuration patterns
  
- **TypeScript**:
  - Verify strict mode enabled
  - Check explicit prop/state typing
  - Look for `any` usage (should be avoided)
  - Verify proper type inference from Drizzle schema
  - Check for type-safe API responses
  
- **Code Organization**:
  - Check proper folder structure (app router conventions)
  - Verify feature-based organization
  - Look for proper file naming conventions
  - Check for circular dependency issues

### 9. Testing & Quality Assurance
- **Component Testing**:
  - Check for unit tests using Vitest/React Testing Library
  - Verify critical user flows have tests
  - Look for accessibility tests
  
- **Integration Testing**:
  - Check for API route tests
  - Verify database integration tests with Drizzle
  
- **Type Safety**:
  - Verify end-to-end type safety (DB schema → API → UI)
  - Check for proper error type handling

## 🔧 Backend Deep Review

### 1. Drizzle ORM Advanced Optimization
- **Query Performance**:
  - **N+1 Detection**: Identify all N+1 query patterns
  - **Eager Loading**: Verify proper `with()` usage for relations
  - **Select Optimization**: Check unnecessary column selection
  - **Prepared Statements**: Look for repeated queries to optimize
  
- **Schema Design**:
  - Check proper index definitions on frequently queried columns
  - Verify foreign key relationships are correctly defined
  - Look for proper enum usage vs string columns
  - Check for timestamp column consistency (createdAt, updatedAt)
  - Verify proper data type selection
  
- **Query Patterns**:
  - Check for proper transaction usage
  - Verify batch insert/update patterns for bulk operations
  - Look for proper pagination implementation (cursor vs offset)
  - Check for proper filtering/sorting optimization
  
- **Type Safety**:
  - Verify `InferSelectModel` and `InferInsertModel` usage
  - Check proper typing for query results
  - Look for type-safe relationship queries
  
- **Migrations**:
  - Check migration file organization
  - Verify rollback strategies
  - Look for data migration patterns

### 2. API Design & Server Actions
- **API Routes vs Server Components**:
  - Identify API routes that should be Server Components
  - Check API routes are only for: webhooks, external integrations, client-only access
  - Verify Server Components directly query database
  
- **Server Actions**:
  - Check proper `'use server'` directive usage
  - Verify form actions use Server Actions
  - Look for proper validation (Zod schemas)
  - Check revalidation after mutations (revalidatePath, revalidateTag)
  
- **Caching Strategy**:
  - Verify GET route handlers have proper cache configuration
  - Check `fetch()` has proper `next.revalidate` settings
  - Look for `unstable_cache` usage for expensive operations
  - Verify proper cache invalidation patterns
  
- **Error Handling**:
  - Check proper error response format
  - Verify HTTP status codes are correct
  - Look for proper error logging
  - Check user-friendly error messages

### 3. Data Fetching Patterns
- **Parallel Fetching**:
  - Verify `Promise.all()` for multiple independent queries
  - Check for waterfall anti-patterns
  - Look for proper error handling in parallel fetches
  
- **Streaming & Suspense**:
  - Check long queries are wrapped in Suspense boundaries
  - Verify progressive rendering for better UX
  - Look for proper loading states
  
- **Data Deduplication**:
  - Verify React's automatic request deduplication works
  - Check for cache() function usage where appropriate

### 4. Security Deep Dive
- **Environment Variables**:
  - Verify server-only variables don't have `NEXT_PUBLIC_` prefix
  - Check proper `.env.local` usage
  - Look for hardcoded secrets
  
- **SQL Injection**:
  - Verify all queries use Drizzle's parameterized queries
  - Check for any string concatenation in queries
  
- **Authentication & Authorization**:
  - Check proper session handling
  - Verify protected routes have proper guards
  - Look for CSRF protection in forms
  - Check proper CORS configuration
  
- **Data Validation**:
  - Verify all inputs are validated (Zod schemas)
  - Check for proper sanitization
  - Look for rate limiting implementation

### 5. Error Handling & Resilience
- **Error Boundaries**:
  - Check `error.tsx` files at appropriate levels
  - Verify proper error UI for users
  - Look for error reporting integration (Sentry, etc.)
  
- **Loading States**:
  - Verify `loading.tsx` files
  - Check skeleton UI implementation
  - Look for proper streaming fallbacks
  
- **Not Found Handling**:
  - Check `not-found.tsx` implementation
  - Verify proper 404 responses
  - Look for proper notFound() usage in Server Components

### 6. Database & Infrastructure
- **Connection Management**:
  - Check proper database connection pooling
  - Verify no connection leaks
  - Look for proper connection configuration
  
- **Performance Monitoring**:
  - Check for slow query logging
  - Verify proper database query performance tracking
  
- **Backup & Recovery**:
  - Verify migration strategy allows rollback
  - Check for proper data backup patterns

## 📊 Review Output Format

For each issue, provide:

**[🔴/🟡/🟢] [Category] Issue Title**

**📍 Location**: `app/path/to/file.tsx:line`

**❌ Current Code**:
```typescript
// Current implementation with problem highlighted
```

**✅ Improved Code**:
```typescript
// Optimized implementation with detailed comments
// Explain why each change is made
```

**💡 Explanation**:
- **Problem**: Detailed explanation of the issue
- **Impact**: Performance/Security/Maintainability/UX impact (quantify if possible)
- **Best Practice**: Reference to Next.js 15/React 19/Zustand/Drizzle best practices
- **Additional Context**: Related patterns or considerations

**🎯 Expected Improvement**:
- Performance metrics (if applicable)
- Bundle size reduction (if applicable)
- Developer experience improvement

## Additional Deep Analysis

### Performance Metrics
- Analyze Core Web Vitals impact (LCP, FID, CLS)
- Bundle size analysis for Client Components
- Database query performance estimates

### Architecture Review
- Overall component architecture assessment
- State management strategy evaluation
- Data flow analysis (Server → Client)

### Scalability Considerations
- Identify potential bottlenecks as app grows
- Suggest patterns for future feature additions
- Database schema scalability review

### Developer Experience
- Code maintainability assessment
- Type safety coverage
- Testing coverage gaps

## Final Comprehensive Checklist

### React & Performance
- [ ] No React Compiler blocking patterns
- [ ] Server/Client boundary properly optimized
- [ ] No unnecessary re-renders (verified with React DevTools)
- [ ] Code splitting implemented where needed
- [ ] Images optimized with next/image

### State Management
- [ ] TanStack Query for all server state
- [ ] Zustand only for UI/client state
- [ ] No state duplication
- [ ] Proper selector optimization

### Data & Backend
- [ ] No N+1 queries in Drizzle
- [ ] Proper indexes on database tables
- [ ] API routes minimized (prefer Server Components)
- [ ] Caching strategy properly implemented
- [ ] Proper error handling throughout

### UI & Components
- [ ] shadcn/ui properly integrated
- [ ] Accessibility requirements met
- [ ] Forms properly validated (Zod + React Hook Form)
- [ ] Consistent design system usage

### Security
- [ ] No environment variable leaks
- [ ] SQL injection prevented
- [ ] Proper authentication/authorization
- [ ] Input validation comprehensive

### Quality
- [ ] TypeScript strict mode
- [ ] No duplicate code
- [ ] Components follow single responsibility
- [ ] Proper folder structure

Begin comprehensive deep review now. **Write all results in Korean (모든 리뷰 결과는 한글로 작성).**