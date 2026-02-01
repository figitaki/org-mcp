import { describe, expect, test } from "bun:test";
import {
  appendTaskLog,
  getTaskAgentContext,
  parseTasksFromOrg,
  readOrgFile,
  setTaskState,
} from "../src/org";

const FIXTURE = `* BACKLOG Example task
:PROPERTIES:
:ID: 1111-2222
:REPO: /tmp/example
:END:

** Agent Context
Please update the README to include a new section.

** Private Notes
Don't show this to agents.

* TODO Another task
:PROPERTIES:
:ID: abcd
:END:

** Log
- [2026-01-01T00:00:00.000Z] created
`;

describe("org parser", () => {
  test("parseTasksFromOrg finds tasks with IDs", () => {
    const tasks = parseTasksFromOrg(FIXTURE);
    expect(tasks.map((t) => t.id)).toEqual(["1111-2222", "abcd"]);
  });

  test("parseTasksFromOrg on empty file returns []", () => {
    expect(parseTasksFromOrg("\n\n")).toEqual([]);
  });

  test("parseTasksFromOrg ignores malformed properties drawers (missing :END:)", () => {
    const malformed = `* TODO Bad\n:PROPERTIES:\n:ID: bad\n`;
    expect(parseTasksFromOrg(malformed)).toEqual([]);
  });

  test("getTaskAgentContext returns Agent Context only", () => {
    const ctx = getTaskAgentContext(FIXTURE, "1111-2222");
    expect(ctx.title).toBe("Example task");
    expect(ctx.state).toBe("BACKLOG");
    expect(ctx.agentContext).toContain("update the README");
    expect(ctx.agentContext).not.toContain("Private Notes");
  });

  test("getTaskAgentContext ignores nested headings under Agent Context", () => {
    const nested = `* TODO Parent\n:PROPERTIES:\n:ID: p1\n:END:\n\n** Agent Context\nTop line\n*** Nested\nShould not be treated as separate section\n`;
    const ctx = getTaskAgentContext(nested, "p1");
    expect(ctx.agentContext).toContain("Top line");
    expect(ctx.agentContext).toContain("*** Nested");
  });

  test("setTaskState updates heading keyword", () => {
    const next = setTaskState(FIXTURE, "abcd", "IN-PROGRESS");
    expect(next).toContain("* IN-PROGRESS Another task");
  });

  test("setTaskState preserves tags/metadata on heading", () => {
    const tagged = `* TODO Title :tag1:tag2:\n:PROPERTIES:\n:ID: t1\n:END:\n`;
    const next = setTaskState(tagged, "t1", "DONE");
    expect(next).toContain("* DONE Title :tag1:tag2:");
  });

  test("setTaskState throws on invalid state", () => {
    expect(() => setTaskState(FIXTURE, "abcd", "NOT_A_STATE")).toThrow();
  });

  test("appendTaskLog appends under Log (creates if missing)", () => {
    const next = appendTaskLog(FIXTURE, "1111-2222", "did something", {
      timestamp: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(next).toContain("** Log");
    expect(next).toContain("[2026-02-01T00:00:00.000Z] did something");
  });

  test("appendTaskLog appends to an existing Log section", () => {
    const next = appendTaskLog(FIXTURE, "abcd", "second entry", {
      timestamp: new Date("2026-02-02T00:00:00.000Z"),
    });

    const logIdx = next.indexOf("** Log");
    const firstIdx = next.indexOf("[2026-01-01T00:00:00.000Z] created");
    const secondIdx = next.indexOf("[2026-02-02T00:00:00.000Z] second entry");

    expect(logIdx).toBeGreaterThanOrEqual(0);
    expect(firstIdx).toBeGreaterThan(logIdx);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  test("appendTaskLog throws if task not found", () => {
    expect(() => appendTaskLog(FIXTURE, "missing", "x")).toThrow();
  });
});

describe("file helpers", () => {
  test("readOrgFile returns empty string when file is missing", async () => {
    const p = `/tmp/org-mcp-missing-${Date.now()}-${Math.random().toString(16).slice(2)}.org`;
    const txt = await readOrgFile(p);
    expect(txt).toBe("");
  });
});
