# Memento — Project Rules

These rules apply to all agents working on the Memento codebase.

## Package Manager

Use `pnpm` exclusively. Never use `npm install` or `yarn add`.

## TypeScript

- Strict mode is enabled. Never use `any`.
- Never use `@ts-ignore` without a comment explaining the specific reason.
- All function parameters and return types must be explicitly typed.

## No Backend

Do not add Firebase, Supabase, Cloudflare Workers, AWS S3, or any cloud service for core media features. There is no backend. The app is fully local.

## No Fake Data

Do not use hardcoded trips, fake device names, invented transfer progress bars, or simulated media in production code paths. Demo/dev mode is acceptable only if gated behind a clear `DEV_MODE` constant.

## Preserve Originals

Never compress, resize, re-encode, or strip metadata from user media files. The app transfers and exports original bytes only.

## Component Size Limit

No component file should exceed ~200 lines. Extract sub-components and hooks.

## Error Handling

Every `async` function must have a `try/catch`. Errors must surface to the user in plain English. Never log sensitive data (file contents, personal information) to the console in production.

## Deletions Are Irreversible

Before implementing any deletion flow:
- Archives: delete the ZIP file only — never the source MediaItem records.
- Trips: confirm before deleting; explain what will be removed.
- Media: never silently delete files from the user's camera roll.
- Always show a confirmation dialog for destructive actions.

## Database Migrations

Every schema change requires a migration entry in `lib/db/migrations.ts`. Never drop or modify a table without a migration. Always increment the schema version.

## Platform Guards

All Capacitor plugin calls must be wrapped:
```typescript
if (Capacitor.isNativePlatform()) {
  // native-only code
} else {
  // web fallback or graceful skip
}
```

Never import a Capacitor plugin at module level without a platform check.

## No Decorative Buttons

Every interactive element must do something real, or must be clearly labelled "(Coming soon)" and disabled. Never show a button that triggers a toast saying "Feature coming soon" without the button being visually distinct (disabled or greyed).

## Commit Convention

Use conventional commits:
- `feat(scope): description`
- `fix(scope): description`
- `refactor(scope): description`
- `docs: description`
- `test(scope): description`

## Test Before Claiming Done

Do not mark a task or feature as complete without running the relevant tests (unit or manual). Physical device tests are required for any nearby transfer or native plugin work.
