# Creates (once) and starts the "Sportzicon_Pixel" Android emulator.
#   powershell -ExecutionPolicy Bypass -File scripts\android-emulator.ps1
# Requires the Android SDK in %LOCALAPPDATA%\Android\Sdk and JDK 17 in %LOCALAPPDATA%\Programs (see README).
$ErrorActionPreference = 'Stop'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$jdk = Get-ChildItem "$env:LOCALAPPDATA\Programs" -Directory -Filter 'jdk-17*' | Sort-Object Name -Descending | Select-Object -First 1
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdk
$env:Path = "$sdk\platform-tools;$sdk\emulator;$($jdk.FullName)\bin;$env:Path"

$name = 'Sportzicon_Pixel'
$image = 'system-images;android-35;google_apis;x86_64'
$existing = & "$sdk\emulator\emulator.exe" -list-avds
if ($existing -notcontains $name) {
  Write-Output "Creating emulator $name..."
  'no' | & "$sdk\cmdline-tools\latest\bin\avdmanager.bat" create avd --name $name --package $image --device 'pixel_7' --force
  # Phone-like defaults: hardware keyboard on, 4 GB RAM, GPU acceleration.
  $cfg = "$env:USERPROFILE\.android\avd\$name.avd\config.ini"
  Add-Content $cfg "hw.keyboard=yes`nhw.ramSize=4096`nhw.gpu.enabled=yes`nhw.gpu.mode=auto"
}

Write-Output "Starting $name..."
Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList "-avd $name -no-snapshot-save -no-boot-anim -netdelay none -netspeed full"
& "$sdk\platform-tools\adb.exe" wait-for-device
do { Start-Sleep -Seconds 2; $boot = (& "$sdk\platform-tools\adb.exe" shell getprop sys.boot_completed 2>$null) } until ($boot -match '1')
Write-Output 'EMULATOR-READY'
