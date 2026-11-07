---
name: effect-v4
description: Use before writing or reviewing any Effect (effect@4.x) code in this repo, including the AI path with @effect/ai-openai.
---

# Effect v4

Effect v4 APIs differ from v3. Do not write from memory.

1. Read `node_modules/effect/AGENTS.md` completely before writing any Effect code, and follow its links.
2. Browse `node_modules/effect/ai-docs/src/` for the topic you need (basics, schema, services, etc.) and read the matching example files. For AI code, also check `node_modules/@effect/ai-openai` and any `ai-docs` under it.
3. For APIs the guide does not cover, search `node_modules/effect/src`. Ignore unrelated or external copies of Effect docs, which may be v3.

Conventions stated in `node_modules/effect/AGENTS.md`:
- Prefer `Effect.gen` for inline code; `Effect.fn("name")` for reusable functions (tracing span), `Effect.fnUntraced` when tracing is not needed. Do not use `.pipe` with `Effect.fn`; pass extra combinators as further arguments.
- Use `Effect.catch` (not v3 `catchAll`) to handle errors.
- Always `return yield*` when raising an error.
- Define errors with `Schema.TaggedError`.
- Use `Schema` for all validation and domain modeling; avoid manual parsing or predicates.
- Structure behaviour as Effect services (define with `Context.Service`; see its section in AGENTS.md).

Re-verify any API name against the files above before using it.
