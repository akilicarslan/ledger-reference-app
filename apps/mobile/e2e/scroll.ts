import { by, element, waitFor } from 'detox';
import { TestIds } from '@ledger/features/testIds';

const SCROLL_STEP = 400;

/**
 * Scrolls the account screen until the element is visible.
 *
 * The tests do not know where the previous test left the scroll position, so
 * the helper scrolls down first and, if it reaches the end, scrolls up.
 */
export async function scrollIntoView(testID: string, screenId: string = TestIds.screens.account) {
  const attempt = (direction: 'up' | 'down') =>
    waitFor(element(by.id(testID)))
      .toBeVisible()
      .whileElement(by.id(screenId))
      .scroll(SCROLL_STEP, direction);
  try {
    await attempt('down');
  } catch {
    await attempt('up');
  }
}
