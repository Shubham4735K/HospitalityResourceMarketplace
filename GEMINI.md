# ResShare — Agent Instructions

## Project Identity

This repository contains **ResShare — Hospitality Resource Exchange**, a B2B marketplace for sharing underutilized hospitality resources.

The project connects hospitality businesses such as hotels, restaurants, caterers, venues, and event businesses so they can discover, request, and coordinate the use of available resources.

## Project Documentation

The `docs/` directory contains the project's source-of-truth documentation.

Before implementing a task, consult the relevant documentation:

- `docs/PRD.md` — project requirements, users, scope, and feature boundaries
- `docs/Architecture.md` — system architecture, technology stack, and project structure
- `docs/Phases.md` — development phases and current task
- `docs/Design.md` — UI/UX and visual design guidelines
- `docs/API.md` — REST API contracts and endpoint behavior
- `docs/Memory.md` — current implementation state and completed work

Do not invent requirements that are not defined by the project documentation or the user's current request.


## Core Development Rules

- Work only on the task explicitly requested by the user.
- Do not implement future phases or unrelated features.
- Do not modify unrelated files.
- Preserve existing working functionality.
- Prefer small, focused changes over large rewrites.
- Do not introduce new libraries or dependencies unless the user explicitly approves them.
- Follow the existing project structure and technology choices.
- Do not create mock data unless explicitly requested.
- Do not remove existing functionality just to simplify implementation.
- Never expose, print, commit, or hard-code secrets, passwords, API keys, or environment variables.
- Do not modify `.env` files unless explicitly requested.
- Before changing a file, inspect its existing contents and understand how it is used.
- After implementation, run the appropriate verification commands and report their results.
- If a requirement is ambiguous, ask the user before making a significant architectural decision.

## Task Workflow

For every development task, follow this workflow:

1. Read the user's current request carefully.
2. Identify the exact scope of the task.
3. Consult the relevant files in `docs/` before making changes.
4. Inspect the existing code related to the task.
5. Explain the planned changes briefly before implementation when the task is non-trivial.
6. Implement only the requested task.
7. Do not move to the next phase or task automatically.
8. Run appropriate verification commands after implementation.
9. Report:
   - files created or modified
   - what changed
   - verification results
   - any issues or limitations
10. Stop and wait for the user's next instruction.

### Git Safety

- Do not commit or push changes unless explicitly asked by the user.
- Do not reset, revert, or discard user changes without explicit permission.
- Before suggesting a commit, check the working tree status.

## Documentation Priority

When making project decisions, use this priority order:

1. The user's current request
2. `docs/PRD.md` for product requirements and scope
3. `docs/Architecture.md` for technical architecture
4. `docs/Phases.md` for the current development phase
5. `docs/API.md` for API behavior and contracts
6. `docs/Design.md` for UI/UX decisions
7. `docs/Memory.md` for current implementation history

If two sources conflict, do not silently choose one. Report the conflict and ask the user for clarification when it affects implementation.

Do not treat assumptions or general best practices as project requirements.