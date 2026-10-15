# ADR 0008: Nitro module with a shared ArrayBuffer for the receipt photo

- Status: Accepted
- Date: 2026-10-13

## Context

The user can take a photo of a receipt. The usual React Native flow sends the image to JavaScript as a base64 string and decodes it again in an `<Image>`. This copies the image several times and decodes it two times.

## Decision

1. Write a Nitro module (`packages/native-camera`) with a `LedgerCamera` HybridObject, a `Photo` HybridObject and a `PhotoView` HybridView.
2. Decode the photo one time into RGBA pixels in native memory.
3. Give JavaScript an owning `ArrayBuffer` that wraps this memory (no copy).
4. Draw the photo with `PhotoView`, which gets the `Photo` object as a prop (no JavaScript round trip).
5. Encode a JPEG only for the upload, on a background thread.
6. Keep the shared screens free of native imports: they use the `CameraService` interface of `PlatformServices`.

## Alternatives

- `expo-image-picker` with `base64: true` (already used for the photo library): simple, but it has the copies that this decision removes.
- `react-native-vision-camera` with frame processors: very fast, but large for a single photo.
- An Expo module: possible, but Expo modules have no zero-copy `ArrayBuffer` type and no HybridView with a native object prop.

## Consequences

- iOS has no pixel copy after the decode. Android has one native copy, because a `Bitmap` cannot wrap foreign memory (see docs/NATIVE-CAMERA.md).
- JavaScript can analyze the pixels (the dark-photo warning) in a few milliseconds.
- The module needs a development build. It does not run in Expo Go.
- The generated bindings (`nitrogen/generated`) are in git, so a build does not need a codegen step.
