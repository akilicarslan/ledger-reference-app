package com.margelo.nitro.ledgercamera

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.ledgercamera.views.HybridPhotoViewManager

/**
 * React Native autolinking finds this package. It loads the native (C++) part
 * of the module and registers the PhotoView view manager.
 * The HybridObjects need no NativeModule: Nitro registers them in C++.
 */
class LedgerCameraPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { emptyMap() }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(HybridPhotoViewManager())

  companion object {
    init {
      LedgerCameraOnLoad.initializeNative()
    }
  }
}
