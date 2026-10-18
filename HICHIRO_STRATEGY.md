# Customization strategy – Kinetic-Dashboard (Hichiro6 fork)

> Reference file for every future conversation / work session.
> Read this first before changing anything.

## 1. Repositories

| Repository | Visibility | Role |
|---|---|---|
| `Hichiro6/Kinetic-Dashboard` | public (fork) | Dashboard engine (`dash.html`, `src/`...). **No personal data.** |
| Original repository (upstream) | public | Keeps evolving; we pull its updates. |
| `Hichiro6/HomeAssistant-backup` (branch `master`) | **private**, **LIVE** | Real Home Assistant config. Holds the deployed dashboard + `config.js`. |

## 2. Absolute rules

1. **Never modify `HomeAssistant-backup` by hand from an AI session.** It is production.
   Only the pipeline (GitHub Action) may write to it, and only inside `www/kinetic/` (never `config.js`).
2. **Always work on a branch**, never directly on `main`.
3. **Fork `main` = exact mirror of upstream.** No commits on it. Updated via "Sync fork".
4. **`config.js` (personal data) lives ONLY in the private repo.** Never in the public fork
   (it is already in upstream's `.gitignore`; leave it that way).
5. **Never put tokens / passwords / private URLs** in the public fork.
6. Modify the engine (`dash.html`, `src/`) as little as possible; when unavoidable: small isolated commit, prefixed `engine:`.
7. Do not edit upstream's `.github/workflows/build.yml` (avoids sync conflicts). Our own workflows are separate files.
8. Do not edit the upstream `VERSION` file; the deployed fork SHA is recorded in `www/kinetic/VERSION` in the private repo.

## 3. Fork branches

```
upstream/main ──► main (mirror, Sync fork)
                    │  regular merge
                    └──► hichiro/ha-config   (working branch = "to deploy" version)
                            └──► feat/xxx    (one branch per page / feature, PR into hichiro/ha-config)
```

## 4. Target layout in the private repo

```
HomeAssistant-backup/
└── www/kinetic/            (served by HA at /local/kinetic/)
    ├── dash.html           <- pushed by the pipeline (the single built file from the fork)
    ├── VERSION             <- pushed by the pipeline (upstream engine version + fork commit SHA)
    └── config.js           <- edited only in the private repo, NEVER overwritten by the pipeline
```

Note: the dashboard is a single built file (`dash.html`, generated from `src/` by `build.mjs`), so only that file is deployed, not `src/`.

## 5. Pipeline

File: `.github/workflows/deploy-to-backup.yml` (in the fork).
Trigger: push to `hichiro/ha-config`, or manual run.

1. Checkout the fork and run `node build.mjs --check` (refuses to deploy a stale `dash.html`).
2. Checkout the private repo (`master`) using the fine-grained PAT stored as secret `BACKUP_REPO_TOKEN`
   (*Contents: write* + *Pull requests: write* on `HomeAssistant-backup` only).
3. Copy `dash.html` to `www/kinetic/dash.html` and write `www/kinetic/VERSION`. `config.js` is never touched.
4. If `dash.html` changed: commit `chore(dash): deploy <sha>` on branch `dash-deploy` and open a PR into `master`.
   Nothing goes live until a human merges that PR.

The PAT expires (90 days suggested): when the pipeline starts failing at the private checkout, renew the token and update the secret.

## 6. Pulling an upstream update

1. GitHub -> fork -> **Sync fork** (updates `main`).
2. PR `main` -> `hichiro/ha-config`, resolve possible conflicts (normally none).
3. Compare `config.example.js` (new options?) and port them into the private repo's `config.js` if needed.
4. The merge triggers the pipeline -> deploy PR in the private repo.

## 7. Pages - progressive activation

Start with the "safe" pages (entities already identifiable in the backup), add the rest over time.

| Page | Status |
|---|---|
| home | todo (priority) |
| rooms | todo (priority) |
| climate | todo (priority) |
| weather | todo (priority) |
| theme | todo (priority, almost no config) |
| security / energy / media / events | later (manual work) |
| irrigation / vehicle / hazards / scenes | later / maybe never |

Update this table whenever something progresses.

## 8. Log

- 2026-10-18: created branch `hichiro/ha-config` and this file. Strategy validated.
- 2026-10-18: file translated to English. Target folder confirmed: `www/kinetic/`.
- 2026-10-18: `BACKUP_REPO_TOKEN` secret created in the fork. Pipeline written on `feat/pipeline` (PR into `hichiro/ha-config`).
