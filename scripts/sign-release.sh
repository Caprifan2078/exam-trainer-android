#!/usr/bin/env bash
# Build only from trusted QA branch. Never add keystores/passwords to git or artifacts.
set -euo pipefail
umask 077
for name in EXAMTRAINER_KEYSTORE_B64 EXAMTRAINER_STORE_PASSWORD EXAMTRAINER_KEY_ALIAS EXAMTRAINER_KEY_PASSWORD EXAMTRAINER_CERT_SHA256; do
  if [[ -z "${!name:-}" ]]; then echo "::error::Missing required owner secret: $name" >&2; exit 1; fi
done
: "${ANDROID_HOME:?Android SDK is required}"
: "${RUNNER_TEMP:?Temporary directory is required}"
build_tools="$ANDROID_HOME/build-tools/35.0.0"
unsigned="app/build/outputs/apk/release/app-release-unsigned.apk"
[[ -f "$unsigned" ]] || { echo "::error::Release APK missing" >&2; exit 1; }
key="$RUNNER_TEMP/examtrainer-owner-signing.p12"
aligned="$RUNNER_TEMP/examtrainer-release-aligned.apk"
signed="app/build/outputs/apk/release/ExamTrainer-owner-signed.apk"
trap 'rm -f "$key" "$aligned"' EXIT
printf '%s' "$EXAMTRAINER_KEYSTORE_B64" | base64 --decode > "$key"
[[ -s "$key" ]] || { echo "::error::Invalid keystore secret" >&2; exit 1; }
"$build_tools/zipalign" -f -p 4 "$unsigned" "$aligned"
"$build_tools/apksigner" sign --ks "$key" --ks-type PKCS12 \
  --ks-key-alias "$EXAMTRAINER_KEY_ALIAS" \
  --ks-pass env:EXAMTRAINER_STORE_PASSWORD \
  --key-pass env:EXAMTRAINER_KEY_PASSWORD \
  --out "$signed" "$aligned"
"$build_tools/apksigner" verify --verbose --print-certs "$signed"
actual=$("$build_tools/apksigner" verify --print-certs "$signed" | \
  sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | tr -d ':[:space:]' | tr '[:upper:]' '[:lower:]')
expected=$(printf '%s' "$EXAMTRAINER_CERT_SHA256" | tr -d ':[:space:]' | tr '[:upper:]' '[:lower:]')
if [[ -z "$actual" || "$actual" != "$expected" ]]; then
  rm -f "$signed"
  echo "::error::Wrong signing certificate; refusing to publish the APK" >&2
  exit 1
fi
echo "Verified owner-signed APK fingerprint: $actual"
