import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. SCENE SETUP
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = null; // Use CSS background (Gradient)

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha true for gradient bg
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
const blueLight = new THREE.PointLight(0x0ea5e9, 3, 50); 
blueLight.position.set(-5, 0, -5);
scene.add(blueLight);

// 2. MEDICAL MODEL
const heartGroup = new THREE.Group();
scene.add(heartGroup);

// Material
const heartMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd61c1c, // Updated to nicer Red
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
});

// A. Main Body (Ventricles)
const ventricleGeo = new THREE.SphereGeometry(1.5, 32, 32); // Slightly bigger
const posAttribute = ventricleGeo.attributes.position;
for ( let i = 0; i < posAttribute.count; i ++ ) {
    const x = posAttribute.getX( i );
    const y = posAttribute.getY( i );
    const z = posAttribute.getZ( i );
    const y_mod = y * 1.2;
    posAttribute.setX( i, x * (1.0 - y * 0.2) );
    posAttribute.setY( i, y_mod );
}
const ventricles = new THREE.Mesh(ventricleGeo, heartMaterial);
ventricles.userData = { name: "Ventricles", info: "Pumps blood to lungs and body." };
heartGroup.add(ventricles);

// B. Atrium
const atriumGeo = new THREE.SphereGeometry(1.0, 32, 32);
const atrium = new THREE.Mesh(atriumGeo, heartMaterial);
atrium.position.y = 1.2;
atrium.scale.set(1.1, 0.6, 1);
atrium.userData = { name: "Atria", info: "Receives blood from veins." };
heartGroup.add(atrium);

// C. Aorta
const aortaGeo = new THREE.TorusGeometry(0.6, 0.15, 16, 50, Math.PI);
const aortaMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
const aorta = new THREE.Mesh(aortaGeo, aortaMat);
aorta.position.set(0.3, 1.8, 0);
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

bpmSlider.addEventListener('input', (e) => {
    bpm = e.target.value;
    bpmDisplay.innerText = bpm;
});

let isWireframe = false;
toggleWireframe.addEventListener('click', () => {
    isWireframe = !isWireframe;
    heartMaterial.wireframe = isWireframe;
    aortaMat.wireframe = isWireframe;
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove( event ) {
    // Calculate mouse position relative to the canvas, not the window
    const rect = container.getBoundingClientRect();
	mouse.x = ( (event.clientX - rect.left) / container.clientWidth ) * 2 - 1;
	mouse.y = - ( (event.clientY - rect.top) / container.clientHeight ) * 2 + 1;
}
container.addEventListener( 'mousemove', onMouseMove, false ); // Listen on container, not window

// 4. ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);
    
    time += 0.01 * (bpm / 60);
    const scale = 1 + Math.sin(time * 10) * 0.05;
    
    ventricles.scale.set(scale, scale, scale);
    atrium.scale.set(1 + Math.sin(time * 10 + 1) * 0.03, 1, 1);

    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects( heartGroup.children );

    if ( intersects.length > 0 ) {
        const object = intersects[0].object;
        if(object.userData.name) {
            document.body.style.cursor = 'pointer';
            tooltip.style.opacity = 1;
            tooltip.innerText = object.userData.name;
            // Tooltip follows mouse
            // We use event.client from the window listener if available, 
            // but simpler to just fix it to bottom right for now or use logic below
            
            anatomyText.innerHTML = `<strong>${object.userData.name}</strong><br>${object.userData.info}`;
            anatomyText.style.background = "rgba(34, 211, 238, 0.2)"; 
            anatomyText.style.border = "1px solid #22d3ee";
        }
    } else {
        document.body.style.cursor = 'default';
        tooltip.style.opacity = 0;
        anatomyText.style.background = "rgba(255,255,255,0.05)";
        anatomyText.style.border = "none";
        anatomyText.innerHTML = "Hover over parts of the model to identify them.";
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

animate();
