param(
  [string]$SourceRoot = "D:\workplace\TRPGLuciusHelper\.claude\skills",
  [string]$CodexSkillsRoot = "$env:USERPROFILE\.codex\skills"
)

$ErrorActionPreference = "Stop"

$skills = @(
  "trpg-document-reader",
  "pdf-decomposer",
  "resource-channel-curator",
  "trpg-rules-analyst",
  "module-clue-analyst",
  "plot-foreshadowing-architect",
  "manage-subrepositories",
  "check-server-logs",
  "convert-md-wiki"
)

foreach ($skill in $skills) {
  $src = Join-Path $SourceRoot ($skill + ".md")
  if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing source skill file: $src"
  }

  $dstDir = Join-Path $CodexSkillsRoot $skill
  $dst = Join-Path $dstDir "SKILL.md"
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "Synced $skill -> $dst"
}
