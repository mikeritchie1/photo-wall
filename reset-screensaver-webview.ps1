$ErrorActionPreference = "Stop"

$baseFolder = Join-Path $env:LOCALAPPDATA "PhotoWallScreensaver\WebView2"

if (Test-Path $baseFolder) {
    try {
        Remove-Item -LiteralPath $baseFolder -Recurse -Force -ErrorAction Stop
        Write-Host "Deleted WebView2 profile cache:"
        Write-Host "  $baseFolder"
    }
    catch {
        Write-Warning "Could not fully delete $baseFolder (likely some files are still locked)."
        Write-Warning "Close Screen Saver Settings and any running PhotoWall.scr, then run this script again."
        throw
    }
}
else {
    Write-Host "No WebView2 profile cache found at:"
    Write-Host "  $baseFolder"
}
