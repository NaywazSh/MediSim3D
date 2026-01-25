import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. SCENE SETUP
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); // Very dark bg
scene.fog = new THREE.FogExp2(0x050505, 0.02);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 2, 50);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);
const blueLight = new THREE.PointLight(0x0ea5e9, 3, 50); // Medical Blue rim light
blueLight.position.set(-5, 0, -5);
scene.add(blueLight);

// 2. MEDICAL MODEL (Procedural Heart Representation)
// In a real scenario, you would use GLTFLoader here to load a .glb file
const heartGroup = new THREE.Group();
scene.add(heartGroup);

// Material
const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaa0000,
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
});

// A. Main Body (Ventricles)
const ventricleGeo = new THREE.SphereGeometry(1.2, 32, 32);
// Deform sphere to look like a heart
const posAttribute = ventricleGeo.attributes.position;
for ( let i = 0; i < posAttribute.count; i ++ ) {
    const x = posAttribute.getX( i );
    const y = posAttribute.getY( i );
    const z = posAttribute.getZ( i );
    // Simple heart shape math
    const y_mod = y * 1.2;
    posAttribute.setX( i, x * (1.0 - y * 0.2) );
    posAttribute.setY( i, y_mod );
}
const ventricles = new THREE.Mesh(ventricleGeo, heartMaterial);
ventricles.userData = { name: "Ventricles", info: "Pumps blood to lungs and body." };
heartGroup.add(ventricles);

// B. Atrium (Top part)
const atriumGeo = new THREE.SphereGeometry(0.8, 32, 32);
const atrium = new THREE.Mesh(atriumGeo, heartMaterial);
atrium.position.y = 1.0;
atrium.scale.set(1.1, 0.6, 1);
atrium.userData = { name: "Atria", info: "Receives blood from veins." };
heartGroup.add(atrium);

// C. Aorta (Artery)
const aortaGeo = new THREE.TorusGeometry(0.6, 0.15, 16, 50, Math.PI);
const aortaMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
const aorta = new THREE.Mesh(aortaGeo, aortaMat);
aorta.position.set(0.3, 1.5, 0);
aorta.rotation.z = -0.5;
aorta.rotation.y = 1.5;
aorta.userData = { name: "Aorta", info: "Main artery carrying oxygenated blood." };
heartGroup.add(aorta);

// 3. INTERACTION LOGIC
const bpmSlider = document.getElementById('bpm-slider');
const bpmDisplay = document.getElementById('bpm-display');
const toggleWireframe = document.getElementById('toggle-wireframe');
const anatomyText = document.getElementById('anatomy-text');
const tooltip = document.getElementById('tooltip');

let bpm = 60;
let time = 0;

// Slider Event
bpmSlider.addEventListener('input', (e) => {
    bpm = e.target.value;
    bpmDisplay.innerText = bpm;
});

// Button Event
let isWireframe = false;
toggleWireframe.addEventListener('click', () => {
    isWireframe = !isWireframe;
    heartMaterial.wireframe = isWireframe;
    aortaMat.wireframe = isWireframe;
});

// Raycaster for Hover Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove( event ) {
	mouse.x = ( event.clientX / container.clientWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / container.clientHeight ) * 2 + 1;
}
window.addEventListener( 'mousemove', onMouseMove, false );

// 4. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    
    // Pulse Logic
    time += 0.01 * (bpm / 60); // Speed based on BPM
    const scale = 1 + Math.sin(time * 10) * 0.05; // Heartbeat expansion
    
    // Apply pulse to ventricles only (realistic contraction)
    ventricles.scale.set(scale, scale, scale);
    atrium.scale.set(1 + Math.sin(time * 10 + 1) * 0.03, 1, 1); // Offset beat

    // Hover Detection
    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects( heartGroup.children );

    if ( intersects.length > 0 ) {
        const object = intersects[0].object;
        if(object.userData.name) {
            document.body.style.cursor = 'pointer';
            tooltip.style.opacity = 1;
            tooltip.innerText = object.userData.name;
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY + 10) + 'px';
            
            anatomyText.innerHTML = `<strong>${object.userData.name}</strong><br>${object.userData.info}`;
            anatomyText.style.background = "rgba(14, 165, 233, 0.2)"; // Highlight blue
        }
    } else {
        document.body.style.cursor = 'default';
        tooltip.style.opacity = 0;
        anatomyText.style.background = "rgba(255,255,255,0.1)";
        anatomyText.innerHTML = "Hover over parts of the model to identify them.";
    }

    controls.update();
    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

animate();
