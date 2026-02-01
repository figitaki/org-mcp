import { describe, expect, test } from "bun:test";
import {
  appendTaskLog,
  getTaskAgentContext,
  parseTasksFromOrg,
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

  test("getTaskAgentContext returns Agent Context only", () => {
    const ctx = getTaskAgentContext(FIXTURE, "1111-2222");
    expect(ctx.title).toBe("Example task");
    expect(ctx.state).toBe("BACKLOG");
    expect(ctx.agentContext).toContain("update the README");
    expect(ctx.agentContext).not.toContain("Private Notes");
  });

  test("setTaskState updates heading keyword", () => {
    const next = setTaskState(FIXTURE, "abcd", "IN-PROGRESS");
    expect(next).toContain("* IN-PROGRESS Another task");
  });

  test("appendTaskLog appends under Log (creates if missing)", () => {
    const next = appendTaskLog(FIXTURE, "1111-2222", "did something", {
      timestamp: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(next).toContain("** Log");
    expect(next).toContain("[2026-02-01T00:00:00.000Z] did something");
  });
});
