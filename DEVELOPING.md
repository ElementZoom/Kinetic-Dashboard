# Developing Kinetic

You deploy **one file**, `dash.html` (plus your `config.js`). You edit **many small files** in `src/`, and a build step joins them.

```
src/
  index.html              page shell: the markup, plus <!-- @include ... --> lines that pull the files below in, in order
  css/                    23 stylesheets, numbered in cascade order (later files win)
  js/boot/                the two small scripts that run before the main one (theme pre-paint, brand splash)
  js/core/                config + access rules, helpers + palette, icons, shared state
  js/modules/             one file per area: sign-in, websocket, rooms, weather, energy, now-playing ...
VERSION                   the engine version (MAJOR.MINOR.PATCH, for example 1.0.0), the only place to change it
build.mjs                 joins src/ into dash.html (Node 18+, no dependencies)
tests/smoke.mjs           boots dash.html in headless Chromium with an invented config
.github/workflows/        the pipeline
```

## Everyday loop

```
node build.mjs          # src/  ->  dash.html
node build.mjs --check  # fails if dash.html is not what src/ builds to (CI runs this)
npm install && npx playwright install chromium && npm test
```

1. Edit files in `src/`. Never edit `dash.html` by hand, it is overwritten by the build.
2. Bump `VERSION` (it is written into the page as `window.DASH_VER`).
3. `node build.mjs`, test, commit `src/`, `VERSION` **and** `dash.html`.

## Rules for the source files

- Order matters. `index.html` lists every file in the order it was joined; JS files share one scope, so a `const` must be defined in an earlier file than its first use at load time. CSS files are numbered because later rules win.
- Each JS file must be valid on its own (`node --check src/js/modules/x.js`). Split only at top level, never inside a function.
- A line that is exactly `<!-- @include path -->` is replaced by that file. `{{VERSION}}` is replaced by the contents of `VERSION`.

## The pipeline (`.github/workflows/build.yml`)

On every push and pull request: check `dash.html` is up to date, syntax-check every script, boot the page in Chromium.

To publish a release:

```
# 1. bump VERSION, build, commit
git tag v1.1 && git push --tags
```

The tag must equal `v` + the `VERSION` file. The workflow then creates a GitHub Release with `dash.html` and `config.example.js` attached.

## Version numbers

`MAJOR.MINOR.PATCH`, starting at **1.0.0**.

- **Bug fixes only**: raise the patch number, 1.0.0 to 1.0.1.
- **New features** (anything a person can now do or see that they could not before): raise the minor number and reset the patch, 1.0.1 to 1.1.0.
- **Big changes** (a redesign, or something that needs config changes): raise the major number, 1.4.2 to 2.0.0.

Every release adds a section to `CHANGELOG.md` headed `## <version> - <date>`; the release workflow publishes that section as the release notes, so a tag without one fails.
