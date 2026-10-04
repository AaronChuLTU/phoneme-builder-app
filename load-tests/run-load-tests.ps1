<#
  run-load-tests.ps1

  Runs the JMeter plan at each load level, one after another, and writes:
    load-tests/results/x<N>/results.jtl   every request, raw
    load-tests/results/x<N>/report/       JMeter's HTML dashboard for that level
    load-tests/results/summary.csv        one row per level, for comparison

  Run against the Docker container (a production build), not `npm run dev`:
  dev mode compiles pages on demand and would measure the compiler, not the app.

  Usage (from the project root):
    powershell -ExecutionPolicy Bypass -File load-tests\run-load-tests.ps1 -JmeterBin C:\apache-jmeter-5.6.3\bin\jmeter.bat
    ... -Levels 1,10,100,1000,10000      include the x10000 level
#>

param(
  [string]$JmeterBin = "jmeter",
  [string]$TargetHost = "localhost",
  [int]$Port = 3000,
  # A string, split below. Declared as [int[]], "-Levels 1,10,100" arrives
  # through `powershell -File` as one string, and PowerShell then reads the
  # commas as thousands separators — 1,10,100,1000 became 1101001000 users.
  [string]$Levels = "1,10,100,1000"
)

$ErrorActionPreference = "Stop"

$levelList = @($Levels -split "[,\s]+" | Where-Object { $_ } | ForEach-Object { [int]$_ })
foreach ($l in $levelList) {
  if ($l -lt 1 -or $l -gt 20000) {
    Write-Host "Load level $l is out of range (1-20000)." -ForegroundColor Red
    exit 1
  }
}
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$plan = Join-Path $root "phoneme-workflow.jmx"
$resultsRoot = Join-Path $root "results"
New-Item -ItemType Directory -Force -Path $resultsRoot | Out-Null

# Users ramp up gradually rather than all at once, and heavier levels loop
# fewer times so each run finishes in a few minutes.
$profiles = @{
  1     = @{ rampup = 1;   loops = 10 }
  10    = @{ rampup = 5;   loops = 10 }
  100   = @{ rampup = 10;  loops = 5 }
  1000  = @{ rampup = 30;  loops = 2 }
  10000 = @{ rampup = 120; loops = 1 }
}

# Fail fast if the app is not up, rather than recording a run of 100% errors.
try {
  $health = Invoke-RestMethod "http://${TargetHost}:${Port}/health" -TimeoutSec 5
  Write-Host "Target healthy: database $($health.database)" -ForegroundColor Green
} catch {
  Write-Host "Nothing healthy at http://${TargetHost}:${Port}/health - start the app first." -ForegroundColor Red
  exit 1
}

$summary = @()

foreach ($users in $levelList) {
  $p = $profiles[$users]
  if (-not $p) { $p = @{ rampup = [math]::Max(1, [int]($users / 50)); loops = 1 } }

  $dir = Join-Path $resultsRoot "x$users"
  if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $jtl = Join-Path $dir "results.jtl"
  $report = Join-Path $dir "report"

  # Large thread counts need more heap than JMeter's 1 GB default.
  if ($users -ge 1000) { $env:HEAP = "-Xms1g -Xmx4g -XX:MaxMetaspaceSize=256m" }
  else { Remove-Item Env:\HEAP -ErrorAction SilentlyContinue }

  Write-Host ""
  Write-Host "=== x$users  ($users users, ramp-up $($p.rampup)s, $($p.loops) loops) ===" -ForegroundColor Cyan

  & $JmeterBin -n -t $plan `
    "-Jusers=$users" "-Jrampup=$($p.rampup)" "-Jloops=$($p.loops)" `
    "-Jhost=$TargetHost" "-Jport=$Port" `
    -l $jtl -e -o $report | Out-Host

  if (-not (Test-Path $jtl)) {
    Write-Host "No results written for x$users - JMeter did not complete." -ForegroundColor Red
    continue
  }

  $rows = Import-Csv $jtl
  $n = $rows.Count
  if ($n -eq 0) { continue }

  $elapsed = $rows | ForEach-Object { [int]$_.elapsed } | Sort-Object
  $errors = ($rows | Where-Object { $_.success -ne "true" }).Count
  $start = ($rows | ForEach-Object { [long]$_.timeStamp } | Measure-Object -Minimum).Minimum
  $end = ($rows | ForEach-Object { [long]$_.timeStamp + [int]$_.elapsed } | Measure-Object -Maximum).Maximum
  $seconds = [math]::Max(0.001, ($end - $start) / 1000)

  # Generation is the one step that writes to the database, so it is the
  # one most likely to slow down as SQLite serialises concurrent writes.
  $gen = $rows | Where-Object { $_.label -like "0[56]*" } | ForEach-Object { [int]$_.elapsed }
  $genAvg = if ($gen) { [math]::Round(($gen | Measure-Object -Average).Average, 0) } else { 0 }

  $summary += [pscustomobject]@{
    Level          = "x$users"
    Users          = $users
    Requests       = $n
    "Avg ms"       = [math]::Round(($elapsed | Measure-Object -Average).Average, 0)
    "Median ms"    = $elapsed[[math]::Floor(0.50 * ($n - 1))]
    "P95 ms"       = $elapsed[[math]::Floor(0.95 * ($n - 1))]
    "Max ms"       = $elapsed[$n - 1]
    "Generate avg" = $genAvg
    "Error %"      = [math]::Round(100 * $errors / $n, 2)
    "Req/s"        = [math]::Round($n / $seconds, 1)
  }
}

$summaryFile = Join-Path $resultsRoot "summary.csv"
$summary | Export-Csv -NoTypeInformation -Path $summaryFile
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$summary | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
Write-Host "Saved to $summaryFile"
Write-Host "Per-level HTML reports: load-tests\results\x<N>\report\index.html"
