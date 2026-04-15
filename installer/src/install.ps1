# IJFW Windows-native installer (F4).
# PowerShell 5.1+ / PowerShell Core on Windows. No WSL required.
#
# Mirrors installer/src/install.js flow:
#   preflight -> resolve target -> clone/pull -> run scripts/install.sh via Git Bash
#   -> merge marketplace into %USERPROFILE%\.claude\settings.json -> summary.
#
# Usage:
#   Invoke-Expression (iwr https://raw.githubusercontent.com/TradeCanyon/ijfw/main/installer/src/install.ps1).Content
#   or:
#   .\install.ps1 -Dir C:\Users\me\.ijfw -Branch main

[CmdletBinding()]
param(
  [string]$Dir = "",
  [string]$Branch = "main",
  [switch]$NoMarketplace,
  [switch]$Yes,
  [switch]$Purge
)

$ErrorActionPreference = "Stop"
$DEFAULT_REPO = "https://github.com/TradeCanyon/ijfw.git"

function Write-Ok($msg) { Write-Host "  [ok] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  ... $msg" -ForegroundColor Gray }

function Test-Command($cmd) {
  try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Get-Target {
  if ($Dir) {
    $resolved = Resolve-Path -LiteralPath $Dir -ErrorAction SilentlyContinue
    if ($resolved) { return $resolved.Path } else { return $Dir }
  }
  if ($env:IJFW_HOME) { return $env:IJFW_HOME }
  return Join-Path $env:USERPROFILE ".ijfw"
}

function Invoke-Preflight {
  $issues = @()
  $node = if (Test-Command node) { (node --version) } else { $null }
  if (-not $node -or ([int]($node -replace 'v(\d+)\..*','$1') -lt 18)) {
    $issues += "Node $node detected; IJFW wants Node >=18."
  }
  if (-not (Test-Command git))  { $issues += "git not on PATH -- install Git for Windows, then retry." }
  if (-not (Test-Command bash)) { $issues += "bash not on PATH -- install Git for Windows (includes Git Bash), then retry." }
  return $issues
}

function Invoke-CloneOrPull($target, $branch) {
  if (Test-Path (Join-Path $target ".git")) {
    & git -C $target pull --ff-only origin $branch
    if ($LASTEXITCODE -ne 0) { throw "git pull failed (exit $LASTEXITCODE)." }
    return "updated"
  }
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  & git clone --depth 1 --branch $branch $DEFAULT_REPO $target
  if ($LASTEXITCODE -ne 0) { throw "git clone failed (exit $LASTEXITCODE)." }
  return "cloned"
}

function Invoke-InstallScript($target) {
  $script = Join-Path $target "scripts\install.sh"
  if (-not (Test-Path $script)) { throw "scripts/install.sh missing at $script." }
  Push-Location $target
  try {
    $env:IJFW_NONINTERACTIVE = if ($env:CI -or $Yes) { "1" } else { "" }
    & bash "./scripts/install.sh"
    if ($LASTEXITCODE -ne 0) { throw "scripts/install.sh exited $LASTEXITCODE." }
  } finally {
    Pop-Location
  }
}

function Merge-Marketplace {
  $settingsPath = Join-Path $env:USERPROFILE ".claude\settings.json"
  $settingsDir = Split-Path -Parent $settingsPath
  if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null }

  $settings = @{}
  if (Test-Path $settingsPath) {
    try {
      $raw = Get-Content -Raw -LiteralPath $settingsPath
      # Strip JSONC comments + trailing commas before parse (mirrors tolerantJsonParse).
      $cleaned = $raw -replace '/\*[\s\S]*?\*/',''
      $cleaned = $cleaned -replace '(^|[^:])//[^\n]*','$1'
      $cleaned = $cleaned -replace ',(\s*[}\]])','$1'
      $settings = ConvertFrom-Json $cleaned -AsHashtable
    } catch {
      throw "settings.json at $settingsPath is not valid JSON or recoverable JSONC."
    }
  }
  if (-not $settings.ContainsKey('extraKnownMarketplaces')) { $settings['extraKnownMarketplaces'] = @{} }
  $settings.extraKnownMarketplaces['ijfw'] = @{ source = @{ source = 'github'; repo = 'TradeCanyon/ijfw' } }
  if (-not $settings.ContainsKey('enabledPlugins')) { $settings['enabledPlugins'] = @{} }
  $settings.enabledPlugins['ijfw-core@ijfw'] = $true

  $tmp = "$settingsPath.tmp"
  $settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tmp -Encoding UTF8
  Move-Item -Force -LiteralPath $tmp -Destination $settingsPath
}

# --- main ---
$issues = Invoke-Preflight
if ($issues.Count -gt 0) {
  Write-Host "Preflight:" -ForegroundColor Yellow
  foreach ($i in $issues) { Write-Host "  - $i" }
  exit 1
}

$target = Get-Target
Write-Host "IJFW -> $target"

$action = Invoke-CloneOrPull $target $Branch
Write-Ok "repo $action"

Invoke-InstallScript $target
Write-Ok "scripts/install.sh complete"

if (-not $NoMarketplace) {
  Merge-Marketplace
  Write-Ok "marketplace registered in $env:USERPROFILE\.claude\settings.json"
}

Write-Host ""
Write-Host "IJFW ready."
Write-Host "  Memory preserved at: $target\memory"
Write-Host "  /doctor inside Claude Code to verify health."
Write-Host "  Privacy: everything local. See NO_TELEMETRY.md."
