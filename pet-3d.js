const initializedCanvases = new WeakSet();
document.documentElement.dataset.pet3dModule = "ready";

function attachRunner(canvas) {
  if (initializedCanvases.has(canvas)) return;
  initializedCanvases.add(canvas);

  const pet = canvas.closest("[data-ai-pet]");
  const button = canvas.closest(".ai-pet-toggle");
  let loadingPromise;

  async function loadRunner() {
    if (loadingPromise) return loadingPromise;
    canvas.classList.add("is-loading");
    canvas.dataset.pet3d = "loading";

    loadingPromise = Promise.all([
      import("./assets/three.module.js"),
      import("./assets/GLTFLoader.js")
    ]).then(([THREE, loaderModule]) => {
      if (!canvas.isConnected) return;
      const { GLTFLoader } = loaderModule;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(1);
      renderer.setSize(112, 138, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(25, 112 / 138, 0.1, 20);
      camera.position.set(0, 1.12, -4.35);
      camera.lookAt(0, 1.03, 0);

      const keyLight = new THREE.DirectionalLight(0xfff2db, 4.6);
      keyLight.position.set(-2.4, 4.2, -3.4);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0xd9b74e, 3.2);
      rimLight.position.set(2.8, 2.6, 2.2);
      scene.add(rimLight);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x4d4637, 2.7));

      let mixer;
      let idleAction;
      let runAction;
      let running = false;
      let lastFrame = 0;
      let idleFrameNeeded = true;
      const clock = new THREE.Clock();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      function setRunning(next) {
        if (!mixer || next === running) return;
        running = next;
        if (running) {
          idleAction.stop();
          runAction.reset().setEffectiveTimeScale(1.08).setEffectiveWeight(1).play();
          clock.start();
        } else {
          runAction.stop();
          idleAction.reset().setEffectiveWeight(1).play();
          mixer.update(0);
          idleFrameNeeded = true;
        }
      }

      function animate(time) {
        if (!canvas.isConnected) {
          renderer.dispose();
          return;
        }
        requestAnimationFrame(animate);
        const wantsRun = !reduceMotion.matches && Boolean(
          pet?.classList.contains("is-running") ||
          button?.matches(":hover") ||
          button === document.activeElement
        );
        setRunning(wantsRun);
        if (!mixer || (!running && !idleFrameNeeded) || time - lastFrame < 42) return;
        lastFrame = time;
        if (running) mixer.update(Math.min(clock.getDelta(), 0.05));
        renderer.render(scene, camera);
        if (!running) idleFrameNeeded = false;
      }

      new GLTFLoader().load(
        "./assets/premium-runner.glb",
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, -0.02, 0);
          model.rotation.set(0, 0, 0);
          model.traverse((node) => {
            if (!node.isMesh) return;
            node.frustumCulled = false;
            if (node.material) {
              node.material = node.material.clone();
              node.material.roughness = Math.min(0.7, node.material.roughness ?? 0.7);
              node.material.metalness = Math.max(0.04, node.material.metalness ?? 0.04);
              if (node.material.name === "Vanguard_VisorMat") {
                node.material.color.set(0xe4bd48);
                node.material.emissive?.set(0x4a3505);
                node.material.emissiveIntensity = 0.32;
              } else {
                node.material.color.set(0x4a4b43);
              }
            }
          });
          scene.add(model);
          mixer = new THREE.AnimationMixer(model);
          idleAction = mixer.clipAction(gltf.animations[0]);
          runAction = mixer.clipAction(gltf.animations[1]);
          idleAction.play();
          mixer.update(0);
          renderer.render(scene, camera);
          canvas.classList.remove("is-loading");
          canvas.classList.add("is-ready");
          canvas.dataset.pet3d = "ready";
        },
        undefined,
        (error) => {
          canvas.classList.remove("is-loading");
          canvas.classList.add("has-error");
          canvas.dataset.pet3d = "error";
          canvas.dataset.pet3dError = error?.message || "Model load failed";
        }
      );

      requestAnimationFrame(animate);
    }).catch((error) => {
      canvas.classList.remove("is-loading");
      canvas.classList.add("has-error");
      canvas.dataset.pet3d = "error";
      canvas.dataset.pet3dError = error?.message || "3D engine failed";
    });

    return loadingPromise;
  }

  button?.addEventListener("pointerenter", loadRunner, { once: true });
  button?.addEventListener("focus", loadRunner, { once: true });
  const schedulePreload = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 900));
  schedulePreload(() => {
    if (canvas.isConnected && !document.hidden) loadRunner();
  }, { timeout: 2200 });
}

function initializeRunners() {
  document.querySelectorAll(".pet-runner-canvas").forEach(attachRunner);
}

initializeRunners();
new MutationObserver(initializeRunners).observe(document.body, { childList: true, subtree: true });
