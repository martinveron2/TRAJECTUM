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
}

# Always invoke tools through the venv Python. Windows entry-point .exe launchers
# embed absolute paths and break if the repository folder is moved or renamed.
& $VenvPython -m pip install -q --upgrade pip
foreach ($module in @("core","physics","cad","validation","api","reporting")) {
    & $VenvPython -m pip install -q -e "$Root\backend\$module[dev]"
}

Say "Preparing frontend"
Push-Location "$Root\frontend\web"
npm install --silent
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
