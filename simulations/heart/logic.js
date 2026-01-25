import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- CONFIGURATION ---
const config = {
    colorArtery: 0xd91e18, // Bright Red
    colorVein: 0x2c3e50,   // Dark Blue
    colorMuscle: 0xa93226, // Deep Red
    bg: 0x050505
};

// --- SCENE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(config.bg);
// Add faint fog for depth
scene.fog = new THREE.FogExp2(config.bg, 0.03);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 12);

// WebGL Renderer (3D)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// CSS2D Renderer (HTML Labels)
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through to 3D
container.appendChild(labelRenderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement); // Bind to WebGL canvas
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.5; // Prevent going under the floor

// --- LIGHTING (Studio Setup) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.SpotLight(0xffffff, 1.5);
mainLight.position.set(10, 10, 10);
mainLight.castShadow = true;
scene.add(mainLight);

const rimLight = new THREE.PointLight(0x0ea5e9, 2); // Blue rim light (Medical feel)
rimLight.position.set(-10, 5, -5);
scene.add(rimLight);

const bottomFill = new THREE.PointLight(0xaa0000, 0.5); // Red glow from bottom
bottomFill.position.set(0, -5, 0);
scene.add(bottomFill);

// --- PROCEDURAL ANATOMY GENERATION ---

// Shared Material (Wet Organ Look)
const tissueMaterial = new THREE.MeshPhysicalMaterial({
    color: config.colorMuscle,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 1.0,        // Wet look
    clearcoatRoughness: 0.1,
    sheen: 1.0,
    sheenColor: 0xffaaaa
});

const arteryMat = new THREE.MeshPhysicalMaterial({
    color: config.colorArtery,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.5
});

const veinMat = new THREE.MeshPhysicalMaterial({
    color: config.colorVein,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.5
});

const heartGroup = new THREE.Group();
scene.add(heartGroup);

// 1. Main Ventricles (Deformed Sphere)
const ventricleGeo = new THREE.SphereGeometry(1.8, 64, 64);
const pos = ventricleGeo.attributes.position;
for(let i=0; i<pos.count; i++){
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    
    // Taper bottom (Apex)
    if(y < 0) {
        x *= (1.0 + y * 0.25);
        z *= (1.0 + y * 0.25);
    }
    // Flatten back slightly
    if(z < 0) z *= 0.8;
    
    pos.setXYZ(i, x, y, z);
}
ventricleGeo.computeVertexNormals();
const ventricles = new THREE.Mesh(ventricleGeo, tissueMaterial);
ventricles.userData = { 
    name: "Ventricles", 
    desc: "Muscular chambers pumping blood to lungs and body." 
};
heartGroup.add(ventricles);

// 2. Atria (Top Caps)
const atriaGeo = new THREE.SphereGeometry(1.3, 32, 32);
const atria = new THREE.Mesh(atriaGeo, tissueMaterial);
atria.scale.set(1.2, 0.7, 1);
atria.position.set(0, 1.5, -0.2);
atria.userData = { name: "Atria", desc: "Receives blood returning to heart." };
heartGroup.add(atria);

// 3. Aorta (The Arch) - Using TubeGeometry with a curve
class CustomSinCurve extends THREE.Curve {
	getPoint( t ) {
        // Create an arch shape
		const tx = Math.cos( t * Math.PI ) * 1.5;
		const ty = Math.sin( t * Math.PI ) * 2.5 + 1;
		const tz = -Math.sin(t * Math.PI) * 0.5;
		return new THREE.Vector3( tx, ty, tz );
	}
}
const aortaPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 1.5, 0),
    new THREE.Vector3(0.2, 2.8, 0),
    new THREE.Vector3(-0.5, 3.2, -0.5),
    new THREE.Vector3(-1.5, 2.5, -1.0),
    new THREE.Vector3(-1.5, 0, -1.5) // Descending aorta
]);
const aortaGeo = new THREE.TubeGeometry(aortaPath, 20, 0.55, 16, false);
const aorta = new THREE.Mesh(aortaGeo, arteryMat);
aorta.userData = { name: "Aorta", desc: "Main artery distributing oxygenated blood." };
heartGroup.add(aorta);

// 4. Pulmonary Artery (Blue-ish) - T Shape
const pulmoPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 1.5, 0.8),
    new THREE.Vector3(-0.8, 2.5, 0.5),
    new THREE.Vector3(-1.8, 2.8, 0.5) // Left branch
]);
const pulmoGeo = new THREE.TubeGeometry(pulmoPath, 20, 0.5, 16, false);
const pulmo = new THREE.Mesh(pulmoGeo, veinMat); // Anatomically carries deoxy blood
pulmo.userData = { name: "Pulmonary Artery", desc: "Carries deoxygenated blood to lungs." };
heartGroup.add(pulmo);

// 5. Superior Vena Cava
const svcGeo = new THREE.CylinderGeometry(0.4, 0.4, 3, 16);
const svc = new THREE.Mesh(svcGeo, veinMat);
svc.position.set(1.5, 2.5, -0.5);
svc.userData = { name: "Vena Cava", desc: "Returns deoxygenated blood from body." };
heartGroup.add(svc);

// --- BLOOD FLOW PARTICLE SYSTEM ---
const particleCount = 200;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
// Simple shader material for glowing dots
const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/disc.png'),
    transparent: true,
    opacity: 0.8,
    vertexColors: true
});
const colors = new Float32Array(particleCount * 3);

// Initialize particles inside Aorta (Red) and Vena Cava (Blue)
const flowSpeed = [];
const flowPath = []; // 0 = Aorta, 1 = Vena Cava

for(let i=0; i<particleCount; i++){
    // Assign random path
    const type = Math.random() > 0.5 ? 0 : 1;
    flowPath.push(type);
    flowSpeed.push(0.02 + Math.random()*0.02);

    // Color
    const c = new THREE.Color(type === 0 ? 0xffaaaa : 0xaaaaff);
    colors[i*3] = c.r;
    colors[i*3+1] = c.g;
    colors[i*3+2] = c.b;

    // Initial Position (dummy)
    particlePos[i*3] = 0;
    particlePos[i*3+1] = 0;
    particlePos[i*3+2] = 0;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const flowSystem = new THREE.Points(particleGeo, particleMat);
heartGroup.add(flowSystem);

// --- INTERACTION LOGIC ---

// 1. Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObj = null;

// HTML Label Logic
const labelDiv = document.getElementById('label-template');
const labelObj = new CSS2DObject(labelDiv);
labelObj.position.set(0,0,0);
scene.add(labelObj); // Add one dynamic label to scene

function onMouseMove( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

// 2. Control Logic
let bpm = 75;
let isFlowing = true;
let showLabels = false;

document.getElementById('bpm-slider').addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
});

document.getElementById('btn-flow').addEventListener('click', (e) => {
    isFlowing = !isFlowing;
    flowSystem.visible = isFlowing;
    e.target.classList.toggle('active');
});

document.getElementById('btn-labels').addEventListener('click', (e) => {
    showLabels = !showLabels;
    e.target.classList.toggle('active');
    // If turning on, we need logic to show all. 
    // For now, this demo uses Hover logic for labels, 
    // but this toggle could force permanent labels.
});

// Cut plane logic (Simple visual transparency toggle for internal view)
let isCut = false;
document.getElementById('btn-cut').addEventListener('click', (e) => {
    isCut = !isCut;
    e.target.classList.toggle('active');
    ventricles.material.opacity = isCut ? 0.4 : 1.0;
    ventricles.material.transparent = isCut;
    ventricles.material.side = isCut ? THREE.DoubleSide : THREE.FrontSide;
});

window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
}

// --- ANIMATION LOOP ---
let time = 0;

function animate() {
    requestAnimationFrame( animate );
    
    // 1. Heart Beat Animation
    // Math to create a "Lub-Dub" rhythm
    const beatSpeed = (bpm / 60) * Math.PI * 2; 
    time += 0.01;
    
    // Scale modifier based on Sin wave with power to make it sharp
    // complex wave for realistic double beat
    const beat = Math.sin(time * beatSpeed * 2); 
    const contraction = 1 + (beat > 0.5 ? 0.05 : 0); 
    
    // Smooth lerping for visual appeal
    ventricles.scale.lerp(new THREE.Vector3(contraction, contraction, contraction), 0.2);
    atria.scale.lerp(new THREE.Vector3(1.2 + (beat < 0 ? 0.03 : 0), 0.7, 1), 0.2);

    // 2. Particle Flow Animation
    if(isFlowing) {
        const positions = flowSystem.geometry.attributes.position.array;
        for(let i=0; i<particleCount; i++){
            // Progress 0 to 1
            const speed = flowSpeed[i] * (bpm/60);
            
            // We use the curve objects to get positions
            // Hacky way to animate along curve: use time offset per particle
            const t = (time * speed + i * 0.1) % 1; 
            
            let pos;
            if(flowPath[i] === 0) {
                // Aorta Path
                pos = aortaPath.getPoint(t);
            } else {
                // Vena Cava (Just a straight line lerp for demo)
                pos = new THREE.Vector3(1.5, 3 - (t*5), -0.5);
            }

            positions[i*3] = pos.x + (Math.random()-0.5)*0.2; // Jitter
            positions[i*3+1] = pos.y + (Math.random()-0.5)*0.2;
            positions[i*3+2] = pos.z + (Math.random()-0.5)*0.2;
        }
        flowSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Hover & Label Logic
    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects( heartGroup.children );

    if ( intersects.length > 0 ) {
        const object = intersects[0].object;
        
        // Highlight logic
        if ( hoveredObj !== object ) {
            // Reset old
            if ( hoveredObj && hoveredObj.material.emissive ) hoveredObj.material.emissive.setHex( 0x000000 );
            
            hoveredObj = object;
            // Set new (glow)
            if ( hoveredObj.material.emissive ) hoveredObj.material.emissive.setHex( 0x330000 );

            // Update Label
            if(object.userData.name) {
                labelDiv.querySelector('.label-title').innerText = object.userData.name;
                labelDiv.querySelector('.label-desc').innerText = object.userData.desc;
                labelDiv.style.opacity = 1;
                
                // Position label slightly above object center
                const center = new THREE.Vector3();
                object.geometry.computeBoundingBox();
                object.geometry.boundingBox.getCenter(center);
                object.localToWorld(center);
                labelObj.position.copy(center);
            }
        }
    } else {
        if ( hoveredObj ) {
            if ( hoveredObj.material.emissive ) hoveredObj.material.emissive.setHex( 0x000000 );
            hoveredObj = null;
            labelDiv.style.opacity = 0;
        }
    }

    controls.update();
    renderer.render( scene, camera );
    labelRenderer.render( scene, camera );
}

animate();
