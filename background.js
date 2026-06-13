// ─── FORCE FIELD CANVASES & PHYSICS ──────────────────────────
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Configuration params - Balanced density starfield
  let spacing = 16; // grid spacing (lower = denser)
  const magnifierRadius = 125;
  const forceStrength = 4.5;
  const friction = 0.84;
  const restoreSpeed = 0.05;

  let particles = [];
  let mouse = { x: width / 2, y: height / 2, active: false };
  let currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  // Track mouse coordinates globally
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
      mouse.active = true;
    }
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  // Track theme changes dynamically
  const observer = new MutationObserver(() => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (theme !== currentTheme) {
      currentTheme = theme;
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ─── INITIALIZE PARTICLE GRID ───────────────────────────────
  function initGrid() {
    particles = [];
    
    // Scale spacing based on screen resolution to protect performance (Balanced density starfield)
    const pixelCount = width * height;
    if (pixelCount > 2000000) spacing = 22;      // 4K or ultra-wide
    else if (pixelCount > 1200000) spacing = 16; // Full HD
    else spacing = 12;                           // Mobile or smaller screens

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const randBright = Math.random() * 255;
        particles.push({
          x: x + (Math.random() - 0.5) * 3, // Slight randomized offset
          y: y + (Math.random() - 0.5) * 3,
          ox: x,
          oy: y,
          vx: 0,
          vy: 0,
          brightness: randBright,
          stroke: 0.5 + (randBright / 255) * 1.3 // Delicate range of dot sizes from 0.5px to 1.8px
        });
      }
    }
  }

  // ─── WINDOW RESIZING ───────────────────────────────────────
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    }, 200);
  });

  // ─── ANIMATION TICK ─────────────────────────────────────────
  function tick() {
    requestAnimationFrame(tick);

    // 1. Draw base gradient background
    const bgGrad = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );

    if (currentTheme === 'dark') {
      bgGrad.addColorStop(0, '#0c0822'); // Deep violet-indigo core
      bgGrad.addColorStop(1, '#020106'); // Obsidian black edges
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw digital blueprint grid overlay directly on canvas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.006)';
    } else {
      bgGrad.addColorStop(0, '#fbf4f8'); // Soft pinkish core
      bgGrad.addColorStop(1, '#e3dbe7'); // Soft pastel purple edges
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.009)';
    }

    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical grid lines
    for (let x = 0; x < width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    // Horizontal grid lines
    for (let y = 0; y < height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 2. Physics & Draw Particles
    // Query the Sudoku grid wrapper dynamically to avoid rendering particles behind it
    const gridEl = document.getElementById('sudoku-grid');
    let excludeRect = null;
    if (gridEl) {
      excludeRect = gridEl.getBoundingClientRect();
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Calculate magnetic force repulsion from cursor
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < magnifierRadius) {
        // Force increases closer to the mouse
        const force = ((magnifierRadius - d) / magnifierRadius) * forceStrength;
        
        // Normalize direction and push
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
      }

      // Apply friction
      p.vx *= friction;
      p.vy *= friction;

      // Apply spring return force to original coordinates
      const rx = p.ox - p.x;
      const ry = p.oy - p.y;
      p.vx += rx * restoreSpeed;
      p.vy += ry * restoreSpeed;

      // Update coordinates
      p.x += p.vx;
      p.y += p.vy;

      // Color calculations based on theme, velocity, and brightness
      let particleColor;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

      if (currentTheme === 'dark') {
        // Deep blue for low brightness, neon magenta for highlights
        let hue = 320; // Magenta default
        if (p.brightness < 120) {
          hue = 240; // Deep Indigo/Blue
        }

        // Kinetic glow: particles shift to neon cyan (#00f0ff, hue 180) when moving fast
        if (speed > 1.2) {
          const shiftFactor = Math.min(1, (speed - 1.2) / 6);
          hue = Math.floor(hue * (1 - shiftFactor) + 180 * shiftFactor);
        }

        // Balanced glowing stars for dark mode
        const lightness = Math.min(55, Math.max(8, 8 + (p.brightness / 255) * 24 + speed * 1.0));
        particleColor = `hsl(${hue}, 75%, ${lightness}%)`;
      } else {
        // Light mode: Rose pink (#d9006c) to dark teal (#0099a6)
        let hue = 330; // Rose Pink
        if (p.brightness < 120) {
          hue = 185; // Soft Teal
        }

        if (speed > 1.2) {
          const shiftFactor = Math.min(1, (speed - 1.2) / 6);
          hue = Math.floor(hue * (1 - shiftFactor) + 200 * shiftFactor); // Shifts to cyan-blue
        }

        // Soft visible pastel stars for light mode
        const lightness = Math.min(94, Math.max(74, 88 - (p.brightness / 255) * 14 - speed * 0.5));
        particleColor = `hsl(${hue}, 60%, ${lightness}%)`;
      }

      // Keep stroke size constant and delicate (no magnifier size expansion)
      const sizeMultiplier = 1.0;

      // Skip drawing if particle is inside the excluded Sudoku grid box (with a tight 2px border clearance)
      if (excludeRect &&
          p.x >= excludeRect.left - 2 && p.x <= excludeRect.right + 2 &&
          p.y >= excludeRect.top - 2 && p.y <= excludeRect.bottom + 2) {
        continue;
      }

      // Draw particle dot
      ctx.fillStyle = particleColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.stroke * sizeMultiplier, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bootstrap initialization
  initGrid();
  tick();
})();
