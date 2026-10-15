require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "LedgerCamera"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/example/ledger"
  s.license      = "UNLICENSED"
  s.authors      = "Ledger"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/example/ledger.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
  ]

  s.frameworks = ["AVFoundation", "UIKit"]

  load 'nitrogen/generated/ios/LedgerCamera+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
