"""Report source videos whose audio is effectively silent.

Usage:
    python test_muted_videos.py
    python test_muted_videos.py --mean-threshold -40

The default threshold classifies a video as muted when its measured mean
volume is -45 dB or quieter. Videos with no audio stream are also classified
as muted. This inspects the original files in videos/, not the web manifest.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from build_manifest import VIDEO_EXTENSIONS, find_media_tool


MEAN_VOLUME_PATTERN = re.compile(r"mean_volume:\s*(-?inf|[-+]?\d+(?:\.\d+)?)\s*dB", re.IGNORECASE)
MAX_VOLUME_PATTERN = re.compile(r"max_volume:\s*(-?inf|[-+]?\d+(?:\.\d+)?)\s*dB", re.IGNORECASE)


def parse_db(value: str) -> float:
    return float("-inf") if value.lower() == "-inf" else float(value)


def has_audio_stream(ffprobe: str, video_file: Path) -> bool:
    result = subprocess.run(
        [
            ffprobe,
            "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=index",
            "-of", "csv=p=0",
            str(video_file),
        ],
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())


def measure_volume(ffmpeg: str, video_file: Path) -> tuple[float | None, float | None, str | None]:
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostats",
            "-i", str(video_file),
            "-map", "0:a:0",
            "-af", "volumedetect",
            "-f", "null",
            "NUL" if sys.platform == "win32" else "/dev/null",
        ],
        capture_output=True,
        text=True,
    )
    diagnostic = f"{result.stdout}\n{result.stderr}"
    mean_match = MEAN_VOLUME_PATTERN.search(diagnostic)
    max_match = MAX_VOLUME_PATTERN.search(diagnostic)
    if not mean_match:
        return None, None, result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "no volume measurement"
    return (
        parse_db(mean_match.group(1)),
        parse_db(max_match.group(1)) if max_match else None,
        None,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mean-threshold",
        type=float,
        default=-45.0,
        help="Classify audio at or below this mean volume as muted (default: -45 dB).",
    )
    args = parser.parse_args()

    videos_dir = Path(__file__).parent / "videos"
    ffmpeg = find_media_tool("ffmpeg")
    ffprobe = find_media_tool("ffprobe")
    if not ffmpeg or not ffprobe:
        print("ERROR: ffmpeg and ffprobe are required and must be installed or discoverable.", file=sys.stderr)
        return 1

    video_files = sorted(
        file for file in videos_dir.rglob("*")
        if file.is_file() and file.suffix.lower() in VIDEO_EXTENSIONS
    )
    muted = []
    measured = 0
    warnings = 0

    print(f"Muted threshold: mean volume <= {args.mean_threshold:.1f} dB")
    print(f"Scanning {len(video_files)} original video file(s)...")

    for video_file in video_files:
        relative = video_file.relative_to(videos_dir)
        if not has_audio_stream(ffprobe, video_file):
            muted.append((relative, "NO AUDIO", "NO AUDIO"))
            continue

        mean_db, max_db, error = measure_volume(ffmpeg, video_file)
        if error or mean_db is None:
            warnings += 1
            print(f"WARNING: could not measure {relative}: {error}", file=sys.stderr)
            continue

        measured += 1
        if mean_db <= args.mean_threshold:
            muted.append((relative, f"{mean_db:.1f} dB mean", f"{max_db:.1f} dB max" if max_db is not None else "max unknown"))

    print()
    print(f"Videos considered muted: {len(muted)}")
    for relative, mean_db, max_db in muted:
        print(f"- {relative}  [{mean_db}; {max_db}]")
    print()
    print(f"Measured audio streams: {measured}; warnings: {warnings}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
