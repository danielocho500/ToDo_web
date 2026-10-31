$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
if (-not $env:JAVA_HOME) {
    $bundledJdk = Get-ChildItem -LiteralPath '.tools/jdk21' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($bundledJdk) { $env:JAVA_HOME = $bundledJdk.FullName }
}
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'No se pudo sincronizar Capacitor.' }
Push-Location android
try {
    & .\gradlew.bat :app:assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar Android.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Force 'releases' | Out-Null
Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination 'releases/ToDo-Priority-debug.apk'
Write-Output 'APK listo: releases/ToDo-Priority-debug.apk'
