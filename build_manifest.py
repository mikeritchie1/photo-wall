import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from datetime import datetime, timezone

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import pillow_heif
except ImportError:
    pillow_heif = None

# Project structure assumed:
# your-project/
#   build_manifest.py
#   images/
#     test/
#     holiday/
#     birthday/

PROJECT_ROOT = Path(__file__).parent
IMAGES_DIR = PROJECT_ROOT / "images"
MANIFEST_PATH = IMAGES_DIR / "manifest.json"
VIDEOS_DIR = PROJECT_ROOT / "videos"
VIDEO_MANIFEST_PATH = VIDEOS_DIR / "manifest.json"
AUDIO_DIR = PROJECT_ROOT / "audio"
AUDIO_MANIFEST_PATH = AUDIO_DIR / "manifest.json"
ROOT_MISC_FOLDER_NAME = "Various"
TARGET_FOLDERS = None
DELETE_ORIGINAL_HEIC = True
DELETE_CONSUMED_SIDECAR_JSON = False

# Allowed image file extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
HEIC_EXTENSIONS = {".heic", ".heif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".oga", ".flac", ".opus", ".webm"}
MUTED_MEAN_VOLUME_THRESHOLD_DB = -45.0
MAX_VIDEO_BYTES = 20 * 1024 * 1024
COMPRESS_TRIGGER_BYTES = MAX_VIDEO_BYTES
# Kept only for migrating files created by older versions. New compressed
# videos are written back to their original filename.
COMPRESSED_VIDEO_SUFFIX = ".compressed.mp4"


def find_media_tool(tool_name: str):
    """Find FFmpeg tools on PATH or in the standard Windows WinGet location."""
    tool = shutil.which(tool_name)
    if tool:
        return tool

    local_app_data = Path.home() / "AppData" / "Local"
    winget_packages = local_app_data / "Microsoft" / "WinGet" / "Packages"
    if winget_packages.exists():
        matches = sorted(winget_packages.glob(f"Gyan.FFmpeg*/*/bin/{tool_name}.exe"))
        if matches:
            return str(matches[0])
    return None


def format_display_date(dt: datetime) -> str:
    day = dt.day
    if 10 <= (day % 100) <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix} {dt.strftime('%B %Y')}"


def format_file_mtime(file: Path) -> str:
    return format_display_date(datetime.fromtimestamp(file.stat().st_mtime))


def parse_exif_datetime(raw_value) -> str | None:
    if not raw_value:
        return None
    if isinstance(raw_value, bytes):
        raw_value = raw_value.decode("utf-8", errors="ignore")
    if not isinstance(raw_value, str):
        return None

    normalized = raw_value.strip().replace("T", " ")
    if len(normalized) >= 19:
        normalized = normalized[:19]

    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d", "%Y-%m-%d"):
        try:
            return format_display_date(datetime.strptime(normalized, fmt))
        except ValueError:
            continue
    return None


def parse_xmp_datetime(raw_value) -> str | None:
    if not raw_value:
        return None
    if isinstance(raw_value, bytes):
        raw_value = raw_value.decode("utf-8", errors="ignore")
    if not isinstance(raw_value, str):
        return None

    # Typical ISO forms from XMP: 2024-05-02T16:59:48 or with timezone.
    match = re.search(r"\d{4}-\d{2}-\d{2}", raw_value)
    if not match:
        return None

    try:
        return format_display_date(datetime.strptime(match.group(0), "%Y-%m-%d"))
    except ValueError:
        return None


def extract_date_from_exif_mapping(exif_mapping) -> str | None:
    if not exif_mapping:
        return None

    # Most reliable capture-time tags first.
    for tag in (36867, 36868, 306):  # DateTimeOriginal, DateTimeDigitized, DateTime
        parsed = parse_exif_datetime(exif_mapping.get(tag))
        if parsed:
            return parsed
    return None


def get_capture_date(file: Path) -> str:
    if Image is None:
        return format_file_mtime(file)

    try:
        with Image.open(file) as img:
            # Primary EXIF route.
            parsed = extract_date_from_exif_mapping(img.getexif())
            if parsed:
                return parsed

            # Some formats keep EXIF in a raw info blob.
            raw_exif = img.info.get("exif")
            if raw_exif:
                exif_obj = Image.Exif()
                exif_obj.load(raw_exif)
                parsed = extract_date_from_exif_mapping(exif_obj)
                if parsed:
                    return parsed

            # Common metadata keys used by PIL readers for some formats/exporters.
            exif_like_keys = (
                "DateTimeOriginal",
                "DateTimeDigitized",
                "DateTime",
                "date:create",
                "date:modify",
                "creation_time",
            )
            for key in exif_like_keys:
                parsed = parse_exif_datetime(img.info.get(key))
                if parsed:
                    return parsed

            # XMP dates (e.g., xmp:CreateDate / photoshop:DateCreated).
            for key in ("XML:com.adobe.xmp", "xmp", "XMP"):
                parsed = parse_xmp_datetime(img.info.get(key))
                if parsed:
                    return parsed
    except Exception:
        pass

    return format_file_mtime(file)

def converted_heic_path(source_file: Path) -> Path:
    return source_file.with_suffix(".jpg")

def is_targeted_file(file: Path) -> bool:
    try:
        relative = file.relative_to(IMAGES_DIR)
    except ValueError:
        return False
    if len(relative.parts) == 1:
        return TARGET_FOLDERS is None
    if len(relative.parts) < 1:
        return False
    if TARGET_FOLDERS is None:
        return True
    return relative.parts[0] in TARGET_FOLDERS

def load_json_with_fallbacks(path: Path):
    try:
        raw = path.read_bytes()
    except OSError:
        return None

    for encoding in ("utf-8-sig", "utf-8", "utf-16", "cp1252"):
        try:
            return json.loads(raw.decode(encoding))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    return None

def is_google_takeout_numeric_stem(stem: str) -> bool:
    if len(stem) < 24:
        return False
    if "_" not in stem:
        return False
    if not stem[-1].isdigit():
        return False
    return re.fullmatch(r"[0-9_]+", stem) is not None

def get_sidecar_candidates_for_image(image_file: Path):
    stem = image_file.stem.lower()
    suffix = image_file.suffix.lower()
    base_stem = stem[:-2] if stem.endswith("_n") else stem

    ordered_candidates = []

    def add_candidate(value: str):
        if value and value not in ordered_candidates:
            ordered_candidates.append(value)

    # Primary exact candidates for the current file name.
    add_candidate(f"{stem}{suffix}")
    add_candidate(stem)
    add_candidate(f"{stem}.heic")
    add_candidate(f"{stem}.heif")

    # `_n` copies often share sidecars with the base name.
    if base_stem != stem:
        add_candidate(f"{base_stem}{suffix}")
        add_candidate(base_stem)
        add_candidate(f"{base_stem}.heic")
        add_candidate(f"{base_stem}.heif")

    # Oversized videos may be replaced by a `.compressed.mp4` file while
    # retaining the original Google Takeout sidecar name.
    compressed_suffix = ".compressed"
    if base_stem.endswith(compressed_suffix):
        add_candidate(base_stem[:-len(compressed_suffix)])

    # Google Photos takeout occasionally emits a sidecar stem with one trailing digit missing.
    if is_google_takeout_numeric_stem(base_stem):
        truncated = base_stem[:-1]
        add_candidate(truncated)
        add_candidate(f"{truncated}.heic")
        add_candidate(f"{truncated}.heif")

    return ordered_candidates

def find_matching_sidecars(image_file: Path, sidecar_files):
    candidates = get_sidecar_candidates_for_image(image_file)
    matches = []

    def has_safe_boundary(remainder: str) -> bool:
        if not remainder:
            return True
        if remainder[0] in {".", " ", "_", "-", "("}:
            return True
        return False

    def candidate_matches_sidecar(candidate: str, sidecar_base: str) -> bool:
        if sidecar_base == candidate:
            return True

        if sidecar_base.startswith(candidate):
            return has_safe_boundary(sidecar_base[len(candidate):])

        if candidate.startswith(sidecar_base):
            return has_safe_boundary(candidate[len(sidecar_base):])

        return False

    for sidecar in sidecar_files:
        sidecar_base = sidecar.stem.lower()
        if any(candidate_matches_sidecar(candidate, sidecar_base) for candidate in candidates):
            matches.append(sidecar)
    return matches

def extract_people_from_sidecar_data(data: dict) -> list[str]:
    people = []
    seen = set()

    def add_person(value):
        name = str(value or "").strip()
        if not name:
            return
        key = name.lower()
        if key in seen:
            return
        seen.add(key)
        people.append(name)

    for key in ("people", "peopleInPhoto", "persons"):
        raw_people = data.get(key)
        if not isinstance(raw_people, list):
            continue
        for person in raw_people:
            if isinstance(person, str):
                add_person(person)
                continue
            if isinstance(person, dict):
                add_person(person.get("name"))
                add_person(person.get("personName"))

    return people

def get_sidecar_metadata(sidecar_files):
    description = ""
    photo_taken = None
    people = []
    seen_people = set()
    consumed = []

    for sidecar in sidecar_files:
        data = load_json_with_fallbacks(sidecar)
        if not isinstance(data, dict):
            continue

        consumed.append(sidecar)

        raw_description = data.get("description")
        if isinstance(raw_description, str) and raw_description.strip():
            description = raw_description.strip()

        for person in extract_people_from_sidecar_data(data):
            key = person.lower()
            if key in seen_people:
                continue
            seen_people.add(key)
            people.append(person)

        photo_taken_time = data.get("photoTakenTime")
        if isinstance(photo_taken_time, dict):
            timestamp = photo_taken_time.get("timestamp")
            if timestamp is not None:
                try:
                    dt = datetime.fromtimestamp(int(str(timestamp)), timezone.utc)
                    photo_taken = format_display_date(dt)
                except (ValueError, TypeError, OSError, OverflowError):
                    photo_taken = None

            if not photo_taken:
                formatted = photo_taken_time.get("formatted")
                if isinstance(formatted, str) and formatted.strip():
                    formatted = formatted.strip()
                    match = re.search(r"([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})", formatted)
                    if match:
                        parsed_date = None
                        for fmt in ("%b %d, %Y", "%B %d, %Y"):
                            try:
                                parsed_date = datetime.strptime(match.group(1), fmt)
                                break
                            except ValueError:
                                continue
                        if parsed_date:
                            photo_taken = format_display_date(parsed_date)
                    else:
                        iso_match = re.search(r"\d{4}-\d{2}-\d{2}", formatted)
                        if iso_match:
                            try:
                                parsed_iso = datetime.strptime(iso_match.group(0), "%Y-%m-%d")
                                photo_taken = format_display_date(parsed_iso)
                            except ValueError:
                                photo_taken = None

    return description, photo_taken, people, consumed

def convert_heic_to_jpg(source_file: Path, target_file: Path) -> bool:
    if Image is None or pillow_heif is None:
        return False

    try:
        with Image.open(source_file) as img:
            exif_bytes = img.info.get("exif")
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            save_kwargs = {"quality": 92}
            if exif_bytes:
                save_kwargs["exif"] = exif_bytes

            img.save(target_file, "JPEG", **save_kwargs)
        return True
    except Exception as error:
        print(f"Failed to convert {source_file}: {error}")
        return False

def ensure_heic_conversions():
    # Migrate older conversion naming (e.g., IMG_1234.heic.jpg -> IMG_1234.jpg).
    for legacy_file in IMAGES_DIR.rglob("*.heic.jpg"):
        if not legacy_file.is_file() or not is_targeted_file(legacy_file):
            continue
        modern_file = legacy_file.with_name(legacy_file.name[: -len(".heic.jpg")] + ".jpg")
        if modern_file.exists():
            continue
        try:
            legacy_file.rename(modern_file)
        except OSError as error:
            print(f"Failed to rename legacy converted file {legacy_file}: {error}")

    heic_files = [
        file
        for file in IMAGES_DIR.rglob("*")
        if file.is_file()
        and file.suffix.lower() in HEIC_EXTENSIONS
        and is_targeted_file(file)
    ]

    if not heic_files:
        return

    if Image is None:
        print("Pillow is not installed. Skipping HEIC conversion.")
        return

    if pillow_heif is None:
        print("pillow-heif is not installed. Skipping HEIC conversion.")
        print("Install it with: pip install pillow-heif")
        return

    pillow_heif.register_heif_opener()

    converted_count = 0
    skipped_count = 0
    deleted_count = 0
    for source_file in heic_files:
        target_file = converted_heic_path(source_file)
        needs_conversion = (
            not target_file.exists()
            or target_file.stat().st_mtime < source_file.stat().st_mtime
        )

        if not needs_conversion:
            skipped_count += 1
            if DELETE_ORIGINAL_HEIC and target_file.exists():
                try:
                    source_file.unlink()
                    deleted_count += 1
                except OSError as error:
                    print(f"Failed to delete original {source_file}: {error}")
            continue

        if convert_heic_to_jpg(source_file, target_file):
            converted_count += 1
            if DELETE_ORIGINAL_HEIC and target_file.exists():
                try:
                    source_file.unlink()
                    deleted_count += 1
                except OSError as error:
                    print(f"Failed to delete original {source_file}: {error}")

    print(
        f"HEIC conversion complete: {converted_count} converted, {skipped_count} up-to-date, {deleted_count} originals deleted."
    )

def move_root_images_to_various_folder():
    if TARGET_FOLDERS is not None and ROOT_MISC_FOLDER_NAME not in TARGET_FOLDERS:
        return

    various_dir = IMAGES_DIR / ROOT_MISC_FOLDER_NAME
    various_dir.mkdir(exist_ok=True)

    moved_count = 0
    skipped_count = 0
    for file in sorted(IMAGES_DIR.iterdir()):
        if not file.is_file():
            continue
        suffix = file.suffix.lower()
        if suffix not in IMAGE_EXTENSIONS and suffix not in HEIC_EXTENSIONS:
            continue

        destination = various_dir / file.name
        if destination.exists():
            skipped_count += 1
            continue

        try:
            file.rename(destination)
            moved_count += 1
        except OSError as error:
            print(f"Failed to move {file} to {destination}: {error}")

    if moved_count or skipped_count:
        print(
            f"Root image move complete: {moved_count} moved to {ROOT_MISC_FOLDER_NAME}, {skipped_count} skipped (already existed)."
        )


def compression_attempts_for_size(size_bytes: int):
    """Choose a stronger starting profile for unusually large source videos."""
    attempts = [
        (28, 1280, "96k"),
        (32, 1280, "96k"),
        (36, 1280, "96k"),
        (40, 960, "96k"),
        (44, 720, "64k"),
        (48, 540, "64k"),
        (51, 360, "48k"),
        (51, 240, "32k"),
        (51, 160, "24k"),
    ]
    size_mb = size_bytes / (1024 * 1024)
    if size_mb > 500:
        return attempts[5:]
    if size_mb > 250:
        return attempts[4:]
    if size_mb > 100:
        return attempts[3:]
    if size_mb > 50:
        return attempts[2:]
    return attempts


def compress_large_video(video_file: Path) -> Path:
    """Compress an oversized video and replace the original with the result."""
    if video_file.name.endswith(COMPRESSED_VIDEO_SUFFIX) or video_file.stat().st_size <= COMPRESS_TRIGGER_BYTES:
        return video_file

    ffmpeg = find_media_tool("ffmpeg")
    if not ffmpeg:
        print(f"Warning: {video_file.name} is over 20 MB, but FFmpeg is not installed; leaving it unchanged.")
        return video_file

    # FFmpeg cannot safely read and write the same file. Encode beside the
    # source, then replace the source immediately when the attempt finishes.
    output_file = video_file
    temporary_file = video_file.with_name(
        f"{video_file.stem}.compressed.tmp{video_file.suffix}"
    )
    duration_seconds = video_duration_seconds(video_file)
    source_for_attempt = video_file
    try:
        compression_attempts = compression_attempts_for_size(video_file.stat().st_size)
        attempt = 0
        while True:
            if attempt >= len(compression_attempts):
                previous_width = compression_attempts[-1][1]
                previous_audio_kbps = int(compression_attempts[-1][2].removesuffix("k"))
                compression_attempts.append(
                    (51, max(64, previous_width // 2), f"{max(8, previous_audio_kbps // 2)}k")
                )
            crf, max_width, audio_bitrate = compression_attempts[attempt]
            attempt += 1
            if temporary_file.exists():
                temporary_file.unlink()
            command = [
                ffmpeg, "-y", "-i", str(source_for_attempt),
                "-vf", f"scale='min({max_width},iw)':-2",
                "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
                "-c:a", "aac", "-b:a", audio_bitrate, "-movflags", "+faststart",
                "-progress", "pipe:1", "-nostats", str(temporary_file),
            ]
            print(
                f"  Attempt {attempt} "
                f"(CRF {crf}, max width {max_width}, audio {audio_bitrate})",
                flush=True,
            )
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
            )
            for line in process.stdout or []:
                if not duration_seconds or "out_time_us=" not in line:
                    continue
                try:
                    elapsed = int(line.split("=", 1)[1]) / 1_000_000
                except (IndexError, ValueError):
                    continue
                percent = min(100, max(0, elapsed / duration_seconds * 100))
                bar_length = 30
                filled = int(bar_length * percent / 100)
                bar = "#" * filled + "-" * (bar_length - filled)
                print(f"\r  [{bar}] {percent:5.1f}%", end="", flush=True)
            return_code = process.wait()
            if duration_seconds:
                print("\r  [##############################] 100.0%", flush=True)
            if return_code != 0:
                raise subprocess.CalledProcessError(return_code, command)
            temporary_file.replace(output_file)
            print(f"Saved compressed video: {output_file.name} ({output_file.stat().st_size / (1024 * 1024):.1f} MB)", flush=True)
            if output_file.stat().st_size <= MAX_VIDEO_BYTES:
                print(f"Compressed and replaced {video_file.name} -> {output_file.name}")
                return output_file
            source_for_attempt = output_file
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"Warning: compression failed for {video_file.name}: {error}")
    finally:
        if temporary_file.exists():
            temporary_file.unlink()
    return output_file if output_file.exists() else video_file


def video_has_audio(video_file: Path) -> bool:
    """Return whether FFprobe finds an audio stream; assume true if unavailable."""
    ffprobe = find_media_tool("ffprobe")
    if not ffprobe:
        return True

    try:
        result = subprocess.run(
            [
                ffprobe, "-v", "error", "-select_streams", "a:0",
                "-show_entries", "stream=index", "-of", "csv=p=0", str(video_file),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return bool(result.stdout.strip())
    except (OSError, subprocess.CalledProcessError):
        return True


def video_is_muted(video_file: Path) -> bool:
    """Return whether a video's measured audio is effectively silent."""
    if not video_has_audio(video_file):
        return True

    ffmpeg = find_media_tool("ffmpeg")
    if not ffmpeg:
        # Preserve the safer stream-based behavior if volume analysis is not
        # available; the manifest still reports that an audio stream exists.
        return False

    try:
        result = subprocess.run(
            [
                ffmpeg, "-hide_banner", "-nostats", "-i", str(video_file),
                "-map", "0:a:0", "-af", "volumedetect", "-f", "null", os.devnull,
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        diagnostic = f"{result.stdout}\n{result.stderr}"
        match = re.search(
            r"mean_volume:\s*(-?inf|[-+]?\d+(?:\.\d+)?)\s*dB",
            diagnostic,
            re.IGNORECASE,
        )
        if not match:
            return False
        mean_volume = float("-inf") if match.group(1).lower() == "-inf" else float(match.group(1))
        return mean_volume <= MUTED_MEAN_VOLUME_THRESHOLD_DB
    except (OSError, ValueError, subprocess.SubprocessError):
        return False
def video_duration_seconds(video_file: Path):
    """Read a video's duration for compression progress reporting."""
    ffprobe = find_media_tool("ffprobe")
    if not ffprobe:
        return None
    try:
        result = subprocess.run(
            [
                ffprobe, "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", str(video_file),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        duration = float(result.stdout.strip())
        return duration if duration > 0 else None
    except (OSError, ValueError, subprocess.CalledProcessError):
        return None


def build_video_manifest():
    """Create the lightweight manifest used by the web app's video mode."""
    video_manifest = {}
    included_paths = set()
    if VIDEOS_DIR.exists():
        for file in sorted(VIDEOS_DIR.rglob("*")):
            if not file.is_file() or file.suffix.lower() not in VIDEO_EXTENSIONS:
                continue
            relative = file.relative_to(VIDEOS_DIR)
            if relative in included_paths:
                continue
            included_paths.add(relative)
            folder = relative.parts[0] if len(relative.parts) > 1 else ROOT_MISC_FOLDER_NAME
            sidecar_files = [
                candidate
                for candidate in file.parent.iterdir()
                if candidate.is_file()
                and candidate.suffix.lower() == ".json"
                and candidate.name.lower() not in {"manifest.json", "metadata.json"}
            ]
            text, taken_time, people, _ = get_sidecar_metadata(
                find_matching_sidecars(file, sidecar_files)
            )
            video_manifest.setdefault(folder, []).append(
                {
                    "filename": file.name,
                    "path": "/".join(relative.parts),
                    "text": text,
                    "date": taken_time or format_file_mtime(file),
                    "people": people,
                    "hasAudio": video_has_audio(file),
                    "isMuted": video_is_muted(file),
                }
            )

    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    with open(VIDEO_MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(video_manifest, f, indent=2, ensure_ascii=False)
    print(f"Video manifest created: {VIDEO_MANIFEST_PATH}")


def build_audio_manifest():
    """Create the lightweight manifest used for music fallback playback."""
    audio_manifest = []
    if AUDIO_DIR.exists():
        for file in sorted(AUDIO_DIR.rglob("*")):
            if not file.is_file() or file.suffix.lower() not in AUDIO_EXTENSIONS:
                continue
            relative = file.relative_to(AUDIO_DIR)
            audio_manifest.append(
                {
                    "filename": file.name,
                    "path": "/".join(relative.parts),
                }
            )

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    with open(AUDIO_MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(audio_manifest, f, indent=2, ensure_ascii=False)
    print(f"Audio manifest created: {AUDIO_MANIFEST_PATH}")


def compress_videos():
    """Compress oversized videos with up to four workers, then rebuild manifests."""
    if not VIDEOS_DIR.exists():
        print("Videos folder not found; nothing to compress.")
        build_manifest()
        return

    oversized_videos = []
    for temporary_file in sorted(VIDEOS_DIR.rglob("*.compressed.tmp.*")):
        if temporary_file.is_file():
            try:
                temporary_file.unlink()
                print(f"Removed incomplete temporary file: {temporary_file.name}", flush=True)
            except OSError as error:
                print(f"Warning: could not remove temporary file {temporary_file.name}: {error}")

    for video_file in sorted(VIDEOS_DIR.rglob("*")):
        if not video_file.is_file() or video_file.suffix.lower() not in VIDEO_EXTENSIONS:
            continue
        if video_file.name.endswith(COMPRESSED_VIDEO_SUFFIX):
            continue
        if video_file.stat().st_size <= COMPRESS_TRIGGER_BYTES:
            continue

        oversized_videos.append(video_file)

    def compress_one_video(video_file):
        size_mb = video_file.stat().st_size / (1024 * 1024)
        print(f"Compressing video: {video_file.name} ({size_mb:.1f} MB)", flush=True)
        compressed_file = compress_large_video(video_file)
        print(f"Finished video: {compressed_file.name}", flush=True)

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(compress_one_video, video_file) for video_file in oversized_videos]
        for future in as_completed(futures):
            future.result()
            # Publish each completed replacement immediately instead of
            # waiting for every worker in the batch.
            build_video_manifest()

    print(
        f"Video compression complete: {len(oversized_videos)} oversized video(s) processed."
    )
    build_manifest()


def build_manifest():
    manifest = {}

    if not IMAGES_DIR.exists():
        print(f"Images folder not found: {IMAGES_DIR}")
        return

    move_root_images_to_various_folder()
    ensure_heic_conversions()

    # Include images directly inside `images/` under a catch-all folder.
    # This supports sidecar metadata the same way album subfolders do.
    if TARGET_FOLDERS is None:
        root_json_sidecars = [
            file
            for file in sorted(IMAGES_DIR.iterdir())
            if file.is_file()
            and file.suffix.lower() == ".json"
            and file.name.lower() not in {"manifest.json", "metadata.json"}
        ]

        root_consumed_sidecars = set()
        root_image_files = []
        for file in sorted(IMAGES_DIR.iterdir()):
            if not file.is_file() or file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if file.name.endswith(".browser.jpg"):
                continue

            sidecar_matches = find_matching_sidecars(file, root_json_sidecars)
            custom_text, taken_time, people, consumed = get_sidecar_metadata(sidecar_matches)
            for matched_sidecar in sidecar_matches:
                root_consumed_sidecars.add(matched_sidecar)
            for parsed_sidecar in consumed:
                root_consumed_sidecars.add(parsed_sidecar)

            root_image_files.append(
                {
                    "filename": file.name,
                    "path": file.name,
                    "text": custom_text,
                    "date": taken_time or get_capture_date(file),
                    "people": people,
                }
            )

        if root_image_files:
            manifest[ROOT_MISC_FOLDER_NAME] = root_image_files

        if DELETE_CONSUMED_SIDECAR_JSON:
            for sidecar in sorted(root_consumed_sidecars):
                try:
                    sidecar.unlink()
                except OSError as error:
                    print(f"Failed to delete sidecar {sidecar}: {error}")

    for folder in sorted(IMAGES_DIR.iterdir()):
        if not folder.is_dir():
            continue
        if TARGET_FOLDERS is not None and folder.name not in TARGET_FOLDERS:
            continue

        all_json_sidecars = [
            file
            for file in sorted(folder.iterdir())
            if file.is_file()
            and file.suffix.lower() == ".json"
            and file.name.lower() not in {"manifest.json", "metadata.json"}
        ]

        consumed_sidecars = set()
        image_files = []
        for file in sorted(folder.iterdir()):
            if not file.is_file() or file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if file.name.endswith(".browser.jpg"):
                continue

            sidecar_matches = find_matching_sidecars(file, all_json_sidecars)
            custom_text, taken_time, people, consumed = get_sidecar_metadata(sidecar_matches)
            for matched_sidecar in sidecar_matches:
                consumed_sidecars.add(matched_sidecar)
            for parsed_sidecar in consumed:
                consumed_sidecars.add(parsed_sidecar)

            image_files.append(
                {
                    "filename": file.name,
                    "path": f"{folder.name}/{file.name}",
                    "text": custom_text,
                    "date": taken_time or get_capture_date(file),
                    "people": people,
                }
            )

        if image_files:
            manifest[folder.name] = image_files

        if DELETE_CONSUMED_SIDECAR_JSON:
            for sidecar in sorted(consumed_sidecars):
                try:
                    sidecar.unlink()
                except OSError as error:
                    print(f"Failed to delete sidecar {sidecar}: {error}")

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    build_video_manifest()
    build_audio_manifest()

    print(f"Manifest created: {MANIFEST_PATH}")
    manifest_preview = json.dumps(manifest, indent=2, ensure_ascii=False)
    try:
        print(manifest_preview)
    except UnicodeEncodeError:
        print(manifest_preview.encode("ascii", errors="replace").decode("ascii"))

if __name__ == "__main__":
    if "--compress-videos" in sys.argv[1:]:
        compress_videos()
    else:
        build_manifest()
