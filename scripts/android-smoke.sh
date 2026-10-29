#!/usr/bin/env bash
set -euo pipefail
ADB="$ANDROID_HOME/platform-tools/adb"
PKG="io.github.caprifan2078.examtrainer.training094"
APK="app/build/outputs/apk/debug/app-debug.apk"
"$ADB" install -r "$APK"
"$ADB" logcat -c
ACTIVITY="io.github.caprifan2078.examtrainer.MainActivity"
"$ADB" shell am start -W -n "$PKG/$ACTIVITY"
sleep 10
PID=$("$ADB" shell pidof "$PKG" | tr -d "\r" || true)
if [ -z "$PID" ]; then
  echo "FAIL: app exited on startup"
  "$ADB" logcat -d -t 400 >&2
  exit 1
fi
if "$ADB" logcat -d | grep -E "FATAL EXCEPTION|JS file:///android_asset/.* (Uncaught|SyntaxError|ReferenceError)" ; then
  echo "FAIL: Android or JavaScript error"
  exit 1
fi
"$ADB" exec-out screencap -p > emulator-home.png
echo "PASS: app remains running; screenshot saved"
