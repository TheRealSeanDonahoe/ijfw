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
  if (-not (Resolve-GitBash)) { $issues += "Git Bash not found -- install Git for Windows (bundles bash.exe), then retry." }
  return $issues
}

# Locate Git Bash explicitly. On Windows the plain `bash` command often
# resolves to WSL's bash, which fails with 'No such file or directory' when
# no Linux distro is installed. Git for Windows ships bash.exe alongside
# git.exe under <git-root>\bin\ (or \usr\bin\), so derive it from git's path.
function Resolve-GitBash {
  $gitCmd = Get-Command git -ErrorAction SilentlyContinue
  if ($gitCmd) {
    $gitDir = Split-Path -Parent $gitCmd.Source
    $candidates = @(
      (Join-Path $gitDir 'bash.exe'),
      (Join-Path (Split-Path -Parent $gitDir) 'bin\bash.exe'),
      (Join-Path (Split-Path -Parent $gitDir) 'usr\bin\bash.exe')
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  }
  foreach ($c in @(
    'C:\Program Files\Git\bin\bash.exe',
    'C:\Program Files\Git\usr\bin\bash.exe',
    'C:\Program Files (x86)\Git\bin\bash.exe'
  )) { if (Test-Path $c) { return $c } }
  return $null
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
  $gitBash = Resolve-GitBash
  if (-not $gitBash) { throw "Git Bash not found -- install Git for Windows and retry." }
  Push-Location $target
  try {
    $env:IJFW_NONINTERACTIVE = if ($env:CI -or $Yes) { "1" } else { "" }
    # Let the PS wrapper own the final closer so Merge-Marketplace output
    # lands above it. Bash skips its "Full log" line when this is set.
    $env:IJFW_SKIP_CLOSER = "1"
    & $gitBash "./scripts/install.sh"
    if ($LASTEXITCODE -ne 0) { throw "scripts/install.sh exited $LASTEXITCODE." }
  } finally {
    Pop-Location
    Remove-Item Env:\IJFW_SKIP_CLOSER -ErrorAction SilentlyContinue
  }
}

function Merge-Marketplace {
  $settingsPath = Join-Path $env:USERPROFILE ".claude\settings.json"
  $settingsDir = Split-Path -Parent $settingsPath
  if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null }

  $settings = @{}
  if (Test-Path $settingsPath) {
    $raw = Get-Content -Raw -LiteralPath $settingsPath
    # Strip UTF-8 BOM if present -- ConvertFrom-Json rejects it on PS 5.1.
    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
    # Strip JSONC comments + trailing commas before parse.
    $cleaned = $raw -replace '/\*[\s\S]*?\*/',''
    $cleaned = $cleaned -replace '(^|[^:])//[^\n]*','$1'
    $cleaned = $cleaned -replace ',(\s*[}\]])','$1'
    try {
      $parsed = ConvertFrom-Json $cleaned -AsHashtable -ErrorAction Stop
      if ($parsed -is [hashtable]) { $settings = $parsed }
    } catch {
      # Graceful fallback: back up the unparseable file, surface the manual
      # next step, return without throwing so the rest of the install stands.
      $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
      $backup = "$settingsPath.bak.marketplace.$ts"
      Copy-Item -LiteralPath $settingsPath -Destination $backup -Force
      Write-Host "  ==> HEADS UP" -ForegroundColor Yellow -NoNewline
      Write-Host "  your Claude settings.json is not valid JSON/JSONC" -ForegroundColor DarkGray
      Write-Host "      Backed up to $backup" -ForegroundColor DarkGray
      Write-Host "      The two /plugin commands above still complete the install." -ForegroundColor DarkGray
      Write-Host ""
      return $false
    }
  }
  if (-not $settings.ContainsKey('extraKnownMarketplaces')) { $settings['extraKnownMarketplaces'] = @{} }
  $settings.extraKnownMarketplaces['ijfw'] = @{ source = @{ source = 'github'; repo = 'TradeCanyon/ijfw' } }
  if (-not $settings.ContainsKey('enabledPlugins')) { $settings['enabledPlugins'] = @{} }
  $settings.enabledPlugins['ijfw-core@ijfw'] = $true

  $tmp = "$settingsPath.tmp"
  $settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tmp -Encoding UTF8
  Move-Item -Force -LiteralPath $tmp -Destination $settingsPath
  return $true
}

# --- main ---
$issues = Invoke-Preflight
if ($issues.Count -gt 0) {
  Write-Host "Preflight:" -ForegroundColor Yellow
  foreach ($i in $issues) { Write-Host "  - $i" }
  exit 1
}

$target = Get-Target

# scripts/install.sh owns the summary (Live now / Standing by / next step).
# Keep clone/pull output suppressed so the final banner reads clean.
$action = Invoke-CloneOrPull $target $Branch | Out-Null

Invoke-InstallScript $target

if (-not $NoMarketplace) {
  # Best-effort: returns $true on success, prints its own message on fallback.
  [void](Merge-Marketplace)
}

$log = Join-Path $env:USERPROFILE ".ijfw\install.log"
Write-Host "  Full log   $log" -ForegroundColor DarkGray
Write-Host ""
