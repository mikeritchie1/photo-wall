// Background drawing and management functions

function populateBackgroundSelect() {
  backgroundSelect.innerHTML = "";
  
  // Space is the only available background.
  const backgrounds = ["space"];

  for (const bg of backgrounds) {
    const option = document.createElement("option");
    option.value = bg;
    // Capitalize first letter
    const displayName = bg.charAt(0).toUpperCase() + bg.slice(1);
    option.textContent = displayName;
    backgroundSelect.appendChild(option);
  }
}

function applyBackground(backgroundName) {
  if (backgroundName === "none") {
    wall.style.backgroundImage = "none";
    wall.style.backgroundColor = "black";
  } else if (backgroundName === "space") {
    const spaceImage = drawSpaceBackground();
    wall.style.backgroundImage = `url(${spaceImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "forest") {
    const forestImage = drawForestBackground();
    wall.style.backgroundImage = `url(${forestImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "sunset") {
    wall.style.backgroundImage = "url('backgrounds/sunset.jpg')";
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "cityscape") {
    const cityscapeImage = drawCityscapeBackground();
    wall.style.backgroundImage = `url(${cityscapeImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "mountain") {
    const mountainImage = drawMountainBackground();
    wall.style.backgroundImage = `url(${mountainImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "clouds") {
    const cloudsImage = drawCloudsBackground();
    wall.style.backgroundImage = `url(${cloudsImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "galaxy") {
    const galaxyImage = drawGalaxyBackground();
    wall.style.backgroundImage = `url(${galaxyImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "desert") {
    const desertImage = drawDesertBackground();
    wall.style.backgroundImage = `url(${desertImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  } else if (backgroundName === "aurora") {
    const auroraImage = drawAuroraBackground();
    wall.style.backgroundImage = `url(${auroraImage})`;
    wall.style.backgroundSize = "cover";
    wall.style.backgroundPosition = "center";
    wall.style.backgroundAttachment = "fixed";
  }
  // No file reading from backgrounds/ folder
}

// Background drawing functions
function drawSpaceBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Dark space background with gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0a0e27");
  gradient.addColorStop(0.5, "#1a1a3e");
  gradient.addColorStop(1, "#0a0e27");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 1.5;
    const opacity = Math.random() * 0.7 + 0.3;

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add some nebula-like clouds
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 150 + 100;

    const nebula = ctx.createRadialGradient(x, y, 0, x, y, size);
    nebula.addColorStop(0, `rgba(100, 150, 200, ${Math.random() * 0.1})`);
    nebula.addColorStop(1, "rgba(100, 150, 200, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }

  return canvas.toDataURL();
}

function drawForestBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(1, "#98FB98");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Mountains in background
  ctx.fillStyle = "#696969";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.6);
  ctx.lineTo(canvas.width * 0.2, canvas.height * 0.4);
  ctx.lineTo(canvas.width * 0.4, canvas.height * 0.5);
  ctx.lineTo(canvas.width * 0.6, canvas.height * 0.3);
  ctx.lineTo(canvas.width * 0.8, canvas.height * 0.45);
  ctx.lineTo(canvas.width, canvas.height * 0.6);
  ctx.closePath();
  ctx.fill();

  // Trees
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * canvas.width;
    const height = Math.random() * 100 + 50;
    const trunkWidth = 10;

    // Trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x - trunkWidth / 2, canvas.height - height - 20, trunkWidth, 20);

    // Leaves
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.arc(x, canvas.height - height, height / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL();
}

function drawSunsetBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Sunset gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#FF4500");
  gradient.addColorStop(0.5, "#FF6347");
  gradient.addColorStop(1, "#8B008B");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sun
  const sunX = canvas.width * 0.8;
  const sunY = canvas.height * 0.3;
  const sunRadius = 80;

  const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
  sunGradient.addColorStop(0, "#FFD700");
  sunGradient.addColorStop(1, "rgba(255, 215, 0, 0)");
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}

function drawCityscapeBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Night sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#191970");
  skyGradient.addColorStop(1, "#000080");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Buildings
  ctx.fillStyle = "#2F4F4F";
  for (let i = 0; i < 15; i++) {
    const x = i * (canvas.width / 15);
    const width = Math.random() * 60 + 40;
    const height = Math.random() * 200 + 100;
    ctx.fillRect(x, canvas.height - height, width, height);

    // Windows
    ctx.fillStyle = "#FFFF00";
    for (let w = 0; w < 3; w++) {
      for (let h = 0; h < Math.floor(height / 30); h++) {
        if (Math.random() > 0.3) {
          ctx.fillRect(x + 5 + w * 15, canvas.height - height + 10 + h * 25, 10, 15);
        }
      }
    }
    ctx.fillStyle = "#2F4F4F";
  }

  return canvas.toDataURL();
}

function drawMountainBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(1, "#F0F8FF");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Mountains
  ctx.fillStyle = "#708090";
  for (let i = 0; i < 5; i++) {
    const x = i * (canvas.width / 4);
    const peakX = x + Math.random() * 100;
    const peakY = canvas.height * (0.3 + Math.random() * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(x + 150, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  // Snow caps
  ctx.fillStyle = "#FFFFFF";
  for (let i = 0; i < 5; i++) {
    const x = i * (canvas.width / 4) + 20;
    const peakX = x + Math.random() * 100;
    const peakY = canvas.height * (0.3 + Math.random() * 0.3) + 20;
    ctx.beginPath();
    ctx.moveTo(x + 10, canvas.height * 0.5);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(x + 50, canvas.height * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL();
}

function drawCloudsBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(1, "#E0F6FF");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.6;
    const width = Math.random() * 200 + 100;
    const height = Math.random() * 60 + 30;

    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL();
}

function drawGalaxyBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Space background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 2;
    const opacity = Math.random() * 0.8 + 0.2;

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nebulae
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 200 + 100;
    const color = colors[Math.floor(Math.random() * colors.length)];

    const nebula = ctx.createRadialGradient(x, y, 0, x, y, size);
    nebula.addColorStop(0, color);
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }

  return canvas.toDataURL();
}

function drawDesertBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Desert gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#FFD700");
  gradient.addColorStop(0.7, "#F4A460");
  gradient.addColorStop(1, "#DEB887");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sand dunes
  ctx.strokeStyle = "#D2691E";
  ctx.lineWidth = 3;
  for (let y = canvas.height * 0.6; y < canvas.height; y += 30) {
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 5) {
      const duneY = y + Math.sin(x * 0.005) * 20;
      if (x === 0) {
        ctx.moveTo(x, duneY);
      } else {
        ctx.lineTo(x, duneY);
      }
    }
    ctx.stroke();
  }

  return canvas.toDataURL();
}

function drawAuroraBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Night sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#000080");
  skyGradient.addColorStop(1, "#000000");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Aurora ribbons
  const colors = ["#00FF7F", "#00CED1", "#FF69B4", "#FFD700", "#FF4500"];
  for (let i = 0; i < 5; i++) {
    const y = canvas.height * (0.2 + i * 0.15);
    const color = colors[i % colors.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 2) {
      const waveY = y + Math.sin(x * 0.01 + i) * 30;
      if (x === 0) {
        ctx.moveTo(x, waveY);
      } else {
        ctx.lineTo(x, waveY);
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Stars
  ctx.fillStyle = "white";
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL();
}
