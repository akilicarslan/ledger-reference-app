# AI in the development process

This document tells how we used an AI coding agent to build Ledger.
It also tells how we keep the AI output correct.

## 1. Principle

The AI agent writes code fast. A person stays responsible for the result.
For this reason, we give the agent clear rules, and we check its output with automated tests and with a review.

## 2. Tools

| Tool                                | Use                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Claude Code (agent in the terminal) | Write code, run commands, read errors, correct code                       |
| Context7 (documentation server)     | Get the current documentation of a library (Zod 4, Storybook 10, RNTL 14) |
| Expo versioned docs                 | Get the SDK 57 rules (monorepo setup, image picker API)                   |
| Playwright (browser control)        | Check the web app in a real browser                                       |
| argent (simulator control)          | Check the iOS app and its accessibility tree on the simulator             |

## 3. Workflow

1. **Plan.** The agent writes the plan (`docs/PLAN.md`) and the decisions (`docs/adr`). A person reviews them.
2. **Check current versions.** The agent reads the installed versions (`npm view`, the Expo template). It does not trust its training data. Example: RNTL 14 made `render` async; the agent found this in the documentation and changed the tests.
3. **Build in small steps.** The agent writes one package, then runs its typecheck and its tests, then continues.
4. **Verify in the real runtime.** The agent opens the web app in a browser and the iOS app on a simulator. This found a real defect: React StrictMode cancelled the first account request, so the balance showed an error. Unit tests did not find it. The agent corrected the code and added a regression test.
5. **Review.** A person reviews each change. The skills give the review checklist.

## 4. How we control AI output

| Risk                                            | Control                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| The agent uses an old API                       | Context7 and versioned docs before code. Typecheck with the installed types.                                                          |
| The code compiles but is wrong                  | Unit tests for each rule (balance, retry, validation). Integration tests of full screens.                                             |
| Two sources of truth                            | Zod schemas generate the OpenAPI document. CI fails if the document is old.                                                           |
| The agent forgets accessibility                 | ESLint rule (only `@ledger/ui` components in screens), contrast tests, semantic tests on two renderers, `accessibility-review` skill. |
| Inconsistent code style                         | `CLAUDE.md`, ESLint, Prettier, the `shared-ui-library` skill.                                                                         |
| The agent claims a result that it did not check | The agent runs `pnpm verify` and reports the output. It reports skipped steps.                                                        |

## 5. Reusable knowledge: skills

A skill is a written procedure that an agent loads when a task matches it.
Skills keep team knowledge in the repository, not in one person's head.

| Skill                                          | Content                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.claude/skills/shared-ui-library/SKILL.md`    | Rules and steps to add a component to the shared library: primitives only, tokens, role/name/state, stories, tests. |
| `.claude/skills/accessibility-review/SKILL.md` | A 22-point WCAG 2.1 AA review for React Native, with the iOS/Android/web mapping and a report format.               |

A new developer (or a new agent) gets the same rules on the first day.
