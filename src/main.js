import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // World
  worldSize: 200,
  playerHeight: 5,
  
  // Shapes - target on-screen density
  targetOnScreenShapes: 50,
  
  // Edge buffer - how far outside the screen edge to spawn/despawn
  // This is in degrees from the frustum edge
  edgeBufferDegrees: 5,
  
  // Shape types with rarity weights (higher = more common)
  shapeTypes: {
    cube: { color: 0xff4444, size: 5, rarity: 10, name: 'Cube' },
    sphere: { color: 0x44ff44, size: 10, rarity: 7, name: 'Sphere' },
    tetrahedron: { color: 0xffff44, size: 7, rarity: 5, name: 'Tetrahedron' },
    octahedron: { color: 0xff44ff, size: 8, rarity: 3, name: 'Octahedron' },
    torus: { color: 0x44ffff, size: 12, rarity: 2, name: 'Torus' }
  },
  
  // Movement
  walkSpeed: 60,
  runSpeed: 120,
  
  // Collection zone
  collectionZoneRadius: 8
};

// ============================================
// GAME STATE
// ============================================
const state = {
  shapes: [],
  heldShape: null,
  recipe: {},
  collected: {},
  isPlaying: false
};

// Debug state
const debugState = {
  spawnEdge: 'NONE',
  lastSpawnCount: 0,
  visibleCount: 0,
  lastDebugUpdate: 0
};

// Velocity tracking using mouse movement directly
const lookVelocity = { x: 0, y: 0 };
let mouseMoveDelta = { x: 0, y: 0 };

// Capture raw mouse movement (this is the actual input)
document.addEventListener('mousemove', (e) => {
  if (controls.isLocked) {
    // movementX = horizontal mouse movement (positive = right)
    // movementY = vertical mouse movement (positive = down)
    mouseMoveDelta.x += e.movementX;
    mouseMoveDelta.y += e.movementY;
  }
});

function updateLookVelocity() {
  // Use accumulated mouse movement as velocity
  // Positive X = turning RIGHT, Negative X = turning LEFT
  // Positive Y = looking DOWN, Negative Y = looking UP
  
  // Smooth it and scale
  lookVelocity.x = lookVelocity.x * 0.3 + mouseMoveDelta.x * 0.7;
  lookVelocity.y = lookVelocity.y * 0.3 + mouseMoveDelta.y * 0.7;
  
  // Reset delta for next frame
  mouseMoveDelta.x = 0;
  mouseMoveDelta.y = 0;
}

// Velocity gizmo drawing
const gizmoCanvas = document.getElementById('velocity-gizmo');
const gizmoCtx = gizmoCanvas.getContext('2d');

function drawVelocityGizmo() {
  const width = gizmoCanvas.width;
  const height = gizmoCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Clear
  gizmoCtx.clearRect(0, 0, width, height);
  
  // Draw crosshair reference (subtle)
  gizmoCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  gizmoCtx.lineWidth = 1;
  gizmoCtx.beginPath();
  gizmoCtx.moveTo(centerX - 30, centerY);
  gizmoCtx.lineTo(centerX + 30, centerY);
  gizmoCtx.moveTo(centerX, centerY - 30);
  gizmoCtx.lineTo(centerX, centerY + 30);
  gizmoCtx.stroke();
  
  // Draw velocity vector
  // lookVelocity.x = horizontal mouse movement (right = positive)
  // lookVelocity.y = vertical mouse movement (down = positive)
  const scale = 15; // Increased sensitivity
  const velX = lookVelocity.x * scale;  // Horizontal: right is positive
  const velY = lookVelocity.y * scale;  // Vertical: down is positive
  
  // Clamp max length
  const maxLen = 80;
  const len = Math.sqrt(velX * velX + velY * velY);
  let drawX = velX;
  let drawY = velY;
  if (len > maxLen) {
    drawX = (velX / len) * maxLen;
    drawY = (velY / len) * maxLen;
  }
  
  // Draw the velocity line
  gizmoCtx.strokeStyle = '#00ff00';
  gizmoCtx.lineWidth = 3;
  gizmoCtx.lineCap = 'round';
  gizmoCtx.beginPath();
  gizmoCtx.moveTo(centerX, centerY);
  gizmoCtx.lineTo(centerX + drawX, centerY + drawY);
  gizmoCtx.stroke();
  
  // Draw arrowhead if there's velocity
  if (len > 5) {
    const angle = Math.atan2(drawY, drawX);
    const arrowSize = 10;
    
    gizmoCtx.beginPath();
    gizmoCtx.moveTo(centerX + drawX, centerY + drawY);
    gizmoCtx.lineTo(
      centerX + drawX - arrowSize * Math.cos(angle - Math.PI / 6),
      centerY + drawY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    gizmoCtx.moveTo(centerX + drawX, centerY + drawY);
    gizmoCtx.lineTo(
      centerX + drawX - arrowSize * Math.cos(angle + Math.PI / 6),
      centerY + drawY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    gizmoCtx.stroke();
  }
  
  // Draw center dot
  gizmoCtx.fillStyle = '#00ff00';
  gizmoCtx.beginPath();
  gizmoCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  gizmoCtx.fill();
}

// ============================================
// THREE.JS SETUP
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.playerHeight, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 300;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// ============================================
// WORLD SETUP
// ============================================

// Ground plane (white)
const groundGeometry = new THREE.PlaneGeometry(CONFIG.worldSize * 2, CONFIG.worldSize * 2);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffffff,
  roughness: 0.8
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Decorative white shapes (non-collectible)
function createDecorations() {
  const decorTypes = ['box', 'cone'];
  const decorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xeeeeee,
    roughness: 0.9
  });
  
  for (let i = 0; i < 30; i++) {
    const type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
    let geometry;
    
    if (type === 'box') {
      const size = 1 + Math.random() * 3;
      geometry = new THREE.BoxGeometry(size, size * 0.3, size);
    } else {
      geometry = new THREE.ConeGeometry(1 + Math.random() * 2, 2 + Math.random() * 3, 4);
    }
    
    const mesh = new THREE.Mesh(geometry, decorMaterial);
    mesh.position.set(
      (Math.random() - 0.5) * CONFIG.worldSize * 1.8,
      type === 'box' ? 0.15 : (1 + Math.random() * 1.5),
      (Math.random() - 0.5) * CONFIG.worldSize * 1.8
    );
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}
createDecorations();

// Collection zone
const collectionZoneGeometry = new THREE.CylinderGeometry(
  CONFIG.collectionZoneRadius, 
  CONFIG.collectionZoneRadius, 
  0.5, 
  32
);
const collectionZoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.3,
  emissive: 0x00ffff,
  emissiveIntensity: 0.5
});
const collectionZone = new THREE.Mesh(collectionZoneGeometry, collectionZoneMaterial);
collectionZone.position.set(0, 0.25, -20);
scene.add(collectionZone);

// Collection zone glow ring
const ringGeometry = new THREE.TorusGeometry(CONFIG.collectionZoneRadius, 0.3, 8, 32);
const ringMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 1
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = -Math.PI / 2;
ring.position.set(0, 0.5, -20);
scene.add(ring);

// ============================================
// SHAPE MANAGEMENT
// ============================================

function createShapeGeometry(type) {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'sphere':
      return new THREE.SphereGeometry(1.2, 16, 16);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(1.5);
    case 'octahedron':
      return new THREE.OctahedronGeometry(1.3);
    case 'torus':
      return new THREE.TorusGeometry(1, 0.4, 8, 16);
    default:
      return new THREE.BoxGeometry(2, 2, 2);
  }
}

function getRandomShapeType() {
  const types = Object.keys(CONFIG.shapeTypes);
  const weights = types.map(t => CONFIG.shapeTypes[t].rarity);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < types.length; i++) {
    random -= weights[i];
    if (random <= 0) return types[i];
  }
  return types[0];
}

// ============================================
// FRUSTUM & EDGE SPAWN SYSTEM
// ============================================

const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

// Half FOV in radians
const halfFovRad = (75 / 2) * Math.PI / 180; // ~37.5 degrees
const edgeBufferRad = CONFIG.edgeBufferDegrees * Math.PI / 180;

// Check if shape is within the DESPAWN zone (inside frustum + buffer)
function isShapeInDespawnZone(shape) {
  // Project shape position to screen space
  const pos = shape.position.clone();
  pos.project(camera);
  
  // pos.x and pos.y are now in range [-1, 1] if on screen
  // We add buffer to allow shapes slightly outside screen
  const buffer = 0.15; // ~15% buffer outside normalized screen coords
  
  return pos.x >= -1 - buffer && pos.x <= 1 + buffer &&
         pos.y >= -1 - buffer && pos.y <= 1 + buffer &&
         pos.z >= 0 && pos.z <= 1; // In front of camera
}

// Check if shape is visible (for counting)
function isShapeVisible(shape) {
  const pos = shape.position.clone();
  pos.project(camera);
  
  return pos.x >= -1 && pos.x <= 1 &&
         pos.y >= -1 && pos.y <= 1 &&
         pos.z >= 0 && pos.z <= 1;
}

// Check if a position is off-screen
function isPositionOffScreen(position) {
  const pos = position.clone();
  pos.project(camera);
  
  // Must be outside the visible area and in front of camera
  const isOff = pos.x < -1.1 || pos.x > 1.1 || pos.y < -1.1 || pos.y > 1.1;
  const isInFront = pos.z >= 0 && pos.z <= 1;
  
  return isOff && isInFront;
}

// Get spawn position at a random edge of the screen (guaranteed off-screen)
function getEdgeSpawnPosition() {
  const bound = CONFIG.worldSize - 5;
  
  // Try up to 20 times to find a valid off-screen position
  for (let attempt = 0; attempt < 20; attempt++) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // Distance from camera
    const distance = 25 + Math.random() * 35;
    
    // Pick an edge: 0=left, 1=right, 2=behind-left, 3=behind-right
    const edge = Math.floor(Math.random() * 4);
    
    let position = new THREE.Vector3();
    
    // Spawn well outside the FOV (50-90 degrees from forward)
    const sideAngle = (50 + Math.random() * 40) * Math.PI / 180;
    
    switch (edge) {
      case 0: // LEFT
        position.copy(camera.position)
          .add(forward.clone().multiplyScalar(Math.cos(sideAngle) * distance))
          .add(right.clone().multiplyScalar(-Math.sin(sideAngle) * distance));
        debugState.spawnEdge = 'LEFT';
        break;
      case 1: // RIGHT
        position.copy(camera.position)
          .add(forward.clone().multiplyScalar(Math.cos(sideAngle) * distance))
          .add(right.clone().multiplyScalar(Math.sin(sideAngle) * distance));
        debugState.spawnEdge = 'RIGHT';
        break;
      case 2: // BEHIND-LEFT
        position.copy(camera.position)
          .add(forward.clone().multiplyScalar(-distance * 0.3))
          .add(right.clone().multiplyScalar(-distance * 0.7));
        debugState.spawnEdge = 'BACK-L';
        break;
      case 3: // BEHIND-RIGHT
        position.copy(camera.position)
          .add(forward.clone().multiplyScalar(-distance * 0.3))
          .add(right.clone().multiplyScalar(distance * 0.7));
        debugState.spawnEdge = 'BACK-R';
        break;
    }
    
    // Set height
    position.y = 1 + Math.random() * 20;
    
    // Clamp to world bounds
    position.x = Math.max(-bound, Math.min(bound, position.x));
    position.z = Math.max(-bound, Math.min(bound, position.z));
    
    // Verify it's actually off-screen
    if (isPositionOffScreen(position)) {
      return position;
    }
  }
  
  // Fallback: spawn behind the player
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const position = camera.position.clone().add(forward.multiplyScalar(-30));
  position.y = 1 + Math.random() * 20;
  position.x = Math.max(-bound, Math.min(bound, position.x));
  position.z = Math.max(-bound, Math.min(bound, position.z));
  debugState.spawnEdge = 'BEHIND';
  return position;
}

// Get on-screen position (for initial spawn)
function getOnScreenPosition() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  
  const distance = 15 + Math.random() * 50;
  
  // Random angle within FOV
  const hAngle = (Math.random() - 0.5) * halfFovRad * 1.6;
  const vAngle = (Math.random() - 0.5) * halfFovRad * 0.8;
  
  const position = new THREE.Vector3()
    .copy(camera.position)
    .add(forward.clone().multiplyScalar(distance))
    .add(right.clone().multiplyScalar(Math.tan(hAngle) * distance))
    .add(up.clone().multiplyScalar(Math.tan(vAngle) * distance));
  
  position.y = 1 + Math.random() * 20;
  
  const bound = CONFIG.worldSize - 5;
  position.x = Math.max(-bound, Math.min(bound, position.x));
  position.z = Math.max(-bound, Math.min(bound, position.z));
  
  return position;
}

// ============================================
// SHAPE SPAWNING
// ============================================

function spawnShape(onScreen = false) {
  const type = getRandomShapeType();
  const config = CONFIG.shapeTypes[type];
  
  const geometry = createShapeGeometry(type);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.4,
    metalness: 0.3
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  const position = onScreen ? getOnScreenPosition() : getEdgeSpawnPosition();
  mesh.position.copy(position);
  mesh.castShadow = true;
  
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  
  mesh.userData = {
    type: type,
    size: config.size,
    name: config.name,
    rotationSpeed: {
      x: (Math.random() - 0.5) * 0.02,
      y: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02
    }
  };
  
  scene.add(mesh);
  state.shapes.push(mesh);
  
  return mesh;
}

function removeShape(shape) {
  const index = state.shapes.indexOf(shape);
  if (index > -1) {
    state.shapes.splice(index, 1);
    scene.remove(shape);
    shape.geometry.dispose();
    shape.material.dispose();
  }
}

// ============================================
// DENSITY MANAGEMENT
// ============================================

function countVisibleShapes() {
  let count = 0;
  for (const shape of state.shapes) {
    if (isShapeVisible(shape)) {
      count++;
    }
  }
  return count;
}

function updateShapeDensity() {
  // Remove shapes that are outside the despawn zone
  const shapesToRemove = [];
  for (const shape of state.shapes) {
    if (shape === state.heldShape) continue;
    if (!isShapeInDespawnZone(shape)) {
      shapesToRemove.push(shape);
    }
  }
  
  for (const shape of shapesToRemove) {
    removeShape(shape);
  }
  
  // Count visible and spawn to maintain density
  const visibleCount = countVisibleShapes();
  debugState.visibleCount = visibleCount;
  
  const needed = CONFIG.targetOnScreenShapes - visibleCount;
  debugState.lastSpawnCount = Math.max(0, needed);
  
  for (let i = 0; i < needed; i++) {
    spawnShape(false); // Spawn at edge
  }
}

// ============================================
// PLAYER INTERACTION
// ============================================

const raycaster = new THREE.Raycaster();
raycaster.far = 15;

function tryPickupShape() {
  if (state.heldShape) {
    dropShape();
    return;
  }
  
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(state.shapes);
  
  if (intersects.length > 0) {
    const shape = intersects[0].object;
    pickupShape(shape);
  }
}

function pickupShape(shape) {
  state.heldShape = shape;
  
  const index = state.shapes.indexOf(shape);
  if (index > -1) {
    state.shapes.splice(index, 1);
  }
  
  document.getElementById('held-indicator').style.display = 'block';
  document.getElementById('held-shape-name').textContent = shape.userData.name;
}

function dropShape() {
  if (!state.heldShape) return;
  
  const shape = state.heldShape;
  
  const distToZone = new THREE.Vector2(
    shape.position.x - collectionZone.position.x,
    shape.position.z - collectionZone.position.z
  ).length();
  
  if (distToZone < CONFIG.collectionZoneRadius) {
    collectShape(shape);
  } else {
    state.shapes.push(shape);
  }
  
  state.heldShape = null;
  document.getElementById('held-indicator').style.display = 'none';
}

function collectShape(shape) {
  const type = shape.userData.type;
  
  state.collected[type] = (state.collected[type] || 0) + 1;
  
  scene.remove(shape);
  shape.geometry.dispose();
  shape.material.dispose();
  
  updateRecipeUI();
  checkWinCondition();
}

// ============================================
// RECIPE SYSTEM
// ============================================

function generateRecipe(difficulty = 1) {
  const types = Object.keys(CONFIG.shapeTypes);
  const recipe = {};
  
  const numTypes = Math.min(1 + Math.floor(difficulty / 2), 3);
  
  const shuffled = types.sort(() => Math.random() - 0.5);
  for (let i = 0; i < numTypes; i++) {
    const type = shuffled[i];
    recipe[type] = 1 + Math.floor(Math.random() * Math.min(difficulty, 3));
  }
  
  return recipe;
}

function updateRecipeUI() {
  const container = document.getElementById('recipe-items');
  container.innerHTML = '';
  
  for (const [type, needed] of Object.entries(state.recipe)) {
    const config = CONFIG.shapeTypes[type];
    const collected = state.collected[type] || 0;
    const complete = collected >= needed;
    
    const item = document.createElement('div');
    item.className = 'recipe-item' + (complete ? ' complete' : '');
    
    const icon = document.createElement('div');
    icon.className = 'shape-icon';
    icon.style.backgroundColor = '#' + config.color.toString(16).padStart(6, '0');
    
    const text = document.createElement('span');
    text.textContent = `${config.name}: ${collected}/${needed}`;
    
    item.appendChild(icon);
    item.appendChild(text);
    container.appendChild(item);
  }
}

function checkWinCondition() {
  for (const [type, needed] of Object.entries(state.recipe)) {
    if ((state.collected[type] || 0) < needed) {
      return false;
    }
  }
  
  showRecipeCompletePopup();
  return true;
}

let currentDifficulty = 1;

function showRecipeCompletePopup() {
  const popup = document.getElementById('recipe-complete-popup');
  popup.classList.add('show');
  
  setTimeout(() => {
    currentDifficulty++;
    state.recipe = generateRecipe(currentDifficulty);
    state.collected = {};
    updateRecipeUI();
    
    setTimeout(() => {
      popup.classList.remove('show');
    }, 500);
  }, 2000);
}

// ============================================
// MOVEMENT
// ============================================

const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false
};

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function updateMovement(delta) {
  if (!controls.isLocked) return;
  
  const currentSpeed = moveState.sprint ? CONFIG.runSpeed : CONFIG.walkSpeed;
  
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  
  direction.z = Number(moveState.forward) - Number(moveState.backward);
  direction.x = Number(moveState.right) - Number(moveState.left);
  direction.normalize();
  
  if (moveState.forward || moveState.backward) {
    velocity.z -= direction.z * currentSpeed * delta;
  }
  if (moveState.left || moveState.right) {
    velocity.x -= direction.x * currentSpeed * delta;
  }
  
  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  
  const pos = camera.position;
  const bound = CONFIG.worldSize - 5;
  pos.x = Math.max(-bound, Math.min(bound, pos.x));
  pos.z = Math.max(-bound, Math.min(bound, pos.z));
  
  pos.y = CONFIG.playerHeight;
}

function updateHeldShape() {
  if (!state.heldShape) return;
  
  const offset = new THREE.Vector3(0, -0.5, -3);
  offset.applyQuaternion(camera.quaternion);
  
  state.heldShape.position.copy(camera.position).add(offset);
  state.heldShape.rotation.x += 0.01;
  state.heldShape.rotation.y += 0.02;
}

// ============================================
// UI UPDATES
// ============================================

function updateZoneDistance() {
  const dist = camera.position.distanceTo(collectionZone.position);
  document.getElementById('zone-distance').textContent = dist.toFixed(0);
}

function updateDebugPanel() {
  const now = performance.now();
  if (now - debugState.lastDebugUpdate < 200) return;
  debugState.lastDebugUpdate = now;
  
  // Show velocities - X = horizontal (left/right), Y = vertical (up/down)
  document.getElementById('debug-vel-y').textContent = lookVelocity.x.toFixed(1) + ' (H)';
  document.getElementById('debug-vel-x').textContent = lookVelocity.y.toFixed(1) + ' (V)';
  document.getElementById('debug-spawn-dir').textContent = debugState.spawnEdge;
  document.getElementById('debug-on-screen').textContent = debugState.visibleCount;
  document.getElementById('debug-last-spawn').textContent = debugState.lastSpawnCount;
}

// ============================================
// EVENT LISTENERS
// ============================================

document.getElementById('start-btn').addEventListener('click', () => {
  controls.lock();
});

document.getElementById('next-btn').addEventListener('click', () => {
  currentDifficulty++;
  state.recipe = generateRecipe(currentDifficulty);
  state.collected = {};
  updateRecipeUI();
  document.getElementById('win-message').style.display = 'none';
  controls.lock();
});

controls.addEventListener('lock', () => {
  document.getElementById('instructions').style.display = 'none';
  state.isPlaying = true;
});

controls.addEventListener('unlock', () => {
  if (!document.getElementById('win-message').style.display || 
      document.getElementById('win-message').style.display === 'none') {
    document.getElementById('instructions').style.display = 'block';
  }
  state.isPlaying = false;
});

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'ShiftLeft':
    case 'ShiftRight': moveState.sprint = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': moveState.sprint = false; break;
  }
});

document.addEventListener('click', () => {
  if (controls.isLocked) {
    tryPickupShape();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// ANIMATION LOOP
// ============================================

// Spawn initial shapes ON SCREEN
for (let i = 0; i < CONFIG.targetOnScreenShapes; i++) {
  spawnShape(true);
}

// Generate first recipe
state.recipe = generateRecipe(1);
updateRecipeUI();

function animateShapes() {
  for (const shape of state.shapes) {
    shape.rotation.x += shape.userData.rotationSpeed.x;
    shape.rotation.y += shape.userData.rotationSpeed.y;
    shape.rotation.z += shape.userData.rotationSpeed.z;
  }
}

function animateCollectionZone(time) {
  ring.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.5;
  collectionZone.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  
  if (state.isPlaying) {
    updateLookVelocity();
    updateMovement(delta);
    updateShapeDensity();
    updateHeldShape();
    updateZoneDistance();
    animateShapes();
    updateDebugPanel();
    drawVelocityGizmo();
  }
  
  animateCollectionZone(time);
  
  renderer.render(scene, camera);
}

animate();

console.log('🔷 Looky Shape Game loaded!');
