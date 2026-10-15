# Accessibility

## 1. Standard

Ledger follows the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.
Section 504 of the Rehabilitation Act requires this level for patient-facing healthcare apps.
The rules apply to the iOS app, the Android app and the web app.

React Native does not create an accessibility tree by itself.
Each component must give an explicit role, name, state and value.
React Native sends this data to VoiceOver (iOS), TalkBack (Android) and the browser (react-native-web).

## 2. Semantic mapping

The `@ledger/ui` components do the mapping. Screens do not use raw React Native primitives (an ESLint rule stops this).

| Need             | React Native prop                                             | iOS (VoiceOver)                       | Android (TalkBack)            | Web                                     |
| ---------------- | ------------------------------------------------------------- | ------------------------------------- | ----------------------------- | --------------------------------------- |
| Name             | `accessibilityLabel`                                          | label                                 | content description           | `aria-label`                            |
| Role             | `role`                                                        | accessibility traits                  | class name / role description | `role`                                  |
| State            | `aria-checked`, `aria-selected`, `aria-disabled`, `aria-busy` | traits and value                      | state description             | same `aria-*`                           |
| Hint, error text | `accessibilityHint`                                           | hint (read after a pause)             | hint                          | `aria-describedby` (by `webOnlyProps`)  |
| Invalid field    | error text in hint                                            | hint                                  | hint                          | `aria-invalid` (by `webOnlyProps`)      |
| Status message   | `LiveRegion`                                                  | `announceForAccessibilityWithOptions` | `aria-live` → live region     | `aria-live` + `role="status"`/`"alert"` |
| Heading          | `role="heading"`                                              | header trait                          | heading                       | `role="heading"` + `aria-level`         |
| Group of parts   | `accessible` + one label                                      | one element                           | one element                   | `role="listitem"` + `aria-label`        |
| Decoration       | `aria-hidden`                                                 | hidden                                | hidden                        | `aria-hidden`                           |

`packages/ui/src/a11y/platform.ts` has the full notes.

## 3. Conformance table

| WCAG 2.1 success criterion                | Level | How Ledger meets it                                                                                                                    | Evidence                                |
| ----------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1.1.1 Non-text content                    | A     | The receipt image has a label ("Receipt image for Office supplies"). Icons are `aria-hidden`.                                          | `AttachmentField`, `RecentTransactions` |
| 1.3.1 Info and relationships              | A     | Headings, lists, list items, radio groups, tabs and regions have roles.                                                                | `components.test.tsx`, native tests     |
| 1.3.2 Meaningful sequence                 | A     | The reading order is the visual order in the narrow and the wide layout.                                                               | `AccountScreen.tsx`                     |
| 1.3.4 Orientation                         | AA    | The app does not lock the orientation (`"orientation": "default"`).                                                                    | `app.json`                              |
| 1.3.5 Identify input purpose              | AA    | Not applicable: the form collects no personal data about the user. The amount field uses `inputMode="decimal"` and a decimal keyboard. | `TransactionForm.tsx`                   |
| 1.4.1 Use of color                        | A     | Credit/debit has a text badge and a sign (+/−). Errors have text and an icon. The selected option has a mark (◉).                      | `Badge`, `Banner`, `SegmentedControl`   |
| 1.4.3 Contrast (minimum)                  | AA    | All text pairs have 4.5:1 or more in the light and the dark theme.                                                                     | `contrast.test.ts`                      |
| 1.4.4 Resize text                         | AA    | The app does not limit system font scaling. Layouts wrap.                                                                              | `typography` tokens                     |
| 1.4.10 Reflow                             | AA    | One column below 900 dp, two columns above. No horizontal scroll at 320 CSS px.                                                        | `AccountScreen.tsx`                     |
| 1.4.11 Non-text contrast                  | AA    | Input borders and focus indicators have 3:1 or more.                                                                                   | `contrast.test.ts`                      |
| 1.4.12 Text spacing                       | AA    | Text has no fixed height. Line heights are 1.3 or more.                                                                                | `typography` tokens                     |
| 1.4.13 Content on hover or focus          | AA    | The app shows no hover-only content.                                                                                                   | —                                       |
| 2.1.1 Keyboard                            | A     | On the web, all controls are focusable and operate with Enter or Space.                                                                | Manual test (section 5)                 |
| 2.4.2 Page titled                         | A     | The web page title is "Ledger – Local account".                                                                                        | `apps/web/index.html`                   |
| 2.4.3 Focus order                         | A     | The focus moves in the reading order. After a failed submit, focus goes to the first field with an error.                              | `TransactionForm.tsx`                   |
| 2.4.6 Headings and labels                 | AA    | Each card has a heading. Each field has a visible label.                                                                               | `Card`, `TextField`                     |
| 2.4.7 Focus visible                       | AA    | Buttons, tabs and radios show a 2 px outline on the web. Fields show a 2 px border.                                                    | `focusRing()`                           |
| 2.5.3 Label in name                       | A     | The accessible name starts with the visible label.                                                                                     | `TextField`, `Button`                   |
| 2.5.5 Target size (AAA, applied)          | AAA   | Touch targets are 48 × 48 or larger.                                                                                                   | `MIN_TOUCH_TARGET`                      |
| 3.1.1 Language of page                    | A     | `<html lang="en">`.                                                                                                                    | `apps/web/index.html`                   |
| 3.2.2 On input                            | A     | A change of a field does not submit the form or move the focus.                                                                        | `TransactionForm.tsx`                   |
| 3.3.1 Error identification                | A     | Each error shows in text next to its field. A summary is in an alert.                                                                  | `TextField`, `AccountScreen.test.tsx`   |
| 3.3.2 Labels or instructions              | A     | Labels, "(required)" text and format hints are visible.                                                                                | `TextField`                             |
| 3.3.3 Error suggestion                    | AA    | Messages tell the correct format ("for example 12.50").                                                                                | `validateDraft()`                       |
| 3.3.4 Error prevention (legal, financial) | AA    | The server checks the balance. The user can correct a refused transaction; the values stay in the form.                                | `transactionDraftSlice`                 |
| 4.1.2 Name, role, value                   | A     | Each interactive element has a name, a role and a state.                                                                               | `components.test.tsx`, native tests     |
| 4.1.3 Status messages                     | AA    | Success, error and data-source messages are in live regions. iOS gets an announcement.                                                 | `LiveRegion`                            |

## 4. Automated checks

| Check                        | Command                                                                | What it finds                                               |
| ---------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Contrast of all theme tokens | `pnpm --filter @ledger/ui test`                                        | A color pair below 4.5:1 or 3:1                             |
| Web semantics                | `pnpm --filter @ledger/ui test`, `pnpm --filter @ledger/features test` | A missing role, name or state on the web                    |
| Native semantics             | `pnpm --filter @ledger/mobile test`                                    | A missing role, state or hint on iOS/Android                |
| axe-core                     | `pnpm storybook`, "Accessibility" panel                                | WCAG 2.1 A/AA rule violations per story                     |
| Architecture rule            | `pnpm lint`                                                            | A screen that uses a raw `Text`, `Pressable` or `TextInput` |

Automated tools find about a third of all accessibility problems. Do the manual test also.

## 5. Manual test procedure

Do this procedure before each release. Use the `accessibility-review` skill to record the results.

### 5.1 iOS (VoiceOver)

1. Open Settings > Accessibility > VoiceOver. Turn on VoiceOver.
2. Open Ledger. Swipe right through all elements of the Account tab.
3. Make sure that VoiceOver reads each element with a name and a role ("Title, required, text field").
4. Use the rotor ("Headings"). Make sure that you can go to each card heading.
5. Submit an empty form. Make sure that VoiceOver reads the error summary.
6. Record a debit that is more than the balance. Make sure that VoiceOver reads "Transaction refused".
7. Set the text size to the maximum (Settings > Accessibility > Display & Text Size > Larger Text). Make sure that no text is cut.

### 5.2 Android (TalkBack)

1. Open Settings > Accessibility > TalkBack. Turn on TalkBack.
2. Do steps 2 to 6 of section 5.1.
3. Make sure that TalkBack reads "Selected" for the active tab and "Checked" for the selected type.
4. Set the font size and the display size to the maximum. Make sure that no text is cut.

### 5.3 Web

1. Use only the keyboard. Press Tab through the page.
2. Make sure that each focused control shows a visible outline.
3. Make sure that you can select a type, enter all values and submit with the keyboard.
4. Zoom the browser to 200 %. Make sure that the page has no horizontal scroll.
5. Use VoiceOver (macOS) or NVDA (Windows). Do steps 5 and 6 of section 5.1.

## 6. Diagnostics and the Reference ID

The success and error banners show "Reference ID: …". The text is selectable, so a user can copy it into a support request.
The Request trace card is a list: each server step is one list item with one full label (for example "Server step 3: The ledger refused the transaction (balance too low), at plus 0.4 milliseconds").

## 7. Known limits

1. React Native has no `aria-describedby` on iOS and Android. The error text goes in the accessibility hint. Some users turn off hints. The error text is also visible next to the field and in the summary alert.
2. The bundled stock snapshot uses a fixed date. The UI shows this date, so the user knows the data is old.
