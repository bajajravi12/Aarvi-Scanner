[app]
title = RV Turbo Scanner
package.name = rvturboscanner
package.domain = org.rvtech.scanner
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,ttf,json

version = 8.5

requirements = python3,kivy==2.3.0,urllib3,openssl

orientation = portrait

fullscreen = 0

# Android specific permissions
android.permissions = INTERNET,ACCESS_NETWORK_STATE

# Target API specification
android.api = 33
android.minapi = 21
android.ndk = 25b
android.ndk_api = 21

# Architecture targeting modern 64-bit devices
android.archs = arm64-v8a

# Build options
android.allow_backup = True
android.wakelock = False
android.entrypoint = org.kivy.android.PythonActivity

[buildozer]
log_level = 2
warn_on_root = 1
