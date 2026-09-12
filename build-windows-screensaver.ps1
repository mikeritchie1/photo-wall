param(
    [string]$Runtime = "win-x64",
    [switch]$SelfContained
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "windows-screensaver\PhotoWall.Screensaver.csproj"
$publishPath = Join-Path $PSScriptRoot "dist\photo-wall-screensaver-windows\$Runtime"
$publishPathFull = [System.IO.Path]::GetFullPath($publishPath)

function Stop-PhotoWallScreensaverProcesses {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetFolder
    )

    $normalizedTarget = [System.IO.Path]::GetFullPath($TargetFolder).TrimEnd('\')

    # Find running PhotoWall screensaver processes from this project/output path.
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -in @("PhotoWall.Screensaver.exe", "PhotoWall.scr", "PhotoWall.exe")
        }

    $targetPids = @()
    foreach ($proc in $processes) {
        $exePath = $proc.ExecutablePath
        if ([string]::IsNullOrWhiteSpace($exePath)) {
            continue
        }

        $exeFull = [System.IO.Path]::GetFullPath($exePath)
        if ($exeFull.StartsWith($normalizedTarget, [System.StringComparison]::OrdinalIgnoreCase)) {
            $targetPids += [int]$proc.ProcessId
        }
    }

    if ($targetPids.Count -eq 0) {
        return
    }

    # Stop child WebView2 processes first (if any), then parent screensaver processes.
    $childWebView = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -eq "msedgewebview2.exe" -and ($targetPids -contains [int]$_.ParentProcessId)
        } |
        Select-Object -ExpandProperty ProcessId

    foreach ($pid in $childWebView) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }

    foreach ($pid in $targetPids) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 300
}

Stop-PhotoWallScreensaverProcesses -TargetFolder $publishPathFull

if (Test-Path $publishPath) {
    try {
        Remove-Item -LiteralPath $publishPath -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Error "Could not clear existing output folder: $publishPath"
        Write-Error "Close Screen Saver Settings and any running PhotoWall.scr process, then run the build again."
        throw
    }
}

$publishArgs = @(
    "publish",
    $projectPath,
    "-c", "Release",
    "-r", $Runtime,
    "-o", $publishPath
)

if ($SelfContained.IsPresent) {
    $publishArgs += @("--self-contained", "true")
}
else {
    $publishArgs += @("--self-contained", "false")
}

Write-Host "Publishing screensaver ($Runtime)..."
dotnet @publishArgs

$exePath = Join-Path $publishPath "PhotoWall.Screensaver.exe"
$scrPath = Join-Path $publishPath "PhotoWall.scr"

if (!(Test-Path $exePath)) {
    throw "Expected output was not found: $exePath"
}

Copy-Item -LiteralPath $exePath -Destination $scrPath -Force

Write-Host ""
Write-Host "Screensaver build complete:"
Write-Host "  $scrPath"
Write-Host ""
Write-Host "To install on this PC: right-click PhotoWall.scr and click Install."
