# Photo Wall - GitHub Pages Test Setup

This project is configured to deploy to GitHub Pages via Actions.

## 1. Add one test photo

Place one image at:

`images/demo/test.jpg`

If you use another filename, also update `images/manifest.json`.

## 2. Push to GitHub

```bash
git add .
git commit -m "Setup GitHub Pages deploy"
git push origin main
```

## 3. Enable GitHub Pages

In your GitHub repo:

1. Open `Settings`
2. Open `Pages`
3. Under `Build and deployment`, set `Source` to `GitHub Actions`

After the workflow completes, your site will be live at:

`https://<your-username>.github.io/<repo-name>/`

## Notes

- Current test manifest is demo-only and points to `images/demo/test.jpg`.
- This keeps the first deployment lightweight before adding cloud storage.
- Add videos to the `videos/` folder and run `python build_manifest.py` to rebuild the manifests. During the build, videos accidentally stored under `images/` are moved into the matching folder under `videos/`, while photos accidentally stored under `videos/` are moved into the matching folder under `images/`. Videos or photos directly in their respective library roots are moved into that library's `Various/` folder; matching JSON sidecars move with them. Image and video folders with the same name are combined when selected in the wallpaper. Photos larger than 8 MiB are also recompressed during the build; photos already below 8 MiB are unchanged. Choose `Videos` in the on-screen controls. Supported formats are MP4, WebM, MOV, M4V, AVI, and MKV. To compress videos over 20 MB with up to four parallel workers and progress output, run `python build_manifest.py --compress-videos`. Each completed video immediately replaces its original file; it is re-encoded progressively until it is below the 20 MB hard limit, and the manifest is updated as work completes. Videos already at or below 20 MB are skipped on later runs. Install FFmpeg for compression.

### Video switching rules

When video handoff is active:

1. A video is kept active for at least 4 seconds.
2. After the minimum hold, it switches when the current video’s center reaches 75% of the screen height—the bottom 25% of the screen.
3. The replacement must be fully visible and have its center at or above 60% of the screen height—the replacement cannot be below the bottom 40%.
4. If no eligible replacement is available yet, the current video remains active until one becomes eligible or leaves the viewport.

## Windows Screensaver Build

You can package this photo wall as a Windows screensaver (`.scr`) that behaves like a normal screensaver entry in Windows settings.

### Prerequisites

1. Windows with `.NET 8 SDK` installed.
2. Microsoft Edge WebView2 Runtime (already present on most modern Windows PCs).

### Build

Run from the repo root:

```powershell
.\build-windows-screensaver.ps1
```

Output:

- `dist/photo-wall-screensaver-windows/win-x64/PhotoWall.scr`

Optional self-contained build (bigger output, fewer dependencies on target PCs):

```powershell
.\build-windows-screensaver.ps1 -SelfContained
```

If WebView2 initialization ever gets stuck on a machine, clear its local profile cache:

```powershell
.\reset-screensaver-webview.ps1
```

If a rebuild says files are locked, close Screen Saver Settings and run:

```powershell
Get-Process PhotoWall,PhotoWall.Screensaver,msedgewebview2 -ErrorAction SilentlyContinue | Stop-Process -Force
```

The build script also now attempts to stop local PhotoWall screensaver processes automatically before cleaning output.

### Install on a PC

1. Copy the full contents of `dist/photo-wall-screensaver-windows/win-x64/` to the target PC.
2. Right-click `PhotoWall.scr` and choose `Install`.
3. In Screen Saver Settings, select `PhotoWall` if needed and click `Preview` (preview is a lightweight placeholder pane).
4. Use `Test` (or wait for timeout) to run the full screensaver experience.

Multi-monitor behavior: the screensaver opens one independent full-screen window per monitor (not one stretched canvas across all displays).

Important: keep the other files/folders next to `PhotoWall.scr` (`web`, `.dll`, etc.), because the screensaver loads local web assets from that folder.
