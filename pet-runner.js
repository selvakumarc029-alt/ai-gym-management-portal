const initializedFrontRunners = new WeakSet();
const runnerFrameCount = 48;
const runnerFrameDelay = 80;

function attachFrontRunner(canvas) {
  if (initializedFrontRunners.has(canvas)) return;
  initializedFrontRunners.add(canvas);

  const pet = canvas.closest("[data-ai-pet]");
  const trigger = pet?.querySelector(".ai-pet-toggle");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const frames = [];
  let idleFrame = null;
  let frameRequest = 0;
  let frameIndex = 0;
  let lastFrameTime = 0;

  if (!pet || !trigger || !context) {
    canvas.classList.add("has-error");
    return;
  }

  function removeSceneBackground() {
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum - minimum;
      const purple = blue > green + 18 && red > green + 24;
      const greenField = green > red + 12 && green > blue + 12;
      const paleTrack = red > 185 && green > 165 && blue > 145 && saturation < 58;
      const whiteLine = red > 222 && green > 222 && blue > 222;

      if (purple || greenField || paleTrack || whiteLine) pixels[index + 3] = 0;
    }

    context.putImageData(frame, 0, 0);
  }

  function renderFrame(index) {
    const image = frames[index];
    if (!image?.complete || image.naturalWidth === 0) return false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 54, 0, 116, 276);
    removeSceneBackground();
    return true;
  }

  function drawIdle() {
    if (!idleFrame) {
      if (!renderFrame(0)) return;
      idleFrame = context.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.putImageData(idleFrame, 0, 0);
    }
    canvas.classList.add("is-ready");
    canvas.classList.remove("is-active");
  }

  function drawRunner(time) {
    if (!pet.isConnected) return;
    if (!pet.classList.contains("is-running") || document.hidden) {
      frameRequest = 0;
      drawIdle();
      return;
    }

    if (!lastFrameTime || time - lastFrameTime >= runnerFrameDelay) {
      if (renderFrame(frameIndex)) {
        canvas.classList.add("is-active");
        frameIndex = (frameIndex + 1) % runnerFrameCount;
        lastFrameTime = time;
      }
    }
    frameRequest = requestAnimationFrame(drawRunner);
  }

  function start() {
    pet.classList.add("is-running");
    if (frameRequest || !frames[0]?.complete) return;
    frameIndex = 0;
    lastFrameTime = 0;
    frameRequest = requestAnimationFrame(drawRunner);
  }

  function stop() {
    pet.classList.remove("is-running");
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    frameIndex = 0;
    lastFrameTime = 0;
    drawIdle();
  }

  for (let index = 1; index <= runnerFrameCount; index += 1) {
    const image = new Image();
    frames.push(image);
    image.addEventListener("load", () => {
      if (index === 1) {
        drawIdle();
        if (pet.classList.contains("is-running")) start();
      }
    }, { once: true });
    image.addEventListener("error", () => {
      if (index === 1) canvas.classList.add("has-error");
    }, { once: true });
    image.src = `assets/front-runner-frames/frame-${String(index).padStart(3, "0")}.png`;
  }

  trigger.addEventListener("pointerenter", start);
  trigger.addEventListener("pointermove", start);
  trigger.addEventListener("mouseenter", start);
  trigger.addEventListener("focus", start);
  trigger.addEventListener("pointerleave", stop);
  trigger.addEventListener("mouseleave", stop);
  trigger.addEventListener("blur", stop);
}

function initializeFrontRunners() {
  document.querySelectorAll("[data-front-runner]").forEach(attachFrontRunner);
}

initializeFrontRunners();
new MutationObserver(initializeFrontRunners).observe(document.body, { childList: true, subtree: true });
