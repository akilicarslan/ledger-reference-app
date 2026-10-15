import Foundation
import NitroModules
import UIKit

/// One photo in native memory.
///
/// Memory model (the important part):
/// 1. `make(from:)` allocates one block of native memory and draws the image into it as RGBA pixels.
/// 2. `pixels` is a Nitro `ArrayBuffer` that **wraps** this block (`ArrayBuffer.wrap(dataWithoutCopy:)`).
///    JavaScript reads the same bytes through `new Uint8Array(photo.pixels)`. Nothing is copied.
/// 3. `cgImage` uses a `CGDataProvider` that points to the same block, so `HybridPhotoView` draws
///    the pixels without a copy and without a base64 round trip through JavaScript.
/// 4. The block is freed when the last owner (JS ArrayBuffer, CGImage or this object) releases it.
final class HybridPhoto: HybridPhotoSpec {
  let width: Double
  let height: Double
  let bytesPerRow: Double
  let source: PhotoSource
  let decodeMs: Double
  let pixels: ArrayBuffer

  private let data: UnsafeMutablePointer<UInt8>
  private let byteCount: Int
  private lazy var image: UIImage? = makeImage()

  private init(
    data: UnsafeMutablePointer<UInt8>, byteCount: Int, width: Int, height: Int, bytesPerRow: Int,
    source: PhotoSource, decodeMs: Double
  ) {
    self.data = data
    self.byteCount = byteCount
    self.width = Double(width)
    self.height = Double(height)
    self.bytesPerRow = Double(bytesPerRow)
    self.source = source
    self.decodeMs = decodeMs
    // Zero-copy: the ArrayBuffer owns `data` and frees it when JavaScript and native release it.
    self.pixels = ArrayBuffer.wrap(dataWithoutCopy: data, size: byteCount) {
      data.deallocate()
    }
    super.init()
  }

  /// Downscales `source` so that its longest side is `maxDimension` or less, and draws it as RGBA.
  static func make(from uiImage: UIImage, maxDimension: Int, source: PhotoSource) throws -> HybridPhoto {
    let start = CFAbsoluteTimeGetCurrent()
    guard let cgSource = uiImage.normalizedCGImage() else {
      throw RuntimeError.error(withMessage: "The photo has no bitmap data.")
    }
    let scale = min(1, Double(maxDimension) / Double(max(cgSource.width, cgSource.height)))
    let width = max(1, Int((Double(cgSource.width) * scale).rounded()))
    let height = max(1, Int((Double(cgSource.height) * scale).rounded()))
    let bytesPerRow = width * 4
    let byteCount = bytesPerRow * height
    let data = UnsafeMutablePointer<UInt8>.allocate(capacity: byteCount)

    guard
      let context = CGContext(
        data: data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)
    else {
      data.deallocate()
      throw RuntimeError.error(withMessage: "Cannot create the bitmap context.")
    }
    context.interpolationQuality = .high
    context.draw(cgSource, in: CGRect(x: 0, y: 0, width: width, height: height))

    let decodeMs = (CFAbsoluteTimeGetCurrent() - start) * 1000
    return HybridPhoto(
      data: data, byteCount: byteCount, width: width, height: height, bytesPerRow: bytesPerRow,
      source: source, decodeMs: decodeMs)
  }

  /// A `UIImage` whose `CGDataProvider` reads the shared pixel memory (no copy).
  var uiImage: UIImage? { image }

  private func makeImage() -> UIImage? {
    // The provider retains `self`, so the pixel memory stays valid while UIKit draws the image.
    let retained = Unmanaged.passRetained(self)
    guard
      let provider = CGDataProvider(
        dataInfo: retained.toOpaque(), data: data, size: byteCount,
        releaseData: { info, _, _ in
          if let info { Unmanaged<HybridPhoto>.fromOpaque(info).release() }
        })
    else {
      retained.release()
      return nil
    }
    guard
      let cgImage = CGImage(
        width: Int(width), height: Int(height), bitsPerComponent: 8, bitsPerPixel: 32,
        bytesPerRow: Int(bytesPerRow), space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo(
          rawValue: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue),
        provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
    else { return nil }
    return UIImage(cgImage: cgImage)
  }

  func toJpegDataUri(quality: Double) throws -> Promise<String> {
    let clamped = min(1, max(0.1, quality))
    return Promise.async {
      guard let jpeg = self.uiImage?.jpegData(compressionQuality: clamped) else {
        throw RuntimeError.error(withMessage: "Cannot encode the photo as JPEG.")
      }
      return "data:image/jpeg;base64," + jpeg.base64EncodedString()
    }
  }

  /// Tells the JS garbage collector how much native memory this object holds.
  /// A large value makes Hermes free unused photos sooner.
  var memorySize: Int { byteCount }
}

extension UIImage {
  /// Returns a CGImage with the EXIF orientation applied (camera photos are often rotated).
  fileprivate func normalizedCGImage() -> CGImage? {
    if imageOrientation == .up, let cgImage { return cgImage }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: size.width * scale, height: size.height * scale), format: format)
    return renderer.image { _ in
      draw(in: CGRect(origin: .zero, size: CGSize(width: size.width * scale, height: size.height * scale)))
    }.cgImage
  }
}
