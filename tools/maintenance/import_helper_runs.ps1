# Importiere die vier unveränderten natürlichen OpenRouter-Runner-Archive nach GitHub.
# Benötigt nur Git (mit Pushberechtigung für origin) und die ZIPs auf dem eigenen Windows-PC.
# Verändert keine Engine, keine ST-Installation und keine persönlichen Chat-Saves.
[CmdletBinding()]
param([string]$SourceDir = (Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$relativeArchive = 'testrun_10b/openrouter-helper-laufserie-20261124/originals'
$entries = @(
  @{ Name='20261124-183634Z-natural_helper_progression.zip'; Sha='fcee87911c3ab58d79d0867d18a53cc590f4f5ddadad7cccbfeb55f40e3ceaa6'; Bytes=1136760 },
  @{ Name='20261124-202907Z-natural_helper_progression.zip'; Sha='25fd2ad75031ef1132b0f6eed46e0b96e1595ad9da75b225d9d1453250e32f17'; Bytes=2540462 },
  @{ Name='20261124-205854Z-natural_helper_progression.zip'; Sha='abad6d3d266e6d01e3a68942fa69b99b2ebd98db4f6c755953568aaee5bb0ad0'; Bytes=11504414 },
  @{ Name='20261124-214323Z-natural_helper_progression.zip'; Sha='bf35564f47b76b9ca8847fbc00f01038d0c69f7293e5213fb7a08edab877f7f0'; Bytes=5061958 }
)

function RunGit([string[]]$Arguments) {
  $output = & git @Args
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed ($LASTEXITCODE)" }
  return $output
}
if (!(Test-Path -LiteralPath $SourceDir -PathType Container)) {
  throw "SourceDir does not exist: $SourceDir. Put your unmodified ZIP files together and pass -SourceDir."
}
Push-Location $repo
try {
  $branch = ((RunGit @('branch','--show-current')) | Select-Object -First 1).Trim()
  if ($branch -ne 'main') { throw "Switch to main first (current: $branch); never commit test archives to the running code branch." }
  $remote = ((RunGit @('remote','get-url','origin')) | Select-Object -First 1).Trim()
  if ($remote -notmatch '(?i)(?:github\.com[:/])Mango1331/Claude-AI-RPG-Game(?:\.git)?$') {
    throw "Unexpected git origin: $remote"
  }
  $staged = @(RunGit @('diff','--cached','--name-only'))
  if ($staged.Count) { throw 'Staged changes already exist; commit or unstage them first.' }
  RunGit @('pull','--ff-only','origin','main') | Out-Null
  $toCopy = @()
  $destFolder = Join-Path $repo $relativeArchive
  foreach ($item in $entries) {
    $source = Join-Path $SourceDir $item.Name
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing original ZIP: $source" }
    if ((Get-Item -LiteralPath $source).Length -ne $item.Bytes) { throw "Wrong byte length: $source" }
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.ToLowerInvariant()
    if ($sha -ne $item.Sha) { throw "SHA-256 mismatch for $source. Do not upload a changed archive." }
    $dest = Join-Path $destFolder $item.Name
    if (Test-Path -LiteralPath $dest -PathType Leaf) {
      $existing = (Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash.ToLowerInvariant()
      if ($existing -ne $item.Sha) { throw "Different archive already exists: $dest" }
      Write-Host "Already identical: $($item.Name)"
    } else {
      $toCopy += @{ Source = $source; Dest = $dest; Name = $item.Name; Sha = $item.Sha }
    }
  }
  if (-not $toCopy.Count) { Write-Host 'All four original ZIPs already exist with correct hashes. Nothing to commit.'; return }
  New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
  foreach ($entry in $toCopy) {
    Copy-Item -LiteralPath $entry.Source -Destination $entry.Dest -ErrorAction Stop
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $entry.Dest).Hash.ToLowerInvariant() -ne $entry.Sha) {
      throw "Archive changed during copy: $($entry.Name)"
    }
    RunGit @('add','--',"$relativeArchive/$($entry.Name)") | Out-Null
    Write-Host "Verified and staged: $($entry.Name)"
  }
  $stagedPaths = @(RunGit @('diff','--cached','--name-only'))
  if ($stagedPaths | Where-Object { $_ -notlike "$relativeArchive/*" }) {
    throw 'Unexpected files staged. No commit made.'
  }
  RunGit @('commit','-m','Archive original natural helper OpenRouter runs with verified SHA-256') | Out-Null
  RunGit @('push','origin','main') | Out-Null
  Write-Host 'GitHub upload complete: 4 (or previously present) original ZIPs under' $relativeArchive
} finally {
  Pop-Location
}
