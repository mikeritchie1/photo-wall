const controls = document.getElementById("controls");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const folderSelect = document.getElementById("folderSelect");
const backgroundSelect = document.getElementById("backgroundSelect");
const lightColorSelect = document.getElementById("lightColorSelect");
const stringColorSelect = document.getElementById("stringColorSelect");
const reverseCheckbox = document.getElementById("reverseCheckbox");
const swaySlider = document.getElementById("swaySlider");
const lightColumnsSelect = document.getElementById("lightColumnsSelect");
const yearStartSlider = document.getElementById("yearStartSlider");
const yearEndSlider = document.getElementById("yearEndSlider");
const yearRangeActive = document.getElementById("yearRangeActive");
const yearRangeValue = document.getElementById("yearRangeValue");
const textSelect = document.getElementById("textSelect");
const mediaMixSlider = document.getElementById("mediaMixSlider");
const mediaMixValue = document.getElementById("mediaMixValue");
const naturalMediaCheckbox = document.getElementById("naturalMediaCheckbox");
const orderedCheckbox = document.getElementById("orderedCheckbox");
const soundCheckbox = document.getElementById("soundCheckbox");
const peopleFilterSummary = document.getElementById("peopleFilterSummary");
const peopleFilterToggle = document.getElementById("peopleFilterToggle");
const peopleOptionsRow = document.getElementById("peopleOptionsRow");
const peopleOptions = document.getElementById("peopleOptions");
const resetControlsBtn = document.getElementById("resetControlsBtn");
const wall = document.getElementById("wall");
const R2_BASE_URL = "https://pub-bd90151148dc4ad4a6dcce4b188be9ac.r2.dev";
const isLocalRuntime =
  location.protocol === "file:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname === "::1" ||
  location.hostname === "[::1]" ||
  location.hostname === "appassets.local";
const PHOTO_BASE_URL = isLocalRuntime ? "images" : R2_BASE_URL;
const MANIFEST_URL = "images/manifest.json";
const VIDEO_MANIFEST_URL = "videos/manifest.json";
const AUDIO_MANIFEST_URL = "audio/manifest.json";
const GROUPS_URL = "images/groups.json";
console.log("[runtime-assets]", {
  hostname: location.hostname,
  isLocalRuntime,
  imageManifest: MANIFEST_URL,
  videoManifest: VIDEO_MANIFEST_URL,
  audioManifest: AUDIO_MANIFEST_URL
});
// Temporary diagnostics for video handoff and screen-position debugging.
// Set to false to restore normal video captions and hide the guide lines.
const DEBUG_MODE = false;
// TEMPORARY: restrict playback to manifest entries marked isMuted=true.
// Set to false to restore the normal mixed media pool.
// Video filtering is controlled by the Filter dropdown below.
// Browser timing logs appear in the browser console, not the Python
// HTTP-server terminal.
const DEBUG_VIDEO_START = DEBUG_MODE;

document.body.classList.toggle("debug-mode", DEBUG_MODE);

function debugVideoStart(label, details) {
  if (DEBUG_VIDEO_START) {
    console.log(label, details);
  }
}

const DEFAULT_CUSTOM_GROUPS = {
  Friends: ["michael"]
};

const lightsLeft = document.getElementById("lights-left");
const lightsCenter = document.getElementById("lights-center");
const lightsRight = document.getElementById("lights-right");

let hideTimer;
let photoWidth = parseFloat(sizeSlider.value);
let verticalSpeed = parseFloat(speedSlider.value);
let currentLightColor = 'warm';
let swayPower = parseFloat(swaySlider.value);
let textMode = 'auto';
let lightColumnCount = 3;
let minAvailableYear = null;
let maxAvailableYear = null;
let selectedStartYear = null;
let selectedEndYear = null;
let lightOffsetY = 0;
let lastRenderTimeSec = null;

const leftXRatio = 0.24;
const rightXRatio = 0.76;
const photosPerColumn = 6;
const lightBulbSpacing = 95;
const MOBILE_BREAKPOINT = 900;
const PHOTO_WRAP_BUFFER_PX = 36;
const DEFAULT_CONTROL_VALUES = {
  folder: "Various",
  size: "420",
  speed: "1.5",
  reverse: false,
  sway: "1.5",
  lightColumns: "3",
  background: "space",
  lightColor: "warm",
  stringColor: "brown",
  text: "auto"
};

const photos = [
  { container: document.getElementById("photo1-container"), imgEl: document.getElementById("photo1"), textEl: document.getElementById("photo1-text"), column: "left", index: 0, rotation: -8, swayOffset: 0.0 },
  { container: document.getElementById("photo2-container"), imgEl: document.getElementById("photo2"), textEl: document.getElementById("photo2-text"), column: "left", index: 1, rotation:  6, swayOffset: 0.9 },
  { container: document.getElementById("photo3-container"), imgEl: document.getElementById("photo3"), textEl: document.getElementById("photo3-text"), column: "left", index: 2, rotation: -5, swayOffset: 1.8 },
  { container: document.getElementById("photo4-container"), imgEl: document.getElementById("photo4"), textEl: document.getElementById("photo4-text"), column: "left", index: 3, rotation:  7, swayOffset: 2.7 },
  { container: document.getElementById("photo9-container"), imgEl: document.getElementById("photo9"), textEl: document.getElementById("photo9-text"), column: "left", index: 4, rotation: -4, swayOffset: 3.6 },
  { container: document.getElementById("photo10-container"), imgEl: document.getElementById("photo10"), textEl: document.getElementById("photo10-text"), column: "left", index: 5, rotation:  8, swayOffset: 4.5 },

  { container: document.getElementById("photo13-container"), imgEl: document.getElementById("photo13"), textEl: document.getElementById("photo13-text"), column: "center", index: 0, rotation: -7, swayOffset: 0.2 },
  { container: document.getElementById("photo14-container"), imgEl: document.getElementById("photo14"), textEl: document.getElementById("photo14-text"), column: "center", index: 1, rotation:  5, swayOffset: 1.1 },
  { container: document.getElementById("photo15-container"), imgEl: document.getElementById("photo15"), textEl: document.getElementById("photo15-text"), column: "center", index: 2, rotation: -6, swayOffset: 2.0 },
  { container: document.getElementById("photo16-container"), imgEl: document.getElementById("photo16"), textEl: document.getElementById("photo16-text"), column: "center", index: 3, rotation:  7, swayOffset: 2.9 },
  { container: document.getElementById("photo17-container"), imgEl: document.getElementById("photo17"), textEl: document.getElementById("photo17-text"), column: "center", index: 4, rotation: -5, swayOffset: 3.8 },
  { container: document.getElementById("photo18-container"), imgEl: document.getElementById("photo18"), textEl: document.getElementById("photo18-text"), column: "center", index: 5, rotation:  6, swayOffset: 4.7 },

  { container: document.getElementById("photo5-container"), imgEl: document.getElementById("photo5"), textEl: document.getElementById("photo5-text"), column: "right", index: 0, rotation: -6, swayOffset: 0.4 },
  { container: document.getElementById("photo6-container"), imgEl: document.getElementById("photo6"), textEl: document.getElementById("photo6-text"), column: "right", index: 1, rotation:  5, swayOffset: 1.3 },
  { container: document.getElementById("photo7-container"), imgEl: document.getElementById("photo7"), textEl: document.getElementById("photo7-text"), column: "right", index: 2, rotation: -7, swayOffset: 2.2 },
  { container: document.getElementById("photo8-container"), imgEl: document.getElementById("photo8"), textEl: document.getElementById("photo8-text"), column: "right", index: 3, rotation:  6, swayOffset: 3.1 },
  { container: document.getElementById("photo11-container"), imgEl: document.getElementById("photo11"), textEl: document.getElementById("photo11-text"), column: "right", index: 4, rotation: -5, swayOffset: 4.0 },
  { container: document.getElementById("photo12-container"), imgEl: document.getElementById("photo12"), textEl: document.getElementById("photo12-text"), column: "right", index: 5, rotation:  7, swayOffset: 4.9 }
];

for (const photo of photos) {
  const videoEl = document.createElement("video");
  videoEl.className = "photo photo-video";
  videoEl.muted = true;
  // Keep every assigned video cycling continuously.
  videoEl.loop = true;
  // Playback is started explicitly after the random seek completes. Native
  // autoplay would begin at t=0 before that seek has taken effect.
  videoEl.autoplay = false;
  videoEl.playsInline = true;
  // Load enough media data for reliable random seeking, including MOV files.
  videoEl.preload = "auto";
  videoEl.setAttribute("aria-hidden", "true");
  videoEl.addEventListener("play", () => {
    debugVideoStart("[video-play-position]", {
      src: videoEl.currentSrc || videoEl.src,
      currentTime: videoEl.currentTime,
      duration: videoEl.duration
    });
  });
  videoEl.addEventListener("seeked", () => {
    debugVideoStart("[video-seeked-position]", {
      src: videoEl.currentSrc || videoEl.src,
      currentTime: videoEl.currentTime,
      duration: videoEl.duration
    });
  });
  photo.container.insertBefore(videoEl, photo.imgEl);
  photo.videoEl = videoEl;
  photo.debugVideoDuration = null;
  photo.debugVideoStartTime = null;
  photo.videoStartSeekComplete = false;
}

const backgroundAudio = document.createElement("audio");
backgroundAudio.preload = "auto";
backgroundAudio.loop = true;
backgroundAudio.autoplay = false;
backgroundAudio.muted = true;
backgroundAudio.setAttribute("aria-hidden", "true");
document.body.appendChild(backgroundAudio);

textSelect.value = "auto";

function sortPhotosForQueue(items) {
  return [...items].sort((a, b) => {
    if (a.index !== b.index) {
      return a.index - b.index;
    }
    const columnRank = { left: 0, center: 1, right: 2 };
    return columnRank[a.column] - columnRank[b.column];
  });
}

function getActivePhotos() {
  if (lightColumnCount === 3) {
    return photos;
  }
  return photos.filter((photo) => photo.column !== "center");
}

let activeQueuePhotos = sortPhotosForQueue(getActivePhotos());

let manifest = null;
let imageManifest = null;
let videoManifest = null;
let audioManifest = [];
let mediaMixIndex = 2;
let naturalMediaMix = false;
let selectedFolder = "Various";
let selectedOrder = "random";
let availablePeople = [];
let selectedPeople = new Set();
let selectedGroupName = null;
let customGroups = { ...DEFAULT_CUSTOM_GROUPS };
let imageCycle = [];
let imageCycleIndex = 0;
let lastServedImageKey = null;
let hasAvailableImages = true;
// Media can exist in the GitHub manifest before it has been uploaded to R2.
// Keep failed keys out of the current session so a missing object cannot be
// selected repeatedly.
const unavailableMediaKeys = new Set();
let videoAssignmentSequence = 0;
let audibleVideoPhoto = null;
let manuallySelectedVideoPhoto = null;
let endedVideoPhoto = null;
let audioUnlocked = false;
let videoRoundKeys = new Set();
let audibleVideoRoundKeys = new Set();
let audioPlaybackStartedAt = 0;
let audioMinimumHoldUntil = 0;
let pendingAudioTarget = null;
// Video handoff rules:
// - A video normally gets at least four seconds of play time.
// - Switch immediately when its center reaches 80% of the viewport.
// - Only choose a replacement whose center is between 15% and 50% of the
//   viewport height.
const MIN_VIDEO_HOLD_MS = 4000;
const VIDEO_SWITCH_CENTER_RATIO = 0.80;
const NEXT_VIDEO_MIN_CENTER_RATIO = 0.15;
const NEXT_VIDEO_MAX_CENTER_RATIO = 0.50;
const VIDEO_FALLBACK_TRIGGER_RATIO = 0.95;
const FALLBACK_VIDEO_MIN_CENTER_RATIO = 0.05;
const FALLBACK_VIDEO_MAX_CENTER_RATIO = 0.95;
const VIDEO_AUDIO_UPDATE_INTERVAL_MS = 150;
let soundEnabled = true;
let backgroundAudioPhoto = null;
let backgroundAudioPrepared = false;
let backgroundAudioPreparing = false;
let backgroundAudioActive = false;
let backgroundAudioItem = null;
let lastVideoAudioUpdateMs = -Infinity;

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function getEffectivePhotoWidth() {
  const activeColumns = lightColumnCount === 3 ? 3 : 2;
  const edgePadding = isMobileViewport() ? 22 : 40;
  const gap = isMobileViewport() ? 18 : 28;
  const availableWidth = window.innerWidth - (edgePadding * 2) - (gap * (activeColumns - 1));
  const maxPerColumn = Math.floor(availableWidth / activeColumns);
  const minimumPhotoWidth = isMobileViewport() ? 80 : 120;
  return Math.min(maxPerColumn, Math.max(minimumPhotoWidth, photoWidth));
}

function syncPhotoScaleVars() {
  const effectivePhotoWidth = getEffectivePhotoWidth();
  const textSize = Math.max(12, Math.min(40, effectivePhotoWidth / 18));
  document.documentElement.style.setProperty("--photo-width", `${effectivePhotoWidth}px`);
  document.documentElement.style.setProperty("--photo-text-size", `${textSize}px`);
  for (const photo of photos) {
    photo.textEl.style.fontSize = `${textSize}px`;
  }
}

function extractYearFromDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const text = String(dateValue).trim();
  const trailingYearMatch = text.match(/(\d{4})$/);
  if (trailingYearMatch) {
    return parseInt(trailingYearMatch[1], 10);
  }

  const anyYearMatch = text.match(/\b(\d{4})\b/);
  if (anyYearMatch) {
    return parseInt(anyYearMatch[1], 10);
  }

  return null;
}

function getManifestItemYear(item, folder) {
  const metadataYear = item && item.hasDateMetadata === true
    ? extractYearFromDate(item.date)
    : null;
  return metadataYear ?? extractYearFromDate(folder);
}

function deriveAvailableYearBounds() {
  if (!manifest) {
    return null;
  }

  const years = [];
  for (const source of getActiveManifests()) {
    for (const [folder, images] of Object.entries(source.data)) {
      for (const image of images) {
      const year = getManifestItemYear(image, folder);
      if (year !== null) {
        years.push(year);
      }
      }
    }
  }

  if (years.length === 0) {
    return null;
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years)
  };
}

function updateYearRangeDisplay() {
  if (selectedStartYear === null || selectedEndYear === null) {
    yearRangeValue.textContent = "All years";
    yearRangeActive.style.left = "0px";
    yearRangeActive.style.width = "0px";
    return;
  }

  const min = minAvailableYear ?? selectedStartYear;
  const max = maxAvailableYear ?? selectedEndYear;
  const span = Math.max(1, max - min);
  const startPercent = ((selectedStartYear - min) / span) * 100;
  const endPercent = ((selectedEndYear - min) / span) * 100;

  yearRangeActive.style.left = `${startPercent}%`;
  yearRangeActive.style.width = `${Math.max(1, endPercent - startPercent)}%`;

  yearRangeValue.textContent =
    selectedStartYear === selectedEndYear
      ? `${selectedStartYear}`
      : `${selectedStartYear} - ${selectedEndYear}`;
}

function initializeYearRangeFromManifest() {
  const bounds = deriveAvailableYearBounds();

  if (!bounds) {
    yearStartSlider.disabled = true;
    yearEndSlider.disabled = true;
    selectedStartYear = null;
    selectedEndYear = null;
    updateYearRangeDisplay();
    return;
  }

  minAvailableYear = bounds.min;
  maxAvailableYear = bounds.max;

  yearStartSlider.disabled = false;
  yearEndSlider.disabled = false;

  yearStartSlider.min = String(minAvailableYear);
  yearStartSlider.max = String(maxAvailableYear);
  yearEndSlider.min = String(minAvailableYear);
  yearEndSlider.max = String(maxAvailableYear);

  if (selectedStartYear === null || selectedStartYear < minAvailableYear || selectedStartYear > maxAvailableYear) {
    selectedStartYear = minAvailableYear;
  }
  if (selectedEndYear === null || selectedEndYear > maxAvailableYear || selectedEndYear < minAvailableYear) {
    selectedEndYear = maxAvailableYear;
  }

  if (selectedStartYear > selectedEndYear) {
    selectedStartYear = minAvailableYear;
    selectedEndYear = maxAvailableYear;
  }

  yearStartSlider.value = String(selectedStartYear);
  yearEndSlider.value = String(selectedEndYear);
  updateYearRangeDisplay();
}

async function loadManifest() {
  try {
    const [imageResponse, videoResponse, audioResponse] = await Promise.all([
      fetch(MANIFEST_URL),
      fetch(VIDEO_MANIFEST_URL).catch(() => null),
      fetch(AUDIO_MANIFEST_URL).catch(() => null)
    ]);
    if (!imageResponse.ok) {
      throw new Error(`Image manifest request failed: ${imageResponse.status}`);
    }
    imageManifest = await imageResponse.json();
    videoManifest = videoResponse && videoResponse.ok ? await videoResponse.json() : {};
    audioManifest = audioResponse && audioResponse.ok ? await audioResponse.json() : [];
    prepareBackgroundAudio();
    console.log("[manifest-load]", {
      imageFolders: Object.keys(imageManifest || {}).length,
      videoFolders: Object.keys(videoManifest || {}).length,
      videoEntries: Object.values(videoManifest || {}).reduce((total, items) => total + items.length, 0),
      audioEntries: Array.isArray(audioManifest) ? audioManifest.length : 0,
      videoStatus: videoResponse ? videoResponse.status : "unavailable",
      audioStatus: audioResponse ? audioResponse.status : "unavailable"
    });
    manifest = imageManifest;
    updateMediaMixControl();
    await loadGroups();
    populateFolderSelect();
    initializeYearRangeFromManifest();
    populatePeopleFilter();
  } catch (error) {
    console.error("Error loading manifest:", error);
  }
}

function normalizeCustomGroups(rawGroups) {
  const normalized = {};
  if (!rawGroups || typeof rawGroups !== "object" || Array.isArray(rawGroups)) {
    return normalized;
  }

  for (const [groupName, members] of Object.entries(rawGroups)) {
    const cleanGroupName = String(groupName || "").trim();
    if (!cleanGroupName || !Array.isArray(members)) {
      continue;
    }

    const seen = new Set();
    const cleanMembers = [];
    for (const member of members) {
      const cleanMember = String(member || "").trim();
      if (!cleanMember) {
        continue;
      }
      const key = cleanMember.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      cleanMembers.push(cleanMember);
    }

    normalized[cleanGroupName] = cleanMembers;
  }

  return normalized;
}

async function loadGroups() {
  customGroups = { ...DEFAULT_CUSTOM_GROUPS };

  try {
    const response = await fetch(GROUPS_URL);
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const candidateGroups = payload && typeof payload === "object" && !Array.isArray(payload) && payload.groups
      ? payload.groups
      : payload;
    const parsedGroups = normalizeCustomGroups(candidateGroups);

    customGroups = {
      ...DEFAULT_CUSTOM_GROUPS,
      ...parsedGroups
    };
  } catch (error) {
    console.warn("Unable to load groups.json; using defaults.", error);
  }
}

function populateFolderSelect() {
  folderSelect.innerHTML = "";
  if (!manifest) return;

  // Add "all" option first
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  allOption.selected = selectedFolder === "all";
  folderSelect.appendChild(allOption);

  // Add individual folders from both media libraries.
  const folders = new Set(getActiveManifests().flatMap((source) => Object.keys(source.data)));
  for (const folder of Array.from(folders).sort()) {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    if (folder === selectedFolder) {
      option.selected = true;
    }
    folderSelect.appendChild(option);
  }
}

const MEDIA_MIXES = [
  { photos: 100, videos: 0 },
  { photos: 75, videos: 25 },
  { photos: 50, videos: 50 },
  { photos: 25, videos: 75 },
  { photos: 0, videos: 100 }
];

function hasVideos() {
  return videoManifest && Object.values(videoManifest).some((items) => items.length > 0);
}

function getMediaMix() {
  return MEDIA_MIXES[mediaMixIndex] || MEDIA_MIXES[0];
}

function getActiveManifests() {
  const mix = getMediaMix();
  const videosAvailable = hasVideos();
  const manifests = [];
  if (naturalMediaMix) {
    if (imageManifest) {
      manifests.push({ data: imageManifest, mediaType: "image" });
    }
    if (videosAvailable) {
      manifests.push({ data: videoManifest, mediaType: "video" });
    }
    return manifests;
  }
  // Always fall back to photos when the selected video share cannot be
  // fulfilled, including the 0% photos / 100% videos setting.
  if (mix.photos > 0 || !videosAvailable) {
    manifests.push({ data: imageManifest, mediaType: "image" });
  }
  if (mix.videos > 0 && videosAvailable) {
    manifests.push({ data: videoManifest, mediaType: "video" });
  }
  return manifests.filter((source) => source.data);
}

function updateMediaMixControl() {
  const mix = getMediaMix();
  mediaMixSlider.value = String(mediaMixIndex);
  mediaMixValue.textContent = `${mix.photos}% photos · ${mix.videos}% videos`;
  mediaMixValue.textContent = naturalMediaMix
    ? "Natural mix - based on available media"
    : `${mix.photos}% photos · ${mix.videos}% videos`;
  mediaMixSlider.disabled = !hasVideos() || naturalMediaMix;
  mediaMixSlider.title = hasVideos() ? "Choose the photos and videos mix" : "Add videos to the videos folder first";
}

mediaMixSlider.addEventListener("input", () => {
  mediaMixIndex = parseInt(mediaMixSlider.value, 10) || 0;
  manifest = imageManifest;
  updateMediaMixControl();
  populateFolderSelect();
  initializeYearRangeFromManifest();
  populatePeopleFilter();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
});

naturalMediaCheckbox.addEventListener("change", (event) => {
  naturalMediaMix = event.target.checked;
  manifest = imageManifest;
  updateMediaMixControl();
  populateFolderSelect();
  initializeYearRangeFromManifest();
  populatePeopleFilter();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
});

orderedCheckbox.addEventListener("change", (event) => {
  selectedOrder = event.target.checked ? "ascending" : "random";
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
});

folderSelect.addEventListener("change", (event) => {
  selectedFolder = event.target.value;
  populatePeopleFilter();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
});

backgroundSelect.addEventListener("change", (event) => {
  applyBackground(event.target.value);
  resetHideTimer();
});

lightColorSelect.addEventListener("change", (event) => {
  applyLightColor(event.target.value);
  resetHideTimer();
});

stringColorSelect.addEventListener("change", (event) => {
  applyStringColor(event.target.value);
  resetHideTimer();
});

textSelect.addEventListener("change", (event) => {
  textMode = event.target.value;
  assignRandomImages();
  resetHideTimer();
});

lightColumnsSelect.addEventListener("change", (event) => {
  lightColumnCount = parseInt(event.target.value, 10) === 3 ? 3 : 2;
  syncPhotoScaleVars();
  updateLightStreamVisibility();
  updateCenterPhotoVisibility();
  activeQueuePhotos = sortPhotosForQueue(getActivePhotos());
  layoutLights();
  layoutPhotos();
  assignRandomImages();
  resetHideTimer();
});

function applyYearRangeChange() {
  updateYearRangeDisplay();
  populatePeopleFilter();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
}

yearStartSlider.addEventListener("input", () => {
  if (selectedEndYear === null) {
    return;
  }

  const startYear = parseInt(yearStartSlider.value, 10);
  selectedStartYear = Math.min(startYear, selectedEndYear);
  yearStartSlider.value = String(selectedStartYear);
  applyYearRangeChange();
});

yearEndSlider.addEventListener("input", () => {
  if (selectedStartYear === null) {
    return;
  }

  const endYear = parseInt(yearEndSlider.value, 10);
  selectedEndYear = Math.max(endYear, selectedStartYear);
  yearEndSlider.value = String(selectedEndYear);
  applyYearRangeChange();
});

resetControlsBtn.addEventListener("click", () => {
  resetControlsToDefaults();
});

function shuffleArray(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function resolveImagePath(image, folder) {
  if (image.path) {
    return image.path;
  }
  if (folder.toLowerCase() === "various") {
    return image.filename;
  }
  return `${folder}/${image.filename}`;
}

function buildPhotoUrl(relativePath, mediaType = "image") {
  const encodedPath = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const mediaFolder = mediaType === "video" ? "videos" : "images";
  const storagePath = isLocalRuntime ? encodedPath : `${mediaFolder}/${encodedPath}`;
  return `${isLocalRuntime ? mediaFolder : R2_BASE_URL}/${storagePath}`;
}

function buildAudioUrl(relativePath) {
  const encodedPath = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `audio/${encodedPath}`;
}

function imageMatchesActiveFilters(image, { ignorePerson = false } = {}) {
  const fullYearRangeSelected =
    selectedStartYear === null ||
    selectedEndYear === null ||
    (selectedStartYear === minAvailableYear && selectedEndYear === maxAvailableYear);
  if (!image.hasKnownYear && !fullYearRangeSelected) {
    return false;
  }
  const inYearRange =
    selectedStartYear === null ||
    selectedEndYear === null ||
    image.year === null ||
    (image.year >= selectedStartYear && image.year <= selectedEndYear);
  if (!inYearRange) {
    return false;
  }

  if (ignorePerson || selectedPeople.size === 0) {
    return true;
  }

  const peopleInImage = new Set(image.people || []);
  for (const selectedPerson of selectedPeople) {
    if (!peopleInImage.has(selectedPerson)) {
      return false;
    }
  }
  return true;
}

function getMediaDateSortValue(item) {
  if (item.hasDateMetadata) {
    const dateText = String(item.date || "").replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
    const timestamp = Date.parse(dateText);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return item.year === null ? Number.POSITIVE_INFINITY : new Date(item.year, 0, 1).getTime();
}

function orderMediaItems(items) {
  if (selectedOrder !== "ascending") {
    return shuffleArray(items);
  }
  return [...items].sort((a, b) => {
    const dateDifference = getMediaDateSortValue(a) - getMediaDateSortValue(b);
    return dateDifference || a._key.localeCompare(b._key);
  });
}

function buildImagePool({ ignorePerson = false } = {}) {
  if (!imageManifest) {
    return [];
  }

  const pool = [];
  for (const source of getActiveManifests()) {
    const folders = selectedFolder === "all"
      ? Object.entries(source.data)
      : [[selectedFolder, source.data[selectedFolder] || []]];
    for (const [folder, items] of folders) {
      for (const item of items) {
        const relativePath = resolveImagePath(item, folder);
        // The local build keeps root videos in videos/Various/, but the
        // manually managed R2 bucket stores those files directly in videos/.
        // Keep the local layout untouched while mapping the deployed URL.
        const mediaPath = !isLocalRuntime &&
          source.mediaType === "video" &&
          folder === "Various"
          ? item.filename
          : relativePath;
        pool.push({
          filename: buildPhotoUrl(mediaPath, source.mediaType),
          mediaType: source.mediaType,
          hasAudio: item.hasAudio !== false,
          text: item.text || "",
          people: normalizePeopleField(item.people),
          isMuted: item.isMuted === true,
          folder,
          date: item.date || "",
          hasDateMetadata: item.hasDateMetadata === true,
          year: getManifestItemYear(item, folder),
          hasKnownYear: getManifestItemYear(item, folder) !== null,
          _key: `${source.mediaType}:${relativePath}`
        });
      }
    }
  }

  const matchingPool = pool
    .filter((image) => !unavailableMediaKeys.has(image._key))
    .filter((image) => imageMatchesActiveFilters(image, { ignorePerson }));
  return createWeightedMediaPool(matchingPool);
}

function createWeightedMediaPool(pool) {
  if (naturalMediaMix) {
    return orderMediaItems(pool);
  }

  const mix = getMediaMix();
  if (mix.photos === 100 || mix.videos === 100) {
    return orderMediaItems(pool);
  }

  const photoItems = orderMediaItems(pool.filter((item) => item.mediaType === "image"));
  const videoItems = orderMediaItems(pool.filter((item) => item.mediaType === "video"));
  if (!photoItems.length || !videoItems.length) {
    return pool;
  }

  // Build a predictable ratio pattern instead of relying on random chance.
  // For example, 75/25 places videos at positions 4, 8, 12, etc.
  const cycleLength = Math.max(photoItems.length, videoItems.length);
  const weightedPool = [];
  let videoAccumulator = 0;
  let photoIndex = 0;
  let videoIndex = 0;

  for (let index = 0; index < cycleLength; index += 1) {
    videoAccumulator += mix.videos;
    const useVideo = videoAccumulator >= 100;
    if (useVideo) {
      videoAccumulator -= 100;
    }

    if (useVideo) {
      weightedPool.push({ ...videoItems[videoIndex % videoItems.length] });
      videoIndex += 1;
    } else {
      weightedPool.push({ ...photoItems[photoIndex % photoItems.length] });
      photoIndex += 1;
    }
  }

  // Keep the random order, but avoid showing the same video in adjacent
  // video slots when there is another video available.
  for (let index = 1; index < weightedPool.length; index += 1) {
    const previous = weightedPool[index - 1];
    const current = weightedPool[index];
    if (previous.mediaType !== "video" || current.mediaType !== "video" || previous._key !== current._key) {
      continue;
    }

    const replacementIndex = weightedPool.findIndex((candidate, candidateIndex) =>
      candidateIndex > index &&
      candidate.mediaType === "video" &&
      candidate._key !== previous._key
    );
    if (replacementIndex !== -1) {
      [weightedPool[index], weightedPool[replacementIndex]] = [weightedPool[replacementIndex], weightedPool[index]];
    }
  }

  // Also prevent the final video in one cycle from matching the first video
  // in the next cycle.
  if (lastServedImageKey) {
    const firstVideoIndex = weightedPool.findIndex((item) => item.mediaType === "video");
    const lastVideoIndex = weightedPool.length - 1;
    if (
      firstVideoIndex !== -1 &&
      weightedPool[firstVideoIndex]._key === lastServedImageKey &&
      weightedPool[lastVideoIndex].mediaType === "video"
    ) {
      const replacementIndex = weightedPool.findIndex((candidate, candidateIndex) =>
        candidateIndex > firstVideoIndex &&
        candidate.mediaType === "video" &&
        candidate._key !== lastServedImageKey
      );
      if (replacementIndex !== -1) {
        [weightedPool[firstVideoIndex], weightedPool[replacementIndex]] = [weightedPool[replacementIndex], weightedPool[firstVideoIndex]];
      }
    }
  }

  return weightedPool;
}

function resetImageCycle() {
  const pool = buildImagePool();
  // buildImagePool already randomizes each media list while preserving the
  // requested repeating photo/video pattern.
  imageCycle = pool;
  imageCycleIndex = 0;
  videoRoundKeys.clear();
  audibleVideoRoundKeys.clear();
  pendingAudioTarget = null;
  hasAvailableImages = imageCycle.length > 0;
  updateCenterPhotoVisibility();

  // Prevent the first image in the new cycle from repeating the previous image.
  if (selectedOrder !== "ascending" && imageCycle.length > 1 && lastServedImageKey && imageCycle[0]._key === lastServedImageKey) {
    const swapIndex = 1 + Math.floor(Math.random() * (imageCycle.length - 1));
    [imageCycle[0], imageCycle[swapIndex]] = [imageCycle[swapIndex], imageCycle[0]];
  }
}

function getNextImage() {
  if (!manifest || !hasAvailableImages) {
    return null;
  }

  if (imageCycle.length === 0 || imageCycleIndex >= imageCycle.length) {
    resetImageCycle();
  }

  if (imageCycle.length === 0) {
    return null;
  }

  let imageData = imageCycle[imageCycleIndex];

  if (selectedOrder !== "ascending" && imageData.mediaType === "video") {
    const allVideoKeys = new Set(
      imageCycle.filter((item) => item.mediaType === "video").map((item) => item._key)
    );
    const videosAlreadyOnStrings = new Set(
      photos
        .filter((photo) => photo.currentMediaType === "video" && photo.currentImageKey)
        .map((photo) => photo.currentImageKey)
    );

    const videoRoundComplete = allVideoKeys.size > 0 && videoRoundKeys.size >= allVideoKeys.size;
    if (videoRoundComplete) {
      videoRoundKeys.clear();
    }

    if (videosAlreadyOnStrings.has(imageData._key) && !videoRoundComplete) {
      const unusedVideoIndex = imageCycle.findIndex((candidate, candidateIndex) =>
        candidateIndex >= imageCycleIndex &&
        candidate.mediaType === "video" &&
        !videoRoundKeys.has(candidate._key) &&
        !videosAlreadyOnStrings.has(candidate._key)
      );
      if (unusedVideoIndex !== -1) {
        [imageCycle[imageCycleIndex], imageCycle[unusedVideoIndex]] =
          [imageCycle[unusedVideoIndex], imageCycle[imageCycleIndex]];
        imageData = imageCycle[imageCycleIndex];
      }
    }
  }

  imageCycleIndex += 1;
  if (imageData.mediaType === "video") {
    videoRoundKeys.add(imageData._key);
  }
  lastServedImageKey = imageData._key;
  return imageData;
}

function setupClickListeners() {
  for (const photo of photos) {
    photo.container.addEventListener("click", (event) => {
      event.stopPropagation();
      if (photo.currentMediaType === "video") {
        // Clicking a video selects it for active sound without replacing its
        // media. Manual selections use the extended 95% cutoff below.
        audibleVideoPhoto = photo;
        manuallySelectedVideoPhoto = photo;
        audioPlaybackStartedAt = 0;
        audioMinimumHoldUntil = 0;
        for (const candidate of photos) {
          if (candidate.currentMediaType !== "video") {
            continue;
          }
          const isSelected = candidate === photo;
          candidate.videoEl.muted = !isSelected || !soundEnabled || !audioUnlocked;
          candidate.container.classList.toggle(
            "audio-active",
            isSelected && soundEnabled && audioUnlocked
          );
        }
        updateVideoAudio();
        return;
      }
      assignRandomImageToPhoto(photo);
    });
  }
}

function assignRandomImages() {
  for (const photo of activeQueuePhotos) {
    assignRandomImageToPhoto(photo);
  }
}

function handleUnavailableMedia(photo, imageData, requestId) {
  if (photo.pendingRequestId !== requestId || photo.currentImageKey !== imageData._key) {
    return;
  }

  console.warn("Skipping unavailable media:", imageData.filename);
  unavailableMediaKeys.add(imageData._key);
  photo.imgEl.onload = null;
  photo.imgEl.onerror = null;
  photo.videoEl.onerror = null;
  photo.videoEl.pause();
  photo.videoEl.removeAttribute("src");
  photo.videoEl.load();

  resetImageCycle();
  if (imageCycle.length > 0) {
    assignRandomImageToPhoto(photo);
    return;
  }

  photo.currentMediaType = null;
  photo.currentImageKey = null;
  hasAvailableImages = false;
  updateCenterPhotoVisibility();
}

function normalizePeopleField(rawPeople) {
  if (!Array.isArray(rawPeople)) {
    return [];
  }

  const cleaned = [];
  const seen = new Set();
  for (const person of rawPeople) {
    const normalized = String(person || "").trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cleaned.push(normalized);
  }
  return cleaned;
}

function updatePeopleSummary() {
  if (selectedGroupName) {
    peopleFilterSummary.textContent = selectedGroupName;
    return;
  }

  if (selectedPeople.size === 0) {
    peopleFilterSummary.textContent = "All";
    return;
  }

  if (selectedPeople.size === 1) {
    peopleFilterSummary.textContent = Array.from(selectedPeople)[0];
    return;
  }

  peopleFilterSummary.textContent = `${selectedPeople.size} selected`;
}

function applyPeopleFilterChange() {
  updatePeopleSummary();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
}

function getKnownPeopleLookup() {
  const lookup = new Map();
  if (!manifest) {
    return lookup;
  }

  for (const images of Object.values(manifest)) {
    for (const image of images) {
      for (const person of normalizePeopleField(image.people)) {
        const key = person.toLowerCase();
        if (!lookup.has(key)) {
          lookup.set(key, person);
        }
      }
    }
  }

  return lookup;
}

function getResolvedGroupMembers(groupName) {
  const groupMembers = Array.isArray(customGroups[groupName]) ? customGroups[groupName] : [];
  const knownPeopleLookup = getKnownPeopleLookup();
  const resolved = [];
  const seen = new Set();

  for (const member of groupMembers) {
    const cleanMember = String(member || "").trim();
    if (!cleanMember) {
      continue;
    }
    const canonical = knownPeopleLookup.get(cleanMember.toLowerCase()) || cleanMember;
    const key = canonical.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    resolved.push(canonical);
  }

  return resolved;
}

function getOrderedCustomGroupNames() {
  const names = Object.keys(customGroups || {}).filter((name) => Array.isArray(customGroups[name]));
  return names.sort((a, b) => {
    if (a.toLowerCase() === "friends") {
      return -1;
    }
    if (b.toLowerCase() === "friends") {
      return 1;
    }
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function renderPeopleOptions() {
  peopleOptions.innerHTML = "";

  const createPeopleButton = (label, active, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "people-option-button";
    button.textContent = label;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.classList.toggle("active", active);
    button.addEventListener("click", onClick);
    peopleOptions.appendChild(button);
  };

  createPeopleButton("All", selectedPeople.size === 0, () => {
    selectedPeople.clear();
    selectedGroupName = null;
    renderPeopleOptions();
    applyPeopleFilterChange();
  });

  for (const groupName of getOrderedCustomGroupNames()) {
    createPeopleButton(groupName, selectedGroupName === groupName, () => {
      selectedGroupName = groupName;
      selectedPeople = new Set(getResolvedGroupMembers(groupName));
      renderPeopleOptions();
      applyPeopleFilterChange();
    });
  }

  for (const person of availablePeople) {
    createPeopleButton(person, selectedPeople.has(person), () => {
      selectedGroupName = null;
      if (selectedPeople.has(person)) {
        selectedPeople.delete(person);
      } else {
        selectedPeople.add(person);
      }
      renderPeopleOptions();
      applyPeopleFilterChange();
    });
  }
}

peopleFilterToggle.addEventListener("click", () => {
  const isOpen = !peopleOptionsRow.classList.contains("hidden");
  peopleOptionsRow.classList.toggle("hidden", isOpen);
  peopleFilterToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
});

function populatePeopleFilter() {
  availablePeople = [];
  if (manifest) {
    const uniquePeople = new Set();
    for (const image of buildImagePool({ ignorePerson: true })) {
      for (const person of image.people || []) {
        uniquePeople.add(person);
      }
    }
    availablePeople = Array.from(uniquePeople).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  selectedPeople = new Set(
    Array.from(selectedPeople).filter((person) => availablePeople.includes(person))
  );
  if (selectedGroupName) {
    selectedPeople = new Set(getResolvedGroupMembers(selectedGroupName));
  }

  renderPeopleOptions();
  updatePeopleSummary();
}

function getDisplayTextForImage(imageData) {
  if (textMode === "disabled") {
    return "";
  }

  const customText = (imageData.text || "").trim();
  if (customText) {
    return customText;
  }

  switch (textMode) {
    case "auto":
      return imageData.folder.toLowerCase() === "various"
        ? imageData.date
        : imageData.folder;
    case "custom":
      return imageData.text;
    case "name":
      return imageData.folder;
    case "date":
      return imageData.date;
    default:
      return "";
  }
}

function assignRandomImageToPhoto(photo) {
  const imageData = getNextImage();
  if (!imageData) {
    return;
  }
  // A photo can never retain the active-video highlight. If the selected
  // video slot is replaced, clear the old selection before assigning media.
  if (audibleVideoPhoto === photo) {
    audibleVideoPhoto = null;
    manuallySelectedVideoPhoto = null;
    audioPlaybackStartedAt = 0;
    audioMinimumHoldUntil = 0;
  }
  photo.container.classList.remove("audio-active");
  const nextCaption = getDisplayTextForImage(imageData);
  photo.audioStartPreparation?.();
  photo.currentMediaType = imageData.mediaType;
  photo.currentImageKey = imageData._key;
  photo.currentHasAudio = imageData.hasAudio !== false;
  photo.currentIsMuted = imageData.mediaType === "video" && imageData.isMuted === true;
  photo.audioRandomStartApplied = false;
  photo.debugVideoDuration = null;
  photo.debugVideoStartTime = null;
  photo.videoStartSeekComplete = false;
  const requestId = (photo.pendingRequestId || 0) + 1;
  photo.pendingRequestId = requestId;

  const finalizeCaptionUpdate = () => {
    if (photo.pendingRequestId !== requestId) {
      return;
    }
    photo.textEl.textContent = nextCaption;
    photo.imgEl.onload = null;
    photo.imgEl.onerror = null;
  };

  if (imageData.mediaType === "video") {
    photo.imgEl.onload = null;
    photo.imgEl.onerror = null;
    photo.videoEl.onerror = () => handleUnavailableMedia(photo, imageData, requestId);
    photo.imgEl.style.display = "none";
    photo.videoEl.style.display = "block";
    photo.videoEl.src = imageData.filename;
    photo.videoAssignmentId = ++videoAssignmentSequence;
    photo.videoEl.load();
    // Choose and apply the random start as soon as the video is assigned.
    // The video stays paused while metadata is read and the seek completes,
    // so it cannot visibly begin at 0 seconds first.
    prepareVideoAudioStart(photo, () => {
      if (photo.currentMediaType === "video" &&
          photo.videoStartSeekComplete && !photo.videoEl.ended &&
          isPhotoInViewport(photo)) {
        photo.videoEl.play().catch(() => {});
      }
    });
    finalizeCaptionUpdate();
  } else {
    photo.container.classList.remove("debug-video-text");
    photo.textEl.style.fontSize = "";
    photo.videoEl.pause();
    photo.videoEl.onerror = null;
    photo.videoEl.removeAttribute("src");
    photo.videoEl.load();
    photo.videoEl.style.display = "none";
    photo.imgEl.style.display = "block";
    photo.imgEl.onload = finalizeCaptionUpdate;
    photo.imgEl.onerror = () => handleUnavailableMedia(photo, imageData, requestId);
    photo.imgEl.src = imageData.filename;

    if (photo.imgEl.complete) {
      finalizeCaptionUpdate();
    }
  }
}

function prepareVideoAudioStart(photo, onReady) {
  const video = photo.videoEl;
  if (photo.audioStartPreparation) {
    return;
  }
  if (photo.audioRandomStartApplied) {
    if (photo.videoStartSeekComplete) {
      onReady();
    }
    return;
  }

  let finished = false;
  let seekStarted = false;
  let seekAttempts = 0;
  let requestedStart = null;
  const cleanup = () => {
    video.removeEventListener("loadedmetadata", tryPrepare);
    video.removeEventListener("durationchange", tryPrepare);
    video.removeEventListener("loadeddata", tryPrepare);
    video.removeEventListener("seeked", finishSeek);
    video.removeEventListener("canplay", finishSeek);
    photo.audioStartPreparation = null;
  };
  const finishSeek = () => {
    if (!seekStarted || video.seeking) {
      return;
    }

    const actualStart = video.currentTime;
    const seekTolerance = 0.25;
    if (requestedStart > seekTolerance &&
        actualStart < requestedStart - seekTolerance &&
        seekAttempts < 2) {
      seekAttempts += 1;
      video.currentTime = requestedStart;
      return;
    }

    debugVideoStart("[video-seek-complete]", {
      key: photo.currentImageKey,
      requestedStart,
      actualStart,
      seekAttempts,
      seekableStart: video.seekable.length ? video.seekable.start(0) : null,
      seekableEnd: video.seekable.length ? video.seekable.end(video.seekable.length - 1) : null
    });
    finish();
  };
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    photo.videoStartSeekComplete = true;
    cleanup();
    onReady();
  };
  const tryPrepare = () => {
    if (photo.currentMediaType !== "video") {
      cleanup();
      return;
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      debugVideoStart("[video-start-skipped-no-duration]", {
        key: photo.currentImageKey,
        duration: video.duration,
        phase: "audio-handoff"
      });
      return;
    }
    if (seekStarted) {
      return;
    }

    seekStarted = true;
    video.pause();
    photo.debugVideoDuration = video.duration;
    // Start anywhere in the video, including near the beginning or end. The
    // video element is looped and continues playing until this photo slot is
    // destroyed/replaced.
    const randomStart = Math.random() * video.duration;
    requestedStart = randomStart;
    photo.debugVideoStartTime = randomStart;
    debugVideoStart("[video-start-calculated]", {
      key: photo.currentImageKey,
      duration: video.duration,
      randomStartMax: video.duration,
      randomStart,
      phase: "audio-handoff"
    });
    if (randomStart > 0.001) {
      video.addEventListener("seeked", finishSeek);
    }
    video.currentTime = randomStart;
    photo.audioRandomStartApplied = true;
    if (randomStart <= 0.001) {
      finish();
    }
  };

  photo.audioStartPreparation = cleanup;
  video.addEventListener("loadedmetadata", tryPrepare);
  video.addEventListener("durationchange", tryPrepare);
  video.addEventListener("loadeddata", tryPrepare);
  video.addEventListener("canplay", finishSeek);
  tryPrepare();
}

function prepareBackgroundAudio() {
  if (backgroundAudioPreparing || backgroundAudioPrepared || !audioManifest.length) {
    return;
  }

  backgroundAudioPreparing = true;
  backgroundAudioItem = audioManifest[Math.floor(Math.random() * audioManifest.length)];
  backgroundAudio.src = buildAudioUrl(backgroundAudioItem.path || backgroundAudioItem.filename);
  backgroundAudio.muted = true;
  backgroundAudio.pause();
  backgroundAudio.load();

  let prepared = false;
  const finishPreparation = () => {
    if (prepared || !Number.isFinite(backgroundAudio.duration) || backgroundAudio.duration <= 0) {
      return;
    }
    prepared = true;
    const latestSafeStart = Math.max(0, backgroundAudio.duration - 10);
    const randomStart = Math.random() * latestSafeStart;
    const finishSeek = () => {
      backgroundAudio.removeEventListener("seeked", finishSeek);
      backgroundAudioPrepared = true;
      backgroundAudioPreparing = false;
      debugVideoStart("[startup-audio-prepared]", {
        audio: backgroundAudioItem.path || backgroundAudioItem.filename,
        duration: backgroundAudio.duration,
        randomStart,
        actualStart: backgroundAudio.currentTime
      });
      // Keep the song running continuously. It starts muted and is unmuted
      // only when a muted video becomes the selected video.
      backgroundAudio.muted = true;
      backgroundAudio.play().catch(() => {});
    };
    backgroundAudio.addEventListener("seeked", finishSeek);
    if (typeof backgroundAudio.fastSeek === "function" && randomStart > 0.01) {
      backgroundAudio.fastSeek(randomStart);
    } else {
      backgroundAudio.currentTime = randomStart;
    }
    if (randomStart <= 0.01) {
      finishSeek();
    }
  };

  backgroundAudio.addEventListener("loadedmetadata", finishPreparation);
  backgroundAudio.addEventListener("durationchange", finishPreparation);
  backgroundAudio.addEventListener("loadeddata", finishPreparation);
  finishPreparation();
}

function syncBackgroundAudio(photo) {
  const mutedVideoSelected = Boolean(
    photo && photo.currentMediaType === "video" && photo.currentIsMuted
  );
  backgroundAudioActive = mutedVideoSelected;

  backgroundAudioPhoto = mutedVideoSelected ? photo : null;
  backgroundAudio.muted = !(mutedVideoSelected && soundEnabled && audioUnlocked);
  if (backgroundAudioPrepared && backgroundAudio.paused) {
    backgroundAudio.play().catch(() => {});
  }
}

function isPhotoInViewport(photo) {
  if (photo.currentMediaType !== "video" || photo.container.style.display === "none") {
    return false;
  }
  const bounds = photo.container.getBoundingClientRect();
  return bounds.bottom > 32 && bounds.top < window.innerHeight - 32;
}

function updateVideoAudio() {
  const allVideoEntries = photos
    .map((photo) => {
      if (photo.currentMediaType !== "video" || photo.container.style.display === "none") {
        return null;
      }
      return { photo, bounds: photo.container.getBoundingClientRect() };
    })
    .filter(Boolean);
  const visibleVideos = allVideoEntries.filter(({ bounds }) =>
    bounds.bottom > 32 && bounds.top < window.innerHeight - 32
  );
  const visibleVideoPhotos = new Set(visibleVideos.map(({ photo }) => photo));
  const videosInCenterRange = (entries, minimumRatio, maximumRatio) => entries.filter(({ bounds }) => {
    const center = (bounds.top + bounds.bottom) / 2;
    return center >= window.innerHeight * minimumRatio &&
      center <= window.innerHeight * maximumRatio;
  });
  const chooseRandomVideo = (entries) => entries.length
    ? entries[Math.floor(Math.random() * entries.length)]
    : null;
  const orderedVisibleVideos = visibleVideos
    .filter(({ bounds }) => {
      const center = (bounds.top + bounds.bottom) / 2;
      return center >= window.innerHeight * NEXT_VIDEO_MIN_CENTER_RATIO &&
        center <= window.innerHeight * NEXT_VIDEO_MAX_CENTER_RATIO;
    })
    .sort((a, b) => {
      const aCenter = (a.bounds.top + a.bounds.bottom) / 2;
      const bCenter = (b.bounds.top + b.bounds.bottom) / 2;
      return aCenter - bCenter;
    });
  const fallbackVisibleVideos = visibleVideos
    .filter(({ bounds }) => {
      const center = (bounds.top + bounds.bottom) / 2;
      return center >= window.innerHeight * FALLBACK_VIDEO_MIN_CENTER_RATIO &&
        center <= window.innerHeight * FALLBACK_VIDEO_MAX_CENTER_RATIO;
    })
    .sort((a, b) => {
      const aCenter = (a.bounds.top + a.bounds.bottom) / 2;
      const bCenter = (b.bounds.top + b.bounds.bottom) / 2;
      return aCenter - bCenter;
    });
  const currentAudibleEntry = visibleVideos.find(({ photo }) => photo === audibleVideoPhoto);
  const minimumHoldComplete = performance.now() >= audioMinimumHoldUntil;
  const currentCenterY = currentAudibleEntry
    ? (currentAudibleEntry.bounds.top + currentAudibleEntry.bounds.bottom) / 2
    : null;
  const manualSelectionIsActive = manuallySelectedVideoPhoto === audibleVideoPhoto &&
    Boolean(audibleVideoPhoto && audibleVideoPhoto.currentMediaType === "video");
  const currentSwitchRatio = manualSelectionIsActive
    ? VIDEO_FALLBACK_TRIGGER_RATIO
    : VIDEO_SWITCH_CENTER_RATIO;
  const currentHasReachedSwitchHeight = currentCenterY !== null &&
    currentCenterY >= window.innerHeight * currentSwitchRatio;
  const currentHasLeftViewport = Boolean(audibleVideoPhoto && !currentAudibleEntry);
  let nextAudibleEntry = null;

  // The automatic center boundary is hard. A manually selected video gets
  // the extended 95% boundary before automatic handoff is considered.
  const currentVideoHasEnded = endedVideoPhoto === audibleVideoPhoto;
  if (currentVideoHasEnded) {
    endedVideoPhoto = null;
  }

  if (!audibleVideoPhoto || currentHasReachedSwitchHeight || currentHasLeftViewport || currentVideoHasEnded) {
    if (!audibleVideoPhoto) {
      // Startup selection uses a widening range so the wallpaper can begin
      // playing immediately without weakening the normal handoff rules.
      const startupCandidates = [
        videosInCenterRange(visibleVideos, 0.15, 0.50),
        videosInCenterRange(visibleVideos, 0.15, 0.80),
        videosInCenterRange(visibleVideos, 0.05, 0.80),
        videosInCenterRange(visibleVideos, 0.05, 0.95),
        allVideoEntries
      ];
      nextAudibleEntry = startupCandidates
        .map(chooseRandomVideo)
        .find(Boolean) || null;
    } else if (!currentAudibleEntry) {
      nextAudibleEntry = orderedVisibleVideos[0] || null;
    } else {
      // Choose the closest eligible video above the current one by actual
      // position. The eligible list already excludes centers below the
      // the 15%-50% next-video handoff range.
      const higherVideos = orderedVisibleVideos.filter((entry) => {
        const entryCenter = (entry.bounds.top + entry.bounds.bottom) / 2;
        return entry.photo !== audibleVideoPhoto && entryCenter < currentCenterY;
      });
      nextAudibleEntry = higherVideos.reduce((closest, entry) => {
        if (!closest) return entry;
        const entryCenter = (entry.bounds.top + entry.bounds.bottom) / 2;
        const closestCenter = (closest.bounds.top + closest.bounds.bottom) / 2;
        return entryCenter > closestCenter ? entry : closest;
      }, null);

      // If the normal 15%-50% range has no candidate, allow a fallback only
      // after the current video reaches the 95% line.
      if (!nextAudibleEntry && currentCenterY >= window.innerHeight * VIDEO_FALLBACK_TRIGGER_RATIO) {
        const fallbackVideos = fallbackVisibleVideos.filter((entry) => {
          const entryCenter = (entry.bounds.top + entry.bounds.bottom) / 2;
          return entry.photo !== audibleVideoPhoto && entryCenter < currentCenterY;
        });
        nextAudibleEntry = fallbackVideos.reduce((closest, entry) => {
          if (!closest) return entry;
          const entryCenter = (entry.bounds.top + entry.bounds.bottom) / 2;
          const closestCenter = (closest.bounds.top + closest.bounds.bottom) / 2;
          return entryCenter > closestCenter ? entry : closest;
        }, null);
      }
    }
  }

  const nextAudiblePhoto = nextAudibleEntry
    ? nextAudibleEntry.photo
    : currentAudibleEntry
    ? currentAudibleEntry.photo
    : !minimumHoldComplete
    ? audibleVideoPhoto
    : null;

  if (nextAudiblePhoto !== manuallySelectedVideoPhoto) {
    manuallySelectedVideoPhoto = null;
  }

  syncBackgroundAudio(nextAudiblePhoto);

  // Only visible videos keep playing. Off-screen videos are paused so mobile
  // devices and TVs do not have to decode invisible video streams.
  for (const photo of photos) {
    if (photo.currentMediaType !== "video") {
      continue;
    }
    if (!visibleVideoPhotos.has(photo)) {
      if (!photo.videoEl.paused) {
        photo.videoEl.pause();
      }
      continue;
    }
    if (!photo.audioStartPreparation && !photo.videoEl.ended && photo.videoEl.paused) {
      photo.videoEl.play().catch(() => {});
    }
  }

  if (audibleVideoPhoto === nextAudiblePhoto && nextAudiblePhoto) {
    const audioStartPending = Boolean(nextAudiblePhoto.audioStartPreparation);
    nextAudiblePhoto.videoEl.muted = audioStartPending || !soundEnabled || !audioUnlocked;
    nextAudiblePhoto.container.classList.toggle("audio-active", soundEnabled && audioUnlocked);
    if (soundEnabled && audioUnlocked && nextAudiblePhoto.videoStartSeekComplete && !nextAudiblePhoto.videoEl.ended) {
      if (!nextAudiblePhoto.audioRandomStartApplied) {
        nextAudiblePhoto.videoEl.muted = true;
        prepareVideoAudioStart(nextAudiblePhoto, () => {
          if (audibleVideoPhoto === nextAudiblePhoto && soundEnabled && audioUnlocked && nextAudiblePhoto.videoStartSeekComplete) {
            nextAudiblePhoto.videoEl.muted = false;
            nextAudiblePhoto.videoEl.play().catch(() => {});
          }
        });
      } else if (!audioStartPending && nextAudiblePhoto.videoEl.paused) {
        nextAudiblePhoto.videoEl.play().catch(() => {});
      }
      if (!audioPlaybackStartedAt) {
        audioPlaybackStartedAt = performance.now();
      }
      if (!audioMinimumHoldUntil) {
        audioMinimumHoldUntil = performance.now() + MIN_VIDEO_HOLD_MS;
      }
    }
    return;
  }

  audibleVideoPhoto = nextAudiblePhoto;
  if (nextAudiblePhoto) {
    audibleVideoRoundKeys.add(nextAudiblePhoto.currentImageKey);
  }
  if (nextAudiblePhoto === pendingAudioTarget?.photo) {
    pendingAudioTarget = null;
  }
  audioPlaybackStartedAt = nextAudiblePhoto && soundEnabled && audioUnlocked ? performance.now() : 0;
  audioMinimumHoldUntil = nextAudiblePhoto
    ? performance.now() + MIN_VIDEO_HOLD_MS
    : 0;
  for (const photo of photos) {
    const isAudible = photo === audibleVideoPhoto;
    photo.videoEl.muted = !isAudible || !soundEnabled || !audioUnlocked;
    photo.container.classList.toggle("audio-active", isAudible && soundEnabled && audioUnlocked);
    if (isAudible && soundEnabled && audioUnlocked) {
      // The random start was selected when this video was assigned. Reuse
      // that seek instead of allowing a new playback start at 0 seconds.
      photo.videoEl.muted = true;
      prepareVideoAudioStart(photo, () => {
        if (audibleVideoPhoto === photo && soundEnabled && audioUnlocked && photo.videoStartSeekComplete) {
          photo.videoEl.muted = false;
          photo.videoEl.play().catch(() => {});
        }
      });
      audioPlaybackStartedAt = performance.now();
      photo.videoEl.volume = 1;
    }
  }
}

function updateDebugVideoOverlay() {
  if (!DEBUG_MODE) {
    return;
  }

  for (const photo of photos) {
    if (photo.currentMediaType !== "video" || photo.container.style.display === "none") {
      continue;
    }

    const bounds = photo.container.getBoundingClientRect();
    const center = (bounds.top + bounds.bottom) / 2;
    const centerPercent = (center / window.innerHeight) * 100;
    const duration = Number.isFinite(photo.videoEl.duration)
      ? photo.videoEl.duration
      : photo.debugVideoDuration;
    const selectedStart = Number.isFinite(photo.debugVideoStartTime)
      ? photo.debugVideoStartTime
      : null;
    const playbackTime = Number.isFinite(photo.videoEl.currentTime)
      ? photo.videoEl.currentTime
      : null;

    photo.container.classList.add("debug-video-text");
    const normalTextSize = Math.max(12, Math.min(40, getEffectivePhotoWidth() / 18));
    photo.textEl.style.fontSize = `${normalTextSize / 2}px`;

    photo.textEl.textContent = [
      `CENTER ${centerPercent.toFixed(1)}%`,
      `Y ${center.toFixed(0)}px`,
      `DURATION ${duration === null ? "--" : `${duration.toFixed(1)}s`}`,
      `START ${selectedStart === null ? "--" : `${selectedStart.toFixed(1)}s`}`,
      `SEEK ${photo.videoStartSeekComplete ? "READY" : "WAIT"}`,
      `AUDIO ${photo.currentHasAudio ? "DETECTED" : "MISSING"}`,
      `MUTED DETECTED ${photo.currentIsMuted ? "YES" : "NO"}`,
      `MUTED ${photo.videoEl.muted ? "YES" : "NO"}`,
      `MUSIC ${backgroundAudioPhoto === photo && !backgroundAudio.muted ? "ON" : "OFF"}`,
      `TIME ${playbackTime === null ? "--" : `${playbackTime.toFixed(1)}s`}`
    ].join("  |  ");
  }
}

soundCheckbox.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundCheckbox.textContent = soundEnabled ? "Sound On" : "Sound Off";
  if (!soundEnabled) {
    audioPlaybackStartedAt = 0;
  }
  updateVideoAudio();
  resetHideTimer();
});

document.addEventListener("pointerdown", () => {
  audioUnlocked = true;
  updateVideoAudio();
}, { passive: true });

function resetControlsToDefaults() {
  soundEnabled = true;
  soundCheckbox.textContent = "Sound On";
  updateVideoAudio();
  mediaMixIndex = 2;
  naturalMediaMix = false;
  naturalMediaCheckbox.checked = false;
  updateMediaMixControl();
  selectedOrder = "random";
  orderedCheckbox.checked = false;
  manifest = imageManifest;
  selectedFolder = DEFAULT_CONTROL_VALUES.folder;
  folderSelect.value = DEFAULT_CONTROL_VALUES.folder;

  sizeSlider.value = DEFAULT_CONTROL_VALUES.size;
  photoWidth = parseFloat(DEFAULT_CONTROL_VALUES.size);
  syncPhotoScaleVars();

  speedSlider.value = DEFAULT_CONTROL_VALUES.speed;
  reverseCheckbox.checked = DEFAULT_CONTROL_VALUES.reverse;
  verticalSpeed = parseFloat(DEFAULT_CONTROL_VALUES.speed);

  swaySlider.value = DEFAULT_CONTROL_VALUES.sway;
  swayPower = parseFloat(DEFAULT_CONTROL_VALUES.sway);

  lightColumnsSelect.value = DEFAULT_CONTROL_VALUES.lightColumns;
  lightColumnCount = parseInt(DEFAULT_CONTROL_VALUES.lightColumns, 10);
  updateLightStreamVisibility();
  updateCenterPhotoVisibility();
  activeQueuePhotos = sortPhotosForQueue(getActivePhotos());

  if (minAvailableYear !== null && maxAvailableYear !== null) {
    selectedStartYear = minAvailableYear;
    selectedEndYear = maxAvailableYear;
    yearStartSlider.value = String(selectedStartYear);
    yearEndSlider.value = String(selectedEndYear);
    updateYearRangeDisplay();
  }

  if (backgroundSelect.querySelector(`option[value="${DEFAULT_CONTROL_VALUES.background}"]`)) {
    backgroundSelect.value = DEFAULT_CONTROL_VALUES.background;
  }
  applyBackground(backgroundSelect.value);

  lightColorSelect.value = DEFAULT_CONTROL_VALUES.lightColor;
  applyLightColor(DEFAULT_CONTROL_VALUES.lightColor);

  stringColorSelect.value = DEFAULT_CONTROL_VALUES.stringColor;
  applyStringColor(DEFAULT_CONTROL_VALUES.stringColor);

  textSelect.value = DEFAULT_CONTROL_VALUES.text;
  textMode = DEFAULT_CONTROL_VALUES.text;
  selectedGroupName = null;
  selectedPeople.clear();
  populatePeopleFilter();

  layoutPhotos();
  resetImageCycle();
  assignRandomImages();
  resetHideTimer();
}

function applyLightColor(color) {
  currentLightColor = color;
  if (color === 'rainbow') {
    // Will be animated in render
    return;
  }
  const bulbs = document.querySelectorAll('.bulb');
  bulbs.forEach(bulb => {
    switch(color) {
      case 'warm':
        bulb.style.background = 'radial-gradient(circle, #fff6cc 0%, #ffd36a 45%, #ffb347 100%)';
        bulb.style.boxShadow = '0 0 10px rgba(255, 210, 100, 0.95), 0 0 22px rgba(255, 190, 80, 0.6), 0 0 40px rgba(255, 180, 80, 0.25)';
        break;
      case 'cool':
        bulb.style.background = 'radial-gradient(circle, #e6f7ff 0%, #b3e0ff 45%, #80ccff 100%)';
        bulb.style.boxShadow = '0 0 10px rgba(179, 224, 255, 0.95), 0 0 22px rgba(128, 204, 255, 0.6), 0 0 40px rgba(255, 180, 80, 0.25)';
        break;
      case 'red':
        bulb.style.background = 'radial-gradient(circle, #ffe6e6 0%, #ffb3b3 45%, #ff8080 100%)';
        bulb.style.boxShadow = '0 0 10px rgba(255, 179, 179, 0.95), 0 0 22px rgba(255, 128, 128, 0.6), 0 0 40px rgba(255, 102, 102, 0.25)';
        break;
      case 'blue':
        bulb.style.background = 'radial-gradient(circle, #e6f7ff 0%, #b3e0ff 45%, #4da6ff 100%)';
        bulb.style.boxShadow = '0 0 10px rgba(179, 224, 255, 0.95), 0 0 22px rgba(77, 166, 255, 0.6), 0 0 40px rgba(51, 133, 255, 0.25)';
        break;
      case 'green':
        bulb.style.background = 'radial-gradient(circle, #e6ffe6 0%, #b3ffb3 45%, #66ff66 100%)';
        bulb.style.boxShadow = '0 0 10px rgba(179, 255, 179, 0.95), 0 0 22px rgba(102, 255, 102, 0.6), 0 0 40px rgba(77, 255, 77, 0.25)';
        break;
    }
  });
}

function applyStringColor(color) {
  const wires = document.querySelectorAll('.light-wire');
  wires.forEach(wire => {
    switch(color) {
      case 'brown':
        wire.style.background = 'linear-gradient(to bottom, rgba(120, 90, 40, 0.9), rgba(80, 60, 30, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(255, 210, 120, 0.12)';
        break;
      case 'black':
        wire.style.background = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(20, 20, 20, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.12)';
        break;
      case 'white':
        wire.style.background = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(200, 200, 200, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(255, 255, 255, 0.12)';
        break;
      case 'red':
        wire.style.background = 'linear-gradient(to bottom, rgba(139, 0, 0, 0.9), rgba(100, 0, 0, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(139, 0, 0, 0.12)';
        break;
      case 'blue':
        wire.style.background = 'linear-gradient(to bottom, rgba(0, 0, 139, 0.9), rgba(0, 0, 100, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(0, 0, 139, 0.12)';
        break;
      case 'green':
        wire.style.background = 'linear-gradient(to bottom, rgba(0, 100, 0, 0.9), rgba(0, 80, 0, 0.85))';
        wire.style.boxShadow = '0 0 6px rgba(0, 100, 0, 0.12)';
        break;
    }
  });
}

const lightStreams = [
  {
    el: lightsLeft,
    column: "left",
    y: 0
  },
  {
    el: lightsCenter,
    column: "center",
    y: 0
  },
  {
    el: lightsRight,
    column: "right",
    y: 0
  }
];

function getActiveLightStreams() {
  if (lightColumnCount === 3) {
    return lightStreams;
  }
  return lightStreams.filter((stream) => stream.column !== "center");
}

function updateLightStreamVisibility() {
  lightsCenter.style.display = lightColumnCount === 3 ? "block" : "none";
}

function updateCenterPhotoVisibility() {
  if (!hasAvailableImages) {
    for (const photo of photos) {
      photo.container.style.display = "none";
    }
    return;
  }

  const isVisible = lightColumnCount === 3;
  for (const photo of photos) {
    photo.container.style.display = photo.column === "center" ? (isVisible ? "block" : "none") : "block";
  }
}

function buildLightStream(streamEl) {
  streamEl.innerHTML = "";

  const wire = document.createElement("div");
  wire.className = "light-wire";
  streamEl.appendChild(wire);

  const streamHeight = 2400;
  streamEl.style.height = `${streamHeight}px`;

  for (let y = 40; y < streamHeight; y += lightBulbSpacing) {
    const bulb = document.createElement("div");
    bulb.className = "bulb";
    bulb.style.top = `${y}px`;
    streamEl.appendChild(bulb);
  }
}

buildLightStream(lightsLeft);
buildLightStream(lightsCenter);
buildLightStream(lightsRight);
updateLightStreamVisibility();
updateCenterPhotoVisibility();

function getPhotoWidth(photo) {
  const activeMedia = photo.videoEl.style.display !== "none" ? photo.videoEl : photo.imgEl;
  return activeMedia.offsetWidth || photoWidth;
}

function getPhotoHeight(photo) {
  const activeMedia = photo.videoEl.style.display !== "none" ? photo.videoEl : photo.imgEl;
  if (activeMedia.offsetHeight > 0) {
    return activeMedia.offsetHeight;
  }
  return photoWidth;
}

function getSpacing() {
  const effectivePhotoWidth = getEffectivePhotoWidth();
  const spacingOffset = isMobileViewport() ? 110 : 80;
  return effectivePhotoWidth + spacingOffset;
}

function getColumnX(column, width) {
  const columnRatios = isMobileViewport() && lightColumnCount === 3
    ? { left: 0.2, right: 0.8 }
    : isMobileViewport()
    ? { left: 0.28, right: 0.72 }
    : { left: leftXRatio, right: rightXRatio };
  const halfWidth = width / 2;
  let rawX = window.innerWidth * columnRatios.right;
  if (column === "left") {
    rawX = window.innerWidth * columnRatios.left;
  } else if (column === "center") {
    rawX = window.innerWidth * 0.5;
  }

  const minX = halfWidth + 20;
  const maxX = window.innerWidth - halfWidth - 20;
  return Math.max(minX, Math.min(maxX, rawX));
}

function layoutPhotos() {
  // Mobile browsers can report a temporary zero/partial viewport while the
  // page is starting. Do not calculate column positions until dimensions are
  // usable, otherwise getColumnX() clamps every column to the same X value.
  if (window.innerWidth <= 0 || window.innerHeight <= 0) {
    return;
  }

  const spacing = getSpacing();
  const streamHeight = spacing * photosPerColumn;
  const startY = window.innerHeight / 2 - streamHeight / 2;

  for (const photo of getActivePhotos()) {
    const width = getPhotoWidth(photo);
    photo.x = getColumnX(photo.column, width);
    const columnYOffset = photo.column === "center" ? spacing / 2 : 0;
    photo.y = startY + photo.index * spacing + spacing / 2 + columnYOffset;
  }

  layoutLights();
}

let layoutFramePending = false;
function scheduleLayout() {
  if (layoutFramePending) {
    return;
  }

  layoutFramePending = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      layoutFramePending = false;
      syncPhotoScaleVars();
      layoutPhotos();
    });
  });
}

function layoutLights() {
  const leftX = getColumnX("left", 70);
  const centerX = getColumnX("center", 70);
  const rightX = getColumnX("right", 70);

  for (const stream of getActiveLightStreams()) {
    const x = stream.column === "left"
      ? leftX
      : stream.column === "center"
      ? centerX
      : rightX;
    stream.x = x;
  }
}

function wrapPhoto(photo) {
  const spacing = getSpacing();
  const totalSpan = spacing * photosPerColumn;
  const halfHeight = getPhotoHeight(photo) / 2;

  if (verticalSpeed > 0 && photo.y - halfHeight > window.innerHeight + PHOTO_WRAP_BUFFER_PX) {
    photo.y -= totalSpan;
    assignRandomImageToPhoto(photo);
  } else if (verticalSpeed < 0 && photo.y + halfHeight < -PHOTO_WRAP_BUFFER_PX) {
    photo.y += totalSpan;
    assignRandomImageToPhoto(photo);
  }
}

function showControls() {
  controls.classList.remove("hidden");
  if (controls.matches(":hover")) {
    clearTimeout(hideTimer);
    return;
  }
  resetHideTimer();
}

function isTouchDevice() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function hideControls() {
  clearTimeout(hideTimer);
  controls.classList.add("hidden");
}

function resetHideTimer() {
  clearTimeout(hideTimer);
  if (!isTouchDevice() && controls.matches(":hover")) {
    return;
  }
  hideTimer = setTimeout(() => {
    hideControls();
  }, 2500);
}

controls.addEventListener("pointerenter", (event) => {
  if (isTouchDevice() || event.pointerType === "touch") {
    return;
  }
  clearTimeout(hideTimer);
});

controls.addEventListener("pointerleave", (event) => {
  if (isTouchDevice() || event.pointerType === "touch") {
    return;
  }
  resetHideTimer();
});

document.addEventListener("click", (event) => {
  if (!controls.classList.contains("hidden") && !controls.contains(event.target)) {
    hideControls();
    return;
  }
  showControls();
});

controls.addEventListener("click", (event) => {
  event.stopPropagation();
  resetHideTimer();
});

sizeSlider.addEventListener("input", () => {
  photoWidth = parseFloat(sizeSlider.value);
  syncPhotoScaleVars();
  layoutPhotos();
  resetHideTimer();
});

speedSlider.addEventListener("input", () => {
  const speed = parseFloat(speedSlider.value);
  verticalSpeed = reverseCheckbox.checked ? -speed : speed;
  resetHideTimer();
});

reverseCheckbox.addEventListener("change", () => {
  const speed = parseFloat(speedSlider.value);
  verticalSpeed = reverseCheckbox.checked ? -speed : speed;
  resetHideTimer();
});

swaySlider.addEventListener("input", () => {
  swayPower = parseFloat(swaySlider.value);
  resetHideTimer();
});

[sizeSlider, speedSlider, swaySlider].forEach(slider => {
  slider.addEventListener("mousedown", resetHideTimer);
  slider.addEventListener("mousemove", resetHideTimer);
  slider.addEventListener("touchstart", resetHideTimer);
  slider.addEventListener("touchmove", resetHideTimer);
});

function updateLights(time, deltaSeconds) {
  const t = time * 0.001;
  lightOffsetY += verticalSpeed * 60 * deltaSeconds;
  const phaseByColumn = {
    left: 0,
    center: 0.75,
    right: 1.5
  };

  for (const stream of getActiveLightStreams()) {
    const swayX = Math.sin(t * 0.7 + phaseByColumn[stream.column]) * 6;
    const wrappedY = ((lightOffsetY % lightBulbSpacing) + lightBulbSpacing) % lightBulbSpacing;

    stream.el.style.transform =
      `translate(${stream.x + swayX}px, ${wrappedY - 100}px) translateX(-50%)`;
  }
}

function render(time) {
  const t = time * 0.001;
  const deltaSeconds = lastRenderTimeSec === null ? 0 : (t - lastRenderTimeSec);
  lastRenderTimeSec = t;

  for (const photo of activeQueuePhotos) {
    // Use the same time-based movement as the light streams. This keeps
    // photos, videos, and lights synchronized at any display frame rate.
    photo.y += verticalSpeed * 60 * deltaSeconds;
    wrapPhoto(photo);

    const sway = Math.sin(t + photo.swayOffset) * swayPower;
    const bob = Math.sin((t * 0.8) + photo.swayOffset) * 4;

    photo.container.style.transform =
      `translate(${photo.x}px, ${photo.y + bob}px) translate(-50%, -50%) rotate(${photo.rotation + sway}deg)`;
  }

  updateDebugVideoOverlay();
  if (time - lastVideoAudioUpdateMs >= VIDEO_AUDIO_UPDATE_INTERVAL_MS) {
    lastVideoAudioUpdateMs = time;
    updateVideoAudio();
  }

  updateLights(time, deltaSeconds);

  if (currentLightColor === 'rainbow') {
    const t = time * 0.001;
    const hue = (t * 50) % 360;
    const color = `hsl(${hue}, 100%, 70%)`;
    const bulbs = document.querySelectorAll('.bulb');
    bulbs.forEach(bulb => {
      bulb.style.background = `radial-gradient(circle, ${color} 0%, ${color} 100%)`;
      bulb.style.boxShadow = `0 0 10px ${color}, 0 0 22px ${color}, 0 0 40px ${color}`;
    });
  }

  requestAnimationFrame(render);
}

window.addEventListener("resize", scheduleLayout);
window.addEventListener("orientationchange", scheduleLayout);
window.visualViewport?.addEventListener("resize", scheduleLayout);
window.addEventListener("load", scheduleLayout);

scheduleLayout();
updateYearRangeDisplay();
hideControls();

// Load manifest and initialize images
loadManifest().then(() => {
  resetImageCycle();
  setupClickListeners();
  assignRandomImages();
  scheduleLayout();
});

// Populate background selector
populateBackgroundSelect();
if (backgroundSelect.querySelector(`option[value="${DEFAULT_CONTROL_VALUES.background}"]`)) {
  backgroundSelect.value = DEFAULT_CONTROL_VALUES.background;
}
applyBackground(backgroundSelect.value);

requestAnimationFrame(render);
