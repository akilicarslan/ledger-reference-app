package com.margelo.nitro.ledgercamera

import android.view.View
import android.widget.ImageView
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Native view for `<PhotoView photo={photo} />`. It gets the `Photo` HybridObject
 * directly as a prop and shows its bitmap. The pixels do not go through JavaScript.
 */
@Keep
@DoNotStrip
class HybridPhotoView(context: ThemedReactContext) : HybridPhotoViewSpec() {
  private val imageView = ImageView(context).apply {
    scaleType = ImageView.ScaleType.CENTER_CROP
    // The JS wrapper gives the accessible name, so this view is not a separate element.
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  override val view: View = imageView

  override var photo: HybridPhotoSpec? = null
    set(value) {
      field = value
      val bitmap = (value as? HybridPhoto)?.bitmap
      UiThreadUtil.runOnUiThread { imageView.setImageBitmap(bitmap) }
    }
}
