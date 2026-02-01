# PR Review: "Switch org-mcp to direct Org file editing"

**PR:** #1
**Branch:** `oc/file-editing` → `main`
**Changes:** +481 −151 across 5 files

## Summary

This PR makes an architectural shift from an Emacs daemon-dependent model to direct file I/O. The MCP server now reads/writes the workflow Org file directly using a new parsing library.

---

## Changes by File

| File | Lines | Assessment |
|------|-------|------------|
| `README.md` | +42/-36 | ✅ Good - Clear documentation update |
| `package.json` | +7/-4 | ✅ Good - Bun migration, adds Zod |
| `src/index.ts` | +116/-111 | ✅ Good - Clean tool registration |
| `src/org.ts` | +260 (new) | ⚠️ See comments below |
| `test/org.test.ts` | +56 (new) | ✅ Good - Basic test coverage |

---

## What's Good

1. **Clean architecture** - Removes Emacs daemon dependency, making the server self-contained
2. **Modern MCP SDK** - Uses `McpServer` API (SDK 1.24.3) with Zod schemas
3. **Well-defined tools** - `list_tasks`, `get_task_context`, `set_task_state`, `append_task_log`
4. **Good test coverage** - Tests cover parsing, context extraction, state changes, and log appending
5. **Configurable** - `ORG_MCP_WORKFLOW_FILE` env var with sensible default

---

## Potential Issues / Questions

### 1. `src/org.ts:206-214` - Recursive call in `appendTaskLog`

```typescript
// Recompute task boundaries after insertion
const newText = joinLines(lines);
const newTask = findTaskById(newText, taskId, allowedStates);
...
return appendTaskLog(newText, taskId, entry, { timestamp: ts, allowedStates });
```

The recursive call when creating a new Log section is a bit surprising. It works, but reparsing the entire file twice for a single append could be avoided with inline insertion logic.

### 2. No file locking / concurrent access handling

If multiple agents or processes write to the workflow file simultaneously, there's potential for race conditions and data loss. Consider adding advisory file locks or atomic writes.

### 3. Error handling for missing file

`readOrgFile` will throw if the file doesn't exist. Should the server gracefully handle a missing workflow file (e.g., create it or return empty task list)?

### 4. `src/org.ts:64` - State type casting

```typescript
if (allowedStates.includes(maybeState as any)) {
```

The `as any` cast is a type escape hatch. Could be cleaner with proper typing.

### 5. Edge case: Task without state

When a task has no TODO keyword, `setTaskState` will change `* Title` to `* DONE Title`, which works. But if the original had no state, should that be preserved somewhere in properties?

---

## Test Coverage Assessment

The tests are good but limited:

- ✅ Parsing tasks with IDs
- ✅ Extracting agent context
- ✅ Setting task state
- ✅ Appending to log (with creation)

**Missing tests:**

- Edge cases (empty file, malformed org, nested headings)
- Error conditions (task not found, invalid state)
- `list_tasks` filtering logic

---

## Verdict

**Approve with minor suggestions.** This is a solid foundational change that removes external dependencies and implements working tool functionality. The code is readable and well-structured. The suggestions above are improvements rather than blockers.
