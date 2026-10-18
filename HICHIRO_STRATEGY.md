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
    ├── dash.html  ┐
    ├── src/...    ├─ pushed automatically by the pipeline from hichiro/ha-config
    ├── VERSION    ┘  (deployed commit SHA, to know which version is running)
    └── config.js     <- edited only in the private repo, NEVER overwritten by the pipeline
```

## 5. Pipeline (to be created - not yet done)

GitHub Action in the fork, triggered on push to `hichiro/ha-config` (+ manual run):
1. Checkout the fork.
2. Checkout the private repo using a **fine-grained PAT** (secret `BACKUP_REPO_TOKEN`, *Contents: write* + *Pull requests: write* on `HomeAssistant-backup` only).
3. Copy the engine files into `www/kinetic/`, **excluding `config.js`, `config.example.js`, `.github/`, `*.md`**.
4. Write `VERSION`, commit `chore(dash): deploy <sha>` on a **branch** `dash-deploy` of the private repo -> PR into `master` (human validation before production).

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
