# Video Specifications

This document describes the video file pipeline, manifest format, playback, looping, and screen-position-based transitions implemented by Photo Wall.

## 1. Video manifest build

Run the following command from the project root:

```powershell
python build_manifest.py
```

The builder scans the `videos/` directory recursively. It includes files with these extensions:

- `.mp4`
- `.webm`
- `.mov`
- `.m4v`
- `.avi`
- `.mkv`

The generated manifest is written to `videos/manifest.json`. Each video is grouped under the first directory name in its relative path. A video directly inside `videos/` is placed in the `Various` group.

Each manifest entry contains:

```json
{
  "filename": "example.mp4",
  "path": "folder/example.mp4",
  "text": "",
  "date": "12th April 2026",
  "people": [],
  "hasAudio": true
}
```

`hasAudio` is detected with FFprobe. If FFprobe is unavailable or cannot inspect the file, the builder assumes that the video has audio.

Matching JSON sidecar metadata is used for the text, date, and people fields. `manifest.json` and `metadata.json` are excluded from sidecar matching.

The same `python build_manifest.py` command also scans `audio/` and writes `audio/manifest.json`. Supported music formats are MP3, WAV, M4A, AAC, OGG, OGA, FLAC, Opus, and WebM.

Each video entry also contains `isMuted`. It is `true` when the video has no audio stream or its measured mean audio level is at or below -45 dB. The application uses this manifest field to decide whether fallback music is needed.

## 2. Video compression

Run:

```powershell
python build_manifest.py --compress-videos
```

Compression rules:

- Videos larger than 20 MiB (`20 * 1024 * 1024` bytes) are selected for compression.
- Videos at or below 20 MiB are left unchanged.
- Files already ending in `.compressed.mp4` are skipped.
- FFmpeg is required. If FFmpeg is unavailable, an oversized video is left unchanged.
- The compressed output is written beside the source as a temporary file, then replaces the original filename after each successful attempt.
- Compression keeps reducing quality and dimensions until the output is at or below 20 MiB, or until all available profiles have been tried.
- The video is encoded with H.264 video, AAC audio, `+faststart`, and a maximum width selected by the compression profile. The height is calculated automatically to preserve aspect ratio.
- Up to four videos are compressed in parallel.
- The video manifest is rebuilt after each completed video and again after the full batch finishes.

The initial profiles progressively use higher CRF values, lower maximum widths, and lower audio bitrates. Very large files start with stronger profiles. If the normal profiles do not reach the limit, the builder continues with progressively smaller dimensions and lower audio bitrate.

The 20 MiB value is the target limit, not a guarantee if FFmpeg fails or if all compression attempts still produce a larger file.

## 3. Media selection and assignment

The application loads `videos/manifest.json` and combines video entries with image entries according to the Photos/Videos mix control.

For mixed media, the application creates a predictable repeating ratio. For example, a 75% photos / 25% videos setting places video entries approximately every fourth position. The source lists are shuffled, and the application avoids adjacent duplicate video entries when another video is available.

When a photo card wraps around the top or bottom of the scrolling wall, it receives the next media item from the cycle. The old card is not replaced because it reached the screen-center transition threshold; media assignment occurs when the card leaves the scrolling boundary and wraps.

## 4. Playback and looping

Each video element is configured as follows:

- Muted by default.
- Inline playback enabled.
- Automatic media preloading enabled for reliable seeking.
- Native autoplay disabled.
- Native looping enabled.

When a video is assigned to a card, media data is loaded and a random start position is selected before playback begins. The video remains paused until the seek completes, so it does not briefly play from 0 seconds. The seek is verified and retried when the browser lands materially earlier than requested. Once prepared, the selected video plays muted until it is handed off for audio.

When a video becomes the active audio video, it reuses the random start position selected during assignment and resumes playback after the seek completes. A random start is selected for videos longer than 6 seconds: the start range leaves at least 4 seconds of playback plus a 2-second end buffer. Videos 6 seconds or shorter start at zero. This prevents playback from briefly beginning at 0 seconds and avoids starting too close to the end.

Videos without an audio stream are still eligible for position-based handoff. When a silent video is selected and the `audio/` folder has music, a random song starts at a random point that is at least 10 seconds before the song ends. The fallback song loops. If no audio files are available, the silent video remains without audio.

## 5. Video handoff and transition rules

The active video is evaluated continuously while the wall animates.

### Startup selection

When no video has been selected yet, the application randomly chooses the first available video using this widening search order:

1. Center between 15% and 50% of the viewport.
2. Center between 15% and 80%.
3. Center between 5% and 80%.
4. Center between 5% and 95%.
5. Any currently assigned video, regardless of its screen position.

The first non-empty range is used. This startup search does not change the normal transition ranges after the first video is selected.

### Normal handoff

1. A video normally receives a minimum 4-second play attempt, but this does not override the screen boundary.
2. The handoff occurs immediately when the active video center reaches 80% of the viewport height.
3. The next video is selected from videos that are still on screen.
4. The next video center must be between 15% and 50% of the viewport height.
5. The 80% line is the hard cutoff for the current video; the current video cannot remain the active handoff target once its center crosses that line if an eligible replacement exists.
6. If several candidates qualify, the closest eligible candidate above the current video is selected.

### Fallback handoff

If no video is available in the normal 15%–50% replacement range, the current video is allowed to continue past the 80% cutoff. When its center reaches 95%, the fallback rule allows a replacement whose center is between 5% and 95% and which is still on screen. The closest eligible fallback video above the current video is selected.

### Exceptions

- If the active video leaves the viewport, the application can select an eligible replacement immediately.
- If no eligible replacement exists, the current active video remains the handoff target until a valid candidate appears or the current target is cleared.
- A candidate must still be on screen; a candidate that has completely left the viewport is not eligible for handoff.
- A video with `hasAudio: false` can be selected by the position-based handoff and uses fallback music when available.
- When a video reaches its end, native looping restarts it automatically. End-of-file playback does not leave the video permanently stopped.

All assigned videos keep playing after their random-start seek, whether or not they are currently selected. The screen-position handoff changes which video is active for audio/state; it does not pause the other video elements, remove cards, or reposition them. Card movement and replacement are controlled separately by the scrolling and wrap behavior described above.
