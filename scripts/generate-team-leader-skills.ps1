param(
  [string]$SourcePath = "docs/skills/team-leader-work.source.md",
  [string]$ClaudePath = ".claude/skills/team-leader-work.md",
  [string]$CodexSkillsRoot = "$env:USERPROFILE\.codex\skills",
  [switch]$SkipCodex
)

$ErrorActionPreference = "Stop"

function Get-Block {
  param(
    [string]$Text,
    [string]$Name
  )

  $pattern = "(?s)<!--\s*$Name`_START\s*-->\s*(.*?)\s*<!--\s*$Name`_END\s*-->"
  $match = [regex]::Match($Text, $pattern)
  if (-not $match.Success) {
    throw "Missing block: $Name"
  }
  return $match.Groups[1].Value.Trim()
}

function Write-Utf8File {
  param(
    [string]$Path,
    [string]$Content
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $directory).Path + [System.IO.Path]::DirectorySeparatorChar + (Split-Path -Leaf $Path), $Content, $utf8NoBom)
}

$source = Get-Content -LiteralPath $SourcePath -Raw -Encoding UTF8

$commonBody = Get-Block -Text $source -Name "COMMON_BODY"
$claudeFrontmatter = Get-Block -Text $source -Name "CLAUDE_FRONTMATTER"
$claudeAdapter = Get-Block -Text $source -Name "CLAUDE_ADAPTER"
$codexFrontmatter = Get-Block -Text $source -Name "CODEX_FRONTMATTER"
$codexAdapter = Get-Block -Text $source -Name "CODEX_ADAPTER"

$claudeOutput = @"
$claudeFrontmatter

$commonBody

$claudeAdapter
"@

Write-Utf8File -Path $ClaudePath -Content $claudeOutput
Write-Host "Generated Claude skill: $ClaudePath"

if (-not $SkipCodex) {
  $codexSkillDir = Join-Path $CodexSkillsRoot "team-leader-work"
  $codexPath = Join-Path $codexSkillDir "SKILL.md"
  $codexOutput = @"
$codexFrontmatter

$commonBody

$codexAdapter
"@

  Write-Utf8File -Path $codexPath -Content $codexOutput
  Write-Host "Generated Codex skill: $codexPath"
}
