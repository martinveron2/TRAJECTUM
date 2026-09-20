# TRAJECTUM Platform Isolation Contract

## Runtime dispatcher

frontend/web/src/main.tsx is only a viewport dispatcher. It chooses MobileApp for (max-width: 820px) and DesktopApp otherwise.

The active platform is also stamped on document.body as either trajectum-mobile or trajectum-desktop.

This is deliberate: modal and picker portals render into document.body and therefore remain inside the correct CSS namespace.

## CSS isolation

Platform CSS is mechanically derived from the golden baseline and scoped to the body namespace.

- app/mobile/mobile.css
- app/desktop/desktop.css

styles.css contains only global font loading, resets and design tokens.

During the parity-first migration CSS is intentionally duplicated rather than deduplicated. Cleanup is a later task after visual parity is locked.

## Import boundaries

- app/mobile/** must not import app/desktop/**.
- app/desktop/** must not import app/mobile/**.
- shared/** must not import either platform UI.

CI enforces these boundaries and additionally honors desktop-only / mobile-only PR labels.

## Physics ownership

No physics behavior is changed by this refactor. Existing frontend auxiliary calculations remain untouched for parity.
The canonical engineering implementation remains in the Python backend; frontend consolidation into backend contracts is a separate future PR with mathematical-equivalence tests.
