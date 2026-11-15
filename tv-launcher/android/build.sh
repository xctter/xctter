#!/usr/bin/env bash
# Compila tv-launcher.apk senza Android Studio.
# Richiede (Ubuntu/Debian): apt install aapt apksigner zipalign dalvik-exchange libandroid-23-java default-jdk
set -euo pipefail
cd "$(dirname "$0")"
JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
OUT=build; rm -rf $OUT; mkdir -p $OUT/classes $OUT/assets
cp ../index.html ../style.css ../app.js ../config.js $OUT/assets/
javac -source 8 -target 8 -nowarn -bootclasspath "$JAR" -d $OUT/classes $(find src -name '*.java') 2>&1 | grep -v "bootstrap class path\|^Note:\|^warning\|^1 warning" || true
dalvik-exchange --dex --output=$OUT/classes.dex $OUT/classes
aapt package -f -M AndroidManifest.xml -S res -A $OUT/assets -I "$JAR" -F $OUT/unaligned.apk
(cd $OUT && aapt add unaligned.apk classes.dex >/dev/null)
zipalign -f 4 $OUT/unaligned.apk $OUT/aligned.apk
KS=${KEYSTORE:-debug.keystore}
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias debug \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=TV Launcher Debug" 2>/dev/null
apksigner sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out ../tv-launcher.apk $OUT/aligned.apk
rm -f ../tv-launcher.apk.idsig
apksigner verify ../tv-launcher.apk && echo "OK: $(cd .. && pwd)/tv-launcher.apk"
