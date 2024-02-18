import * as THREE from 'three';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

THREE.Cache.enabled = true;


const socket = new WebSocket("ws://10.1.107.150:6969");



socket.addEventListener("open", (event) => {

    for (let i = 0; i < messages.length; i++) {
        if (message_sender[i] == 0) {
            socket.send(messages[i]);
        }
    }
});

socket.addEventListener("message", (event) => {
    addMessage(event.data, 1);
    refreshText();
});


let silly = [new Audio('boing-6222.mp3'), new Audio('baby-squeak-toy-2-183912.mp3'), new Audio('boing-box-01-39502.mp3'), new Audio('cartoon-yoink-1-183915.mp3'), new Audio('thump-and-grunt-85606.mp3')];

const glob_rng = splitmix32(new Date().getTime());

const raycaster = new THREE.Raycaster();
let char_pos = new THREE.Vector3(0, 0, 0);
const pointer = new THREE.Vector2(0, 0);

let sender_colour = 0x0000ff;
let other_colour = 0xffffff;

const SPACE_WIDTH = 10;

let right_limit = window.innerWidth * 0.3;
let left_limit = 100;

let current_sender = 0;

let container;

let render_scene, bloom_pass, bloom_composer, mix_pass, output_pass, final_composer;

let text;
let add_flag = false;

let txt_group;

let strip_count;
let strip_angles = [];
let strip_distances = [];
let strip_ys = [];
let strip_widths = [];
let strip_vels = [];
let strip_length = 10000;
let strips = [];
let explosion_counter = 1000;

let plane;
let camera, cameraTarget, scene, renderer;

let group, textMesh1, textMesh2, textGeo, materials, background;

const min_width = 50;
const message_row_height = 25;

let firstLetter = true;

let message_sender = [];

let heights = [150, 150];


let scroll_location = 0;
let window_height = 500;

let min_camera_y_position = 400;


let g = -10;
let moving_arr = [];
let velocity_arr = [];


let messages = [],

	bevelEnabled = true,

	font = undefined,

	fontName = 'gentilis', // helvetiker, optimer, gentilis, droid sans, droid serif
	fontWeight = 'bold'; // normal bold

const height = 20,
	size = 20,

	curveSegments = 4,

	bevelThickness = 2,
	bevelSize = 1.5;

// Initialise bloom stuff

const BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );
const stored_materials = {};

const params = {
	threshold: 0,
	strength: 1,
	radius: 0.5,
	exposure: 1
};

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );

const fontMap = {

	'helvetiker': 0,
	'optimer': 1,
	'gentilis': 2,
	'droid/droid_sans': 3,
	'droid/droid_serif': 4

};

const weightMap = {

	'regular': 0,
	'bold': 1

};

const reverseFontMap = [];
const reverseWeightMap = [];

for ( const i in fontMap ) reverseFontMap[ fontMap[ i ] ] = i;
for ( const i in weightMap ) reverseWeightMap[ weightMap[ i ] ] = i;

let targetRotation = 0;
let targetRotationOnPointerDown = 0;

let pointerX = 0;
let pointerXOnPointerDown = 0;

let windowHalfX = window.innerWidth / 2;

let fontIndex = 1;

init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	// CAMERA

	camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1500 );
	camera.position.set( 0, 400, 700 );

	// SCENE    

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	//scene.fog = new THREE.Fog( 0xFF69B4, 250, 1400 );
	
	
	

	// LIGHTS

	const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
	dirLight.position.set( 0, 0, 1 ).normalize();
	scene.add( dirLight );

	const pointLight = new THREE.PointLight( 0xffffff, 4.5, 0, 0 );
	pointLight.color.setHSL( Math.random(), 1, 0.5 );
	pointLight.position.set( 0, 100, 90 );
	scene.add( pointLight );

	materials = [
		new THREE.MeshNormalMaterial( ), // front
		new THREE.MeshNormalMaterial( ) // side
	];

	group = new THREE.Group();
	group.position.y = 100;
	group.position.x = - ( 0.2 * window.innerWidth );

	scene.add( group );

	loadFont();

	// RENDERER

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.toneMapping = THREE.ReinhardToneMapping;
	renderer.setSize( window.innerWidth, window.innerHeight );

	container.appendChild( renderer.domElement );

	// EVENTS

	container.style.touchAction = 'none';
	document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'mousemove', onClick );
	document.addEventListener( 'wheel', onScroll );

	document.addEventListener( 'keypress', onDocumentKeyPress );
	document.addEventListener( 'keydown', onDocumentKeyDown );

	window.addEventListener( 'resize', onWindowResize );
	
	// Rendering
	
    render_scene = new RenderPass( scene, camera );
    
    bloom_pass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
	bloom_pass.threshold = params.threshold;
	bloom_pass.strength = params.strength;
	bloom_pass.radius = params.radius;

    bloom_composer = new EffectComposer( renderer );
	bloom_composer.renderToScreen = false;
	bloom_composer.addPass( render_scene );
	bloom_composer.addPass( bloom_pass );
	
	mix_pass = new ShaderPass(
		new THREE.ShaderMaterial( {
			uniforms: {
				baseTexture: { value: null },
				bloomTexture: { value: bloom_composer.renderTarget2.texture }
			},
			vertexShader: document.getElementById( 'vertexshader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
			defines: {}
		} ), 'baseTexture'
	);
	
	output_pass = new OutputPass();
	
	final_composer = new EffectComposer( renderer );
	final_composer.addPass( render_scene );
	final_composer.addPass( mix_pass );
	final_composer.addPass( output_pass );
	
	// strips
	
	generateStrips();
	
	for (let i = 0; i < strip_count; i++) {
	    let strip_material = new THREE.ShaderMaterial({
          uniforms: {
            color1: {
              value: new THREE.Color(getRandomInt(0x00000f, 0xffffff, glob_rng))
            },
            color2: {
              value: new THREE.Color(getRandomInt(0x00000f, 0xffffff, glob_rng))
            }
          },
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
          
            varying vec2 vUv;
            
            void main() {
              
              gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
            }
          `,
          wireframe: false
        });
        let strip_geom = new THREE.PlaneGeometry(strip_widths[i], strip_length);
        let strip = new THREE.Mesh(strip_geom, strip_material);
        strip.layers.enable(1);
        
        strip.rotation.z = strip_angles[i];
        strip.rotation.y = Math.PI * 2;
        
        strip.position.y = strip_ys[i];
        strip.position.z = strip_distances[i];
        
        strips.push(strip);
        scene.add(strip);
    }
    

}

function onWindowResize() {

	windowHalfX = window.innerWidth / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function onDocumentKeyDown( event ) {

	if ( firstLetter ) {

		firstLetter = false;
		text = '';

	}

	const keyCode = event.keyCode; 

	// backspace

	if ( keyCode == 8 ) {

		event.preventDefault();

		text = text.substring( 0, text.length - 1 );

		return false;

	} else if ( keyCode == 13 && text.length != 0) { 
	    event.preventDefault();
	    addMessage(wrap(text), current_sender);
	    text = "";
	    firstLetter = true;   
	    refreshText();
	}

}

function onDocumentKeyPress( event ) {

	const keyCode = event.which;

	// backspace

	if ( keyCode == 8 ) {

		event.preventDefault();

	} else if ( keyCode == 13 ) {
	 
	    event.preventDefault(); 
	    
	} else {

		const ch = String.fromCharCode( keyCode );
		text += ch;

	}

}

function loadFont() {

	const loader = new FontLoader();
	loader.load( 'fonts/' + fontName + '_' + fontWeight + '.typeface.json', function ( response ) {

		font = response;

		refreshText();

	} );

}

function createText(text, location, render_background, reverse) {

    const rows = text.split("\n");
    
    let num_rows = rows.length;
    
    txt_group = new THREE.Group();
    
    let total_width = 0;
    
    textGeo = new TextGeometry( text, {

        font: font,

        size: size,
        height: height,
        curveSegments: curveSegments,

        bevelThickness: bevelThickness,
        bevelSize: bevelSize,
        bevelEnabled: bevelEnabled

    } );
    textGeo.computeBoundingBox();
    let box_height = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;
    
    for (let i = 0; i < num_rows; i++) {
        total_width = 0;
        const words = rows[i].split(" ");
        for (let j = 0; j < words.length; j++) {
            textGeo = new TextGeometry( words[j], {

	            font: font,
	            size: size,
	            height: height,
	            curveSegments: curveSegments,

	            bevelThickness: bevelThickness,
	            bevelSize: bevelSize,
	            bevelEnabled: bevelEnabled

            } );
            textGeo.computeBoundingBox();
            let box_width = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
            
            textMesh1 = new THREE.Mesh( textGeo, materials );
            
            textMesh1.position.x = location[0] + total_width;
            textMesh1.position.y = location[1] - i * message_row_height;
            textMesh1.position.z = location[2] - 18;

            textMesh1.rotation.x = 0;
            textMesh1.rotation.y = Math.PI * 2;
            
            total_width += SPACE_WIDTH + box_width;
            txt_group.add(textMesh1);
        }
    }
	heights.push(heights[heights.length - 1] - (5 * message_row_height));
	
	if (add_flag && text == messages[messages.length - 1]) {
	    min_camera_y_position -= (5 * message_row_height);
	    camera.position.y -= (5 * message_row_height);
	    add_flag = false;
    }
	group.add( txt_group );
	
	
	renderBackground(
	    [total_width* 2, message_row_height * num_rows * 2],
	    location,
	    reverse,
	    num_rows
	)
}

function refreshText() {
	console.log(group.children.length);
	for (let i = 0; i < group.children.length; i++) {
	    group.children[i].clear();
	}
	group.clear();

	if ( ! messages ) return;
	
	for (let i = 0; i < messages.length; i++) {
	    if (message_sender[i] == 0) {
	        createText(messages[i], [right_limit, heights[i], 0], true, true);
	    } else {
	        createText(messages[i], [left_limit, heights[i], 0], true, false);
	    }
	    
	}
}

function onPointerMove( event ) {

	if ( event.isPrimary === false ) return;

	pointerX = event.clientX - windowHalfX;
	
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	targetRotation = targetRotationOnPointerDown + ( pointerX - pointerXOnPointerDown ) * 0.02;

}

function onScroll( event ) {
    if (event.isPrimary === false ) return;
    if (camera.position.y > min_camera_y_position || event.deltaY < 0) {
    
        for (let i = 0; i < strip_count; i++) {
            strips[i].position.x += (strip_vels[i][0] - 7.5) * event.deltaY * 0.002 ;
            strips[i].position.y += (strip_vels[i][1] - 12.5) * event.deltaY * 0.002 ;
            strips[i].position.z += (strip_vels[i][2] - 2.5) * event.deltaY * 0.002 ;
            strips[i].rotation.z += event.deltaY * 0.0002;
        }
    
    
        camera.position.y -= event.deltaY * 0.2; 
    }   
}

function onClick( event ) {
    ///if (event.isPrimary === false ) return;
    
    if (event.buttons === 1) {
    
        raycaster.setFromCamera( pointer, camera );

	    // calculate objects intersecting the picking ray
	    const intersects = raycaster.intersectObjects( scene.children );

	    for ( let i = 0; i < intersects.length; i ++ ) {
            var audio = silly[getRandomInt(0, silly.length, glob_rng)];
            audio.play()    

	        moving_arr.push(intersects[ i ].object);
	        velocity_arr.push([getRandomInt(0, 100, glob_rng) - 50, getRandomInt(0, 100, glob_rng) - 50, getRandomInt(0, 100, glob_rng) - 50]);  
	    }
	}
}

//

function animate() {

	requestAnimationFrame( animate );

	render();

}

function renderBackground(mesh_size, location, msg_sender, num_rows) {
    const rng = splitmix32(mesh_size[0] * mesh_size[1] + msg_sender + num_rows);
    
    const mesh_x = Math.max(mesh_size[0], min_width);
    const mesh_y = Math.max(mesh_size[1], message_row_height);
    let background_colour;
    
    if (msg_sender) {
        background_colour = sender_colour;
    } else {
        background_colour = other_colour;
    }
    
    let bg_group = new THREE.Group();
    
    const num_bubbles = getRandomInt(10, 16, rng)
    for (let i = 0; i < num_bubbles; i++) {
        background = new THREE.Mesh(
            new THREE.CircleGeometry(getRandomInt(2, 18, rng), 32),
            new THREE.MeshBasicMaterial( {color: getRandomInt(0x00000f, 0xffffff, rng), side: THREE.FrontSide} ) 
        );
        background.position.x = getRandomInt(location[0],location[0] + 0.5 * mesh_x, rng);
        background.position.y = getRandomInt(location[1],location[1] + 0.5 * mesh_y, rng) - (num_rows - 1) * message_row_height;
        background.position.z = location[2] - 10 * getRandomInt(0, 60, rng);

        background.rotation.x = 0;
        background.rotation.y = Math.PI * 2;
        background.layers.enable(1);
        bg_group.add(background);
    } 
    
    bg_group.layers.enable(1);
    group.add( bg_group );
}

function getRandomInt(min, max, rng) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(rng() * (max - min + 1)) + min;
}

function splitmix32(a) {
    return function() {
      a |= 0; a = a + 0x9e3779b9 | 0;
      var t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
          t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
    }
}

function addMessage(message_text, sender) {
    message_sender.push(sender);
    messages.push(message_text);
    if (sender == 0 && socket.connected) {
        socket.send(message_text);
    }
    add_flag = true;
}

const wrap = (s) => s.replace(
    /(?![^\n]{1,10}$)([^\n]{1,10})\s/g, '$1\n'
);


function getNumRows(s) {
    return (s.split("\n").length - 1);
}

function darkenNonBloomed( obj ) {

	if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {

		stored_materials[ obj.uuid ] = obj.material;
		obj.material = darkMaterial;

	}

}

function restoreMaterial( obj ) {

	if ( stored_materials[ obj.uuid ] ) {

		obj.material = stored_materials[ obj.uuid ];
		delete stored_materials[ obj.uuid ];

	}

}

function generateStrips() {
    
    strip_count = getRandomInt(20, 30, glob_rng);
    for (let i = 0; i < strip_count; i++) {
        strip_angles.push(getRandomInt(0, 100, glob_rng));
        strip_ys.push(getRandomInt(0, 1000, glob_rng));
        strip_distances.push(-getRandomInt(600, 1500, glob_rng));
        strip_vels.push([getRandomInt(5, 10, glob_rng),getRandomInt(10, 15, glob_rng), getRandomInt(0, 5, glob_rng)]);
        strip_widths.push(getRandomInt(5, 10, glob_rng));
    }
}

function render() {

	group.rotation.y = Math.min(Math.max(( targetRotation / 23 - group.rotation.y ) * 0.05, -0.1), 0.1);

	for ( let i = 0; i < velocity_arr.length; i++) {
	    moving_arr[i].position.x += velocity_arr[i][0];
	    moving_arr[i].position.y += velocity_arr[i][1];
	    moving_arr[i].position.z += velocity_arr[i][2];
	    
	    velocity_arr[i][1] += g;
	    
	    moving_arr[i].rotation.x += velocity_arr[i][0] * 0.1;
	    moving_arr[i].rotation.y += velocity_arr[i][1] * 0.1;
	    moving_arr[i].rotation.z += velocity_arr[i][2] * 0.1;
	}

    scene.traverse( darkenNonBloomed );
    bloom_composer.render();
    scene.traverse( restoreMaterial );
    
    final_composer.render();

}


// Player stuff



function raycast_from_char() {
     
    raycaster.set(char_pos, pointer);
    const intersects = raycaster.intersectObjects( scene.children );
    for ( let i = 0; i < intersects.length; i ++ ) {
        
		intersects[ i ].object.material.color.set( 0xff0000 );

	}
}

