param(
  [switch]$CreateVenv
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $repoRoot ".venv"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"

Write-Host "TRPG workflow setup"
Write-Host "Repository: $repoRoot"

if ($CreateVenv -and -not (Test-Path -LiteralPath $pythonPath)) {
  python -m venv $venvPath
}

if (Test-Path -LiteralPath $pythonPath) {
  Write-Host "Python: $pythonPath"
} else {
  Write-Host "Python: system python will be used"
}

Write-Host "Workflow script: scripts/trpg-workflow.ps1"
Write-Host "Main engine: scripts/trpg-docflow.py"
Write-Host "Config doc: docs/skills/trpg-suite-workflow.md"
