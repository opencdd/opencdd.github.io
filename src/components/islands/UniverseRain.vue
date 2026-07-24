<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const TRIGGER = "universe";
const BUFFER_RESET_MS = 3000;

const IRDI_FRAGMENTS = [
  "0112/2///61360_4#AAA001",
  "0112/2///61360_4#AAD009",
  "0112/2///61987#ABC369",
  "0112/2///62683#ACH594",
  "0112/2///62720#UAA000",
  "0112/2///63213#KEB004",
  "0112/2///63508#KDA001",
  "MDC_C002", "MDC_P004", "MDC_C003",
  "AAA021", "AAD009", "UAA000", "KEB004",
  "0112/2///61360_4#AAA000",
  "UNIVERSE",
];

const GLYPH_COLORS = ["#25a2cb", "#4682b4", "#ec7a2a", "#10b981", "#a78bfa", "#f43f5e"];
const HEAD_COLOR = "#fef9e7";

const showRain = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animId = 0;
let rainTimeout: ReturnType<typeof setTimeout> | undefined;
let buffer = "";
let bufferTimeout: ReturnType<typeof setTimeout> | undefined;
let phase = 0;

function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key.length !== 1) {
    buffer = "";
    return;
  }
  buffer = (buffer + e.key.toLowerCase()).slice(-TRIGGER.length);
  if (bufferTimeout) clearTimeout(bufferTimeout);
  bufferTimeout = setTimeout(() => { buffer = ""; }, BUFFER_RESET_MS);
  if (buffer === TRIGGER) {
    buffer = "";
    triggerRain();
  }
}

function triggerRain() {
  if (showRain.value) {
    if (rainTimeout) clearTimeout(rainTimeout);
    rainTimeout = setTimeout(closeRain, 6000);
    return;
  }
  showRain.value = true;
  phase = 0;
  requestAnimationFrame(() => startCanvas());
  rainTimeout = setTimeout(closeRain, 6500);
}

function closeRain() {
  showRain.value = false;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = 0;
  }
}

function startCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const fontSize = 13;
  const colWidth = fontSize * 0.62;
  const columnCount = Math.max(20, Math.floor(canvas.width / colWidth));

  interface Drop {
    y: number;
    speed: number;
    chars: string[];
    color: string;
    trail: number;
  }

  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

  const drops: Drop[] = Array.from({ length: columnCount }, (_, i) => ({
    y: rand(-canvas.height, 0),
    speed: rand(1.4, 4.2),
    chars: Array.from({ length: 12 + Math.floor(rand(0, 12)) }, () => pick(IRDI_FRAGMENTS)),
    color: i % 7 === 0 ? pick(GLYPH_COLORS) : pick(GLYPH_COLORS),
    trail: Math.floor(rand(6, 18)),
  }));

  let frame = 0;

  function draw() {
    if (!ctx || !canvas) return;
    ctx.fillStyle = "rgba(10, 14, 20, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.textBaseline = "top";

    drops.forEach((drop, i) => {
      const x = i * colWidth;

      for (let t = 0; t < drop.trail; t++) {
        const charIdx = (Math.floor(drop.y / fontSize) - t + drop.chars.length * 4) % drop.chars.length;
        const ch = drop.chars[charIdx] ?? "•";
        const yOffset = drop.y - t * fontSize;
        if (yOffset < -fontSize || yOffset > canvas.height) continue;

        if (t === 0) {
          ctx.fillStyle = HEAD_COLOR;
          ctx.shadowColor = drop.color;
          ctx.shadowBlur = 12;
        } else {
          const alpha = (1 - t / drop.trail) * 0.9;
          ctx.fillStyle = drop.color;
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(ch, x, yOffset);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      drop.y += drop.speed;
      if (drop.y - drop.trail * fontSize > canvas.height) {
        drop.y = rand(-200, -20);
        drop.speed = rand(1.4, 4.2);
        drop.color = pick(GLYPH_COLORS);
        drop.chars = Array.from({ length: 12 + Math.floor(rand(0, 12)) }, () => pick(IRDI_FRAGMENTS));
      }
    });

    phase += 0.02;
    frame++;
    if (frame % 120 === 0) {
      drops.forEach((d) => {
        if (Math.random() < 0.3) d.color = pick(GLYPH_COLORS);
      });
    }

    animId = requestAnimationFrame(draw);
  }

  draw();
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  if (animId) cancelAnimationFrame(animId);
  if (rainTimeout) clearTimeout(rainTimeout);
  if (bufferTimeout) clearTimeout(bufferTimeout);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-700 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showRain"
        class="fixed inset-0 z-[100] pointer-events-none"
        style="background: rgba(10, 14, 20, 0.82);"
      >
        <canvas ref="canvasRef" class="h-full w-full"></canvas>
        <div class="absolute inset-x-0 top-[18%] text-center mix-blend-screen">
          <p
            class="font-display tracking-[0.15em]"
            style="color: #25a2cb; font-size: clamp(28px, 5vw, 56px); text-shadow: 0 0 30px rgba(37,162,203,0.7), 0 0 60px rgba(37,162,203,0.3);"
          >
            UNIVERSE
          </p>
          <p
            class="mt-3 font-mono"
            style="color: rgba(255,249,231,0.6); font-size: 12px; letter-spacing: 0.12em;"
          >
            0112/2///61360_4#UNIVERSE
          </p>
          <p
            class="mt-1 italic"
            style="color: rgba(163,154,126,0.7); font-size: 11px;"
          >
            the virtual root class — IEC 61360 §21.1
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
