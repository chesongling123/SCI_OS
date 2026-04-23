# PhD_OS Coding Conventions & Harness Rules

> Machine-readable rules for AI agents working on PhD_OS. Follow these conventions to produce consistent, maintainable code.

---

## 1. General Principles

Write code that:
- Uses **explicit types** everywhere (never `any`, prefer `unknown` + type guards)
- Follows **feature-based colocation** (related files live together)
- Uses **ES modules** (`import/export`) exclusively — no CommonJS
- Prefers **destructured imports**: `import { foo } from 'bar'`
- Includes **JSDoc comments** for all public API surfaces

## 2. Monorepo Rules

### Package Boundaries

```
shared-types → backend ✓   backend → shared-types ✗
shared-types → frontend ✓  frontend → shared-types ✗
backend → frontend ✗       frontend → backend ✗
```

- `packages/shared-types` is the ONLY shared dependency between frontend and backend
- Never import frontend code in backend or vice versa
- After modifying `shared-types`, always run: `pnpm -F @phd/shared-types build`

### Naming Conventions

| Layer | Naming | Example |
|-------|--------|---------|
| Package | `@phd/[name]` | `@phd/backend`, `@phd/frontend` |
| Module | kebab-case | `task/`, `calendar/`, `pomodoro/` |
| Component | PascalCase | `TaskCard.tsx`, `GlassButton.tsx` |
| Hook | camelCase + `use` prefix | `useTasks.ts`, `useAiChat.ts` |
| Service | camelCase | `task.service.ts` |
| Controller | camelCase | `task.controller.ts` |
| DTO | PascalCase + `Dto` suffix | `CreateTaskDto`, `MoveTaskDto` |
| Type/Interface | PascalCase | `TaskStatus`, `PomodoroSession` |
| Enum | PascalCase | `TaskStatus`, `Priority` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

## 3. Backend (NestJS) Rules

### Module Structure

Every domain module follows this exact structure:

```
modules/task/
├── task.module.ts          ← Module definition
├── task.controller.ts      ← HTTP routes (thin)
├── task.service.ts         ← Business logic
├── task.repository.ts      ← Database access (optional)
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── move-task.dto.ts
└── entities/
    └── task.entity.ts      ← Prisma-generated types preferred
```

### Controller Rules

- Controllers are **thin**: delegate all logic to Services
- All routes must have Swagger decorators:

```typescript
@ApiTags('Tasks')
@Controller('api/v1/tasks')
export class TaskController {
  @Get()
  @ApiOperation({ summary: 'List all tasks for the current user' })
  @ApiResponse({ status: 200, description: 'Returns task list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: ListTasksDto): Promise<TaskResponseDto[]> {
    return this.taskService.findAll(query);
  }
}
```

### Service Rules

- Services contain all business logic
- Use constructor injection (never instantiate dependencies manually)
- Return typed DTOs (never raw Prisma results directly)

```typescript
@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTaskDto): Promise<TaskResponseDto> {
    const task = await this.prisma.task.create({
      data: { ...dto, userId: this.getCurrentUserId() },
    });
    this.eventEmitter.emit('task.created', task);
    return this.mapper.toResponse(task);
  }
}
```

### Database Rules

- Use Prisma Client (never raw SQL unless absolutely necessary)
- All queries must filter `deletedAt: null` (soft delete pattern)
- Use transactions for multi-step operations
- Never expose database IDs to frontend — always map to response DTOs

## 4. Frontend (React) Rules

### Component Structure

```tsx
// Public API at top
export function TaskCard({ task, onMove, onDelete }: TaskCardProps) {
  // Hooks first
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate: moveTask } = useMoveTask();

  // Derived state
  const priorityColor = PRIORITY_COLORS[task.priority];

  // Event handlers
  const handleDragEnd = (event: DragEndEvent) => {
    // ...
  };

  // Render
  return (
    <GlassCard className="...">
      {/* JSX */}
    </GlassCard>
  );
}

// Types at bottom (or in separate .types.ts file)
interface TaskCardProps {
  task: Task;
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}
```

### Hook Rules

- Custom hooks go in `modules/[feature]/hooks/`
- Always use `useQuery` for reads and `useMutation` for writes
- Include `staleTime` and `gcTime` in query configurations

```typescript
// Good
export function useTasks(status?: TaskStatus) {
  return useQuery({
    queryKey: ['tasks', status],
    queryFn: () => api.tasks.list({ status }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

// Good
export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, sortOrder }: MoveTaskParams) =>
      api.tasks.move(id, { status, sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Styling Rules

- Use Tailwind CSS utility classes exclusively
- Never write inline styles (except for dynamic values)
- Use the liquid glass design system CSS variables:

```css
/* Available CSS variables from glass-theme.css */
--glass-bg: rgba(255, 255, 255, 0.08);
--glass-border: rgba(255, 255, 255, 0.15);
--glass-highlight: rgba(255, 255, 255, 0.25);
--glass-blur: 16px;
--glass-saturation: 1.2;
```

- Use `glass-*` utility classes from the design system:

```tsx
// Correct
<GlassCard className="glass-surface p-4">
  <h2 className="text-glass-foreground font-medium">Title</h2>
  <p className="text-glass-muted text-sm">Description</p>
</GlassCard>

// Incorrect
<div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
```

## 5. OpenClaw Integration Rules

### WebSocket Client Rules

- `OpenClawService` is a NestJS singleton (module-scoped)
- Connection established in `OnModuleInit`, cleaned up in `OnModuleDestroy`
- Exponential backoff for reconnection (1s → 2s → 4s → 8s → max 30s)
- Never expose Gateway credentials to frontend — backend proxies all AI calls

### MCP Server Rules

- All MCP Servers use Docker sandbox (`docker run --rm -i`)
- Server names use `phd-` prefix
- Tool descriptions must be clear enough for an AI to understand when to use them
- Input schemas must include `description` for every parameter

### Skill Rules

- Skill names use `phd-` prefix
- Always include `version` in frontmatter (semver)
- List only tools the skill actually uses
- Include example tool calls in workflow steps
- Rules section must cover edge cases

## 6. Testing Rules

### Backend Testing

```typescript
// Unit test pattern
describe('TaskService', () => {
  let service: TaskService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new TaskService(prisma);
  });

  it('should create task with correct sortOrder', async () => {
    prisma.task.create.mockResolvedValue(mockTask);
    const result = await service.create(createDto);
    expect(result.sortOrder).toBeDefined();
  });
});
```

### Frontend Testing

```typescript
// Component test pattern
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

describe('TaskCard', () => {
  it('renders task title', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskCard task={mockTask} />
      </QueryClientProvider>
    );
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
```

## 7. Forbidden Patterns

These patterns are **prohibited** and will be caught by CI:

```typescript
// ❌ NEVER use 'any'
function bad(data: any) { ... }

// ❌ NEVER use console.log in production code
console.log('debug');

// ❌ NEVER use raw Prisma results as API responses
return prisma.task.findMany(); // Wrong

// ❌ NEVER forget Swagger decorators on controllers
@Get() // Missing @ApiOperation
async findAll() { ... }

// ❌ NEVER hardcode demo user in new code
const userId = 'demo@phd-os.local'; // Will fail auth integration

// ❌ NEVER use string concatenation for SQL
const query = `SELECT * FROM tasks WHERE id = ${id}`; // SQL injection!

// ❌ NEVER commit .env files or secrets
// .env should be in .gitignore

// ❌ NEVER use implicit returns in complex functions
const bad = () => condition ? value1 : value2; // Ambiguous

// ❌ NEVER forget error handling in async functions
async function bad() {
  const data = await fetch('/api'); // No try/catch
}
```

## 8. Git Commit Rules

```
<type>(<scope>): <description>

<body>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:

```
feat(task): add drag-and-drop reordering
fix(pomodoro): correct session duration calculation
refactor(ai): extract OpenClaw client to shared module
docs(openclaw): add MCP Server development guide
```

## 9. Anti-Patterns Specific to PhD_OS

| Anti-Pattern | Why Forbidden | Correct Approach |
|--------------|--------------|------------------|
| Demo user hardcoding | Blocks auth system migration | Use `req.user` from JWT guard |
| Direct SQL queries | Bypasses Prisma's type safety and soft-delete | Use Prisma Client methods |
| Frontend calling OpenClaw directly | Security risk — API keys exposed | Backend proxies all AI calls |
| Missing `deletedAt` filter | Returns soft-deleted records | Always include in WHERE |
| Any `as any` cast | Defeats TypeScript purpose | Use proper types or `unknown` |
| Inline liquid glass CSS | Inconsistent UI | Use glass-* utility classes |
