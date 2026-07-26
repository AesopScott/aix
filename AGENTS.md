# Repository Agent Instructions

## Aliases

### Deploy

When the user says `Deploy`, include all non-ignored repo changes, including untracked files, then synchronize with the remote main branch and publish to `origin/main`:

1. Run `git status --short --untracked-files=all` and treat untracked files as deployable repo changes unless they are ignored or clearly local/private.
2. Stage all deployable changes with `git add -A`.
3. If anything is staged, commit it with a concise message that describes the deployed changes.
4. Run `git fetch origin`.
5. Run `git rebase origin/main`.
6. Resolve any rebase conflicts without discarding user work; ask the user if the conflict cannot be resolved safely.
7. Run `git push origin main`.
8. Confirm the GitHub Actions Cloudflare Pages deployment succeeds before reporting the deploy as complete.

Do not discard unrelated working-tree changes. Do not deploy ignored local files, secrets, dependency folders, local build caches, or local memory folders.
