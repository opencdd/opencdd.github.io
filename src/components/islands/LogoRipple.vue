<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const REQUIRED_TAPS = 5;
const TAP_WINDOW_MS = 1600;

const showRipple = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let taps: number[] = [];
let animId = 0;
let rippleTimeout: ReturnType<typeof setTimeout> | undefined;
let originX = 0;
let originY = 0;

const RIPPLE_CODES = [
  "AAA001", "AAD009", "UAA000", "KEB004", "KDA001",
  "ABC369", "ACH594", "MDC_C002", "MDC_P004", "UNIVERSE",
  "0112/2///61360_4", "0112/2///61987",
];

const RIPPLE_COLORS = ["#25a2cb", "#4682b4", "#ec7a2a", "#10b981", "#a78bfa"];

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  thickness: number;
}

interface FloatingGlyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  rotation: number;
  vr: number;
  size: number;
  life: number;
  maxLife: number;
}

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  const logoLink = target?.closest('a[href="/"][aria-label="OpenCDD home"]');
  if (!logoLink) {
    taps = [];
    return;
  }

  const now = Date.now();
  taps = taps.filter((t) => now - t < TAP_WINDOW_MS);
  taps.push(now);

  if (taps.length >= REQUIRED_TAPS) {
    taps = [];
    const rect = logoLink.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    triggerRipple();
  }
}

function triggerRipple() {
  showRipple.value = true;
  requestAnimationFrame(() => startCanvas());
  if (rippleTimeout) clearTimeout(rippleTimeout);
  rippleTimeout = setTimeout(() => {
    showRipple.value = false;
    if (animId) cancelAnimationFrame(animId);
  }, 4200);
}

function startCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ripples: Ripple[] = [];
  const glyphs: FloatingGlyph[] = [];

  const maxR = Math.hypot(canvas.width, canvas.height);

  for (let i = 0; i < 6; i++) {
    ripples.push({
      x: originX,
      y: originY,
      radius: 0,
      maxRadius: maxR * (0.55 + i * 0.08),
      alpha: 0.8 - i * 0.1,
      color: RIPPLE_COLORS[i % RIPPLE_COLORS.length]!,
      thickness: 2.5 - i * 0.3,
    });
  }

  const glyphCount = 42;
  for (let i = 0; i < glyphCount; i++) {
    const angle = (i / glyphCount) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 4;
    const code = RIPPLE_CODES[Math.floor(Math.random() * RIPPLE_CODES.length)]!;
    glyphs.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      text: code,
      color: RIPPLE_COLORS[Math.floor(Math.random() * RIPPLE_COLORS.length)]!,
      alpha: 1,
      rotation: (Math.random() - 0.5) * 0.6,
      vr: (Math.random() - 0.5) * 0.04,
      size: 10 + Math.random() * 8,
      life: 0,
      maxLife: 200 + Math.floor(Math.random() * 120),
    });
  }

  let startTime = performance.now();
  let lastRipple = 0;

  function draw(now: number) {
    if (!ctx || !canvas) return;
    const elapsed = now - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (elapsed - lastRipple > 400 && elapsed < 2000) {
      lastRipple = elapsed;
      ripples.push({
        x: originX,
        y: originY,
        radius: 0,
        maxRadius: maxR * 0.5,
        alpha: 0.5,
        color: RIPPLE_COLORS[Math.floor(Math.random() * RIPPLE_COLORS.length)]!,
        thickness: 1.5,
      });
    }

    for (const r of ripples) {
      r.radius += (r.maxRadius - r.radius) * 0.018;
      r.alpha *= 0.992;

      if (r.alpha < 0.02) continue;

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = r.thickness;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 14;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const g of glyphs) {
      g.life++;
      g.x += g.vx;
      g.y += g.vy;
      g.vy += 0.02;
      g.vx *= 0.998;
      g.rotation += g.vr;
      const lifeRatio = g.life / g.maxLife;
      g.alpha = lifeRatio < 0.15 ? lifeRatio / 0.15 : 1 - Math.max(0, (lifeRatio - 0.6) / 0.4);

      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      ctx.font = `${g.size}px ui-monospace, monospace`;
      ctx.fillStyle = g.color;
      ctx.globalAlpha = g.alpha;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 6;
      ctx.textAlign = "center";
      ctx.fillText(g.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (let i = glyphs.length - 1; i >= 0; i--) {
      if (glyphs[i]!.life > glyphs[i]!.maxLife) glyphs.splice(i, 1);
    }

    if (glyphs.length > 0 || elapsed < 3500) {
      animId = requestAnimationFrame(draw);
    }
  }

  animId = requestAnimationFrame(draw);
}

onMounted(() => {
  document.addEventListener("click", onClick, true);
});

onUnmounted(() => {
  document.removeEventListener("click", onClick, true);
  if (animId) cancelAnimationFrame(animId);
  if (rippleTimeout) clearTimeout(rippleTimeout);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-700 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showRipple" class="fixed inset-0 z-[99] pointer-events-none">
        <canvas ref="canvasRef" class="h-full w-full"></canvas>
      </div>
    </Transition>
  </Teleport>
</template>
