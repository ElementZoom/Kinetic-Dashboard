# Stratégie de personnalisation – Kinetic-Dashboard (fork Hichiro6)

> Fichier de référence pour toute future conversation / session de travail.
> À lire en premier avant de modifier quoi que ce soit.

## 1. Les dépôts

| Dépôt | Visibilité | Rôle |
|---|---|---|
| `Hichiro6/Kinetic-Dashboard` | public (fork) | Moteur du dashboard (`dash.html`, `src/`…). **Aucune donnée perso.** |
| Dépôt original (upstream) | public | Continue d'évoluer, on récupère ses mises à jour. |
| `Hichiro6/HomeAssistant-backup` (branche `master`) | **privé**, **LIVE** | Config réelle de Home Assistant. Contient le dashboard déployé + `config.js`. |

## 2. Règles absolues

1. **Ne jamais modifier `HomeAssistant-backup` à la main depuis une session IA.** C'est la prod.
   Seule la pipeline (GitHub Action) a le droit d'y écrire, et uniquement dans `dash/` (hors `config.js`).
2. **Toujours travailler sur une branche**, jamais directement sur `main`.
3. **`main` du fork = miroir exact de l'upstream.** Aucun commit dessus. Mise à jour via « Sync fork ».
4. **`config.js` (données perso) n'existe QUE dans le dépôt privé.** Jamais dans le fork public
   (il est déjà dans le `.gitignore` upstream, on le laisse ainsi).
5. **Jamais de token / mot de passe / URL privée** dans le fork public.
6. Modifier le moteur (`dash.html`, `src/`) le moins possible ; si nécessaire : petit commit isolé, préfixé `engine:`.

## 3. Branches du fork

```
upstream/main ──► main (miroir, Sync fork)
                    │  merge régulier
                    └──► hichiro/ha-config   (branche de travail = version "à déployer")
                            └──► feat/xxx    (une branche par page / fonctionnalité, PR vers hichiro/ha-config)
```

## 4. Structure cible dans le dépôt privé

```
HomeAssistant-backup/
└── www/kinetic/            (ou dash/ – à confirmer selon où HA sert les fichiers : /local = config/www)
    ├── dash.html  ┐
    ├── src/…      ├─ poussés automatiquement par la pipeline depuis hichiro/ha-config
    ├── VERSION    ┘  (SHA du commit déployé, pour savoir quelle version tourne)
    └── config.js     ← édité uniquement dans le dépôt privé, JAMAIS écrasé par la pipeline
```

## 5. Pipeline (à mettre en place – non encore créée)

GitHub Action dans le fork, déclenchée sur push vers `hichiro/ha-config` (+ manuel) :
1. Checkout du fork.
2. Checkout du dépôt privé avec un **fine-grained PAT** (secret `BACKUP_REPO_TOKEN`, droits *Contents: write* sur `HomeAssistant-backup` uniquement).
3. Copie des fichiers du moteur dans le dossier cible, **en excluant `config.js`, `config.example.js`, `.github/`, `*.md`**.
4. Écrit `VERSION`, commit `chore(dash): deploy <sha>` sur une **branche** `dash-deploy` du dépôt privé → PR vers `master` (validation humaine avant la prod).

## 6. Récupérer une mise à jour upstream

1. GitHub → fork → **Sync fork** (met à jour `main`).
2. PR `main` → `hichiro/ha-config`, résoudre les éventuels conflits (normalement aucun).
3. Comparer `config.example.js` (nouvelles options ?) et reporter dans `config.js` du dépôt privé si besoin.
4. Le merge déclenche la pipeline → PR de déploiement dans le dépôt privé.

## 7. Pages – activation progressive

Commencer par les pages « sûres » (entités déjà identifiables dans le backup), ajouter le reste au fil de l'eau.

| Page | Statut |
|---|---|
| home | à faire (prioritaire) |
| rooms | à faire (prioritaire) |
| climate | à faire (prioritaire) |
| weather | à faire (prioritaire) |
| theme | à faire (prioritaire, quasi sans config) |
| security / energy / media / events | plus tard (travail manuel) |
| irrigation / vehicle / hazards / scenes | plus tard / peut-être jamais |

Mettre à jour ce tableau à chaque avancement.

## 8. Journal

- 2026-10-18 : création de la branche `hichiro/ha-config` et de ce fichier. Stratégie validée.
