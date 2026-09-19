# TRAJECTUM Mobile UI/UX — Navigation and Rendering Contract

Status: **mandatory internal architecture rule**

This document defines the non-negotiable behavior for mobile navigation and screen rendering in TRAJECTUM.

## 1. Instant navigation through DOM retention

Screen-level components MUST remain mounted when the user changes sections.

Applies to, at minimum:

- Home
- MDR / KOM
- PDR
- CDR
- FRR
- LRR
- PFR / MCR
- Vehicle
- Geometry
- Motor
- Analysis
- Plots
- CAD Import
- Export surfaces

Changing sections MUST NOT unmount/remount the screen subtree.

The approved implementation pattern is a persistent stack:

- all screen layers remain mounted;
- inactive layers use CSS visibility/state control;
- the active layer is switched with `visibility`, `display`, `pointer-events`, and/or `z-index`;
- section selection is an immediate state update with no artificial delay.

Preferred pattern:

```css
.mobile-screen {
  position: absolute;
  inset: 0;
  visibility: hidden;
  pointer-events: none;
}

.mobile-view-pdr .mobile-pdr-screen {
  visibility: visible;
  pointer-events: auto;
}
```

Do not replace this architecture with conditional JSX such as:

```tsx
{activeSection === 'pdr' && <PdrScreen />}
```

for primary mobile routes.

## 2. Immutable shell

The following shell elements MUST remain continuously visible and stable:

- application background: `#030914`;
- top header;
- mobile content viewport;
- bottom navigation bar.

They MUST NOT fade, slide, scale, flash, reflow, or disappear during route changes.

The shell must feel physically fixed to the device viewport.

## 3. Zero fade / zero slide for section transitions

Screen-level navigation MUST be instantaneous.

Forbidden on primary screen containers:

- `opacity` transition/fade;
- `translateX`;
- `translateY`;
- `translate3d`;
- slide animations;
- scale animations;
- route loading overlays;
- artificial navigation delays;
- temporary dimming of the screen.

Section changes occur at **0 ms**.

The user should perceive only the content state changing inside a fixed application shell.

## 4. Allowed microinteractions

Animation is allowed only inside individual controls or content modules.

Examples allowed:

- button press feedback: `scale(0.97)`;
- icon selection feedback;
- progress indicators;
- loading spinners inside a CTA;
- skeleton loaders inside a card or analysis panel;
- telemetry animation;
- simulation animation;
- mission event indicators;
- chart interaction;
- input validation feedback.

These effects MUST NOT animate the screen container or move the application shell.

## 5. Button feedback

Interactive controls should provide immediate local feedback without affecting layout.

Recommended press state:

```css
button:active {
  transform: scale(0.97);
}
```

The transform applies only to the pressed control.

It must never propagate to the parent screen, route container, header, bottom nav, or content viewport.

## 6. Loading states

Backend/physics work must preserve the current layout.

When FastAPI / RK4 / analysis processing is active:

- keep the destination screen mounted;
- show feedback inside the relevant card/button;
- prefer spinner, progress bar, or skeleton inside the target module;
- never blank, dim, fade, replace, or slide the entire screen.

## 7. Regression checklist

Before merging a mobile navigation/UI change, verify all of the following:

1. Header DOM node remains mounted across section changes.
2. Bottom navigation DOM node remains mounted across section changes.
3. Primary route views remain mounted.
4. No primary screen has route-transition `opacity` animation.
5. No primary screen has `translateX/Y/3d`.
6. No artificial timeout is used for route navigation.
7. Background remains `#030914` and never flashes.
8. Screen coordinates remain stable before and after tapping a nav item.
9. No horizontal overflow is introduced.
10. Internal loading/microinteraction animations remain scoped to their own component.

## 8. Current implementation reference

TRAJECTUM currently implements the persistent mobile stack through:

- `.mobile-content-stack`
- `.mobile-view-*` route classes
- CSS visibility/pointer-event toggling
- persistent `.topbar`
- persistent `.mobile-command-bar`

This architecture is intentional and MUST be preserved unless an alternative provides the same guarantees with no screen unmounting and no shell animation.
