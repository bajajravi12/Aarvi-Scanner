[app]
title = RV Turbo Scanner
package.name = rvscanner
package.domain = org.rv
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,ttf
version = 8.5

# Pinned stable Python & Kivy version to prevent compiler crash
requirements = python3,kivy,openssl,urllib3

orientation = portrait
fullscreen = 0

android.permissions = INTERNET,ACCESS_NETWORK_STATE
android.api = 33
android.minapi = 21
android.ndk = 25b
android.archs = arm64-v8a

[buildozer]
log_level = 2
warn_on_root = 1
