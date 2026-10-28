# Quality Tooling Refresh

## Approved Scope

Refresh supported dependencies and existing quality tooling.
Regenerate `yarn.lock` with the repository-pinned Yarn Classic 1.22.22.
Preserve public settings, commands, the VS Code 1.140.0 minimum, source behavior, assets and release metadata.

## Compatibility Decisions

- Keep TypeScript 6.0.3: TypeScript ESLint 8.72.1 supports `>=4.8.4 <6.1.0`, and webpack uses the compiler through `ts-loader`.
- Retain `@types/node` 26.6.5 and prove compatibility through compilation and execution on the project's Node 24 runtime.
- Limit security resolutions to their consuming packages instead of forcing every installed major to one release.
  Mocha uses `diff` 8.0.4 while Sinon keeps its required `diff` 9 line.
  Mocha's serializer and Azure Identity's MSAL retain the existing patched major lines because the requested older majors have no patched release.
- Preserve Trunk CLI 1.25.0, plugin v1.11.0 and the existing managed runtimes unless a concrete compatibility failure requires a change.
- Run TruffleHog without credential verification and use the repository-local filesystem JSONL-to-SARIF reader.
  Keep findings at file level when decoded values have no literal location, and fail malformed conversion input without emitting clean SARIF.
  Synthetic literal and encoded credentials must fail the configured scan, while clean input must pass.

## Acceptance

- Pinact remains locked to `4.1.1` with `lint` and `upgrade`.
- The full no-fix Trunk scan and declared project gates pass.
- The reader's CLI tests pass independently of the extension, and configured Trunk controls reject literal and encoded synthetic findings before accepting clean input.
- Changed manifests have package-manager-generated lockfiles under repository policy.
- Advisory dispositions have specific evidence and affected knowledge claims are reconciled.
- Extension Host tests use their `.vscode-test` profile directories and stub clipboard and configuration APIs.
- No source changes or real clipboard, settings or installed editor profile writes are included.

## Evidence

Registry responses, peer ranges, GitHub advisories, effective Trunk configuration, dependency paths, command logs and knowledge checks are retained in `/Volumes/dongminyu/Development/01_personal/pr-loop-reviews/copy-code-as-snippet/2026-10-28-quality-refresh`.
The historical Oracle result is partial and unverified; live compiler peers and the current source determine this refresh.
The returned source paths are `wiki/entities/copy-code-as-snippet.md`, `raw/sources/.claude/projects/-Users-dongminyu-Development-01-personal-copy-code-as-snippet/memory/MEMORY.md` and `wiki/concepts/extension-test-isolation-leak-in-copy-code-as-snippet.md`.
The compiler warning supports retaining the latest compatible compiler, while the historical activation issue requires the current isolated host suite to pass.

## Publication

Push and PR creation require explicit repository-specific approval.
After approval, continue the requested hosted gates, merge, cleanup and memory recording.
