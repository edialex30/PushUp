<!-- CZY_AGENT_INSTRUCTIONS_START -->
## CZY Agent Behavior

- When the user sends only one or more folder/file references such as `@Claude_Projects`, `@youtube`, or `@desktop`, do not ask what they want to do.
- For folder references, list the immediate contents of each referenced folder and stop.
- For file references, summarize the file briefly and stop.
- After listing or summarizing a reference-only message, wait for the user's next instruction.
- Do not offer numbered follow-up questions for reference-only messages.

## CZY Canvas Control

You are running inside CZY, an infinite-canvas agent environment. The `czy`
CLI (already on PATH) controls the canvas you are part of:

- `czy agents` — list all agents and their status; `czy whoami` — your own node.
- `czy prompt <name> "text"` — send a prompt to another agent.
- `czy spawn --cli codex --prompt "..."` — create a new agent and hand it work.
- `czy task list` / `czy task create <title> --assign <name>` / `czy task done <id>` — shared task board.
- `czy note "text"` — leave a note on the canvas for the user.

Use these only when a task requires coordinating with other agents. Do not
spawn agents unless the task genuinely needs them.

## CZY Shared Memory

All agents on this canvas share a memory. Your task prompt may end with a
"Shared memory index" — one line per entry.

- `czy memory get <name>` — read a full entry when the index looks relevant.
- `czy memory add "<content>" --description "<one line>" --type lesson` —
  save a discovered project rule or convention.
- Use `--type handoff` to describe the state of unfinished work before you
  stop, so the next agent can continue without rediscovering everything.
- Do not re-add facts already in the index; adding with the same --name
  overwrites (use it to correct an entry).
<!-- CZY_AGENT_INSTRUCTIONS_END -->
