#!/usr/bin/env bash
set -euo pipefail
mkdir -p qa-evidence
adb install qa-bin/app-debug.apk
adb logcat -c
adb shell am start -W -n io.github.caprifan2078.examtrainer.qa0915/io.github.caprifan2078.examtrainer.MainActivity
sleep 12
adb shell pidof io.github.caprifan2078.examtrainer.qa0915
adb exec-out screencap -p > qa-evidence/home.png
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb pull /sdcard/window.xml qa-evidence/home.xml >/dev/null
python3 qa_tests/delivered-ui.py
adb exec-out screencap -p > qa-evidence/work.png
if adb logcat -d | grep -E 'FATAL EXCEPTION|JS file:///android_asset/.*(Uncaught|SyntaxError|ReferenceError)'; then exit 1; fi
echo 'PASS: started, visible home, opened a task; no detected fatal errors'
