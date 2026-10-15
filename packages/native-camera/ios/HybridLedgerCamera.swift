import AVFoundation
import Foundation
import NitroModules
import UIKit

/// Entry point of the module. JavaScript creates it with
/// `NitroModules.createHybridObject<LedgerCamera>('LedgerCamera')`.
final class HybridLedgerCamera: HybridLedgerCameraSpec {
  /// AVFoundation can answer from any thread (UIKit APIs need the main thread).
  var isCameraAvailable: Bool {
    AVCaptureDevice.default(for: .video) != nil
  }

  func takePhoto(maxDimension: Double) throws -> Promise<(any HybridPhotoSpec)?> {
    let limit = max(64, Int(maxDimension))
    let useCamera = isCameraAvailable
    return Promise.async {
      let captured: UIImage?
      let source: PhotoSource
      if useCamera {
        captured = await CameraPresenter.capture()
        source = .camera
      } else {
        // The iOS simulator has no camera. A generated receipt keeps the zero-copy path testable.
        captured = await SampleReceipt.render()
        source = .sample
      }
      guard let captured else { return nil }
      return try HybridPhoto.make(from: captured, maxDimension: limit, source: source)
    }
  }
}

/// Presents the system camera (`UIImagePickerController`) and waits for the result.
@MainActor
final class CameraPresenter: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
  private static var active: CameraPresenter?
  private var continuation: CheckedContinuation<UIImage?, Never>?

  static func capture() async -> UIImage? {
    await withCheckedContinuation { continuation in
      let presenter = CameraPresenter()
      presenter.continuation = continuation
      active = presenter
      guard let host = topViewController() else {
        presenter.finish(nil)
        return
      }
      let picker = UIImagePickerController()
      picker.sourceType = .camera
      picker.cameraCaptureMode = .photo
      picker.delegate = presenter
      host.present(picker, animated: true)
    }
  }

  func imagePickerController(
    _ picker: UIImagePickerController,
    didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
  ) {
    let image = info[.originalImage] as? UIImage
    picker.dismiss(animated: true)
    finish(image)
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true)
    finish(nil)
  }

  private func finish(_ image: UIImage?) {
    continuation?.resume(returning: image)
    continuation = nil
    Self.active = nil
  }

  private static func topViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}

/// Draws a sample receipt. Used only when the device has no camera (simulator).
@MainActor
enum SampleReceipt {
  static func render() -> UIImage {
    let size = CGSize(width: 960, height: 1280)
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { context in
      UIColor(red: 0.95, green: 0.96, blue: 0.97, alpha: 1).setFill()
      context.fill(CGRect(origin: .zero, size: size))
      let paper = CGRect(x: 120, y: 80, width: 720, height: 1120)
      UIColor.white.setFill()
      context.fill(paper)
      let title: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 56), .foregroundColor: UIColor.black]
      let body: [NSAttributedString.Key: Any] = [.font: UIFont.monospacedSystemFont(ofSize: 34, weight: .regular), .foregroundColor: UIColor.darkGray]
      ("SAMPLE RECEIPT" as NSString).draw(at: CGPoint(x: 180, y: 140), withAttributes: title)
      let lines = ["Office Supplies Ltd.", "", "Printer paper   12.40", "Toner          48.90", "Pens             2.90", "", "TOTAL          64.20 USD"]
      for (index, line) in lines.enumerated() {
        (line as NSString).draw(at: CGPoint(x: 180, y: 280 + index * 60), withAttributes: body)
      }
      ("Simulator image: no camera" as NSString).draw(at: CGPoint(x: 180, y: 1080), withAttributes: body)
    }
  }
}
