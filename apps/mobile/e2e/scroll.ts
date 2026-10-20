import { by, element, waitFor } from 'detox';
import { TestIds } from '@ledger/features/testIds';

const SCROLL_STEP = 400;

type ScrollOptions = {
  /** The screen that scrolls. */
  screenId?: string;
  /**
   * How much of the element must be visible. Detox needs 100 for `replaceText`
   * and `tap`, because they refuse a view that is partly clipped.
   */
  visiblePercent?: number;
};

/**
 * Scrolls the account screen until the element is visible.
 *
 * The tests do not know where the previous test left the scroll position, so
 * the helper scrolls down first and, if it reaches the end, scrolls up.
 */
export async function scrollIntoView(
  testID: string,
  { screenId = TestIds.screens.account, visiblePercent = 75 }: ScrollOptions = {},
) {
  const attempt = (direction: 'up' | 'down') =>
    waitFor(element(by.id(testID)))
      .toBeVisible(visiblePercent)
      .whileElement(by.id(screenId))
      .scroll(SCROLL_STEP, direction);
  try {
    await attempt('down');
  } catch {
    await attempt('up');
  }
}
