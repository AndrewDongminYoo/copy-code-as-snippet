# Quality Tooling Refresh Plan

## Work

1. Verify repository identity, instructions, current changes and Oracle precedent → verify: absolute Git root, personal origin, worktree status and source inspection.
2. Refresh compatible dependency and linter versions with existing package managers → verify: live npm peer ranges, effective Trunk configuration and resolved consumer dependency paths.
3. Run the declared local gates and `trunk check --all --no-fix` → verify: recorded command output and exit status, with synthetic-credential rejection before a clean scanner result.
4. Reconcile affected knowledge and review the scoped candidate → verify: manifest/script/source comparisons, internal links and a scoped diff.
5. Commit locally and prepare visible evidence before requesting publication approval.

## Declared Gates

- `yarn install --frozen-lockfile`
- `yarn lint`
- `yarn test`
- `VSCODE_TEST_VERSION=stable yarn test:integration`
- `yarn package`
- `yarn audit --json`
- Direct OSV scan of `yarn.lock` using the configured scanner, when the scanner supports the lockfile.
- `trunk check --all --no-fix --jobs=2`

## Execution Boundaries

Run the default full suite once and the declared stable integration target once, recording the actual editor versions.
Do not repeat the integration suite three times without a failure or another concrete reason.
Use the shared heavy-job slot and require a fresh one-minute load below 10 before the Extension Host, production build or full scan.
Keep source, tests, editor profiles, media and public extension contributions outside this maintenance change.
Return any required repair outside the approved paths to the root agent.
