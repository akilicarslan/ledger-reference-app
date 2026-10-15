import Foundation
import NitroModules
import UIKit

/// Native view for `<PhotoView photo={photo} />`.
/// It gets the `Photo` HybridObject directly as a prop (no serialization) and
/// shows its pixels from the shared memory.
final class HybridPhotoView: HybridPhotoViewSpec {
  private let imageView: UIImageView = {
    let view = UIImageView()
    view.contentMode = .scaleAspectFill
    view.clipsToBounds = true
    view.backgroundColor = .secondarySystemBackground
    // The JS wrapper gives the accessible name, so this view is not a separate element.
    view.isAccessibilityElement = false
    return view
  }()

  var view: UIView { imageView }

  var photo: (any HybridPhotoSpec)? {
    didSet {
      let image = (photo as? HybridPhoto)?.uiImage
      if Thread.isMainThread {
        imageView.image = image
      } else {
        DispatchQueue.main.async { [imageView] in imageView.image = image }
      }
    }
  }
}
