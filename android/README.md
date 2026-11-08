# RFD Hub — Android

Kotlin + WebView host for the shared frontend in `client/ui/`.

## Requirements
- Android Studio Ladybug or newer
- JDK 17
- Android SDK 35

## Sync the shared UI (single source of truth)
From the repository root:
```bash
rm -rf android/app/src/main/assets/ui
mkdir -p android/app/src/main/assets/ui
cp -R client/ui/* android/app/src/main/assets/ui/
```
Do this after any change to `client/ui/`.

## Build
Open the `android/` folder in Android Studio and run the app, or:
```bash
cd android
./gradlew assembleDebug
```
APK: `app/build/outputs/apk/debug/app-debug.apk`

## Behavior
- Loads `file:///android_asset/ui/index.html`
- Exposes `window.hub` with the same surface as Electron / pywebview
- `launchRfd` returns an honest unsupported result (Windows player cannot run on Android)
- Config stored in SharedPreferences
- No VPS credentials embedded
