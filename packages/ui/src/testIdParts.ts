/**
 * Test IDs of the parts inside a component. A component gives each part an ID
 * that it makes from its `testID`. The tests get the same IDs from these
 * functions, so a changed suffix cannot break a test without a type error.
 * This file has no imports: Detox (Node.js) can load it.
 */

export function bannerTestIds(testID: string) {
  return { message: `${testID}-message`, reference: `${testID}-reference` } as const;
}

export function textFieldTestIds(testID: string) {
  return { error: `${testID}-error` } as const;
}

export function attachmentTestIds(testID: string) {
  return {
    nativePreview: `${testID}-native-preview`,
    preview: `${testID}-preview`,
    camera: `${testID}-camera`,
    pick: `${testID}-pick`,
    remove: `${testID}-remove`,
    details: `${testID}-details`,
  } as const;
}
