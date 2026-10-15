---
name: shared-ui-library
description: Add, change or review a component in the Ledger shared UI library (packages/ui) that React Native (iOS, Android) and React web (react-native-web) both use. Use this skill when a task creates a new UI component, changes a component API, adds a design token, adds a Storybook story, or moves UI code from a screen into packages/ui.
---

# Shared UI library (`@ledger/ui`)

This skill gives the procedure to add or change a component in `packages/ui`.
The mobile app renders the components with React Native.
The web app and Storybook render the same components with react-native-web.

## 1. Rules

1. Use only React Native primitives: `View`, `Text`, `Pressable`, `TextInput`, `Image`, `ScrollView`, `Animated`, `ActivityIndicator`.
2. Do not import a native module (for example `expo-*`). If a component needs one, give a callback prop. The app gives the implementation. See `AttachmentField.onPick`.
3. Do not import from `@ledger/core` or `@ledger/features`. The library does not know about transactions or the API.
4. Use theme tokens from `useTheme()` or `useThemedStyles()`. Do not write a literal color, size or font value in a component.
5. Make each touch target `theme.minTouchTarget` (48) or larger.
6. Give each interactive element a role, a name and a state. Read section 3.
7. Put web-only ARIA attributes in `webOnlyProps()`. Do not pass them directly; React Native does not know them.
8. Export each public component and its props type from `src/index.ts`.
9. Write all UI text and comments in ASD-STE100 (see `docs/STE-WRITING-RULES.md`).

## 2. Procedure: add a component

1. Read `src/components/Button.tsx` and `src/components/TextField.tsx`. Use the same structure.
2. Create `src/components/<Name>.tsx`. Use this order: imports, props interface with TSDoc, component, `createStyles(theme)`.
3. Write the props interface:
   - Make the visible label a required `label: string` prop. The label is also the accessible name.
   - Add `testID?: string`.
   - Add a TSDoc comment for each prop that has an accessibility effect.
4. Add the accessibility props. Use the table in section 3.
5. Export the component and its props type from `src/index.ts`.
6. Create `src/components/<Name>.stories.tsx`:
   - Use `satisfies Meta<typeof Name>`.
   - Add one story for each important state (default, disabled, loading, error).
   - Add a `parameters.docs.description.component` text that gives the accessibility behavior.
7. Add a test in `test/components.test.tsx`. Query by role and name (`getByRole('button', { name: '...' })`). Do not query by test ID for semantics.
8. If you add a color token, add its pairs to `test/contrast.test.ts`.
9. Run the checks:

   ```sh
   pnpm --filter @ledger/ui typecheck
   pnpm --filter @ledger/ui test
   pnpm --filter @ledger/ui build-storybook
   pnpm lint
   ```

10. Open Storybook (`pnpm storybook`). Open the "Accessibility" panel for each new story. Make sure that it shows no violations in the light and the dark theme.
11. Run the `accessibility-review` skill on the new component.

## 3. Accessibility mapping

| Component type                       | Props to set                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                               | `role="button"`, `accessibilityLabel={label}`, `aria-disabled`, `aria-busy` when loading, `accessibilityHint` if the result is not clear from the label             |
| Text input                           | `accessibilityLabel` (label + ", required"), `accessibilityHint` (error + hint) for native, `webOnlyProps({ 'aria-required', 'aria-invalid', 'aria-describedby' })` |
| Single choice                        | container `role="radiogroup"` + `accessibilityLabel`; each option `role="radio"` + `aria-checked`                                                                   |
| Tabs                                 | container `role="tablist"`; each tab `role="tab"` + `aria-selected`                                                                                                 |
| Heading                              | `role="heading"` on `Text` (use the `headingLevel` prop of `Text`)                                                                                                  |
| List                                 | container `role="list"` + name; row `role="listitem"` + `accessible` + one full `accessibilityLabel`                                                                |
| Image with meaning                   | `role="img"` + `accessibilityLabel`                                                                                                                                 |
| Decoration (icon, divider, skeleton) | `aria-hidden`                                                                                                                                                       |
| Status message                       | wrap in `<LiveRegion message="...">`. Use `politeness="assertive"` only for errors                                                                                  |
| Pressable on the web                 | add `focusRing(theme, state)` to the style function                                                                                                                 |

Do not show a state with color only. Add text, a symbol or a border change.

## 4. Change a component API

1. Find all usages:

   ```sh
   grep -rn "<Name" packages/features apps --include=*.tsx
   ```

2. Change the component and all usages in the same change.
3. Update the stories and the tests.
4. If the change removes or renames a prop, write the change in the pull request description.

## 5. Checklist

- [ ] Only React Native primitives and theme tokens
- [ ] Role, name and state for each interactive element
- [ ] Touch target 48 × 48 or larger
- [ ] State not shown by color only
- [ ] Story for each state, a11y panel shows no violations
- [ ] Test with `getByRole` and an accessible name
- [ ] Exported from `src/index.ts`
- [ ] Typecheck, test, lint and Storybook build pass
