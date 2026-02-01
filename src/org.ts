import fs from "node:fs/promises";
import path from "node:path";

export type OrgTask = {
  id: string;
  level: number;
  rawHeadingLine: string;
  title: string;
  state?: string;
  properties: Record<string, string>;
  startLine: number; // 0-indexed
  endLine: number; // inclusive, 0-indexed
};

export type GetTaskContextResult = {
  id: string;
  state?: string;
  title: string;
  properties: Record<string, string>;
  agentContext: string;
};

export const DEFAULT_STATES: readonly string[] = [
  "BACKLOG",
  "TODO",
  "IN-PROGRESS",
  "IN-REVIEW",
  "DONE",
  "CANCELLED",
];

export function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(process.env.HOME ?? "", p.slice(2));
  return p;
}

export async function readOrgFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err: any) {
    // Treat missing workflow file as empty; callers can create it on write.
    if (err?.code === "ENOENT") return "";
    throw err;
  }
}

async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmp = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

  await fs.writeFile(tmp, content, "utf8");
  // Atomic replace on POSIX; on Windows rename may fail if dest exists.
  try {
    await fs.rename(tmp, filePath);
  } catch (err: any) {
    // Fallback for platforms where rename-overwrite is not allowed.
    if (err?.code === "EEXIST" || err?.code === "EPERM") {
      await fs.writeFile(filePath, content, "utf8");
      await fs.unlink(tmp).catch(() => undefined);
      return;
    }
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

async function withAdvisoryLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  // Cross-platform advisory lock via lockfile creation.
  // Limitations: if the process crashes, the lock file may be left behind.
  const lockPath = `${filePath}.lock`;
  const maxWaitMs = 5_000;
  const start = Date.now();

  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try {
        return await fn();
      } finally {
        await handle.close().catch(() => undefined);
        await fs.unlink(lockPath).catch(() => undefined);
      }
    } catch (err: any) {
      if (err?.code !== "EEXIST") throw err;
      if (Date.now() - start > maxWaitMs) {
        throw new Error(`Timed out waiting for lock: ${lockPath}`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

export async function writeOrgFile(filePath: string, content: string): Promise<void> {
  // Use atomic replace + an advisory lock to reduce concurrent clobbering.
  await withAdvisoryLock(filePath, async () => {
    await writeFileAtomic(filePath, content);
  });
}

function isHeadingLine(line: string): boolean {
  return /^\*+\s+/.test(line);
}

function headingLevel(line: string): number {
  const m = line.match(/^(\*+)/);
  return m ? m[1].length : 0;
}

function parseHeading(line: string, allowedStates: readonly string[]) {
  // "** TODO Title" or "* Title"
  const level = headingLevel(line);
  const rest = line.replace(/^\*+\s+/, "");
  const parts = rest.split(/\s+/);
  const maybeState = parts[0];
  if (maybeState && allowedStates.includes(maybeState)) {
    const title = rest.slice(maybeState.length).trim();
    return { level, state: maybeState, title };
  }
  return { level, state: undefined, title: rest.trim() };
}

function sliceLines(text: string): string[] {
  // preserve empty last line behavior ok; we re-join with \n
  // normalize to \n
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}

function parsePropertiesDrawer(lines: string[], start: number, end: number): Record<string, string> {
  // Search within [start, end] for :PROPERTIES: ... :END:
  let i = start;
  while (i <= end) {
    if (lines[i]?.trim() === ":PROPERTIES:") break;
    i++;
  }
  if (i > end) return {};
  const props: Record<string, string> = {};
  i++;
  while (i <= end) {
    const t = lines[i]?.trim();
    if (t === ":END:") break;
    const m = t?.match(/^:([A-Za-z0-9_@#%\-]+):\s*(.*)$/);
    if (m) props[m[1]] = m[2] ?? "";
    i++;
  }
  return props;
}

export function parseTasksFromOrg(text: string, allowedStates = DEFAULT_STATES): OrgTask[] {
  const lines = sliceLines(text);
  const tasks: OrgTask[] = [];

  // Identify sections by heading boundaries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isHeadingLine(line)) continue;

    const { level, state, title } = parseHeading(line, allowedStates);

    // Determine end line: next heading of same or lower level, or EOF
    let end = lines.length - 1;
    for (let j = i + 1; j < lines.length; j++) {
      if (!isHeadingLine(lines[j])) continue;
      const lvl = headingLevel(lines[j]);
      if (lvl <= level) {
        end = j - 1;
        break;
      }
    }

    const properties = parsePropertiesDrawer(lines, i + 1, end);
    const id = properties["ID"];
    if (id) {
      tasks.push({
        id,
        level,
        rawHeadingLine: line,
        title,
        state,
        properties,
        startLine: i,
        endLine: end,
      });
    }
  }

  return tasks;
}

export function findTaskById(text: string, taskId: string, allowedStates = DEFAULT_STATES): OrgTask {
  const tasks = parseTasksFromOrg(text, allowedStates);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task not found for id=${taskId}`);
  return task;
}

function findSubheadingRange(
  lines: string[],
  task: OrgTask,
  subheadingTitle: string
): { start: number; end: number; level: number } | null {
  for (let i = task.startLine + 1; i <= task.endLine; i++) {
    const line = lines[i];
    if (!isHeadingLine(line)) continue;
    const lvl = headingLevel(line);
    if (lvl !== task.level + 1) continue;
    const rest = line.replace(/^\*+\s+/, "").trim();
    if (rest !== subheadingTitle) continue;

    // find end of this subheading: next heading with level <= lvl, but still within task
    let end = task.endLine;
    for (let j = i + 1; j <= task.endLine; j++) {
      const l2 = lines[j];
      if (!isHeadingLine(l2)) continue;
      const lvl2 = headingLevel(l2);
      if (lvl2 <= lvl) {
        end = j - 1;
        break;
      }
    }

    return { start: i, end, level: lvl };
  }
  return null;
}

export function getTaskAgentContext(text: string, taskId: string, allowedStates = DEFAULT_STATES): GetTaskContextResult {
  const lines = sliceLines(text);
  const task = findTaskById(text, taskId, allowedStates);
  const range = findSubheadingRange(lines, task, "Agent Context");

  let agentContext = "";
  if (range) {
    agentContext = lines
      .slice(range.start + 1, range.end + 1)
      .join("\n")
      .trim();
  }

  return {
    id: task.id,
    state: task.state,
    title: task.title,
    properties: task.properties,
    agentContext,
  };
}

export function setTaskState(text: string, taskId: string, newState: string, allowedStates = DEFAULT_STATES): string {
  if (!allowedStates.includes(newState)) {
    throw new Error(`Invalid state: ${newState}. Allowed: ${allowedStates.join(", ")}`);
  }

  const lines = sliceLines(text);
  const task = findTaskById(text, taskId, allowedStates);

  const { level, title } = parseHeading(lines[task.startLine], allowedStates);
  const stars = "*".repeat(level);
  lines[task.startLine] = `${stars} ${newState} ${title}`;
  return joinLines(lines);
}

export function appendTaskLog(
  text: string,
  taskId: string,
  entry: string,
  opts?: { timestamp?: Date; allowedStates?: readonly string[] }
): string {
  const allowedStates = opts?.allowedStates ?? DEFAULT_STATES;
  const ts = opts?.timestamp ?? new Date();
  const stamp = ts.toISOString();

  const lines = sliceLines(text);
  const task = findTaskById(text, taskId, allowedStates);

  let logRange = findSubheadingRange(lines, task, "Log");
  if (!logRange) {
    // Insert a new "** Log" section at the end of the task.
    // Avoid reparsing the whole file by constructing the range directly.
    const insertAt = task.endLine + 1;
    const logHeading = `${"*".repeat(task.level + 1)} Log`;
    lines.splice(insertAt, 0, logHeading, "");

    logRange = { start: insertAt, end: insertAt + 1, level: task.level + 1 };
  }

  // Append as a list item under Log
  const bullet = `- [${stamp}] ${entry}`;
  const insertionPoint = logRange.end + 1;

  // Ensure there's at least one blank line before insert if needed
  const before = lines[insertionPoint - 1] ?? "";
  if (before.trim() !== "") {
    lines.splice(insertionPoint, 0, "", bullet);
  } else {
    lines.splice(insertionPoint, 0, bullet);
  }

  return joinLines(lines);
}

export function getWorkflowFilePath(): string {
  if (process.env.ORG_MCP_WORKFLOW_FILE) {
    return expandHome(process.env.ORG_MCP_WORKFLOW_FILE);
  }

  // Repo-local default if present
  // (handy for developing org-mcp inside its own repo)
  // NOTE: relative path is resolved against process.cwd()
  const local = "./workflow.org";
  try {
    // eslint-disable-next-line no-sync
    require("node:fs").accessSync(local);
    return local;
  } catch {
    // ignore
  }

  return expandHome("~/workflow.org");
}
