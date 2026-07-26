# Repository Agent Instructions

## Aliases

### Deploy

When the user says `Deploy`, synchronize with the remote main branch and publish the current committed changes:

1. Run `git fetch origin`.
2. Run `git rebase origin/main`.
3. Resolve any rebase conflicts without discarding user work; ask the user if the conflict cannot be resolved safely.
4. Run `git push origin main`.
5. Confirm the GitHub Actions Cloudflare Pages deployment succeeds before reporting the deploy as complete.

Do not stage, commit, or discard unrelated working-tree changes unless the user explicitly asks for that as part of the deploy.
