import * as THREE from 'three';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

THREE.Cache.enabled = true;

let container;

let text;

let camera, cameraTarget, scene, renderer;

let group, textMesh1, textMesh2, textGeo, materials, background;

const min_width = 60;
const min_height = 80;

let firstLetter = true;

let message_sender = [0, 0, 1, 1];

let heights = [-400];


let scroll_location = 0;
let window_height = 500;


let messages = ["Q", "E", "m", "l"],

	bevelEnabled = true,

	font = undefined,

	fontName = 'gentilis', // helvetiker, optimer, gentilis, droid sans, droid serif
	fontWeight = 'bold'; // normal bold

const height = 20,
	size = 20,

	curveSegments = 4,

	bevelThickness = 2,
	bevelSize = 1.5;

const mirror = false;

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

	cameraTarget = new THREE.Vector3( 0, 150, 0 );

	// SCENE    

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	scene.fog = new THREE.Fog( 0x000000, 250, 1400 );

	// LIGHTS

	const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
	dirLight.position.set( 0, 0, 1 ).normalize();
	scene.add( dirLight );

	const pointLight = new THREE.PointLight( 0xffffff, 4.5, 0, 0 );
	pointLight.color.setHSL( Math.random(), 1, 0.5 );
	pointLight.position.set( 0, 100, 90 );
	scene.add( pointLight );

	materials = [
		new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
		new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
	];

	group = new THREE.Group();
	group.position.y = 100;
	group.position.x = - ( 0.2 * window.innerWidth );

	scene.add( group );

	loadFont();

	// RENDERER

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	// EVENTS

	container.style.touchAction = 'none';
	document.addEventListener( 'pointermove', onPointerMove );

	document.addEventListener( 'keypress', onDocumentKeyPress );
	document.addEventListener( 'keydown', onDocumentKeyDown );

	//

	const params = {
		changeColor: function () {

			pointLight.color.setHSL( Math.random(), 1, 0.5 );

		},
		changeFont: function () {

			fontIndex ++;

			fontName = reverseFontMap[ fontIndex % reverseFontMap.length ];

			loadFont();

		},
		changeWeight: function () {

			if ( fontWeight === 'bold' ) {

				fontWeight = 'regular';

			} else {

				fontWeight = 'bold';

			}

			loadFont();

		},
		changeBevel: function () {

			bevelEnabled = ! bevelEnabled;

			refreshText();

		}
	};

	//

	const gui = new GUI();

	gui.add( params, 'changeColor' ).name( 'change color' );
	gui.add( params, 'changeFont' ).name( 'change font' );
	gui.add( params, 'changeWeight' ).name( 'change weight' );
	gui.add( params, 'changeBevel' ).name( 'change bevel' );
	gui.open();

	//

	window.addEventListener( 'resize', onWindowResize );

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
		refreshText();

		return false;

	} else if ( keyCode == 13 && text.length != 0) { 
	    event.preventDefault();
	    addMessage(text, 0); 
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

		refreshText();

	}

}

function loadFont() {

	const loader = new FontLoader();
	loader.load( 'fonts/' + fontName + '_' + fontWeight + '.typeface.json', function ( response ) {

		font = response;

		refreshText();

	} );

}

function RectangleRounded( w, h, r, s ) { // width, height, radiusCorner, smoothness
    
    const pi2 = Math.PI * 2;
    const n = ( s + 1 ) * 4; // number of segments    
    let indices = [];
    let positions = [];
 	let uvs = [];   
    let qu, sgx, sgy, x, y;
    
	for ( let j = 1; j < n + 1; j ++ ) indices.push( 0, j, j + 1 ); // 0 is center
    indices.push( 0, n, 1 );   
    positions.push( 0, 0, 0 ); // rectangle center
    uvs.push( 0.5, 0.5 );   
    for ( let j = 0; j < n ; j ++ ) contour( j );
    
    const geometry = new THREE.BufferGeometry( );
    geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 ) );
	geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
	geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );
    
    return geometry;
    
    function contour( j ) {
        
        qu = Math.trunc( 4 * j / n ) + 1 ;      // quadrant  qu: 1..4         
        sgx = ( qu === 1 || qu === 4 ? 1 : -1 ) // signum left/right
        sgy =  qu < 3 ? 1 : -1;                 // signum  top / bottom
        x = sgx * ( w / 2 - r ) + r * Math.cos( pi2 * ( j - qu + 1 ) / ( n - 4 ) ); // corner center + circle
        y = sgy * ( h / 2 - r ) + r * Math.sin( pi2 * ( j - qu + 1 ) / ( n - 4 ) );   
 
        positions.push( x, y, 0 );       
        uvs.push( 0.5 + x / w, 0.5 + y / h );       
        
    }
    
}

function createText(text, location, render_background) {

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
    
    let box_width = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
    let box_height = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;
    
	const centerOffset = - 0.5 * ( box_width );
	heights.push(heights[heights.length - 1] + box_height);

	textMesh1 = new THREE.Mesh( textGeo, materials );

	textMesh1.position.x = location[0];
	textMesh1.position.y = location[1];
	textMesh1.position.z = location[2] - 18;

	textMesh1.rotation.x = 0;
	textMesh1.rotation.y = Math.PI * 2;

	group.add( textMesh1 );
	
	renderBackground(
	    [(textGeo.boundingBox.max.x - textGeo.boundingBox.min.x) + 10, (textGeo.boundingBox.max.y - textGeo.boundingBox.min.y) + 10],
	    location
	)

	if ( mirror ) {

		textMesh2 = new THREE.Mesh( textGeo, materials );

		textMesh2.position.x = centerOffset;
		textMesh2.position.y = - hover;
		textMesh2.position.z = height;

		textMesh2.rotation.x = Math.PI;
		textMesh2.rotation.y = Math.PI * 2;

		group.add( textMesh2 );

	}

}

function refreshText() {

	group.remove( textMesh1 );
	group.remove( background );
	if ( mirror ) group.remove( textMesh2 );

	if ( ! messages ) return;
	
	for (let i = 0; i < messages.length; i++) {
	    createText(messages[i], [message_sender[i] * 100, heights[i], 0]);
	}
}

function onPointerMove( event ) {

	if ( event.isPrimary === false ) return;

	pointerX = event.clientX - windowHalfX;

	targetRotation = targetRotationOnPointerDown + ( pointerX - pointerXOnPointerDown ) * 0.02;

}

function onScroll( event ) {
    if (event.isPrimary === false ) return;
    
        
}

//

function animate() {

	requestAnimationFrame( animate );

	render();

}

function renderBackground(mesh_size, location) {
    background = new THREE.Mesh(
        RectangleRounded(Math.max(mesh_size[0], min_width), Math.max(mesh_size[1], min_height), 25, 10),
        new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.FrontSide} ) 
    );
    
    background.position.x = location[0] + 0.5 * mesh_size[0];
    background.position.y = location[1] + 0.5 * mesh_size[1];
    background.position.z = location[2];

    background.rotation.x = 0;
    background.rotation.y = Math.PI * 2;
    
    group.add( background );
}


function addMessage(message_text, sender) {
    message_sender.push(sender);
    messages.push(message_text);
}


function render() {

	group.rotation.y = Math.min(Math.max(( targetRotation / 23 - group.rotation.y ) * 0.05, -0.1), 0.1);


	camera.lookAt( cameraTarget );

	renderer.clear();
	renderer.render( scene, camera );

}
