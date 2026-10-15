package com.margelo.nitro.ledgercamera

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Typeface
import android.media.ExifInterface
import android.provider.MediaStore
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

/**
 * Entry point of the module. JavaScript creates it with
 * `NitroModules.createHybridObject<LedgerCamera>('LedgerCamera')`.
 */
@Keep
@DoNotStrip
class HybridLedgerCamera : HybridLedgerCameraSpec() {
  private val context: ReactApplicationContext
    get() = NitroModules.applicationContext ?: throw Error("The React context is not available.")

  override val isCameraAvailable: Boolean
    get() = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)

  override fun takePhoto(maxDimension: Double): Promise<HybridPhotoSpec?> {
    val limit = maxOf(64, maxDimension.toInt())
    return Promise.async {
      if (!isCameraAvailable) {
        return@async HybridPhoto.make(SampleReceipt.render(), limit, PhotoSource.SAMPLE)
      }
      ensureCameraPermission()
      val file = captureToFile() ?: return@async null
      try {
        val bitmap = decodeSampled(file, limit)
        HybridPhoto.make(bitmap, limit, PhotoSource.CAMERA)
      } finally {
        file.delete()
      }
    }
  }

  /**
   * The system camera app needs no permission, unless the app manifest declares CAMERA.
   * In that case Android requires a runtime grant before ACTION_IMAGE_CAPTURE.
   */
  private suspend fun ensureCameraPermission() {
    val info = context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
    val declared = info.requestedPermissions?.contains(Manifest.permission.CAMERA) == true
    if (!declared) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) return
    val activity = context.currentActivity as? PermissionAwareActivity
      ?: throw Error("The camera permission is necessary.")
    val granted = withContext(Dispatchers.Main) {
      suspendCancellableCoroutine { continuation ->
        activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), PERMISSION_REQUEST) { code, _, results ->
          if (code != PERMISSION_REQUEST) return@requestPermissions false
          continuation.resume(results.firstOrNull() == PackageManager.PERMISSION_GRANTED)
          true
        }
      }
    }
    if (!granted) throw Error("The camera permission was denied.")
  }

  /** Starts the camera app. Resolves with the photo file, or null when the user cancels. */
  private suspend fun captureToFile(): File? = withContext(Dispatchers.Main) {
    val reactContext = context
    val activity = reactContext.currentActivity ?: throw Error("No activity is in the foreground.")
    val directory = File(reactContext.cacheDir, "ledger-camera").apply { mkdirs() }
    val file = File.createTempFile("photo-", ".jpg", directory)
    val uri = FileProvider.getUriForFile(reactContext, "${reactContext.packageName}.ledgercamera.provider", file)
    val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
      .putExtra(MediaStore.EXTRA_OUTPUT, uri)
      .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)

    suspendCancellableCoroutine { continuation ->
      val listener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
          if (requestCode != CAPTURE_REQUEST) return
          reactContext.removeActivityEventListener(this)
          if (resultCode == Activity.RESULT_OK && file.length() > 0) {
            continuation.resume(file)
          } else {
            file.delete()
            continuation.resume(null)
          }
        }
      }
      reactContext.addActivityEventListener(listener)
      continuation.invokeOnCancellation { reactContext.removeActivityEventListener(listener) }
      try {
        activity.startActivityForResult(intent, CAPTURE_REQUEST)
      } catch (error: ActivityNotFoundException) {
        reactContext.removeActivityEventListener(listener)
        file.delete()
        continuation.resumeWithException(Error("No camera app is installed."))
      }
    }
  }

  /** Decodes with a power-of-two sample size (low memory) and applies the EXIF rotation. */
  private fun decodeSampled(file: File, limit: Int): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= limit) sample *= 2
    val options = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val decoded = BitmapFactory.decodeFile(file.path, options) ?: throw Error("The photo file cannot be read.")
    val degrees = when (ExifInterface(file.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }
    if (degrees == 0f) return decoded
    val rotated = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, Matrix().apply { postRotate(degrees) }, true)
    decoded.recycle()
    return rotated
  }

  private companion object {
    const val CAPTURE_REQUEST = 0x1ED6
    const val PERMISSION_REQUEST = 0x1ED7
  }
}

/** Draws a sample receipt. Used only when the device has no camera. */
private object SampleReceipt {
  fun render(): Bitmap {
    val bitmap = Bitmap.createBitmap(960, 1280, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.rgb(242, 245, 248))
    canvas.drawRect(120f, 80f, 840f, 1200f, Paint().apply { color = Color.WHITE })
    val title = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 56f; typeface = Typeface.DEFAULT_BOLD }
    val body = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.DKGRAY; textSize = 34f; typeface = Typeface.MONOSPACE }
    canvas.drawText("SAMPLE RECEIPT", 180f, 190f, title)
    listOf("Office Supplies Ltd.", "", "Printer paper   12.40", "Toner          48.90", "Pens             2.90", "", "TOTAL          64.20 USD")
      .forEachIndexed { index, line -> canvas.drawText(line, 180f, 320f + index * 60f, body) }
    canvas.drawText("Emulator image: no camera", 180f, 1120f, body)
    return bitmap
  }
}
