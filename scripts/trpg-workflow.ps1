param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("inspect", "read", "decompose")]
  [string]$Command,

  [Parameter(Mandatory = $true, Position = 1)]
  [string]$InputPath,

  [ValidateSet("md", "json")]
  [string]$Format = "md"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot "trpg-docflow.py"
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"

$python = if (Test-Path -LiteralPath $venvPython) { $venvPython } else { "python" }

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

& $python -X utf8 $scriptPath $Command $InputPath --format $Format
