import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // World
  worldSize: 200,
  playerHeight: 5,
  
  // Shapes - this is the TARGET on-screen density
  targetOnScreenShapes: 50,
  
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
// LOOK VELOCITY TRACKING
// ============================================
const lookVelocity = { x: 0, y: 0 };
let lastCameraRotation = { x: 0, y: 0 };

function updateLookVelocity() {
  const currentRotation = {
    x: camera.rotation.x,
    y: camera.rotation.y
  };
  
  // Calculate angular velocity (smoothed)
  lookVelocity.x = lookVelocity.x * 0.7 + (currentRotation.x - lastCameraRotation.x) * 0.3;
  lookVelocity.y = lookVelocity.y * 0.7 + (currentRotation.y - lastCameraRotation.y) * 0.3;
  
  lastCameraRotation.x = currentRotation.x;
  lastCameraRotation.y = currentRotation.y;
}

// ============================================
// SPAWN POSITIONS
// ============================================

// Get a position ON SCREEN (within the frustum)
function getOnScreenPosition() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0);
  
  // Random distance in front of player
  const distance = 15 + Math.random() * 50;
  
  // Random angle within FOV (75 degrees, so ±30 degrees to stay comfortably in view)
  const hAngle = (Math.random() - 0.5) * 55 * Math.PI / 180;
  const vAngle = (Math.random() - 0.5) * 35 * Math.PI / 180;
  
  const position = new THREE.Vector3()
    .copy(camera.position)
    .add(forward.clone().multiplyScalar(distance))
    .add(right.clone().multiplyScalar(Math.tan(hAngle) * distance))
    .add(up.clone().multiplyScalar(Math.tan(vAngle) * distance));
  
  // Override height to be in reasonable range
  position.y = 1 + Math.random() * 20;
  
  // Clamp to world bounds
  const bound = CONFIG.worldSize - 5;
  position.x = Math.max(-bound, Math.min(bound, position.x));
  position.z = Math.max(-bound, Math.min(bound, position.z));
  
  return position;
}

// Debug state
const debugState = {
  spawnDirection: 'NONE',
  lastSpawnCount: 0,
  lastDebugUpdate: 0
};

// Get a spawn position in the direction the player is looking/turning
function getLookDirectionSpawnPosition() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0);
  
  // Distance from player - spawn at edge of view
  const distance = 20 + Math.random() * 35;
  
  // Determine which SINGLE side to spawn on based on look velocity
  // Compare horizontal vs vertical velocity to pick dominant direction
  const absVelY = Math.abs(lookVelocity.y); // Horizontal turning
  const absVelX = Math.abs(lookVelocity.x); // Vertical looking
  const velocityThreshold = 0.001;
  
  let hAngle, vAngle;
  const edgeAngle = (32 + Math.random() * 4) * Math.PI / 180;
  
  // Pick ONE direction based on which velocity is dominant
  if (absVelY > velocityThreshold || absVelX > velocityThreshold) {
    if (absVelY >= absVelX) {
      // Horizontal movement is dominant
      if (lookVelocity.y > 0) {
        // Turning LEFT - spawn on LEFT
        hAngle = -edgeAngle;
        debugState.spawnDirection = 'LEFT';
      } else {
        // Turning RIGHT - spawn on RIGHT
        hAngle = edgeAngle;
        debugState.spawnDirection = 'RIGHT';
      }
      // Small random vertical variation
      vAngle = (Math.random() - 0.5) * 15 * Math.PI / 180;
    } else {
      // Vertical movement is dominant
      if (lookVelocity.x > 0) {
        // Looking DOWN - spawn at BOTTOM
        vAngle = -edgeAngle * 0.6;
        debugState.spawnDirection = 'BOTTOM';
      } else {
        // Looking UP - spawn at TOP
        vAngle = edgeAngle * 0.6;
        debugState.spawnDirection = 'TOP';
      }
      // Small random horizontal variation
      hAngle = (Math.random() - 0.5) * 15 * Math.PI / 180;
    }
  } else {
    // Not moving much - spawn randomly
    const side = Math.random() > 0.5 ? 1 : -1;
    hAngle = side * (25 + Math.random() * 10) * Math.PI / 180;
    vAngle = (Math.random() - 0.5) * 15 * Math.PI / 180;
    debugState.spawnDirection = 'RANDOM';
  }
  
  const position = new THREE.Vector3()
    .copy(camera.position)
    .add(forward.clone().multiplyScalar(distance))
    .add(right.clone().multiplyScalar(Math.tan(hAngle) * distance))
    .add(up.clone().multiplyScalar(Math.tan(vAngle) * distance));
  
  // Random height
  position.y = 1 + Math.random() * 20;
  
  // Clamp to world bounds
  const bound = CONFIG.worldSize - 5;
  position.x = Math.max(-bound, Math.min(bound, position.x));
  position.z = Math.max(-bound, Math.min(bound, position.z));
  
  return position;
}

// ============================================
// SHAPE SPAWNING
// ============================================

function spawnShape(onScreen = true) {
  const type = getRandomShapeType();
  const config = CONFIG.shapeTypes[type];
  
  const geometry = createShapeGeometry(type);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.4,
    metalness: 0.3
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Position based on context
  const position = onScreen ? getOnScreenPosition() : getLookDirectionSpawnPosition();
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
// VISIBILITY & DENSITY MANAGEMENT
// ============================================

const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

function isShapeVisible(shape) {
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);
  
  if (!shape.geometry.boundingSphere) {
    shape.geometry.computeBoundingSphere();
  }
  
  const worldSphere = new THREE.Sphere(
    shape.position.clone(),
    shape.geometry.boundingSphere.radius * 1.5
  );
  
  return frustum.intersectsSphere(worldSphere);
}

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
  // Remove shapes that went off-screen
  const shapesToRemove = [];
  for (const shape of state.shapes) {
    if (shape === state.heldShape) continue;
    if (!isShapeVisible(shape)) {
      shapesToRemove.push(shape);
    }
  }
  
  for (const shape of shapesToRemove) {
    removeShape(shape);
  }
  
  // Count how many are currently visible
  const visibleCount = countVisibleShapes();
  
  // Spawn new shapes to maintain density
  const needed = CONFIG.targetOnScreenShapes - visibleCount;
  debugState.lastSpawnCount = needed;
  
  for (let i = 0; i < needed; i++) {
    spawnShape(false); // Spawn in look direction
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
  
  // Recipe complete! Show popup and auto-advance
  showRecipeCompletePopup();
  return true;
}

let currentDifficulty = 1;

function showRecipeCompletePopup() {
  const popup = document.getElementById('recipe-complete-popup');
  popup.classList.add('show');
  
  // After 2 seconds, start next recipe and fade out
  setTimeout(() => {
    currentDifficulty++;
    state.recipe = generateRecipe(currentDifficulty);
    state.collected = {};
    updateRecipeUI();
    
    // Fade out popup
    setTimeout(() => {
      popup.classList.remove('show');
    }, 500);
  }, 2000);
}

// Keep old functions for compatibility but they won't be used
function showWinMessage() {
  document.getElementById('win-message').style.display = 'block';
  controls.unlock();
}

function startNextRecipe() {
  currentDifficulty++;
  state.recipe = generateRecipe(currentDifficulty);
  state.collected = {};
  updateRecipeUI();
  document.getElementById('win-message').style.display = 'none';
  controls.lock();
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
  // Only update every 200ms
  if (now - debugState.lastDebugUpdate < 200) return;
  debugState.lastDebugUpdate = now;
  
  // Scale up velocity by 1000 to make it readable
  document.getElementById('debug-vel-y').textContent = (lookVelocity.y * 1000).toFixed(1);
  document.getElementById('debug-vel-x').textContent = (lookVelocity.x * 1000).toFixed(1);
  document.getElementById('debug-spawn-dir').textContent = debugState.spawnDirection;
  document.getElementById('debug-on-screen').textContent = countVisibleShapes();
  document.getElementById('debug-last-spawn').textContent = debugState.lastSpawnCount;
}

// ============================================
// EVENT LISTENERS
// ============================================

document.getElementById('start-btn').addEventListener('click', () => {
  controls.lock();
});

document.getElementById('next-btn').addEventListener('click', () => {
  startNextRecipe();
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
  }
  
  animateCollectionZone(time);
  
  renderer.render(scene, camera);
}

animate();

console.log('🔷 Looky Shape Game loaded!');
