import { by, device, element, expect, waitFor } from 'detox';
import { TestIds } from '@ledger/features/testIds';
import { scrollIntoView } from './scroll';

/**
 * The Nitro camera module on a device without a camera (iOS simulator).
 * The module gives a generated sample photo, so the full path runs:
 * native pixels → ArrayBuffer shared with JS → JS analysis → native PhotoView.
 * The end-to-end tests run on iOS only.
 */
describe('Receipt photo (Nitro camera module)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('shows the native preview and the shared-memory details', async () => {
    const cameraButton = `${TestIds.form.receipt}-camera`;
    await scrollIntoView(cameraButton);
    await element(by.id(cameraButton)).tap();

    // The preview can appear below the visible area: wait for it, then scroll to it.
    const preview = `${TestIds.form.receipt}-native-preview`;
    await waitFor(element(by.id(preview)))
      .toExist()
      .withTimeout(10_000);
    await scrollIntoView(preview);
    await expect(element(by.label('Receipt photo'))).toExist();
    await expect(element(by.id(`${TestIds.form.receipt}-details`))).toExist();
  });
});
