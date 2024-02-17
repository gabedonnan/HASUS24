import * as THREE from 'three';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

THREE.Cache.enabled = true;

let container;

let camera, cameraTarget, scene, renderer;

let group, textMesh1, textMesh2, textGeo, materials, background;

let firstLetter = true;

let messages = [["Q", "E"], ["m", "l"]],

	bevelEnabled = true,

	font = undefined,

	fontName = 'optimer', // helvetiker, optimer, gentilis, droid sans, droid serif
	fontWeight = 'bold'; // normal bold

const height = 20,
	size = 70,
	hover = 30,

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

	scene.add( group );

	loadFont();

	// RENDERER

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	// EVENTS

	container.style.touchAction = 'none';
	container.addEventListener( 'pointerdown', onPointerDown );

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

	}

}

function onDocumentKeyPress( event ) {

	const keyCode = event.which;

	// backspace

	if ( keyCode == 8 ) {

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

	const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

	textMesh1 = new THREE.Mesh( textGeo, materials );

	textMesh1.position.x = location[0] + centerOffset;
	textMesh1.position.y = location[1] + - 0.3 * ( textGeo.boundingBox.max.y - textGeo.boundingBox.min.y );
	textMesh1.position.z = location[2];

	textMesh1.rotation.x = 0;
	textMesh1.rotation.y = Math.PI * 2;

	group.add( textMesh1 );
	
	renderBackground(
	    [(textGeo.boundingBox.max.x - textGeo.boundingBox.min.x) * 1.1, (textGeo.boundingBox.max.y - textGeo.boundingBox.min.y) * 1.1],
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

    for (let i = 0; i < messages[0].length; i++) {
        createText(messages[0][i], [0, (messages[0].length - i) * 100, 0]);
    }
	for (let i = 0; i < messages[1].length; i++) {
        createText(messages[1][i], [100, (messages[1].length - i) * 100, 0]);
    }
}

function onPointerDown( event ) {

	if ( event.isPrimary === false ) return;

	pointerXOnPointerDown = event.clientX - windowHalfX;
	targetRotationOnPointerDown = targetRotation;

	document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'pointerup', onPointerUp );

}

function onPointerMove( event ) {

	if ( event.isPrimary === false ) return;

	pointerX = event.clientX - windowHalfX;

	targetRotation = targetRotationOnPointerDown + ( pointerX - pointerXOnPointerDown ) * 0.02;

}

function onPointerUp() {

	if ( event.isPrimary === false ) return;

	document.removeEventListener( 'pointermove', onPointerMove );
	document.removeEventListener( 'pointerup', onPointerUp );

}

//

function animate() {

	requestAnimationFrame( animate );

	render();

}

function renderBackground(mesh_size, location) {
    background = new THREE.Mesh(
        RectangleRounded(mesh_size[0], mesh_size[1], 25, 10),
        new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.FrontSide} ) 
    );
    
    background.position.x = location[0];
    background.position.y = location[1];
    background.position.z = location[2];

    background.rotation.x = 0;
    background.rotation.y = Math.PI * 2;
    
    group.add( background );
}

function render() {

	group.rotation.y += ( targetRotation - group.rotation.y ) * 0.05;

	camera.lookAt( cameraTarget );

	renderer.clear();
	renderer.render( scene, camera );

}
