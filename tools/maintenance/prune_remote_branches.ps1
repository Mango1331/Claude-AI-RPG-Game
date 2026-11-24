# Safe one-time migration from many remote branches to the three permanent stage branches.
# DRY RUN by default. -Apply creates immutable archive tags, verifies them, then deletes old refs.
# -Archive200 additionally deletes the historic product branch AFTER its tag is confirmed.
# No remote branch is deleted unless its exact expected HEAD and matching archive tag are verified.
[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$Archive200
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$expected = @{
    'Testrun-v1' = '06b53578e6bd9548540704e858b03a96d5acf102'
    'chatgpt/narrator-gm-tools-2026-10-02' = '717e2f7a12c5d2d11963aa7cc50a497ca6bad751'
    'claude/c-planner-prototype-2026-10-02-gpt-c666' = '0cd14806cd0c7fe2ab0d54b8463c486ee572714b'
    'claude/pulse-package-a' = '60682c842b90e5dca287ca9bc7d5439a6818f530'
    'experiment/action-hud-200-v1' = 'b51e850bfa233b32f10ba01c563002ab26061c85'
    'experiment/architecture-prototype-201' = '80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c'
    'experiment/dynamic-gm-model' = 'd8baa91ffa595ecf6076266ceed9e04ef164778e'
    'experiment/203-board-slot-offline-b1' = '71b1a4461680b89a68ebf61181ee726e15dfd833'
    'experiment/203-board-slot-repair' = 'f18ec4a8a67d7dfbc6c5c61db62482bfc1548b01'
    'experiment/203-cycle3-trade-acceptance' = '1c581b83fbf590f05ab5bbbb78302064940ec0dd'
    'experiment/203-extractor-benchmark' = '2bad913b0dba624e569392d7b29a10241f0aad15'
    'experiment/203-extractor-compact-offline' = '1123b7e5b9d130145f95f860d466842e2cc8ea6e'
    'experiment/203-narrator-streaming-phase1' = 'af45acf499137009883a55b1c3e1004567470a9f'
    'experiment/203-natural-featherless-ab' = '6adf43b94b420111094bf906a34d56ea4ca5617f'
    'experiment/203-openrouter-trade-ab' = '3a507c08b5551756cf0654d22b8cc10fff52d2a2'
    'experiment/203-performance-cycle2' = '6d9770f9b31e78d37567719bf1c06d8a4942288c'
    'experiment/203-performance-cycle3' = '25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18'
    'experiment/203-performance-optimization-suite' = '8df38d3fe4b62eafc2b746ada81e5f2470956dea'
    'experiment/203-performance-review-candidate' = '399eb5b9f1f814f32a63bdc219f8499dfc107f0b'
    'experiment/204-b-playtest-ready' = 'b51e850bfa233b32f10ba01c563002ab26061c85'
    'experiment/204-user07-board-dungeon-camp' = '52d9c04aaf9f32ae92f03a72e9686d4b662749c6'
    'experiment/205-user08-playtest-ready' = 'a69daeeed613850919f16eb810cc2c150c8aafd0'
    'experiment/206-user08-dungeon-board' = 'cecc2c3777542e5bf9c74096c810a1c04fbed36e'
    'experiment/207-trade-hud' = '609380b308d89d14c289e9ca1c4e26ed29174789'
    'experiment/208-board-hazard-main-minor' = 'cb1eb944a041b26be9210199d780be9ff740f74d'
    'experiment/208-trust-b-bounded' = '84a97c447a2736241eebda215d29f0dd9045a2cc'
    'experiment/208-trust-c-narrator-first' = 'dc7290708b8d18dc1cb00320f6d0d4bb264164d4'
    'experiment/209-compact-action-hud' = 'a854cd6759712571f078bff52e7fe439858b8454'
    'experiment/210-world-continuity' = '82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc'
    'experiment/211-display-consent' = '8c88669b82420f7656687f5d40e13ec83cbcd732'
    'experiment/211-openrouter-helper-single-runner' = 'a1361d734e30b5831db1b164222d17b1a94b74a6'
    'experiment/211-scene-continuity' = 'c2ddc780d4c57b219f9cd7a1d134efceca7e459d'
    'experiment/211-travel-frame-contract' = 'c47e43187e77837db102c3a1e3646c5630c315f6'
    'main' = '2c88bf3032b341f18d8d84079df87da7bd875f0b'
}
$main = 'main'
$baseline = 'experiment/211-scene-continuity'
$current = 'experiment/211-openrouter-helper-single-runner'
$product = 'claude/c-planner-prototype-2026-10-02-gpt-c666'
$permanent = @($main, $baseline, $current)
$keep = if ($Archive200) { $permanent } else { $permanent + $product }

function Git([string[]]$GitArgs) {
    $out = & git @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "Git command failed (exit $LASTEXITCODE): git $($GitArgs -join ' ')" }
    return $out
}
function RemoteHeads {
    $rows = Git @('ls-remote','--heads','origin')
    $found = @{}
    foreach ($row in $rows) {
        if ($row -match '^([a-f0-9]{40})\s+refs/heads/(.+)$') {
            $found[$Matches[2]] = $Matches[1]
        }
    }
    return $found
}
function RemoteTags {
    $rows = Git @('ls-remote','--tags','origin')
    $found = @{}
    foreach ($row in $rows) {
        # Exclude peeled annotated tags; archive tags are lightweight and point directly to a commit.
        if ($row -match '^([a-f0-9]{40})\s+refs/tags/(.+)$' -and !$Matches[2].EndsWith('^{}')) {
            $found[$Matches[2]] = $Matches[1]
        }
    }
    return $found
}

$remoteUrl = (Git @('remote','get-url','origin') | Select-Object -First 1).Trim()
if ($remoteUrl -notmatch '(?i)(?:github\.com[:/])Mango1331/Claude-AI-RPG-Game(?:\.git)?$') {
    throw "Unexpected origin: $remoteUrl"
}
$heads = RemoteHeads
$unknown = @($heads.Keys | Where-Object { !$expected.ContainsKey($_) } | Sort-Object)
$missing = @($expected.Keys | Where-Object { !$heads.ContainsKey($_) } | Sort-Object)
if ($unknown.Count -or $missing.Count) {
    throw "Remote branch inventory changed. Unknown: $($unknown -join ', '); missing: $($missing -join ', '). STOP and review."
}
foreach ($name in $expected.Keys) {
    # Main is never deleted; its documentation HEAD may advance after this cleanup script is committed.
    if ($name -ne $main -and $heads[$name] -ne $expected[$name]) {
        throw "Branch $name moved from $($expected[$name]) to $($heads[$name]). STOP; do not overwrite."
    }
}
$toDelete = @($heads.Keys | Where-Object { $keep -notcontains $_ } | Sort-Object)
$tags = @{}
foreach ($name in $toDelete) { $tags["archive/heads/$name"] = $heads[$name] }
$tags['archive/product-200-frozen'] = $heads[$product]
Write-Host "Verified GitHub origin: $remoteUrl"
Write-Host "Remote branches now: $($heads.Count). Will keep $($keep.Count), remove $($toDelete.Count)."
Write-Host "Protected permanent refs: $($keep -join ', ')"
Write-Host "Product .200 commit $($heads[$product]); $($(if ($Archive200) {'archive branch as tag'} else {'KEEP branch and create permanent tag'}))."
foreach ($name in $toDelete) {
    Write-Host "  REMOVE: $name  $($heads[$name])  -> archive/heads/$name"
}
if (!$Apply) {
    Write-Host "DRY RUN ONLY. No changes were made."
    Write-Host "Run with -Apply to keep 4 remote branches including .200, or -Apply -Archive200 for exactly 3."
    return
}
$working = @(Git @('status','--porcelain'))
if ($working.Count) { throw "Uncommitted local changes detected; STOP before altering remote refs." }
# Fetch every object before creating tags, then validate every expected HEAD again.
Git @('fetch','--no-tags','origin','+refs/heads/*:refs/remotes/origin/*') | Out-Null
$afterFetch = RemoteHeads
foreach ($name in $expected.Keys) {
    if ($afterFetch[$name] -ne $heads[$name]) { throw "Branch $name moved while preparing backup; STOP." }
}
$existing = RemoteTags
foreach ($tag in ($tags.Keys | Sort-Object)) {
    $sha = $tags[$tag]
    if ($existing.ContainsKey($tag)) {
        if ($existing[$tag] -ne $sha) { throw "Archive tag $tag already points elsewhere; STOP." }
    } else {
        Git @('push','origin',"${sha}:refs/tags/$tag") | Out-Null
    }
}
$confirmedTags = RemoteTags
foreach ($tag in $tags.Keys) {
    if ($confirmedTags[$tag] -ne $tags[$tag]) { throw "Missing or incorrect remote archive tag $tag; STOP. No deletion started." }
}
Write-Host "All $($tags.Count) archive tags verified on origin. Starting leased remote deletions."
foreach ($name in $toDelete) {
    $sha = $heads[$name]
    Git @('push',"--force-with-lease=refs/heads/${name}:$sha",'origin',":refs/heads/$name") | Out-Null
    Write-Host "Deleted remote branch $name (archive/heads/$name preserves $sha)"
}
$finalHeads = RemoteHeads
foreach ($name in $keep) { if (!$finalHeads.ContainsKey($name)) { throw "Expected survivor missing: $name" } }
if ($finalHeads.Count -ne $keep.Count) { throw "Branch count is $($finalHeads.Count), expected $($keep.Count). Inspect origin." }
Write-Host "DONE: $($finalHeads.Count) remote branches remain. Product tag: archive/product-200-frozen."
Write-Host "Existing local branches are not changed. git fetch --prune origin refreshes tracking refs."
