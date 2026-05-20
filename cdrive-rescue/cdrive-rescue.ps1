param(
  [switch]$CleanSafe,
  [string]$ReportDir = "$env:USERPROFILE\Desktop\CDriveRescue_Report"
)

$ErrorActionPreference = "SilentlyContinue"
$now = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$out = Join-Path $ReportDir $now
New-Item -ItemType Directory -Force -Path $out | Out-Null

function SizeGB($bytes) {
  if (-not $bytes) { return 0 }
  return [math]::Round($bytes / 1GB, 2)
}

function FolderSize($path) {
  if (-not (Test-Path -LiteralPath $path)) { return 0 }
  return (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
}

$targets = @(
  @{Name="Windows Temp"; Path="$env:WINDIR\Temp"; Safe=$true; Note="Usually safe to clean old temp files."},
  @{Name="User Temp"; Path="$env:TEMP"; Safe=$true; Note="Usually safe to clean old temp files."},
  @{Name="Downloads"; Path="$env:USERPROFILE\Downloads"; Safe=$false; Note="Review manually before deleting."},
  @{Name="Desktop"; Path="$env:USERPROFILE\Desktop"; Safe=$false; Note="Move large archives/installers to D drive."},
  @{Name="Chrome Cache"; Path="$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"; Safe=$true; Note="Browser cache can usually be cleaned."},
  @{Name="Edge Cache"; Path="$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"; Safe=$true; Note="Browser cache can usually be cleaned."},
  @{Name="npm cache"; Path="$env:LOCALAPPDATA\npm-cache"; Safe=$true; Note="Developer cache; can be rebuilt."},
  @{Name="pip cache"; Path="$env:LOCALAPPDATA\pip\Cache"; Safe=$true; Note="Python package cache; can be rebuilt."},
  @{Name="Gradle cache"; Path="$env:USERPROFILE\.gradle"; Safe=$false; Note="Can be huge; move to D drive or clean with care."},
  @{Name="Docker data"; Path="$env:LOCALAPPDATA\Docker"; Safe=$false; Note="Review Docker images/volumes before deleting."}
)

$rows = foreach ($t in $targets) {
  $bytes = FolderSize $t.Path
  [PSCustomObject]@{
    Name = $t.Name
    Path = $t.Path
    SizeGB = SizeGB $bytes
    SafeToAutoClean = $t.Safe
    Recommendation = $t.Note
  }
}

$topRoot = Get-ChildItem -LiteralPath "C:\" -Force -Directory | ForEach-Object {
  $sum = FolderSize $_.FullName
  [PSCustomObject]@{ Name=$_.Name; Path=$_.FullName; SizeGB=(SizeGB $sum) }
} | Sort-Object SizeGB -Descending | Select-Object -First 20

$cleaned = @()
if ($CleanSafe) {
  foreach ($t in $targets | Where-Object { $_.Safe }) {
    if (Test-Path -LiteralPath $t.Path) {
      $before = FolderSize $t.Path
      Get-ChildItem -LiteralPath $t.Path -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-2) } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
      $after = FolderSize $t.Path
      $cleaned += [PSCustomObject]@{
        Name=$t.Name
        FreedGB=(SizeGB ($before - $after))
        Path=$t.Path
      }
    }
  }
}

$rows | Sort-Object SizeGB -Descending | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $out "scan.csv")
$topRoot | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $out "c_root_top.csv")
if ($cleaned.Count -gt 0) {
  $cleaned | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $out "cleaned.csv")
}

$htmlRows = ($rows | Sort-Object SizeGB -Descending | ForEach-Object {
  "<tr><td>$($_.Name)</td><td>$($_.SizeGB)</td><td>$($_.SafeToAutoClean)</td><td>$($_.Recommendation)</td><td><code>$($_.Path)</code></td></tr>"
}) -join "`n"
$rootRows = ($topRoot | ForEach-Object {
  "<tr><td>$($_.Name)</td><td>$($_.SizeGB)</td><td><code>$($_.Path)</code></td></tr>"
}) -join "`n"

$html = @"
<!doctype html>
<html><head><meta charset="utf-8"><title>C Drive Rescue Report</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;margin:32px;color:#111827}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#f3f4f6}code{font-size:12px}.warn{padding:12px;background:#fff7ed;border:1px solid #fdba74}</style></head>
<body>
<h1>C Drive Rescue Report</h1>
<p class="warn">This report is conservative. Review personal folders before deleting anything. Safe cleanup only removes older temp/cache files when you run with <code>-CleanSafe</code>.</p>
<h2>Common cleanup targets</h2>
<table><tr><th>Name</th><th>GB</th><th>Safe auto clean</th><th>Recommendation</th><th>Path</th></tr>$htmlRows</table>
<h2>Largest C:\ folders</h2>
<table><tr><th>Name</th><th>GB</th><th>Path</th></tr>$rootRows</table>
<h2>Next steps</h2>
<ol>
<li>Move large installers, videos, archives, and project folders from Desktop/Downloads to D drive.</li>
<li>Clean safe caches with: <code>powershell -ExecutionPolicy Bypass -File .\cdrive-rescue.ps1 -CleanSafe</code></li>
<li>For developer machines, move npm, pip, Gradle, Docker, and model caches to D drive before deleting.</li>
</ol>
</body></html>
"@

$report = Join-Path $out "report.html"
$html | Set-Content -LiteralPath $report -Encoding UTF8
Write-Host "C Drive Rescue report created:"
Write-Host $report
if ($CleanSafe) { Write-Host "Safe cleanup completed. See cleaned.csv when available." }
