## Project Overview

**SAS Clinical Trial Decision Tree** - Interactive tool for selecting appropriate SAS statistical procedures for clinical trial analysis.

**Tech Stack:** React 18.2 + TypeScript 5.8 + Vite 6.2 + Tldraw 2.4.4 + Google Generative AI

**Views:**
- Map View (default): Tldraw infinite canvas with expandable decision tree
- Interactive Flow: Step-by-step wizard with breadcrumb navigation
- AI Chat: Gemini-powered assistant for SAS code customization

## Critical Rules

### 1. Code Organization

- Many small files over few large files
- High cohesion, low coupling
- 200-400 lines typical, 800 max per file
- Organize by feature/domain, not by type

### 2. Code Style

- No emojis in code, comments, or documentation
- Immutability always - never mutate objects or arrays
- No console.log in production code
- Proper error handling with try/catch
- Input validation with Zod or similar

### 3. Testing

- TDD: Write tests first
- 80% minimum coverage
- Unit tests for utilities
- Integration tests for APIs
- E2E tests for critical flows

### 4. Security

- No hardcoded secrets
- Environment variables for sensitive data
- Validate all user inputs
- Parameterized queries only
- CSRF protection enabled

## File Structure

```
stat-tree/
|-- components/       # React components (ChatPanel, SASCard)
|-- utils/            # Utility functions (treeLayout, expansionState, etc.)
|-- codemaps/         # Architecture documentation
|-- .reports/         # Generated reports
|-- __mocks__/        # Jest test mocks
|-- App.tsx           # Main component (dual-view system)
|-- data.ts           # Decision tree data (40+ nodes)
|-- types.ts          # TypeScript interfaces
|-- index.tsx         # React entry point
```

## Key Patterns

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### Error Handling

```typescript
try {
  const result = await operation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { success: false, error: 'User-friendly message' }
}
```

## Environment Variables

```bash
# Required for AI Chat
VITE_GEMINI_API_KEY=    # Google Generative AI key
```

## Available Commands

- `/tdd` - Test-driven development workflow
- `/plan` - Create implementation plan
- `/code-review` - Review code quality
- `/build-fix` - Fix build errors

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Never commit to main directly
- PRs require review
- All tests must pass before merge
