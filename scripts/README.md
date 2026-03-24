# Scripts Directory

This directory keeps project-level utility scripts that are still in active use.

Project startup entrypoint is maintained at repository root:

- `start-all.sh`
- `stop-all.sh`

## Active scripts

- `check-artifact-templates.js`: validate artifact template declarations and files.
- `sync-css.js`: sync CSS assets before local startup/build.
- `start-prod.sh`: start docker compose stack with an env file.
- `stop-prod.sh`: stop docker compose stack.
- `rotate-logs.sh`: rotate runtime logs.
- `cleanup-node-modules.js`: cleanup oversized/redundant `node_modules` trees.
- `refactor/bootstrap-governance-loop.mjs`: bootstrap governance/refactor loop.

Generated assets such as `public/css/*` are not committed. They are recreated by
`sync-css.js` once during local startup and during build.

## Removed legacy scripts (2026-02-11)

The following scripts were removed because they were not referenced anywhere and
represented historical one-off workflows:

- `performance-test.sh`
- `performance-test-auto.js`
- `production-validation.sh`
- `replace-console-log.sh`
- `performance-test-simple.sh`
- `create-frontend-ddd-module.sh`
