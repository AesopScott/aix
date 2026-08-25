param(
  [string]$TaskName = "Mojo Daily LinkedIn AI Post",
  [string]$PythonExe = "python",
  [string]$RepoRoot = "C:\Users\scott\Code\aix",
  [string]$RunTime = "06:00",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $RepoRoot "scripts\daily-linkedin-ai-post.py"
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Daily LinkedIn script not found at $scriptPath"
}

$arguments = "`"$scriptPath`""
if ($DryRun) {
  $arguments += " --dry-run"
}

$action = New-ScheduledTaskAction `
  -Execute $PythonExe `
  -Argument $arguments `
  -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger `
  -Daily `
  -At ([datetime]::ParseExact($RunTime, "HH:mm", $null))

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Generates a daily Mojo AI Summits LinkedIn thought-leadership image and post package." `
  -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' to run daily at $RunTime."
