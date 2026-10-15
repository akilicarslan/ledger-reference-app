package com.margelo.nitro.ledgercamera

import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Base64
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * One photo in native memory.
 *
 * Memory model:
 * 1. [make] scales the camera bitmap and copies its pixels one time into a *direct* ByteBuffer
 *    (memory outside the Java heap). Android Bitmaps cannot wrap foreign memory, so this is the
 *    only copy.
 * 2. [pixels] wraps that direct ByteBuffer with `ArrayBuffer.wrap(...)`. JavaScript reads the same
 *    bytes through `new Uint8Array(photo.pixels)`: no copy to JS, no base64.
 * 3. [bitmap] is the display copy for [HybridPhotoView]. It never goes through JavaScript.
 */
@Keep
@DoNotStrip
class HybridPhoto private constructor(
  val bitmap: Bitmap,
  private val buffer: ByteBuffer,
  override val source: PhotoSource,
  override val decodeMs: Double,
) : HybridPhotoSpec() {
  override val width: Double = bitmap.width.toDouble()
  override val height: Double = bitmap.height.toDouble()
  override val bytesPerRow: Double = (bitmap.width * BYTES_PER_PIXEL).toDouble()

  /** Zero-copy view of [buffer] for JavaScript. */
  override val pixels: ArrayBuffer = ArrayBuffer.wrap(buffer)

  /** Tells the JS garbage collector how much native memory this object holds. */
  override val memorySize: Long
    get() = buffer.capacity().toLong() + bitmap.allocationByteCount.toLong()

  override fun toJpegDataUri(quality: Double): Promise<String> {
    val clamped = (quality.coerceIn(0.1, 1.0) * 100).toInt()
    return Promise.async {
      val output = ByteArrayOutputStream()
      if (!bitmap.compress(Bitmap.CompressFormat.JPEG, clamped, output)) {
        throw Error("Cannot encode the photo as JPEG.")
      }
      "data:image/jpeg;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    }
  }

  companion object {
    private const val BYTES_PER_PIXEL = 4

    /** Downscales [source] so that its longest side is [maxDimension] or less. */
    fun make(source: Bitmap, maxDimension: Int, photoSource: PhotoSource): HybridPhoto {
      val start = SystemClock.elapsedRealtimeNanos()
      val scale = minOf(1.0, maxDimension.toDouble() / maxOf(source.width, source.height))
      val width = maxOf(1, Math.round(source.width * scale).toInt())
      val height = maxOf(1, Math.round(source.height * scale).toInt())
      var scaled = if (scale < 1.0) Bitmap.createScaledBitmap(source, width, height, true) else source
      if (scaled.config != Bitmap.Config.ARGB_8888) {
        scaled = scaled.copy(Bitmap.Config.ARGB_8888, false)
      }
      if (scaled !== source) source.recycle()

      // ARGB_8888 keeps the bytes in R, G, B, A order in memory: the same layout as on iOS.
      val buffer = ByteBuffer.allocateDirect(scaled.byteCount).order(ByteOrder.nativeOrder())
      scaled.copyPixelsToBuffer(buffer)
      buffer.rewind()

      val decodeMs = (SystemClock.elapsedRealtimeNanos() - start) / 1_000_000.0
      return HybridPhoto(scaled, buffer, photoSource, decodeMs)
    }
  }
}
