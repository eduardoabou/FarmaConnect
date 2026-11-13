param(
    [ValidateSet('Build', 'Install', 'Devices', 'Dev')]
    [string]$Action = 'Build'
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $mobileRoot 'android'

# Variaveis apenas deste processo: nao altera o Java/SDK global do Windows.
$sdkPath = $env:ANDROID_HOME
if (-not $sdkPath) { $sdkPath = $env:ANDROID_SDK_ROOT }
if (-not $sdkPath) { $sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adbPath)) {
    throw 'Android SDK nao encontrado. Configure ANDROID_HOME para sua pasta Android\Sdk.'
}

$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
# Keep Gradle's downloads and locks in the Windows user profile. Some restricted
# shells omit HOME, which otherwise makes Gradle resolve to C:\\.gradle. This
# shorter path also keeps native Android build paths below Windows' 260-char limit.
$env:GRADLE_USER_HOME = Join-Path $env:USERPROFILE '.gradle'
New-Item -ItemType Directory -Force -Path $env:GRADLE_USER_HOME | Out-Null

if ($Action -eq 'Devices') {
    & $adbPath devices -l
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar aparelhos via ADB.' }
    exit 0
}

if ($Action -in @('Install', 'Dev')) {
    $deviceState = & $adbPath -d get-state 2>&1
    if ($LASTEXITCODE -ne 0 -or ($deviceState -join '').Trim() -ne 'device') {
        throw 'Conecte um unico celular por USB, ative Depuracao USB e aceite a autorizacao na tela. Use npm run android:devices.'
    }
}

if ($Action -in @('Build', 'Dev')) {
    if ($Action -in @('Build', 'Dev')) {
        $supabaseEnvPath = Join-Path $mobileRoot '.env'
        if (-not (Test-Path -LiteralPath $supabaseEnvPath)) {
            throw 'Crie mobile\.env a partir de mobile\.env.example antes de compilar o aplicativo.'
        }
        $supabaseValues = @{}
        foreach ($line in Get-Content -LiteralPath $supabaseEnvPath) {
            if ($line -match '^([A-Z0-9_]+)=(.+)$') {
                $supabaseValues[$matches[1]] = $matches[2].Trim()
            }
        }
        if (-not $supabaseValues['SUPABASE_URL'] -or -not $supabaseValues['SUPABASE_PUBLISHABLE_KEY']) {
            throw 'mobile\.env precisa conter SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.'
        }
        $env:SUPABASE_URL = $supabaseValues['SUPABASE_URL']
        $env:SUPABASE_PUBLISHABLE_KEY = $supabaseValues['SUPABASE_PUBLISHABLE_KEY']
    }
    $localJdks = Join-Path $env:LOCALAPPDATA 'FarmaConnect\toolchains'
    $jdkCandidates = @()
    if ($env:FARMACONNECT_JAVA_HOME) { $jdkCandidates += $env:FARMACONNECT_JAVA_HOME }
    if (Test-Path -LiteralPath $localJdks) {
        $jdkCandidates += @(Get-ChildItem -LiteralPath $localJdks -Directory -Filter 'jdk-17*' |
            Sort-Object Name -Descending | Select-Object -ExpandProperty FullName)
    }
    if ($env:JAVA_HOME) { $jdkCandidates += $env:JAVA_HOME }
    $chosenJdk = $jdkCandidates | Where-Object {
        Test-Path -LiteralPath (Join-Path $_ 'bin\javac.exe')
    } | Select-Object -First 1
    if (-not $chosenJdk) {
        throw 'Instale JDK 17 e configure JAVA_HOME ou FARMACONNECT_JAVA_HOME.'
    }

    $env:JAVA_HOME = $chosenJdk
    $env:PATH = (Join-Path $chosenJdk 'bin') + ';' + $env:PATH
    Write-Output ('JDK: ' + $chosenJdk)
    Write-Output ('SDK: ' + $sdkPath)

    Push-Location $androidRoot
    try {
        if ($Action -eq 'Build') {
            & .\gradlew.bat :app:assemblePreview --no-daemon --console=plain --max-workers=2 '-PreactNativeArchitectures=arm64-v8a'
        } else {
            & $adbPath -d reverse tcp:8081 tcp:8081
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao encaminhar a porta do Metro pelo USB.' }
            & .\gradlew.bat :app:installDebug --console=plain --max-workers=2 '-PreactNativeArchitectures=arm64-v8a'
        }
        if ($LASTEXITCODE -ne 0) { throw 'A compilacao Android falhou. Consulte os erros acima.' }
    } finally {
        Pop-Location
    }
}

if ($Action -eq 'Build') {
    $apkPath = Join-Path $androidRoot 'app\build\outputs\apk\preview\app-preview.apk'
    if (-not (Test-Path -LiteralPath $apkPath)) { throw 'O APK esperado nao foi encontrado.' }
    Write-Output ('APK pronto: ' + $apkPath)
}

if ($Action -eq 'Install') {
    $apkPath = Join-Path $androidRoot 'app\build\outputs\apk\preview\app-preview.apk'
    if (-not (Test-Path -LiteralPath $apkPath)) { throw 'Gere o APK primeiro: npm run apk:build' }
    & $adbPath -d install -r $apkPath
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar o APK no celular.' }
    & $adbPath -d shell am start -n com.farmaconnect.preview/com.farmaconnect.MainActivity
    if ($LASTEXITCODE -ne 0) { throw 'APK instalado, mas nao foi possivel abrir automaticamente.' }
}

if ($Action -eq 'Dev') {
    & $adbPath -d shell am start -n com.farmaconnect/com.farmaconnect.MainActivity
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao abrir a versao de desenvolvimento.' }
}
