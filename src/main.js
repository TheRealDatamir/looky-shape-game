import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // World
  worldSize: 100, // 20x player height (assuming player ~5 units)
  playerHeight: 5,
  
  // Shapes
  maxShapes: 50,
  spawnPadding: 10,
  
  // Shape types with rarity weights (higher = more common)
  shapeTypes: {
    cube: { color: 0xff4444, size: 5, rarity: 10, name: 'Cube' },
    sphere: { color: 0x44ff44, size: 10, rarity: 7, name: 'Sphere' },
    tetrahedron: { color: 0xffff44, size: 7, rarity: 5, name: 'Tetrahedron' },
    octahedron: { color: 0xff44ff, size: 8, rarity: 3, name: 'Octahedron' },
    torus: { color: 0x44ffff, size: 12, rarity: 2, name: 'Torus' }
  },
  
  // Movement
  moveSpeed: 30,
  
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
document.getElementById('game-container').appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
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

function spawnShape() {
  const type = getRandomShapeType();
  const config = CONFIG.shapeTypes[type];
  
  const geometry = createShapeGeometry(type);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.4,
    metalness: 0.3
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Random position
  const angle = Math.random() * Math.PI * 2;
  const distance = CONFIG.spawnPadding + Math.random() * (CONFIG.worldSize - CONFIG.spawnPadding * 2);
  
  mesh.position.set(
    Math.cos(angle) * distance,
    1 + Math.random() * 4, // Float between 1-5 units high
    Math.sin(angle) * distance
  );
  
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  
  mesh.userData = {
    type: type,
    size: config.size,
    name: config.name,
    seen: false,
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

// Frustum for visibility checking
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

function isShapeVisible(shape) {
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);
  return frustum.containsPoint(shape.position);
}

function updateShapeVisibility() {
  const shapesToRemove = [];
  
  for (const shape of state.shapes) {
    if (shape === state.heldShape) continue; // Don't remove held shape
    
    const visible = isShapeVisible(shape);
    
    if (visible) {
      shape.userData.seen = true;
    } else if (shape.userData.seen) {
      // Was seen, now not visible - mark for removal
      shapesToRemove.push(shape);
    }
  }
  
  // Remove shapes and spawn new ones
  for (const shape of shapesToRemove) {
    removeShape(shape);
    spawnShape();
  }
}

// ============================================
// PLAYER INTERACTION
// ============================================

const raycaster = new THREE.Raycaster();
raycaster.far = 15; // Max pickup distance

function tryPickupShape() {
  if (state.heldShape) {
    // Drop the shape
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
  
  // Remove from world shapes array (so it doesn't despawn)
  const index = state.shapes.indexOf(shape);
  if (index > -1) {
    state.shapes.splice(index, 1);
  }
  
  // Update UI
  document.getElementById('held-indicator').style.display = 'block';
  document.getElementById('held-shape-name').textContent = shape.userData.name;
}

function dropShape() {
  if (!state.heldShape) return;
  
  const shape = state.heldShape;
  
  // Check if in collection zone
  const distToZone = new THREE.Vector2(
    shape.position.x - collectionZone.position.x,
    shape.position.z - collectionZone.position.z
  ).length();
  
  if (distToZone < CONFIG.collectionZoneRadius) {
    // Collect the shape!
    collectShape(shape);
  } else {
    // Just drop it back into the world
    state.shapes.push(shape);
    shape.userData.seen = false; // Reset seen state
  }
  
  state.heldShape = null;
  document.getElementById('held-indicator').style.display = 'none';
}

function collectShape(shape) {
  const type = shape.userData.type;
  
  // Add to collected
  state.collected[type] = (state.collected[type] || 0) + 1;
  
  // Remove from scene
  scene.remove(shape);
  shape.geometry.dispose();
  shape.material.dispose();
  
  // Spawn a replacement
  spawnShape();
  
  // Update UI and check win
  updateRecipeUI();
  checkWinCondition();
}

// ============================================
// RECIPE SYSTEM
// ============================================

function generateRecipe(difficulty = 1) {
  const types = Object.keys(CONFIG.shapeTypes);
  const recipe = {};
  
  // Number of different shape types needed (1-3 based on difficulty)
  const numTypes = Math.min(1 + Math.floor(difficulty / 2), 3);
  
  // Shuffle and pick types
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
  
  // Win!
  showWinMessage();
  return true;
}

let currentDifficulty = 1;

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
  right: false
};

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

function updateMovement(delta) {
  if (!controls.isLocked) return;
  
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  
  direction.z = Number(moveState.forward) - Number(moveState.backward);
  direction.x = Number(moveState.right) - Number(moveState.left);
  direction.normalize();
  
  if (moveState.forward || moveState.backward) {
    velocity.z -= direction.z * CONFIG.moveSpeed * delta;
  }
  if (moveState.left || moveState.right) {
    velocity.x -= direction.x * CONFIG.moveSpeed * delta;
  }
  
  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  
  // Keep player in bounds
  const pos = camera.position;
  const bound = CONFIG.worldSize - 5;
  pos.x = Math.max(-bound, Math.min(bound, pos.x));
  pos.z = Math.max(-bound, Math.min(bound, pos.z));
  
  // Fixed height
  pos.y = CONFIG.playerHeight;
}

// Update held shape position
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
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
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

// Spawn initial shapes
for (let i = 0; i < CONFIG.maxShapes; i++) {
  spawnShape();
}

// Generate first recipe
state.recipe = generateRecipe(1);
updateRecipeUI();

// Animate shapes
function animateShapes(delta) {
  for (const shape of state.shapes) {
    shape.rotation.x += shape.userData.rotationSpeed.x;
    shape.rotation.y += shape.userData.rotationSpeed.y;
    shape.rotation.z += shape.userData.rotationSpeed.z;
  }
}

// Animate collection zone
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
    updateMovement(delta);
    updateShapeVisibility();
    updateHeldShape();
    updateZoneDistance();
    animateShapes(delta);
  }
  
  animateCollectionZone(time);
  
  renderer.render(scene, camera);
}

animate();

console.log('🔷 Looky Shape Game loaded!');
