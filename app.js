const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

const STATES = {
  idle: {
    row: 0,
    frames: [0, 1, 2, 3, 4, 5],
    durations: [280, 110, 110, 140, 140, 320],
    label: "正在休息",
  },
  "running-right": {
    row: 1,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
    label: "向右跑动",
  },
  "running-left": {
    row: 2,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
    label: "向左跑动",
  },
  waving: {
    row: 3,
    frames: [0, 1, 2, 3],
    durations: [140, 140, 140, 280],
    label: "挥手打招呼",
  },
  jumping: {
    row: 4,
    frames: [0, 1, 2, 3, 4],
    durations: [140, 140, 140, 140, 280],
    label: "站着挠头",
  },
  failed: {
    row: 5,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durations: [140, 140, 140, 140, 140, 140, 140, 240],
    label: "遇到错误",
  },
  waiting: {
    row: 6,
    frames: [0, 1, 2, 3, 4, 5],
    durations: [150, 150, 150, 150, 150, 260],
    label: "等待确认",
  },
  running: {
    row: 7,
    frames: [0, 1, 2, 3, 4, 5],
    durations: [120, 120, 120, 120, 120, 220],
    label: "认真工作中",
  },
  review: {
    row: 8,
    frames: [0, 1, 2, 3, 4, 5],
    durations: [150, 150, 150, 150, 150, 280],
    label: "检查结果",
  },
};

const DIRECTION_NAMES = [
  "上",
  "右上 22.5°",
  "右上 45°",
  "右上 67.5°",
  "右",
  "右下 112.5°",
  "右下 135°",
  "右下 157.5°",
  "下",
  "左下 202.5°",
  "左下 225°",
  "左下 247.5°",
  "左",
  "左上 292.5°",
  "左上 315°",
  "左上 337.5°",
];

const stage = document.querySelector("#motion-stage");
const pet = document.querySelector("#pet");
const pointerOrb = document.querySelector("#pointer-orb");
const statusLabel = document.querySelector("#status-label");
const stateValue = document.querySelector("#state-value");
const atlasValue = document.querySelector("#atlas-value");
const directionValue = document.querySelector("#direction-value");
const stateButtons = document.querySelector("#state-buttons");
const restButton = document.querySelector("#rest-button");
const resetPositionButton = document.querySelector("#reset-position");

let timer = 0;
let animationToken = 0;
let activeState = "idle";
let activeFrame = 0;
let transient = false;
let dragging = false;
let hoverArmed = true;
let petX = 0;
let petY = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let lastPointerX = 0;
let dragDirection = "running-right";
let pointerInsidePet = false;

function setSprite(row, column, stateName, direction = null) {
  pet.style.setProperty("--row", row);
  pet.style.setProperty("--col", column);
  activeFrame = column;
  activeState = stateName;

  stateValue.textContent = stateName;
  atlasValue.textContent = `row ${row} · frame ${column + 1}`;
  directionValue.textContent = direction ?? "正面";
}

function setActiveButton(stateName = null) {
  document.querySelectorAll("[data-state]").forEach((button) => {
    button.classList.toggle("active", button.dataset.state === stateName);
  });
}

function stopAnimation() {
  animationToken += 1;
  window.clearTimeout(timer);
}

function startIdle() {
  stopAnimation();
  transient = false;
  setActiveButton();
  const token = animationToken;
  const state = STATES.idle;
  let index = 0;

  function tick() {
    if (token !== animationToken || dragging) return;
    const column = state.frames[index];
    setSprite(state.row, column, "idle");
    statusLabel.textContent = state.label;
    index = (index + 1) % state.frames.length;
    timer = window.setTimeout(tick, state.durations[index === 0 ? state.frames.length - 1 : index - 1]);
  }

  tick();
}

function playState(stateName, repeats = 2, options = {}) {
  const state = STATES[stateName];
  if (!state) return;

  stopAnimation();
  transient = true;
  setActiveButton(options.highlight === false ? null : stateName);
  statusLabel.textContent = state.label;

  const token = animationToken;
  let index = 0;
  let loop = 0;

  function tick() {
    if (token !== animationToken) return;
    const column = state.frames[index];
    setSprite(state.row, column, stateName);
    const delay = state.durations[index];
    index += 1;

    if (index >= state.frames.length) {
      index = 0;
      loop += 1;
    }

    if (repeats !== Infinity && loop >= repeats) {
      timer = window.setTimeout(() => {
        if (token !== animationToken) return;
        transient = false;
        options.onComplete?.();
        if (options.returnToIdle !== false) startIdle();
      }, delay);
      return;
    }

    timer = window.setTimeout(tick, delay);
  }

  tick();
}

function showDirection(clientX, clientY) {
  if (transient || dragging) return;

  const petRect = pet.getBoundingClientRect();
  const centerX = petRect.left + petRect.width / 2;
  const centerY = petRect.top + petRect.height * 0.43;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance < 30) {
    if (activeState === "looking") startIdle();
    return;
  }

  stopAnimation();
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const normalized = (degrees + 360) % 360;
  const directionIndex = Math.round(normalized / 22.5) % 16;
  const row = directionIndex < 8 ? 9 : 10;
  const column = directionIndex < 8 ? directionIndex : directionIndex - 8;

  setSprite(row, column, "looking", DIRECTION_NAMES[directionIndex]);
  statusLabel.textContent = `看向${DIRECTION_NAMES[directionIndex]}`;
  setActiveButton();
}

function setPetPosition(x, y) {
  petX = x;
  petY = y;
  pet.style.setProperty("--pet-x", `${x}px`);
  pet.style.setProperty("--pet-y", `${y}px`);
}

function clampPetPosition(nextX, nextY) {
  const stageRect = stage.getBoundingClientRect();
  const petRect = pet.getBoundingClientRect();
  const maxX = Math.max(0, (stageRect.width - petRect.width) / 2 - 14);
  const maxY = Math.max(0, (stageRect.height - petRect.height) / 2 - 56);
  return {
    x: Math.max(-maxX, Math.min(maxX, nextX)),
    y: Math.max(-maxY, Math.min(maxY, nextY)),
  };
}

stage.addEventListener("pointermove", (event) => {
  const stageRect = stage.getBoundingClientRect();
  pointerOrb.style.left = `${event.clientX - stageRect.left}px`;
  pointerOrb.style.top = `${event.clientY - stageRect.top}px`;
  stage.classList.add("pointer-active");

  if (dragging) {
    const next = clampPetPosition(
      dragOriginX + event.clientX - dragStartX,
      dragOriginY + event.clientY - dragStartY,
    );
    setPetPosition(next.x, next.y);

    const deltaX = event.clientX - lastPointerX;
    const nextDirection = Math.abs(deltaX) < 1 ? dragDirection : deltaX > 0 ? "running-right" : "running-left";
    if (nextDirection !== dragDirection || activeState !== nextDirection) {
      dragDirection = nextDirection;
      stage.dataset.lastDragDirection = dragDirection;
      playState(dragDirection, Infinity, { returnToIdle: false, highlight: false });
    }
    lastPointerX = event.clientX;
    return;
  }

  const petRect = pet.getBoundingClientRect();
  const insidePetBounds =
    event.clientX >= petRect.left &&
    event.clientX <= petRect.right &&
    event.clientY >= petRect.top &&
    event.clientY <= petRect.bottom;

  if (insidePetBounds) {
    if (!pointerInsidePet) {
      pointerInsidePet = true;
      if (hoverArmed) {
        hoverArmed = false;
        playState("jumping", 3, { highlight: false });
      }
    }
    return;
  }

  if (pointerInsidePet) {
    pointerInsidePet = false;
    hoverArmed = true;
    if (activeState === "jumping") startIdle();
  }

  showDirection(event.clientX, event.clientY);
});

stage.addEventListener("pointerleave", () => {
  stage.classList.remove("pointer-active");
  pointerInsidePet = false;
  hoverArmed = true;
  if (!dragging) startIdle();
});

pet.addEventListener("pointerenter", () => {
  if (!hoverArmed || dragging || pointerInsidePet) return;
  pointerInsidePet = true;
  hoverArmed = false;
  playState("jumping", 3, { highlight: false });
});

pet.addEventListener("pointerleave", () => {
  pointerInsidePet = false;
  hoverArmed = true;
  if (!dragging && activeState === "jumping") startIdle();
});

pet.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dragging = true;
  hoverArmed = false;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginX = petX;
  dragOriginY = petY;
  lastPointerX = event.clientX;
  dragDirection = "running-right";
  stage.dataset.lastDragDirection = dragDirection;
  pet.classList.add("dragging");
  pet.setPointerCapture(event.pointerId);
  playState(dragDirection, Infinity, { returnToIdle: false, highlight: false });
});

function finishDrag(event) {
  if (!dragging) return;
  dragging = false;
  pet.classList.remove("dragging");
  if (pet.hasPointerCapture(event.pointerId)) pet.releasePointerCapture(event.pointerId);
  startIdle();
}

pet.addEventListener("pointerup", finishDrag);
pet.addEventListener("pointercancel", finishDrag);

pet.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    playState("jumping", 3, { highlight: false });
  }
});

stateButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-state]");
  if (!button) return;
  const repeats = button.dataset.state === "jumping" ? 3 : 2;
  playState(button.dataset.state, repeats);
});

restButton.addEventListener("click", startIdle);

resetPositionButton.addEventListener("click", () => {
  setPetPosition(0, 0);
  startIdle();
});

window.addEventListener("resize", () => {
  const next = clampPetPosition(petX, petY);
  setPetPosition(next.x, next.y);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAnimation();
  else startIdle();
});

startIdle();
