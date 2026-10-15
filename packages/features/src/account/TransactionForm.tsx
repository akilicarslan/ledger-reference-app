import { useRef, useState, type RefObject } from 'react';
import { Keyboard, View } from 'react-native';
import { MAX_RECEIPT_IMAGE_LENGTH, type TransactionType } from '@ledger/contracts';
import {
  draftFieldChanged,
  firstInvalidField,
  formatBytes,
  formatMoney,
  selectDraft,
  selectSubmit,
  submitStatusCleared,
  submitTransaction,
  useAppDispatch,
  useAppSelector,
  validateDraft,
  type DraftErrors,
  type DraftField,
  type TransactionDraft,
} from '@ledger/core';
import {
  AttachmentField,
  Banner,
  Button,
  Card,
  LiveRegion,
  SegmentedControl,
  TextField,
  useTheme,
  type SegmentOption,
  type TextFieldRef,
} from '@ledger/ui';
import { usePlatformServices, type CapturedPhoto, type PlatformServices } from '../platform';
import { TestIds } from '../testIds';

const TYPE_OPTIONS: readonly SegmentOption<TransactionType>[] = [
  { value: 'credit', label: 'Credit', description: 'Add funds', testID: TestIds.form.typeCredit },
  {
    value: 'debit',
    label: 'Debit',
    description: 'Expense or withdrawal',
    testID: TestIds.form.typeDebit,
  },
];

/**
 * Form to record one transaction. Rules:
 * - Validation runs on submit. The form shows each error next to its field
 *   and moves focus to the first field with an error (WCAG 3.3.1).
 * - Server errors (for example "insufficient funds") show in a banner in
 *   an assertive live region, so screen readers speak them at once.
 */
export function TransactionForm() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const services = usePlatformServices();
  const submit = useAppSelector(selectSubmit);
  const draft = useAppSelector(selectDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  /** The native photo for the preview. Not in Redux: it holds native memory, it is not serializable. */
  const [capturedPhoto, setPhoto] = useState<CapturedPhoto | null>(null);
  // Derived, not synchronized with an effect: when the draft has no image (after a
  // submit or a remove) and no capture is in progress, the form shows no photo.
  const photo = capturedPhoto && (picking || draft.receiptImage !== null) ? capturedPhoto : null;

  const titleRef = useRef<TextFieldRef>(null);
  const amountRef = useRef<TextFieldRef>(null);
  const descriptionRef = useRef<TextFieldRef>(null);
  const fieldRefs: Partial<Record<DraftField, RefObject<TextFieldRef | null>>> = {
    title: titleRef,
    amount: amountRef,
    description: descriptionRef,
  };

  const update = <K extends DraftField>(field: K, value: TransactionDraft[K]) => {
    dispatch(draftFieldChanged(field, value));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (submit.status === 'succeeded') dispatch(submitStatusCleared());
  };

  // The React Compiler cannot compile `try ... finally`, so `setPicking(false)`
  // comes after the try/catch. The attach functions return early, never throw past it.
  const attachPickedImage = async () => {
    const image = await services.pickImage();
    if (!image) return;
    if (image.dataUri.length > MAX_RECEIPT_IMAGE_LENGTH) {
      setErrors((current) => ({
        ...current,
        receiptImage: 'The image is too large. Select an image smaller than 1 MB.',
      }));
      return;
    }
    setPhoto(null);
    update('receiptImage', image.dataUri);
  };

  const pickImage = async () => {
    setPicking(true);
    try {
      await attachPickedImage();
    } catch {
      setErrors((current) => ({
        ...current,
        receiptImage: 'The image cannot be opened. Try a different image.',
      }));
    }
    setPicking(false);
  };

  const attachCameraPhoto = async (camera: NonNullable<PlatformServices['camera']>) => {
    const captured = await camera.takePhoto();
    if (!captured) return;
    // 1. Show the native preview at once. The pixels do not go through JavaScript.
    setPhoto(captured);
    setErrors((current) => ({ ...current, receiptImage: undefined }));
    // 2. Encode the JPEG for the upload on a native background thread.
    const dataUri = await captured.toDataUri();
    if (dataUri.length > MAX_RECEIPT_IMAGE_LENGTH) {
      setPhoto(null);
      setErrors((current) => ({
        ...current,
        receiptImage: 'The photo is too large. Take the photo again from a shorter distance.',
      }));
      return;
    }
    update('receiptImage', dataUri);
  };

  const takePhoto = async () => {
    const camera = services.camera;
    if (!camera) return;
    setPicking(true);
    try {
      await attachCameraPhoto(camera);
    } catch {
      setPhoto(null);
      setErrors((current) => ({
        ...current,
        receiptImage: 'The camera is not available. Use "Add image" to select a photo.',
      }));
    }
    setPicking(false);
  };

  const photoLabel = draft.title.trim()
    ? `Receipt photo for ${draft.title.trim()}`
    : 'Receipt photo';
  const photoDetails = photo
    ? [
        `${photo.width} × ${photo.height}`,
        `${formatBytes(photo.byteLength)} shared with JavaScript, no copy`,
        `native decode ${photo.decodeMs.toFixed(0)} ms`,
        `JS analysis ${photo.analysisMs.toFixed(1)} ms`,
        photo.source === 'sample' ? 'sample image (this device has no camera)' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  const onSubmit = async () => {
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      const count = Object.values(result.errors).filter(Boolean).length;
      setSummary(
        `The form has ${count} ${count === 1 ? 'error' : 'errors'}. Correct the marked fields, then submit again.`,
      );
      const first = firstInvalidField(result.errors);
      if (first) fieldRefs[first]?.current?.focus();
      return;
    }
    setErrors({});
    setSummary(null);
    // Close the keyboard, so the user can see the result banner.
    Keyboard.dismiss();
    // On success, transactionDraftSlice clears the form and keeps the type.
    // The draft keeps the idempotency key: a second tap after a timeout cannot record two times.
    const action = await dispatch(
      submitTransaction({ input: result.value, idempotencyKey: draft.idempotencyKey }),
    );
    // Release the native photo memory after a successful upload.
    if (submitTransaction.fulfilled.match(action)) setPhoto(null);
  };

  const submitting = submit.status === 'pending';
  const errorMessage = submit.status === 'failed' ? (submit.error?.message ?? null) : null;
  const successMessage =
    submit.status === 'succeeded' && submit.lastTransaction
      ? `Transaction "${submit.lastTransaction.title}" recorded. New balance: ${formatMoney(submit.lastTransaction.balanceAfter)}.`
      : null;

  return (
    <Card
      title="New transaction"
      subtitle="Fields marked (required) must have a value."
      testID={TestIds.form.container}
    >
      <View style={{ gap: theme.spacing.lg }}>
        <SegmentedControl
          label="Transaction type"
          options={TYPE_OPTIONS}
          value={draft.type}
          onChange={(value) => update('type', value)}
        />
        <TextField
          ref={titleRef}
          label="Title"
          required
          value={draft.title}
          onChangeText={(value) => update('title', value)}
          error={errors.title}
          maxLength={80}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => amountRef.current?.focus()}
          testID={TestIds.form.title}
        />
        <TextField
          ref={amountRef}
          label="Amount (USD)"
          required
          hint="Use a number with a maximum of 2 decimals, for example 12.50."
          value={draft.amount}
          onChangeText={(value) => update('amount', value)}
          error={errors.amount}
          keyboardType="decimal-pad"
          inputMode="decimal"
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
          testID={TestIds.form.amount}
        />
        <TextField
          ref={descriptionRef}
          label="Description"
          hint="Optional. Maximum 500 characters."
          value={draft.description}
          onChangeText={(value) => update('description', value)}
          error={errors.description}
          multiline
          maxLength={500}
          testID={TestIds.form.description}
        />
        <AttachmentField
          label="Receipt image (optional)"
          hint="PNG, JPEG or WebP. Maximum 1 MB."
          imageUri={draft.receiptImage}
          imageAccessibilityLabel={
            draft.title ? `Receipt image for ${draft.title.trim()}` : 'Receipt image'
          }
          onPick={() => void pickImage()}
          onRemove={() => {
            setPhoto(null);
            update('receiptImage', null);
          }}
          onTakePhoto={services.camera ? () => void takePhoto() : undefined}
          preview={photo ? photo.renderPreview(photoLabel) : undefined}
          details={photoDetails}
          warning={
            photo?.isTooDark
              ? 'The photo is dark. The receipt text can be hard to read. Take the photo again in more light.'
              : null
          }
          busy={picking}
          error={errors.receiptImage}
          testID={TestIds.form.receipt}
        />

        <LiveRegion politeness="assertive" message={errorMessage ?? summary}>
          {errorMessage ? (
            <Banner
              tone="error"
              title={
                submit.error?.code === 'INSUFFICIENT_FUNDS'
                  ? 'Transaction refused'
                  : 'Transaction not recorded'
              }
              message={errorMessage}
              reference={submit.error?.traceId}
              testID={TestIds.form.errorBanner}
            />
          ) : summary ? (
            <Banner tone="error" title="Check the form" message={summary} />
          ) : null}
        </LiveRegion>
        <LiveRegion politeness="polite" message={successMessage}>
          {successMessage ? (
            <Banner
              tone="success"
              message={successMessage}
              reference={submit.trace?.traceId}
              testID={TestIds.form.successBanner}
            />
          ) : null}
        </LiveRegion>

        <Button
          label={draft.type === 'credit' ? 'Record credit' : 'Record debit'}
          onPress={() => void onSubmit()}
          loading={submitting}
          // Wait until the photo is encoded, so the upload has the image.
          disabled={picking}
          fullWidth
          testID={TestIds.form.submit}
        />
      </View>
    </Card>
  );
}
