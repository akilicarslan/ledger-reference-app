---
name: accessibility-review
description: Review React Native or react-native-web code in the Ledger repository for WCAG 2.1 Level AA conformance (Section 504, patient-facing healthcare) and for correct semantic mapping to iOS VoiceOver, Android TalkBack and the browser. Use this skill when the user asks for an accessibility review or audit, before a release, or after a change to a screen or a component in packages/ui or packages/features.
---

# Accessibility review (WCAG 2.1 AA, Section 504)

This skill gives a review procedure for React Native screens and components.
The result is a list of findings with a WCAG criterion, a location and a correction.

React Native does not create an accessibility tree automatically.
A View without a role and a name is not visible to VoiceOver or TalkBack as a control.
For this reason, the review examines the props of each element.

## 1. Prepare

1. Find the files to review. Use the files of the change, or the files that the user names.

   ```sh
   git diff --name-only main -- packages/ui packages/features apps
   ```

2. Read `docs/ACCESSIBILITY.md`, section 2 (semantic mapping) and section 3 (conformance table).
3. Read `packages/ui/src/a11y/platform.ts`. It gives the platform differences.

## 2. Run the automated checks

Run these commands. Record each failure as a finding.

```sh
pnpm lint                              # raw primitives in screens (architecture rule)
pnpm --filter @ledger/ui test          # contrast of all tokens, web semantics
pnpm --filter @ledger/features test    # web semantics of the screens
pnpm --filter @ledger/mobile test      # native semantics of the screens
```

If Storybook is necessary, run `pnpm storybook` and open the "Accessibility" panel of each changed story.

## 3. Examine the code

Examine each changed element. Use this table. Each row is a check.

| #   | Check                                                                 | WCAG            | How to find a problem                                                                                                     |
| --- | --------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Each interactive element has a role                                   | 4.1.2           | `Pressable`/`TouchableOpacity` without `role`, or a `View` with `onPress`/`onTouchEnd`                                    |
| 2   | Each interactive element has a name that starts with its visible text | 2.5.3, 4.1.2    | `accessibilityLabel` missing, or different from the visible label                                                         |
| 3   | States are exposed                                                    | 4.1.2           | Selected, checked, disabled or busy shown only by style; no `aria-selected`, `aria-checked`, `aria-disabled`, `aria-busy` |
| 4   | Headings have a role                                                  | 1.3.1, 2.4.6    | Large or bold title `Text` without `role="heading"` (`headingLevel` prop)                                                 |
| 5   | Images have a text alternative or are hidden                          | 1.1.1           | `Image` without `accessibilityLabel` and without `aria-hidden`                                                            |
| 6   | Decorative icons are hidden                                           | 1.1.1           | Glyphs (✓ ⚠ ▲ ↑) without `aria-hidden`                                                                                    |
| 7   | Color is not the only signal                                          | 1.4.1           | Credit/debit, error or selection shown by a color change only                                                             |
| 8   | Contrast                                                              | 1.4.3, 1.4.11   | A literal color in a style, or a new token pair not in `contrast.test.ts`                                                 |
| 9   | Touch target size                                                     | 2.5.5 (applied) | `minHeight`/`minWidth` below 48 on a control, and no `hitSlop`                                                            |
| 10  | Error identification and suggestion                                   | 3.3.1, 3.3.3    | Error shown only by a red border; message does not tell the correct format                                                |
| 11  | Error is available to screen readers                                  | 3.3.1, 4.1.2    | Native: error not in `accessibilityHint`. Web: no `aria-invalid`/`aria-describedby`                                       |
| 12  | Status messages are announced                                         | 4.1.3           | A banner or a result text that appears without a `LiveRegion`                                                             |
| 13  | Live region stays mounted                                             | 4.1.3           | `LiveRegion` inside a condition (Android and browsers do not announce a new region)                                       |
| 14  | Focus after an error                                                  | 2.4.3, 3.3.1    | Failed submit does not move focus to the first invalid field                                                              |
| 15  | Reading order                                                         | 1.3.2           | Visual order (for example `flexDirection: 'row-reverse'`, absolute position) differs from code order                      |
| 16  | Text can scale                                                        | 1.4.4           | `allowFontScaling={false}`, a small `maxFontSizeMultiplier`, or a fixed `height` on a text container                      |
| 17  | Orientation is not locked                                             | 1.3.4           | `"orientation": "portrait"` in `app.json`, or `expo-screen-orientation` lock                                              |
| 18  | Motion can stop                                                       | 2.3.3 (applied) | A loop animation that does not use `useReducedMotion()`                                                                   |
| 19  | Grouped rows have one full label                                      | 1.3.1           | A list row with `accessible` but a label that misses the amount or the type                                               |
| 20  | Web focus is visible                                                  | 2.4.7           | A `Pressable` style function without `focusRing(theme, state)`                                                            |
| 21  | Web-only ARIA goes through `webOnlyProps()`                           | —               | `aria-describedby`, `aria-invalid`, `aria-level` passed directly to a React Native component                              |
| 22  | UI text is clear (ASD-STE100)                                         | 3.3.2           | Message blames the user ("invalid"), or does not tell what to do                                                          |

## 4. Test on devices (if a simulator or an emulator is available)

1. Do the manual procedure in `docs/ACCESSIBILITY.md`, section 5.
2. For an automated check of the native tree on iOS, use the argent `describe` tool. Make sure that each control shows a role (`AXButton`, `AXTextField`, `AXHeading`) and a label.
3. Record each problem as a finding.

## 5. Write the report

Write the report in ASD-STE100. Use this format:

```markdown
## Accessibility review: <scope>

Result: <N> findings (<n> blocking, <n> major, <n> minor)

| #   | Severity | WCAG  | Location                       | Problem                                                                      | Correction                      |
| --- | -------- | ----- | ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------- |
| 1   | Blocking | 4.1.2 | packages/features/src/x.tsx:42 | The "Delete" control has no role. VoiceOver reads "Delete" without "button". | Use `Button` from `@ledger/ui`. |

Checks passed: <list of check numbers from section 3>
Not tested: <for example "TalkBack on a physical device">
```

Severity:

- **Blocking**: a user with assistive technology cannot complete a task (for example, a control without a name, an error that is not announced).
- **Major**: a task is difficult (for example, a wrong focus order, contrast below the minimum).
- **Minor**: the experience is worse, but the task is possible (for example, a long label, a hint that repeats the label).

## 6. Correct the findings

If the user asks for corrections:

1. Correct the problem in the `@ledger/ui` component when possible. A correction there helps all screens.
2. Add a test that fails without the correction. Query by role and name.
3. Run the checks of section 2 again.
4. Update the conformance table in `docs/ACCESSIBILITY.md` if the evidence changes.
