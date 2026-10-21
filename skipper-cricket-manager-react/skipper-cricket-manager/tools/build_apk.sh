#!/bin/bash
# Build the React app with Vite (dist/), then package, align and sign the APK from dist/ + android/.
# Usage: bash tools/build_apk.sh <versionName> <versionCode>   (versionCode must go up with every build)
# Needs (Debian/Ubuntu): aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
#                        android-framework-res openjdk-17-jdk-headless python3-cryptography
# Also needs Node 18+ and npm (run `npm install` once in the repo root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; A="$ROOT/android"; B="$A/build"
VER_NAME="${1:-1.1.0}"; VER_CODE="${2:-3}"
AJ=/usr/lib/android-sdk/platforms/android-23/android.jar
FR=/usr/share/android-framework-res/framework-res.apk
for f in "$AJ" "$FR"; do [ -f "$f" ] || { echo "Missing $f - install android-sdk-platform-23 and android-framework-res"; exit 1; }; done
# signing key: recreated identically every time, so new builds install over old ones
[ -f "$A/keys/skipper.pk8" ] || python3 "$ROOT/tools/make_key.py" "$A/keys"
rm -rf "$B" "$A/assets/www"; mkdir -p "$B/obj" "$A/assets"
# the web build: one script, one stylesheet, fonts inlined, relative paths (works from file:///android_asset)
[ -d "$ROOT/node_modules" ] || (cd "$ROOT" && npm install)
(cd "$ROOT" && npm run build)
cp -r "$ROOT/dist" "$A/assets/www"
aapt package -f -M "$A/AndroidManifest.xml" -S "$A/res" -A "$A/assets" -I "$FR" \
  --min-sdk-version 21 --target-sdk-version 34 --version-code "$VER_CODE" --version-name "$VER_NAME" \
  -F "$B/app.unsigned.apk"
javac -nowarn --release 8 -cp "$AJ" -d "$B/obj" $(find "$A/src" -name '*.java') 2>&1 | grep -v "^warning\|^Note\|Picked up" || true
[ -f "$B/obj/com/jamil/skipper/MainActivity.class" ] || { echo "javac failed"; exit 1; }
dalvik-exchange --dex --min-sdk-version=21 --output="$B/classes.dex" "$B/obj"
(cd "$B" && aapt add app.unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$B/app.unsigned.apk" "$B/app.aligned.apk"
apksigner sign --key "$A/keys/skipper.pk8" --cert "$A/keys/skipper.x509.pem" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$B/skipper.apk" "$B/app.aligned.apk"
apksigner verify --verbose "$B/skipper.apk" | head -4
echo "Built: $B/skipper.apk (version $VER_NAME, code $VER_CODE)"
