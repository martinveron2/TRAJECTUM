$ErrorActionPreference = "Stop"

$Root = if ($env:TRAJECTUM_HOME) { $env:TRAJECTUM_HOME } else { Join-Path $HOME "TRAJECTUM" }
$Repo = "https://github.com/martinveron2/TRAJECTUM.git"
$ApiPort = if ($env:TRAJECTUM_API_PORT) { $env:TRAJECTUM_API_PORT } else { "8000" }
$WebPort = if ($env:TRAJECTUM_WEB_PORT) { $env:TRAJECTUM_WEB_PORT } else { "5173" }

function Say($msg) { Write-Host ""; Write-Host "[TRAJECTUM] $msg" }

$SkipUpdate = $env:TRAJECTUM_SKIP_UPDATE -eq "1"
if (!$SkipUpdate) {
    if (Test-Path (Join-Path $Root ".git")) {
        Say "Updating canonical repository"
        git -C $Root fetch origin
        git -C $Root checkout main
        git -C $Root pull --ff-only origin main
    } else {
        Say "Cloning canonical repository"
        if (Test-Path $Root) { Remove-Item $Root -Recurse -Force }
        git clone $Repo $Root
    }
}

$VenvDir = Join-Path $Root ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$FreshVenv = $false

Say "Preparing Python"
$NeedFreshVenv = !(Test-Path $VenvPython)
if (!$NeedFreshVenv) {
    & $VenvPython -c "import sys" 2>$null
    if ($LASTEXITCODE -ne 0) { $NeedFreshVenv = $true }
}
if ($NeedFreshVenv) {
    if (Test-Path $VenvDir) {
        Say "Rebuilding stale virtual environment"
        Remove-Item $VenvDir -Recurse -Force
    }
    python -m venv $VenvDir
    $FreshVenv = $true
}

# Editable installs only need to be repeated when package manifests change.
# Source-code updates are visible immediately through the editable links.
$ManifestFiles = Get-ChildItem -Path (Join-Path $Root "backend") -Filter "pyproject.toml" -Recurse |
    Sort-Object FullName
$ManifestFingerprint = ($ManifestFiles | ForEach-Object {
    (Get-FileHash $_.FullName -Algorithm SHA256).Hash
}) -join "|"
$DepsStamp = Join-Path $VenvDir ".trajectum-python-deps"
$InstalledFingerprint = if (Test-Path $DepsStamp) { Get-Content $DepsStamp -Raw } else { "" }

if ($FreshVenv -or $InstalledFingerprint -ne $ManifestFingerprint) {
    Say "Python dependencies changed - installing once"
    & $VenvPython -m pip install --disable-pip-version-check -q --upgrade pip
    foreach ($module in @("core","physics","cad","validation","api","reporting")) {
        Write-Host "  -> $module"
        & $VenvPython -m pip install --disable-pip-version-check -q -e "$Root\backend\$module[dev]"
        if ($LASTEXITCODE -ne 0) { throw "Python install failed for module: $module" }
    }
    Set-Content -Path $DepsStamp -Value $ManifestFingerprint -NoNewline
    Write-Host "  Python dependencies ready."
} else {
    Write-Host "  Python dependencies unchanged - using cached environment."
}

Say "Preparing frontend"
Push-Location "$Root\frontend\web"
$PackageHash = (Get-FileHash (Join-Path $Root "frontend\web\package.json") -Algorithm SHA256).Hash
$LockPath = Join-Path $Root "frontend\web\package-lock.json"
if (Test-Path $LockPath) {
    $PackageHash += "|" + (Get-FileHash $LockPath -Algorithm SHA256).Hash
}
$NodeStamp = Join-Path $Root "frontend\web\node_modules\.trajectum-node-deps"
$NodeFingerprint = if (Test-Path $NodeStamp) { Get-Content $NodeStamp -Raw } else { "" }
if (!(Test-Path (Join-Path $Root "frontend\web\node_modules")) -or $NodeFingerprint -ne $PackageHash) {
    Write-Host "  -> npm dependencies"
    npm install --silent
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    Set-Content -Path $NodeStamp -Value $PackageHash -NoNewline
} else {
    Write-Host "  Frontend dependencies unchanged - using cache."
}
Pop-Location

Say "Starting API"
New-Item -ItemType Directory -Force -Path "$Root\runtime\logs" | Out-Null
Start-Process -FilePath $VenvPython -ArgumentList "-m","uvicorn","trajectum_api.main:app","--host","127.0.0.1","--port",$ApiPort -WorkingDirectory $Root -RedirectStandardOutput "$Root\runtime\logs\api.log" -RedirectStandardError "$Root\runtime\logs\api.err.log" -WindowStyle Hidden

Say "Starting WEB"
Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev","--","--host","127.0.0.1","--port",$WebPort -WorkingDirectory "$Root\frontend\web" -RedirectStandardOutput "$Root\runtime\logs\web.log" -RedirectStandardError "$Root\runtime\logs\web.err.log" -WindowStyle Hidden

Start-Sleep -Seconds 2
Say "Running UTN CDR case"
& $VenvPython -m trajectum_physics.cli "$Root\data\reference-cases\utn-frh-g07\vehicle.cdr.json"
$cdrCode = $LASTEXITCODE

Say "READY"
Write-Host "WEB: http://127.0.0.1:$WebPort"
Write-Host "API: http://127.0.0.1:$ApiPort"
Write-Host "API docs: http://127.0.0.1:$ApiPort/docs"
Write-Host "Logs: $Root\runtime\logs"
if ($cdrCode -eq 2) { Write-Host "CDR engine healthy; unresolved engineering inputs still block final numbers." }
