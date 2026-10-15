import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface AttachmentFieldProps {
  label: string;
  hint?: string;
  /** URI of the selected image (file, http or data URI). `null` when there is no image. */
  imageUri: string | null;
  /** Text alternative for the image (WCAG 2.1 SC 1.1.1). */
  imageAccessibilityLabel: string;
  onPick: () => void;
  onRemove: () => void;
  /** Shows a "Take photo" button. Give it only when the platform has a camera service. */
  onTakePhoto?: () => void;
  /**
   * A native preview element (for example a Nitro PhotoView). It replaces the
   * `imageUri` thumbnail. The element must have its own accessible name.
   */
  preview?: ReactNode;
  /** Technical details below the preview, for example the size of the photo. */
  details?: string;
  /** A non-blocking warning, for example "The photo is dark". */
  warning?: string | null;
  busy?: boolean;
  error?: string | null;
  testID?: string;
}

/**
 * Optional image attachment. The component does not open a picker or a camera
 * itself: the app gives `onPick` and `onTakePhoto`, because these are
 * different on each platform (Nitro camera and expo-image-picker on mobile, a
 * file input on the web).
 */
export function AttachmentField({
  label,
  hint,
  imageUri,
  imageAccessibilityLabel,
  onPick,
  onRemove,
  onTakePhoto,
  preview,
  details,
  warning,
  busy = false,
  error,
  testID,
}: AttachmentFieldProps) {
  const styles = useThemedStyles(createStyles);
  const hasImage = Boolean(preview || imageUri);
  return (
    <View style={styles.container} testID={testID}>
      <Text variant="label">{label}</Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
      <View style={styles.row}>
        {preview ? (
          <View
            style={styles.previewFrame}
            testID={testID ? `${testID}-native-preview` : undefined}
          >
            {preview}
          </View>
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            role="img"
            accessibilityLabel={imageAccessibilityLabel}
            style={styles.thumbnail}
            testID={testID ? `${testID}-preview` : undefined}
          />
        ) : null}
        <View style={styles.actions}>
          {onTakePhoto ? (
            <Button
              label={hasImage ? 'Take a new photo' : 'Take photo'}
              icon="◉"
              variant="secondary"
              onPress={onTakePhoto}
              loading={busy}
              accessibilityHint="Opens the camera."
              testID={testID ? `${testID}-camera` : undefined}
            />
          ) : null}
          <Button
            label={hasImage ? 'Replace image' : 'Add image'}
            icon="＋"
            variant="secondary"
            onPress={onPick}
            loading={busy && !onTakePhoto}
            disabled={busy}
            accessibilityHint="Opens the photo library."
            testID={testID ? `${testID}-pick` : undefined}
          />
          {hasImage ? (
            <Button
              label="Remove image"
              variant="ghost"
              onPress={onRemove}
              disabled={busy}
              testID={testID ? `${testID}-remove` : undefined}
            />
          ) : null}
        </View>
      </View>
      {details ? (
        <Text variant="caption" tone="muted" testID={testID ? `${testID}-details` : undefined}>
          {details}
        </Text>
      ) : null}
      {warning ? (
        <Text variant="label" tone="warning">
          {`! ${warning}`}
        </Text>
      ) : null}
      {error ? (
        <Text variant="label" tone="danger">
          {`⚠ ${error}`}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexWrap: 'wrap' },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.surfaceMuted,
    },
    previewFrame: {
      width: 120,
      height: 160,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    actions: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', flexShrink: 1 },
  });
